## Nuove sezioni: Pianificazioni e New Pianificazione

### Database (migration)

Due nuove tabelle:

**`plannings`** — pianificazione principale
- `supplier_id` (FK), `owner_id`, `title`, `start_date`, `end_date`, timestamps

**`planning_projects`** — progetti dentro una pianificazione
- `planning_id` (FK cascade), `title`, `sort_order`
- `dev_start`, `dev_end` (obbligatori)
- `uat_start`, `uat_end`, `prod_release` (opzionali)

RLS: `owner_id = auth.uid()` su `plannings`; `planning_projects` gated tramite EXISTS su parent. GRANT a `authenticated` + `service_role`. Trigger `updated_at` su `plannings`.

### Routing

Due nuovi file:
- `src/routes/_authenticated/new-planning.tsx` — wizard: seleziona fornitore + titolo + date, poi form dinamico per progetti (aggiungi/rimuovi), tutti i datepicker con shadcn `Calendar` in `Popover`. Bottone "Salva" inserisce planning + projects in transazione lato client (insert plannings, poi bulk insert projects con planning_id).
- `src/routes/_authenticated/plannings.tsx` — layout con `<Outlet />`.
- `src/routes/_authenticated/plannings.index.tsx` — selezione fornitore + griglia (titolo, date inizio/fine, created_at, updated_at, azioni: view/edit/delete).
- `src/routes/_authenticated/plannings.$id.tsx` — modalità view (Gantt readonly) o edit (form completo riutilizzabile + Gantt live preview).

### Menu

Aggiornare `src/routes/_authenticated/route.tsx`: aggiungere due voci `Pianificazioni` (icona `CalendarRange`) e `New Pianificazione` (icona `CalendarPlus`).

### Gantt

Componente custom `src/components/GanttChart.tsx` — nessuna libreria esterna, SVG/div puri:
- Asse temporale orizzontale calcolato da `planning.start_date`/`end_date`.
- Una riga per progetto, con barre colorate per fase: Dev (blu), UAT (giallo), Prod release (marker verde puntuale).
- Header con settimane/mesi a seconda della durata.
- Stile dark coerente col tema.

### Form condiviso

`src/components/PlanningForm.tsx` riutilizzato da new-planning e edit:
- Zod validation (titolo non vuoto, end>=start, dev_end>=dev_start, uat_end>=uat_start, date progetto dentro range planning).
- Datepicker shadcn con `pointer-events-auto`.
- Lista progetti con aggiungi/rimuovi/riordina.

### Delete

Cascata a livello DB su `planning_projects`.

Procedo con la migration come primo step.
