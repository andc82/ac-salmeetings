export async function downloadMinutePdf(opts: { title: string; html: string; supplier?: string; createdAt?: string }) {
  const { default: html2pdf } = await import("html2pdf.js");
  const el = document.createElement("div");
  el.className = "minute-render";
  el.style.maxWidth = "780px";
  el.innerHTML = `
    <div style="border-bottom:2px solid #e5e7eb;margin-bottom:16px;padding-bottom:12px;">
      <div style="font-size:12px;color:#6b7280;letter-spacing:.08em;text-transform:uppercase;">SAL Meeting</div>
      <h1 style="font-size:24px;font-weight:700;margin:6px 0 4px;">${escape(opts.title)}</h1>
      <div style="font-size:12px;color:#6b7280;">
        ${opts.supplier ? `Fornitore: <strong>${escape(opts.supplier)}</strong>` : ""}
        ${opts.createdAt ? ` &nbsp;·&nbsp; ${escape(opts.createdAt)}` : ""}
      </div>
    </div>
    <div>${opts.html || ""}</div>
  `;
  document.body.appendChild(el);
  try {
    await html2pdf().set({
      margin: [12, 12, 12, 12],
      filename: `${opts.title.replace(/[^a-z0-9-_ ]/gi, "_")}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, backgroundColor: "#ffffff" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    }).from(el).save();
  } finally {
    el.remove();
  }
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
