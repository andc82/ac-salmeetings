import { toast } from "sonner";

export async function downloadMinutePdf(opts: { title: string; html: string; supplier?: string; createdAt?: string }) {
  try {
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import("jspdf"),
      import("html2canvas-pro"),
    ]);

    const el = document.createElement("div");
    el.style.cssText =
      "position:fixed;left:-10000px;top:0;width:780px;background:#ffffff;color:#111111;font-family:Inter,Arial,sans-serif;padding:32px;line-height:1.55;";
    el.innerHTML = `
      <div style="border-bottom:2px solid #e5e7eb;margin-bottom:16px;padding-bottom:12px;">
        <div style="font-size:12px;color:#6b7280;letter-spacing:.08em;text-transform:uppercase;">SAL Meeting</div>
        <h1 style="font-size:24px;font-weight:700;margin:6px 0 4px;color:#111;">${escapeHtml(opts.title)}</h1>
        <div style="font-size:12px;color:#6b7280;">
          ${opts.supplier ? `Fornitore: <strong style="color:#111">${escapeHtml(opts.supplier)}</strong>` : ""}
          ${opts.createdAt ? ` &nbsp;·&nbsp; ${escapeHtml(opts.createdAt)}` : ""}
        </div>
      </div>
      <div style="color:#111;">${opts.html || ""}</div>
    `;
    document.body.appendChild(el);

    try {
      const fullCanvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });

      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentW = pageW - margin * 2;
      const contentH = pageH - margin * 2;

      // px-per-mm based on the rendered canvas width mapped to PDF content width
      const pxPerMm = fullCanvas.width / contentW;
      const pageSlicePx = Math.floor(contentH * pxPerMm);

      let renderedPx = 0;
      let pageIndex = 0;

      while (renderedPx < fullCanvas.height) {
        const remainingPx = fullCanvas.height - renderedPx;
        const slicePx = Math.min(pageSlicePx, remainingPx);

        const slice = document.createElement("canvas");
        slice.width = fullCanvas.width;
        slice.height = slicePx;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(
          fullCanvas,
          0, renderedPx, fullCanvas.width, slicePx,
          0, 0, fullCanvas.width, slicePx,
        );

        const imgData = slice.toDataURL("image/jpeg", 0.95);
        const sliceHeightMm = slicePx / pxPerMm;

        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", margin, margin, contentW, sliceHeightMm);

        renderedPx += slicePx;
        pageIndex += 1;
      }

      const filename = `${(opts.title || "minuta").replace(/[^a-z0-9-_ ]/gi, "_")}.pdf`;
      pdf.save(filename);
    } finally {
      el.remove();
    }
  } catch (err: any) {
    console.error("PDF export failed", err);
    toast.error(`Errore esportazione PDF: ${err?.message ?? err}`);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
