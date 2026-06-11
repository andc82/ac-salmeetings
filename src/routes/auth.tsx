import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { resolveUsernameEmail } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Accedi — AC SAL Meetings" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/meetings" });
    });
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { email } = await resolveUsernameEmail({ data: { username: username.trim() } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error("Credenziali non valide"); return; }
      toast.success("Accesso effettuato");
      navigate({ to: "/meetings" });
    } catch {
      toast.error("Credenziali non valide");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary/10 ring-1 ring-primary/30 grid place-items-center">
            <span className="font-display text-lg font-semibold text-primary">AC</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">AC SAL Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestione minute SAL fornitori</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl shadow-black/30">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Accesso..." : "Accedi"}</Button>
        </form>
      </div>
    </div>
  );
}
