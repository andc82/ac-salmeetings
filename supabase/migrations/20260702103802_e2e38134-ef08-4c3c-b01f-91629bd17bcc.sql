
CREATE TABLE public.plannings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plannings TO authenticated;
GRANT ALL ON public.plannings TO service_role;
ALTER TABLE public.plannings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all plannings" ON public.plannings FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_plannings_updated_at BEFORE UPDATE ON public.plannings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.planning_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id uuid NOT NULL REFERENCES public.plannings(id) ON DELETE CASCADE,
  title text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  dev_start date NOT NULL,
  dev_end date NOT NULL,
  uat_start date,
  uat_end date,
  prod_release date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planning_projects TO authenticated;
GRANT ALL ON public.planning_projects TO service_role;
ALTER TABLE public.planning_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner all planning_projects" ON public.planning_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.plannings p WHERE p.id = planning_id AND p.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.plannings p WHERE p.id = planning_id AND p.owner_id = auth.uid()));

CREATE INDEX idx_plannings_supplier ON public.plannings(supplier_id);
CREATE INDEX idx_planning_projects_planning ON public.planning_projects(planning_id);
