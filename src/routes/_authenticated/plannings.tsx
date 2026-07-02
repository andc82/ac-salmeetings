import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/plannings")({
  head: () => ({ meta: [{ title: "Pianificazioni — AC SAL Meetings" }] }),
  component: () => <Outlet />,
});
