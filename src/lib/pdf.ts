import { toast } from "sonner";

type InlineRun = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  href?: string;
};

type Block =
  | { kind: "heading"; level: 1 | 2 | 3; runs: InlineRun[] }
  | { kind: "paragraph"; runs: InlineRun[] }
  | { kind: "list-item"; runs: InlineRun[]; ordered: boolean; index: number; depth: number }
  | { kind: "spacer"; height: number }
  | { kind: "hr" };

export async function downloadMinutePdf(opts: {
  title: string;
  html: string;
  supplier?: string;
  createdAt?: string;
}) {
  try {
    const [{ default: jsPDF }, { default: DOMPurify }] = await Promise.all([
      import("jspdf"),
      import("dompurify"),
    ]);

    const safeHtml = DOMPurify.sanitize(opts.html || "", { ADD_ATTR: ["target", "rel"] });
    const container = document.createElement("div");
    container.innerHTML = safeHtml;

    const blocks: Block[] = parseBlocks(container);

    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 48;
    const contentW = pageW - margin * 2;

    let y = margin;

    // ---------- Header ----------
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(110);
    pdf.text("SAL MEETING", margin, y);
    y += 14;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(20);
    const titleLines = pdf.splitTextToSize(opts.title || "Minuta", contentW);
    pdf.text(titleLines, margin, y);
    y += titleLines.length * 22;

    const metaParts: string[] = [];
    if (opts.supplier) metaParts.push(`Fornitore: ${opts.supplier}`);
    if (opts.createdAt) metaParts.push(opts.createdAt);
    if (metaParts.length) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(110);
      pdf.text(metaParts.join("  ·  "), margin, y);
      y += 14;
    }

    y += 6;
    pdf.setDrawColor(220);
    pdf.line(margin, y, pageW - margin, y);
    y += 16;

    // ---------- Body ----------
    const lineHeight = 14;
    const fontSize = 11;

    const ensureSpace = (h: number) => {
      if (y + h > pageH - margin) {
        pdf.addPage();
        y = margin;
      }
    };

    for (const block of blocks) {
      if (block.kind === "spacer") {
        y += block.height;
        continue;
      }
      if (block.kind === "hr") {
        ensureSpace(12);
        pdf.setDrawColor(220);
        pdf.line(margin, y + 6, pageW - margin, y + 6);
        y += 16;
        continue;
      }

      let size = fontSize;
      let lh = lineHeight;
      let indent = 0;
      let prefix = "";
      let forceBold = false;

      if (block.kind === "heading") {
        size = block.level === 1 ? 16 : block.level === 2 ? 14 : 12;
        lh = size + 4;
        forceBold = true;
        ensureSpace(lh + 4);
        y += 4;
      } else if (block.kind === "list-item") {
        indent = 18 + block.depth * 14;
        prefix = block.ordered ? `${block.index}. ` : "";
      }

      pdf.setTextColor(20);
      pdf.setFontSize(size);

      const runs = forceBold
        ? block.runs.map((r) => ({ ...r, bold: true }))
        : block.runs;

      // If a block has no runs (empty paragraph), emit one blank line matching editor spacing.
      if (runs.length === 0 || runs.every((r) => r.text.length === 0)) {
        ensureSpace(lh);
        y += lh;
        continue;
      }

      renderRuns({
        pdf,
        runs,
        x: margin + indent,
        maxWidth: contentW - indent,
        getY: () => y,
        setY: (v) => (y = v),
        lineHeight: lh,
        ensureSpace,
        prefix,
        bullet: block.kind === "list-item" && !block.ordered,
        pageH,
        margin,
      });
    }

    const filename = `${(opts.title || "minuta").replace(/[^a-z0-9-_ ]/gi, "_")}.pdf`;
    pdf.save(filename);
  } catch (err: any) {
    console.error("PDF export failed", err);
    toast.error(`Errore esportazione PDF: ${err?.message ?? err}`);
  }
}

// ---------- HTML → blocks ----------

function parseBlocks(root: HTMLElement): Block[] {
  const blocks: Block[] = [];
  walk(root, blocks, { depth: 0 });
  return blocks;
}

function walk(
  node: Node,
  out: Block[],
  ctx: { depth: number; orderedStack?: { ordered: boolean; index: number }[] },
) {
  const orderedStack = ctx.orderedStack ?? [];

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = (child.textContent || "").trim();
      if (t) {
        // Stray text outside a block — wrap as paragraph
        out.push({ kind: "paragraph", runs: [{ text: t }] });
      }
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    switch (tag) {
      case "h1":
      case "h2":
      case "h3": {
        const level = (tag === "h1" ? 1 : tag === "h2" ? 2 : 3) as 1 | 2 | 3;
        out.push({ kind: "heading", level, runs: collectRuns(el) });
        return;
      }
      case "p": {
        const runs = collectRuns(el);
        // Detect empty paragraph (used as blank line in editor)
        const hasContent = runs.some((r) => r.text.length > 0);
        if (!hasContent) {
          out.push({ kind: "paragraph", runs: [] });
        } else {
          out.push({ kind: "paragraph", runs });
        }
        return;
      }
      case "br": {
        out.push({ kind: "paragraph", runs: [] });
        return;
      }
      case "hr": {
        out.push({ kind: "hr" });
        return;
      }
      case "ul":
      case "ol": {
        const ordered = tag === "ol";
        let idx = 1;
        el.childNodes.forEach((li) => {
          if (li.nodeType === Node.ELEMENT_NODE && (li as HTMLElement).tagName.toLowerCase() === "li") {
            out.push({
              kind: "list-item",
              runs: collectRuns(li as HTMLElement),
              ordered,
              index: idx++,
              depth: ctx.depth,
            });
            // Nested lists
            (li as HTMLElement).querySelectorAll(":scope > ul, :scope > ol").forEach((nested) => {
              walk(nested, out, { depth: ctx.depth + 1, orderedStack });
            });
          }
        });
        return;
      }
      case "blockquote":
      case "div": {
        walk(el, out, ctx);
        return;
      }
      default: {
        // Inline-only top-level element: treat as paragraph
        const runs = collectRuns(el);
        if (runs.some((r) => r.text.length > 0)) {
          out.push({ kind: "paragraph", runs });
        }
      }
    }
  });
}

function collectRuns(el: HTMLElement): InlineRun[] {
  const runs: InlineRun[] = [];
  const push = (text: string, style: { bold?: boolean; italic?: boolean; href?: string }) => {
    if (!text) return;
    runs.push({ text, ...style });
  };

  const visit = (n: Node, style: { bold?: boolean; italic?: boolean; href?: string }) => {
    if (n.nodeType === Node.TEXT_NODE) {
      // Collapse whitespace like browsers do for inline content
      const txt = (n.textContent || "").replace(/\s+/g, " ");
      push(txt, style);
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const e = n as HTMLElement;
    const tag = e.tagName.toLowerCase();
    if (tag === "br") {
      // line break inside a paragraph: encode as newline sentinel
      runs.push({ text: "\n" });
      return;
    }
    const next = { ...style };
    if (tag === "strong" || tag === "b") next.bold = true;
    if (tag === "em" || tag === "i") next.italic = true;
    if (tag === "a") next.href = (e as HTMLAnchorElement).getAttribute("href") || style.href;
    e.childNodes.forEach((c) => visit(c, next));
  };

  el.childNodes.forEach((c) => visit(c, {}));

  // Trim leading/trailing whitespace runs
  while (runs.length && runs[0].text.trim() === "" && runs[0].text !== "\n") runs.shift();
  while (runs.length && runs[runs.length - 1].text.trim() === "" && runs[runs.length - 1].text !== "\n") runs.pop();

  return runs;
}

// ---------- Run renderer with wrapping + hyperlinks ----------

function renderRuns(args: {
  pdf: any;
  runs: InlineRun[];
  x: number;
  maxWidth: number;
  getY: () => number;
  setY: (v: number) => void;
  lineHeight: number;
  ensureSpace: (h: number) => void;
  prefix?: string;
  pageH: number;
  margin: number;
}) {
  const { pdf, runs, x, maxWidth, getY, setY, lineHeight, ensureSpace, prefix } = args;

  // Tokenize each run into words while preserving spaces and explicit newlines
  type Token = { text: string; run: InlineRun; isSpace: boolean; isNewline: boolean };
  const tokens: Token[] = [];
  for (const r of runs) {
    if (r.text === "\n") {
      tokens.push({ text: "", run: r, isSpace: false, isNewline: true });
      continue;
    }
    // Split keeping spaces
    const parts = r.text.split(/(\s+)/);
    for (const p of parts) {
      if (!p) continue;
      tokens.push({ text: p, run: r, isSpace: /^\s+$/.test(p), isNewline: false });
    }
  }

  const setStyle = (run: InlineRun) => {
    const style = run.bold && run.italic ? "bolditalic" : run.bold ? "bold" : run.italic ? "italic" : "normal";
    pdf.setFont("helvetica", style);
    pdf.setTextColor(run.href ? 30 : 20, run.href ? 80 : 20, run.href ? 200 : 20);
  };

  let lineTokens: { token: Token; width: number }[] = [];
  let lineWidth = 0;
  let isFirstLineOfBlock = true;

  const flushLine = () => {
    ensureSpace(lineHeight);
    let lx = x;
    if (isFirstLineOfBlock && prefix) {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(20);
      pdf.text(prefix, lx, getY() + lineHeight - 4);
      lx += prefixWidth;
    }
    for (const { token, width } of lineTokens) {
      if (token.isSpace) {
        lx += width;
        continue;
      }
      setStyle(token.run);
      pdf.text(token.text, lx, getY() + lineHeight - 4);
      if (token.run.href) {
        pdf.link(lx, getY() + 2, width, lineHeight, { url: token.run.href });
      }
      lx += width;
    }
    setY(getY() + lineHeight);
    lineTokens = [];
    lineWidth = 0;
    isFirstLineOfBlock = false;
  };

  // We need to measure tokens using their style font
  const measure = (t: Token) => {
    setStyle(t.run);
    // include prefix width on first token of first line
    return pdf.getTextWidth(t.text);
  };

  // compute prefix width once
  let prefixWidth = 0;
  if (prefix) {
    pdf.setFont("helvetica", "normal");
    prefixWidth = pdf.getTextWidth(prefix);
  }

  for (const tok of tokens) {
    if (tok.isNewline) {
      flushLine();
      continue;
    }
    const w = measure(tok);
    const effectiveMax = maxWidth - (isFirstLineOfBlock && prefix ? prefixWidth : 0);
    if (!tok.isSpace && lineWidth + w > effectiveMax && lineTokens.length > 0) {
      while (lineTokens.length && lineTokens[lineTokens.length - 1].token.isSpace) {
        const removed = lineTokens.pop()!;
        lineWidth -= removed.width;
      }
      flushLine();
      if (tok.isSpace) continue;
    }
    lineTokens.push({ token: tok, width: w });
    lineWidth += w;
  }
  if (lineTokens.length) flushLine();
}

