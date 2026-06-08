import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/meetings")({
  head: () => ({ meta: [{ title: "SAL Meetings — AC SAL Meetings" }] }),
  component: () => <Outlet />,
});
