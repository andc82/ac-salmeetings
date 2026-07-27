import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "AC SAL Meetings — Gestione SAL fornitori";
const DESCRIPTION =
  "Portale per la gestione delle minute degli incontri SAL con i fornitori: redazione, archivio, pianificazioni Gantt ed esportazione in PDF.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://ac-salmeetings.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://ac-salmeetings.lovable.app/" }],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/meetings" });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 h-12 w-12 rounded-xl bg-primary/10 ring-1 ring-primary/30 grid place-items-center">
          <span className="font-display text-lg font-semibold text-primary">AC</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          AC SAL Meetings — gestione SAL fornitori
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
          {DESCRIPTION}
        </p>

        <section className="mt-10 grid gap-4 text-left sm:grid-cols-3">
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium">Minute SAL</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Redazione con editor completo e archivio per fornitore.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium">Pianificazioni</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Progetti, fasi Dev e Q&amp;A/UAT visualizzati come Gantt.
            </p>
          </article>
          <article className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-medium">Export PDF</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Esportazione fedele delle minute con hyperlink attivi.
            </p>
          </article>
        </section>

        <Link
          to="/auth"
          className="mt-10 inline-block rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Accedi al portale
        </Link>
      </div>
    </div>
  );
}
