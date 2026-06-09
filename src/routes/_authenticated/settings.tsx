import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurazione — AC SAL Meetings" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Sezione</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Configurazione</h1>
      </div>
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profilo</TabsTrigger>
          <TabsTrigger value="suppliers">Fornitori</TabsTrigger>
        </TabsList>
        <TabsContent value="profile"><ProfileTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function ProfileTab() {
  const queryClient = useQueryClient();
  const profileQ = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("noauth");
      const { data, error } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      if (error) throw error;
      return data;
    },
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (profileQ.data) {
      setFirstName(profileQ.data.first_name);
      setLastName(profileQ.data.last_name);
    }
  }, [profileQ.data]);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("noauth");
      const { error } = await supabase.from("profiles").update({ first_name: firstName, last_name: lastName }).eq("id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profilo aggiornato"); queryClient.invalidateQueries({ queryKey: ["profile"] }); },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  const savePassword = useMutation({
    mutationFn: async () => {
      if (password.length < 6) throw new Error("La password deve avere almeno 6 caratteri");
      if (password !== confirm) throw new Error("Le password non coincidono");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password aggiornata"); setPassword(""); setConfirm(""); },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  if (profileQ.isLoading) return <p className="text-sm text-muted-foreground">Caricamento...</p>;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Dati personali</h2>
        <p className="text-sm text-muted-foreground mb-5">L'email (username) non è modificabile.</p>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Email</Label><Input value={profileQ.data?.email ?? ""} disabled /></div>
          <div className="space-y-2"><Label>Nome</Label><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Cognome</Label><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          <Button onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>Salva profilo</Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1">Cambia password</h2>
        <p className="text-sm text-muted-foreground mb-5">Inserisci la nuova password e conferma.</p>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nuova password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-2"><Label>Conferma password</Label><Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <Button onClick={() => savePassword.mutate()} disabled={savePassword.isPending || !password}>Aggiorna password</Button>
        </div>
      </Card>
    </div>
  );
}

function SuppliersTab() {
  const queryClient = useQueryClient();
  const suppliersQ = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("noauth");
      const { error } = await supabase.from("suppliers").insert({ name: newName.trim(), owner_id: u.user.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fornitore aggiunto"); setNewName(""); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  const update = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("suppliers").update({ name: editName.trim() }).eq("id", editingId!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fornitore aggiornato"); setEditingId(null); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // Check meetings
      const { count, error: e1 } = await supabase.from("sal_meetings").select("id", { count: "exact", head: true }).eq("supplier_id", id);
      if (e1) throw e1;
      if ((count ?? 0) > 0) throw new Error("Esistono minute associate a questo fornitore");
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Fornitore eliminato"); queryClient.invalidateQueries({ queryKey: ["suppliers"] }); },
    onError: (e: any) => toast.error(e.message ?? "Errore"),
  });

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-1">Fornitori</h2>
      <p className="text-sm text-muted-foreground mb-5">Gestisci la lista dei fornitori. Un fornitore con minute associate non può essere eliminato.</p>
      <div className="flex gap-2 mb-6">
        <Input placeholder="Ragione sociale" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) create.mutate(); }} />
        <Button disabled={!newName.trim() || create.isPending} onClick={() => create.mutate()}><Plus className="h-4 w-4 mr-2" />Aggiungi</Button>
      </div>
      <div className="border-t border-border">
        {suppliersQ.data?.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nessun fornitore.</p>
        ) : (
          suppliersQ.data?.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-3 border-b border-border last:border-0">
              {editingId === s.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                  <Button size="icon" variant="ghost" aria-label="Conferma modifica" onClick={() => update.mutate()}><Check className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Annulla modifica" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">{s.name}</span>
                  <Button size="icon" variant="ghost" aria-label={`Modifica ${s.name}`} onClick={() => { setEditingId(s.id); setEditName(s.name); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label={`Elimina ${s.name}`} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Eliminare il fornitore?</AlertDialogTitle>
                        <AlertDialogDescription>«{s.name}» verrà eliminato. L'operazione fallirà se ha minute associate.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annulla</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove.mutate(s.id)}>Elimina</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
