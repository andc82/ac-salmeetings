import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/RichTextEditor";
import { ArrowLeft, Download, Save, Pencil } from "lucide-react";
import { downloadMinutePdf } from "@/lib/pdf";
import { toast } from "sonner";
import DOMPurify from "dompurify";

const search = z.object({ mode: z.enum(["view", "edit"]).optional().default("view") });

export const Route = createFileRoute("/_authenticated/meetings/$id")({
  validateSearch: search,
  head: () => ({ meta: [{ title: "Minuta — AC SAL Meetings" }] }),
  component: MeetingDetail,
});

function MeetingDetail() {
  const { id } = Route.useParams();
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const q = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sal_meetings").select("*, suppliers(name)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  useEffect(() => { if (q.data) { setTitle(q.data.title); setContent(q.data.content); } }, [q.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sal_meetings").update({ title, content }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Minuta salvata");
      queryClient.invalidateQueries({ queryKey: ["meeting", id] });
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Caricamento...</p>;
  if (q.error || !q.data) return <p className="text-sm text-destructive">Minuta non trovata.</p>;

  const supplierName = (q.data as any).suppliers?.name as string | undefined;
  const editable = mode === "edit";

  return (
    <div>
      <div className="sticky top-16 z-30 mb-6 flex items-center justify-between gap-4 flex-wrap bg-background/95 backdrop-blur py-2 -mx-6 px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" aria-label="Torna alle minute" onClick={() => navigate({ to: "/meetings" })}><ArrowLeft className="h-4 w-4" /></Button>
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
          {!editable && (
            <Button variant="outline" onClick={() => navigate({ to: "/meetings/$id", params: { id }, search: { mode: "edit" } })}>
              <Pencil className="h-4 w-4 mr-2" />Modifica
            </Button>
          )}
          <Button variant="outline" onClick={() => downloadMinutePdf({ title, html: content, supplier: supplierName, createdAt: new Date(q.data.created_at).toLocaleString("it-IT") })}>
            <Download className="h-4 w-4 mr-2" />PDF
          </Button>
          {editable && (
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              <Save className="h-4 w-4 mr-2" />{save.isPending ? "Salvataggio..." : "Salva"}
            </Button>
          )}
        </div>
      </div>

      {editable ? (
        <RichTextEditor value={content} onChange={setContent} toolbarTopClass="top-32" />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="tiptap-editor"><div className="ProseMirror" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content || "<p><em>Vuota</em></p>") }} /></div>
        </div>
      )}
    </div>
  );
}
