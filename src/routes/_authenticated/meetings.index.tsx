import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Pencil, Trash2, FileText, Plus } from "lucide-react";
import { downloadMinutePdf } from "@/lib/pdf";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/meetings/")({
  head: () => ({ meta: [{ title: "SAL Meetings — AC SAL Meetings" }] }),
  component: MeetingsPage,
});

function MeetingsPage() {
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

  const meetingsQ = useQuery({
    queryKey: ["meetings", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase.from("sal_meetings").select("*").eq("supplier_id", supplierId).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sal_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Minuta eliminata"); queryClient.invalidateQueries({ queryKey: ["meetings"] }); },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  const suppliers = suppliersQ.data ?? [];
  const supplier = suppliers.find((s) => s.id === supplierId);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Sezione</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">SAL Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seleziona un fornitore per visualizzare le minute.</p>
        </div>
        <Button onClick={() => navigate({ to: "/new-meeting" })}><Plus className="h-4 w-4 mr-2" />Nuova minuta</Button>
      </div>

      <Card className="p-5 mb-6">
        <label className="text-sm font-medium mb-2 block">Fornitore</label>
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-full md:w-96"><SelectValue placeholder={suppliers.length ? "Seleziona un fornitore" : "Nessun fornitore — aggiungili in Configurazione"} /></SelectTrigger>
          <SelectContent>
            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {!supplierId ? (
        <EmptyState icon={FileText} title="Nessun fornitore selezionato" desc="Seleziona un fornitore qui sopra per visualizzare le sue minute." />
      ) : meetingsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Caricamento...</p>
      ) : (meetingsQ.data?.length ?? 0) === 0 ? (
        <EmptyState icon={FileText} title="Nessuna minuta" desc={`Nessuna minuta per ${supplier?.name}. Creane una nuova.`} action={<Button onClick={() => navigate({ to: "/new-meeting" })}><Plus className="h-4 w-4 mr-2" />Nuova minuta</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Titolo</th>
                  <th className="text-left px-5 py-3 font-medium">Creata</th>
                  <th className="text-left px-5 py-3 font-medium">Modificata</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {meetingsQ.data!.map((m) => (
                  <tr key={m.id} className="border-t border-border hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-3 font-medium">
                      <Link to="/meetings/$id" params={{ id: m.id }} search={{ mode: "view" }} className="hover:text-primary">{m.title}</Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(m.created_at)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{fmtDate(m.updated_at)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label={`Visualizza ${m.title}`} title="Visualizza" onClick={() => navigate({ to: "/meetings/$id", params: { id: m.id }, search: { mode: "view" } })}>
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Modifica ${m.title}`} title="Modifica" onClick={() => navigate({ to: "/meetings/$id", params: { id: m.id }, search: { mode: "edit" } })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={`Scarica PDF ${m.title}`} title="Scarica PDF" onClick={() => downloadMinutePdf({ title: m.title, html: m.content, supplier: supplier?.name, createdAt: fmtDate(m.created_at) })}>
                          <Download className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Elimina ${m.title}`} title="Elimina" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Eliminare la minuta?</AlertDialogTitle>
                              <AlertDialogDescription>«{m.title}» verrà eliminata definitivamente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annulla</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteM.mutate(m.id)}>Elimina</AlertDialogAction>
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
  const d = new Date(s);
  return d.toLocaleString("it-IT", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
