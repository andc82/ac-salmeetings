import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarRange, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plannings/")({
  head: () => ({
    meta: [
      { title: "Pianificazioni — AC SAL Meetings" },
      { name: "description", content: "Elenco delle pianificazioni per fornitore: consulta, modifica ed elimina i piani con visualizzazione a diagramma di Gantt." },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Pianificazioni — AC SAL Meetings" },
      { property: "og:description", content: "Elenco delle pianificazioni per fornitore con visualizzazione Gantt." },
      { property: "og:url", content: "https://ac-salmeetings.lovable.app/plannings" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://ac-salmeetings.lovable.app/plannings" }],
  }),
  component: PlanningsPage,
});

function PlanningsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState<string>("");

  const suppliersQ = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const planningsQ = useQuery({
    queryKey: ["plannings", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase.from("plannings").select("*").eq("supplier_id", supplierId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plannings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Pianificazione eliminata"); queryClient.invalidateQueries({ queryKey: ["plannings"] }); },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  const suppliers = suppliersQ.data ?? [];
  const supplier = suppliers.find((s) => s.id === supplierId);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Sezione</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pianificazioni</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seleziona un fornitore per visualizzare le pianificazioni.</p>
        </div>
        <Button onClick={() => navigate({ to: "/new-planning" })}><Plus className="h-4 w-4 mr-2" />Nuova pianificazione</Button>
      </div>

      <Card className="p-5 mb-6">
        <h2 className="sr-only">Filtro per fornitore</h2>
        <label className="text-sm font-medium mb-2 block">Fornitore</label>
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-full md:w-96"><SelectValue placeholder={suppliers.length ? "Seleziona un fornitore" : "Nessun fornitore — aggiungili in Configurazione"} /></SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {!supplierId ? (
        <EmptyState icon={CalendarRange} title="Nessun fornitore selezionato" desc="Seleziona un fornitore qui sopra per visualizzare le sue pianificazioni." />
      ) : planningsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : (planningsQ.data?.length ?? 0) === 0 ? (
        <EmptyState icon={CalendarRange} title="Nessuna pianificazione" desc={`Nessuna pianificazione per ${supplier?.name}.`} action={<Button onClick={() => navigate({ to: "/new-planning" })}><Plus className="h-4 w-4 mr-2" />Nuova pianificazione</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <h2 className="sr-only">Elenco pianificazioni</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Titolo</th>
                  <th className="text-left px-5 py-3 font-medium">Periodo</th>
                  <th className="text-left px-5 py-3 font-medium">Creata</th>
                  <th className="text-left px-5 py-3 font-medium">Modificata</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {planningsQ.data!.map((p) => (
                  <tr key={p.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      <Link to="/plannings/$id" params={{ id: p.id }} search={{ mode: "view" }} className="hover:text-primary">{p.title}</Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDay(p.start_date)} → {fmtDay(p.end_date)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(p.created_at)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(p.updated_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Visualizza ${p.title}`} title="Visualizza" onClick={() => navigate({ to: "/plannings/$id", params: { id: p.id }, search: { mode: "view" } })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Modifica ${p.title}`} title="Modifica" onClick={() => navigate({ to: "/plannings/$id", params: { id: p.id }, search: { mode: "edit" } })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Elimina ${p.title}`} title="Elimina" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare la pianificazione?</AlertDialogTitle>
                              <AlertDialogDescription>«{p.title}» e tutti i suoi progetti verranno eliminati definitivamente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del.mutate(p.id)}>Elimina</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }: any) {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-4">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}

function fmtDate(s: string) {
  return new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDay(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}
