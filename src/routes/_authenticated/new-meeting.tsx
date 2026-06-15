import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/new-meeting")({
  head: () => ({ meta: [{ title: "Nuova minuta — AC SAL Meetings" }] }),
  component: NewMeeting,
});

function NewMeeting() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [supplierId, setSupplierId] = useState("");
  const [title, setTitle] = useState("");
  const [started, setStarted] = useState(false);
  const [content, setContent] = useState("<p></p>");
  const [baseMeetingId, setBaseMeetingId] = useState<string>("none");

  const suppliersQ = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const existingMeetingsQ = useQuery({
    queryKey: ["meetings", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sal_meetings")
        .select("id,title,content,updated_at")
        .eq("supplier_id", supplierId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });


  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non autenticato");
      const { data, error } = await supabase.from("sal_meetings").insert({
        owner_id: u.user.id, supplier_id: supplierId, title: title.trim(), content,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Minuta creata");
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      navigate({ to: "/meetings" });
    },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  const suppliers = suppliersQ.data ?? [];

  if (!started) {
    return (
      <div className="max-w-2xl">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Sezione</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">New SAL Meeting</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seleziona un fornitore e dai un titolo alla minuta.</p>
        </div>
        <Card className="p-6 space-y-5">
          <div className="space-y-2">
            <Label>Fornitore</Label>
            {suppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun fornitore. <Link to="/settings" className="text-primary underline">Aggiungine uno</Link>.</p>
            ) : (
              <Select value={supplierId} onValueChange={(v) => { setSupplierId(v); setBaseMeetingId("none"); }}>
                <SelectTrigger><SelectValue placeholder="Seleziona un fornitore" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          {supplierId && (
            <div className="space-y-2">
              <Label>Parti da una minuta esistente <span className="text-muted-foreground font-normal">(opzionale)</span></Label>
              <Select value={baseMeetingId} onValueChange={setBaseMeetingId} disabled={existingMeetingsQ.isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={existingMeetingsQ.isLoading ? "Caricamento..." : "Nessuna — parti da vuoto"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nessuna — parti da vuoto</SelectItem>
                  {(existingMeetingsQ.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Titolo</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Es. SAL settimanale 24/06" />
          </div>
          <div className="flex justify-end">
            <Button
              disabled={!supplierId || !title.trim()}
              onClick={() => {
                const base = (existingMeetingsQ.data ?? []).find((m) => m.id === baseMeetingId);
                setContent(base?.content || "<p></p>");
                setStarted(true);
              }}
            >Procedi</Button>
          </div>

        </Card>
      </div>
    );
  }

  const supplierName = suppliers.find((s) => s.id === supplierId)?.name;

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
          <Save className="h-4 w-4 mr-2" />{create.isPending ? "Salvataggio..." : "Salva"}
        </Button>
      </div>
      <RichTextEditor value={content} onChange={setContent} />
    </div>
  );
}
