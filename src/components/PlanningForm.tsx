import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/DatePicker";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { GanttProject } from "@/components/GanttChart";

export interface ProjectRow {
  id?: string;
  _key: string;
  title: string;
  dev_start: string | null;
  dev_end: string | null;
  uat_start: string | null;
  uat_end: string | null;
  prod_release: string | null;
}

interface Props {
  startDate: string;
  endDate: string;
  projects: ProjectRow[];
  onChange: (projects: ProjectRow[]) => void;
}

let seq = 0;
export function makeEmptyProject(): ProjectRow {
  seq += 1;
  return { _key: `p-${Date.now()}-${seq}`, title: "", dev_start: null, dev_end: null, uat_start: null, uat_end: null, prod_release: null };
}

export function PlanningProjects({ startDate, endDate, projects, onChange }: Props) {
  function update(i: number, patch: Partial<ProjectRow>) {
    const next = projects.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) { onChange(projects.filter((_, idx) => idx !== i)); }
  function add() { onChange([...projects, makeEmptyProject()]); }
  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= projects.length) return;
    const next = projects.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {projects.map((p, i) => (
        <Card key={p._key} className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col mt-8">
              <button type="button" onClick={() => move(i, -1)} aria-label="Sposta su" className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === 0}>▲</button>
              <GripVertical className="h-4 w-4 text-muted-foreground my-1" />
              <button type="button" onClick={() => move(i, 1)} aria-label="Sposta giù" className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={i === projects.length - 1}>▼</button>
            </div>
            <div className="flex-1 space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Titolo progetto</Label>
                  <Input value={p.title} onChange={(e) => update(i, { title: e.target.value })} placeholder={`Progetto ${i + 1}`} />
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Rimuovi progetto" className="text-destructive" onClick={() => remove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data inizio sviluppo *</Label>
                  <DatePicker value={p.dev_start} onChange={(v) => update(i, { dev_start: v })} min={startDate} max={endDate} />
                </div>
                <div className="space-y-2">
                  <Label>Data fine sviluppo *</Label>
                  <DatePicker value={p.dev_end} onChange={(v) => update(i, { dev_end: v })} min={p.dev_start ?? startDate} max={endDate} />
                </div>
                <div className="space-y-2">
                  <Label>Data inizio UAT</Label>
                  <DatePicker clearable value={p.uat_start} onChange={(v) => update(i, { uat_start: v })} min={startDate} max={endDate} />
                </div>
                <div className="space-y-2">
                  <Label>Data fine UAT</Label>
                  <DatePicker clearable value={p.uat_end} onChange={(v) => update(i, { uat_end: v })} min={p.uat_start ?? startDate} max={endDate} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Data rilascio in produzione</Label>
                  <DatePicker clearable value={p.prod_release} onChange={(v) => update(i, { prod_release: v })} min={startDate} max={endDate} />
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
      <Button type="button" variant="outline" onClick={add}><Plus className="h-4 w-4 mr-2" />Aggiungi progetto</Button>
    </div>
  );
}

export function projectsToGantt(projects: ProjectRow[]): GanttProject[] {
  return projects
    .filter((p) => p.title.trim() && p.dev_start && p.dev_end)
    .map((p, i) => ({
      id: p.id ?? p._key,
      title: p.title || `Progetto ${i + 1}`,
      dev_start: p.dev_start!,
      dev_end: p.dev_end!,
      uat_start: p.uat_start,
      uat_end: p.uat_end,
      prod_release: p.prod_release,
    }));
}

export function validateProjects(projects: ProjectRow[], startDate: string, endDate: string): string | null {
  if (projects.length === 0) return "Aggiungi almeno un progetto";
  for (const [i, p] of projects.entries()) {
    const n = i + 1;
    if (!p.title.trim()) return `Progetto ${n}: titolo obbligatorio`;
    if (!p.dev_start || !p.dev_end) return `Progetto ${n}: date di sviluppo obbligatorie`;
    if (p.dev_end < p.dev_start) return `Progetto ${n}: fine sviluppo precedente all'inizio`;
    if (p.dev_start < startDate || p.dev_end > endDate) return `Progetto ${n}: date sviluppo fuori dal range pianificazione`;
    if ((p.uat_start && !p.uat_end) || (!p.uat_start && p.uat_end)) return `Progetto ${n}: entrambe le date UAT o nessuna`;
    if (p.uat_start && p.uat_end && p.uat_end < p.uat_start) return `Progetto ${n}: fine UAT precedente all'inizio`;
  }
  return null;
}
