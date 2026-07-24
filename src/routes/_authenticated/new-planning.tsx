import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/DatePicker";
import { PlanningProjects, makeEmptyProject, projectsToGantt, validateProjects, type ProjectRow } from "@/components/PlanningForm";
import { GanttChart } from "@/components/GanttChart";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/new-planning")({
  head: () => ({
    meta: [
      { title: "Nuova pianificazione — AC SAL Meetings" },
      { name: "description", content: "Crea una nuova pianificazione: seleziona fornitore, definisci periodo e progetti con date di sviluppo, Q&A/UAT e rilascio in produzione." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Nuova pianificazione — AC SAL Meetings" },
      { property: "og:description", content: "Crea una nuova pianificazione con progetti e diagramma di Gantt." },
      { property: "og:url", content: "https://ac-salmeetings.lovable.app/new-planning" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://ac-salmeetings.lovable.app/new-planning" }],
  }),
  component: NewPlanning,
});

function NewPlanning() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([makeEmptyProject()]);

  const suppliersQ = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const err = validateProjects(projects, startDate!, endDate!);
      if (err) throw new Error(err);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non autenticato");
      const { data: pl, error: e1 } = await supabase.from("plannings").insert({
        owner_id: u.user.id, supplier_id: supplierId, title: title.trim(), start_date: startDate!, end_date: endDate!,
      }).select().single();
      if (e1) throw e1;
      const rows = projects.map((p, i) => ({
        planning_id: pl.id,
        title: p.title.trim(),
        sort_order: i,
        dev_start: p.dev_start, dev_end: p.dev_end,
        uat_start: p.uat_start, uat_end: p.uat_end, prod_release: p.prod_release,
      }));
      const { error: e2 } = await supabase.from("planning_projects").insert(rows);
      if (e2) {
        await supabase.from("plannings").delete().eq("id", pl.id);
        throw e2;
      }
      return pl;
    },
    onSuccess: () => {
      toast.success("Pianificazione creata");
      queryClient.invalidateQueries({ queryKey: ["plannings"] });
      navigate({ to: "/plannings" });
    },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  const suppliers = suppliersQ.data ?? [];
  const canProceed = supplierId && title.trim() && startDate && endDate && startDate <= endDate;

  if (!started) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Sezione</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">New Pianificazione</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seleziona fornitore, titolo e periodo della pianificazione.</p>
        </div>
        <Card className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Fornitore *</Label>
            {suppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun fornitore. <Link to="/settings" className="text-primary underline">Aggiungine uno</Link>.</p>
            ) : (
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Seleziona un fornitore" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titolo pianificazione *</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. Roadmap Q3 2026" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data inizio *</Label>
              <DatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div className="space-y-2">
              <Label>Data fine *</Label>
              <DatePicker value={endDate} onChange={setEndDate} min={startDate ?? undefined} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={!canProceed} onClick={() => setStarted(true)}>Procedi</Button>
          </div>
        </Card>
      </div>
    );
  }

  const supplierName = suppliers.find((s) => s.id === supplierId)?.name;
  const gantt = projectsToGantt(projects);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" aria-label="Torna indietro" onClick={() => setStarted(false)}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{supplierName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight truncate">{title}</h1>
          </div>
        </div>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          <Save className="h-4 w-4 mr-2" />{create.isPending ? "Salvataggio..." : "Salva pianificazione"}
        </Button>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-semibold mb-3">Progetti</h2>
          <PlanningProjects startDate={startDate!} endDate={endDate!} projects={projects} onChange={setProjects} />
        </section>
        {gantt.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Anteprima Gantt</h2>
            <GanttChart startDate={startDate!} endDate={endDate!} projects={gantt} />
          </section>
        )}
      </div>
    </div>
  );
}
