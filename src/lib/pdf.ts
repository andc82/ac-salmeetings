export async function downloadMinutePdf(opts: { title: string; html: string; supplier?: string; createdAt?: string }) {
  const { default: html2pdf } = await import("html2pdf.js");
  const el = document.createElement("div");
  el.style.cssText = "position:fixed;left:-10000px;top:0;width:780px;background:#ffffff;color:#111111;font-family:Inter,Arial,sans-serif;padding:24px;";
  el.innerHTML = `
    <div style="border-bottom:2px solid #e5e7eb;margin-bottom:16px;padding-bottom:12px;color:#111;">
      <div style="font-size:12px;color:#6b7280;letter-spacing:.08em;text-transform:uppercase;">SAL Meeting</div>
      <h1 style="font-size:24px;font-weight:700;margin:6px 0 4px;color:#111;">${escape(opts.title)}</h1>
      <div style="font-size:12px;color:#6b7280;">
        ${opts.supplier ? `Fornitore: <strong style="color:#111">${escape(opts.supplier)}</strong>` : ""}
        ${opts.createdAt ? ` &nbsp;·&nbsp; ${escape(opts.createdAt)}` : ""}
      </div>
    </div>
    <div style="color:#111;line-height:1.55;">${opts.html || ""}</div>
  `;
  document.body.appendChild(el);
  try {
    await html2pdf().set({
      margin: [12, 12, 12, 12],
      filename: `${opts.title.replace(/[^a-z0-9-_ ]/gi, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        backgroundColor: "#ffffff",
        onclone: (doc: Document) => {
          // Neutralize oklch / unsupported color functions inherited from the app stylesheet.
          const style = doc.createElement("style");
          style.textContent = `
            .__pdf-root, .__pdf-root * {
              color: #111 !important;
              background-color: transparent !important;
              border-color: #e5e7eb !important;
            }
            .__pdf-root { background:#fff !important; }
            .__pdf-root a { color: #1d4ed8 !important; text-decoration: underline; }
          `;
          doc.head.appendChild(style);
        },
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    } as any).from(el).save();
  } finally {
    el.remove();
  }
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
