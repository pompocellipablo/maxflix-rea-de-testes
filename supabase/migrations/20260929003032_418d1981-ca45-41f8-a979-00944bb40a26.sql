CREATE TABLE public.server_credit_alerts (
  server text PRIMARY KEY,
  minimum_balance integer NOT NULL DEFAULT 0 CHECK (minimum_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_credit_alerts TO authenticated;
GRANT ALL ON public.server_credit_alerts TO service_role;
ALTER TABLE public.server_credit_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários conectados gerenciam alertas" ON public.server_credit_alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_server_credit_alerts_updated_at BEFORE UPDATE ON public.server_credit_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();