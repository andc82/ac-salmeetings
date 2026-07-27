import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/DatePicker";
import { GanttChart } from "@/components/GanttChart";
import { PlanningProjects, projectsToGantt, validateProjects, type ProjectRow } from "@/components/PlanningForm";
import { ArrowLeft, Save, Pencil } from "lucide-react";
import { toast } from "sonner";

const search = z.object({ mode: z.enum(["view", "edit"]).optional().default("view") });

export const Route = createFileRoute("/_authenticated/plannings/$id")({
  validateSearch: search,
  head: ({ params }) => {
    const shortId = params.id.slice(0, 8);
    const title = `Pianificazione ${shortId} — AC SAL Meetings`;
    const description = `Pianificazione ${shortId}: diagramma di Gantt con fasi di sviluppo, Q&A/UAT e rilascio in produzione per ogni progetto del fornitore.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "noindex, nofollow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `https://ac-salmeetings.lovable.app/plannings/${params.id}` },
      ],
    };
  },

  component: PlanningDetail,
});

function PlanningDetail() {
  const { id } = Route.useParams();
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ["planning", id],
    queryFn: async () => {
      const { data: pl, error } = await supabase.from("plannings").select("*, suppliers(name)").eq("id", id).single();
      if (error) throw error;
      const { data: projs, error: e2 } = await supabase.from("planning_projects").select("*").eq("planning_id", id).order("sort_order");
      if (e2) throw e2;
      return { planning: pl, projects: projs };
    },
  });

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [projects, setProjects] = useState<ProjectRow[]>([]);

  useEffect(() => {
    if (!q.data) return;
    setTitle(q.data.planning.title);
    setStartDate(q.data.planning.start_date);
    setEndDate(q.data.planning.end_date);
    setProjects(q.data.projects.map((p: any) => ({
      id: p.id, _key: p.id,
      title: p.title,
      dev_start: p.dev_start, dev_end: p.dev_end,
      uat_start: p.uat_start, uat_end: p.uat_end, prod_release: p.prod_release,
    })));
  }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const err = validateProjects(projects, startDate, endDate);
      if (err) throw new Error(err);
      const { error: e1 } = await supabase.from("plannings").update({ title: title.trim(), start_date: startDate, end_date: endDate }).eq("id", id);
      if (e1) throw e1;
      // Replace projects wholesale for simplicity
      const { error: e2 } = await supabase.from("planning_projects").delete().eq("planning_id", id);
      if (e2) throw e2;
      const rows = projects.map((p, i) => ({
        planning_id: id, title: p.title.trim(), sort_order: i,
        dev_start: p.dev_start, dev_end: p.dev_end,
        uat_start: p.uat_start, uat_end: p.uat_end, prod_release: p.prod_release,
      }));
      const { error: e3 } = await supabase.from("planning_projects").insert(rows);
      if (e3) throw e3;
    },
    onSuccess: () => {
      toast.success("Pianificazione salvata");
      queryClient.invalidateQueries({ queryKey: ["planning", id] });
      queryClient.invalidateQueries({ queryKey: ["plannings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Caricamento...</p>;
  if (q.error || !q.data) return <p className="text-sm text-destructive">Pianificazione non trovata.</p>;

  if (!startDate || !endDate) return <p className="text-sm text-muted-foreground">Caricamento...</p>;
  const supplierName = (q.data.planning as any).suppliers?.name as string | undefined;
  const editable = mode === "edit";
  const gantt = editable ? projectsToGantt(projects) : q.data.projects.map((p: any) => ({ id: p.id, title: p.title, dev_start: p.dev_start, dev_end: p.dev_end, uat_start: p.uat_start, uat_end: p.uat_end, prod_release: p.prod_release }));

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" aria-label="Torna alle pianificazioni" onClick={() => navigate({ to: "/plannings" })}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground truncate">{supplierName ?? ""}</p>
            {editable ? (
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 text-2xl h-auto font-semibold border-0 px-0 focus-visible:ring-0 bg-transparent" />
            ) : (
              <h1 className="mt-1 text-2xl font-semibold tracking-tight truncate">{title}</h1>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editable ? (
            <Button variant="outline" onClick={() => navigate({ to: "/plannings/$id", params: { id }, search: { mode: "edit" } })}>
              <Pencil className="h-4 w-4 mr-2" />Modifica
            </Button>
          ) : (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-2" />{save.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          )}
        </div>
      </div>

      {editable && (
        <Card className="p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data inizio</label>
              <DatePicker value={startDate} onChange={(v) => v && setStartDate(v)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data fine</label>
              <DatePicker value={endDate} onChange={(v) => v && setEndDate(v)} min={startDate} />
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-8">
        {editable && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Progetti</h2>
            <PlanningProjects startDate={startDate} endDate={endDate} projects={projects} onChange={setProjects} />
          </section>
        )}
        <section>
          <h2 className="text-lg font-semibold mb-3">Gantt</h2>
          {gantt.length > 0 ? (
            <GanttChart startDate={startDate} endDate={endDate} projects={gantt} />
          ) : (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nessun progetto da visualizzare.</Card>
          )}
        </section>
      </div>
    </div>
  );
}
