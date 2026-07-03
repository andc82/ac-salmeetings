import { useMemo } from "react";
import { differenceInCalendarDays, format, addDays, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { it } from "date-fns/locale";

export interface GanttProject {
  id: string;
  title: string;
  dev_start: string;
  dev_end: string;
  uat_start?: string | null;
  uat_end?: string | null;
  prod_release?: string | null;
}

interface Props {
  startDate: string;
  endDate: string;
  projects: GanttProject[];
}

const ROW_H = 44;
const HEADER_H = 56;
const LABEL_W = 220;

function toDate(s: string) { return new Date(s + "T00:00:00"); }

export function GanttChart({ startDate, endDate, projects }: Props) {
  const { start, end, totalDays, dayW, width, months } = useMemo(() => {
    const start = toDate(startDate);
    const end = toDate(endDate);
    const totalDays = Math.max(1, differenceInCalendarDays(end, start) + 1);
    const dayW = Math.max(6, Math.min(40, Math.round(1400 / totalDays)));
    const width = totalDays * dayW;
    const months = eachMonthOfInterval({ start: startOfMonth(start), end: endOfMonth(end) });
    return { start, end, totalDays, dayW, width, months };
  }, [startDate, endDate]);

  function xFor(dateStr: string) {
    const d = toDate(dateStr);
    const diff = differenceInCalendarDays(d, start);
    return Math.max(0, Math.min(totalDays, diff)) * dayW;
  }
  function barFor(a: string, b: string) {
    const x1 = xFor(a);
    const x2 = xFor(b) + dayW;
    return { x: x1, w: Math.max(dayW, x2 - x1) };
  }

  const height = HEADER_H + projects.length * ROW_H + 8;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex">
        {/* Left labels */}
        <div className="shrink-0 border-r border-border" style={{ width: LABEL_W }}>
          <div className="h-14 border-b border-border bg-background/40 px-4 flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Progetto
          </div>
          {projects.map((p) => (
            <div key={p.id} className="border-b border-border px-4 flex items-center text-sm truncate" style={{ height: ROW_H }} title={p.title}>
              {p.title}
            </div>
          ))}
        </div>
        {/* Timeline */}
        <div className="overflow-x-auto flex-1">
          <div style={{ width, height }} className="relative">
            {/* Header months */}
            <div className="h-14 border-b border-border bg-background/40 relative">
              {months.map((m, i) => {
                const mStart = m < start ? start : m;
                const mEnd = endOfMonth(m) > end ? end : endOfMonth(m);
                const x = differenceInCalendarDays(mStart, start) * dayW;
                const w = (differenceInCalendarDays(mEnd, mStart) + 1) * dayW;
                return (
                  <div key={i} className="absolute top-0 h-full border-r border-border px-2 flex flex-col justify-center" style={{ left: x, width: w }}>
                    <span className="text-xs font-semibold">{format(m, "MMMM yyyy", { locale: it })}</span>
                    <span className="text-[10px] text-muted-foreground">{format(mStart, "d")} – {format(mEnd, "d")}</span>
                  </div>
                );
              })}
            </div>
            {/* Grid + bars */}
            {projects.map((p, i) => {
              const y = i * ROW_H;
              const dev = barFor(p.dev_start, p.dev_end);
              const uat = p.uat_start && p.uat_end ? barFor(p.uat_start, p.uat_end) : null;
              const prodX = p.prod_release ? xFor(p.prod_release) + dayW / 2 : null;
              return (
                <div key={p.id} className="absolute left-0 right-0 border-b border-border" style={{ top: HEADER_H + y, height: ROW_H }}>
                  <div className="absolute inset-0 flex items-center px-1 gap-1">
                    <div
                      className="absolute h-6 rounded-md bg-yellow-500/80 text-black text-[11px] px-2 flex items-center overflow-hidden shadow-sm"
                      style={{ left: dev.x, width: dev.w }}
                      title={`Sviluppo: ${p.dev_start} → ${p.dev_end}`}
                    >
                      Dev
                    </div>
                    {uat && (
                      <div
                        className="absolute h-6 rounded-md bg-sky-500/80 text-white text-[11px] px-2 flex items-center overflow-hidden shadow-sm"
                        style={{ left: uat.x, width: uat.w, top: 8 }}
                        title={`Q&A/UAT: ${p.uat_start} → ${p.uat_end}`}
                      >
                        Q&A/UAT
                      </div>
                    )}
                    {prodX !== null && (
                      <div
                        className="absolute"
                        style={{ left: prodX - 8, top: (ROW_H - 16) / 2 }}
                        title={`Rilascio produzione: ${p.prod_release}`}
                      >
                        <div className="h-4 w-4 rotate-45 bg-emerald-500 border border-emerald-300" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-yellow-500/80" /> Sviluppo</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-sky-500/80" /> Q&A/UAT</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rotate-45 bg-emerald-500 inline-block" /> Rilascio prod</span>
        <span className="ml-auto">Da {format(start, "dd/MM/yyyy")} a {format(end, "dd/MM/yyyy")} — {addDays(start,0) && ""}{totalDays} giorni</span>
      </div>
    </div>
  );
}
