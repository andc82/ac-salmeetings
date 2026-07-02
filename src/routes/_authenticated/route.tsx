import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileText, Settings, Plus, LogOut, CalendarRange, CalendarPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/meetings", label: "SAL Meetings", icon: FileText },
    { to: "/new-meeting", label: "New SAL Meeting", icon: Plus },
    { to: "/plannings", label: "Pianificazioni", icon: CalendarRange },
    { to: "/new-planning", label: "New Pianificazione", icon: CalendarPlus },
    { to: "/settings", label: "Configurazione", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/meetings" className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 ring-1 ring-primary/30 grid place-items-center">
              <span className="font-display text-sm font-semibold text-primary">AC</span>
            </div>
            <span className="font-display text-sm font-semibold tracking-tight">SAL Meetings</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-4 w-4 mr-2" />
            Esci
          </Button>
        </div>
        <nav className="md:hidden flex items-center gap-1 px-6 pb-3 overflow-x-auto">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs whitespace-nowrap ${active ? "bg-accent" : "text-muted-foreground"}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
