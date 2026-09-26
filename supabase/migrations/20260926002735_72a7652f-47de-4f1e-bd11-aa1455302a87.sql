CREATE TABLE public.resellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  cost_price NUMERIC(10,2) NOT NULL CHECK (cost_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resellers TO authenticated;
GRANT ALL ON public.resellers TO service_role;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários conectados gerenciam revendedores" ON public.resellers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER update_resellers_updated_at BEFORE UPDATE ON public.resellers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.reseller_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES public.resellers(id) ON DELETE RESTRICT,
  sold_at DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  sale_price NUMERIC(10,2) NOT NULL CHECK (sale_price >= 0),
  cost_price NUMERIC(10,2) NOT NULL CHECK (cost_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reseller_sales TO authenticated;
GRANT ALL ON public.reseller_sales TO service_role;
ALTER TABLE public.reseller_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários conectados gerenciam vendas de créditos" ON public.reseller_sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX reseller_sales_reseller_date_idx ON public.reseller_sales (reseller_id, sold_at DESC);
CREATE TRIGGER update_reseller_sales_updated_at BEFORE UPDATE ON public.reseller_sales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();