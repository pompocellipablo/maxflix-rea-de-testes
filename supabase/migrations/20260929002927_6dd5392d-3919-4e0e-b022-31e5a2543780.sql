CREATE TABLE public.server_credit_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('initial', 'purchase', 'adjustment', 'renewal')),
  quantity integer NOT NULL CHECK (quantity <> 0 OR kind = 'initial'),
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT server_credit_quantity_check CHECK ((kind IN ('initial', 'purchase') AND quantity >= 0) OR kind IN ('adjustment', 'renewal')),
  CONSTRAINT server_credit_renewal_quantity_check CHECK (kind <> 'renewal' OR quantity = -1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.server_credit_movements TO authenticated;
GRANT ALL ON public.server_credit_movements TO service_role;
ALTER TABLE public.server_credit_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Consultar créditos dos servidores" ON public.server_credit_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Registrar compras e ajustes" ON public.server_credit_movements FOR INSERT TO authenticated WITH CHECK (kind IN ('initial', 'purchase', 'adjustment'));
CREATE POLICY "Editar compras e ajustes" ON public.server_credit_movements FOR UPDATE TO authenticated USING (kind IN ('initial', 'purchase', 'adjustment')) WITH CHECK (kind IN ('initial', 'purchase', 'adjustment'));
CREATE POLICY "Excluir compras e ajustes" ON public.server_credit_movements FOR DELETE TO authenticated USING (kind IN ('initial', 'purchase', 'adjustment'));
CREATE UNIQUE INDEX one_initial_balance_per_server ON public.server_credit_movements(server) WHERE kind = 'initial';
CREATE INDEX server_credit_movements_server_date_idx ON public.server_credit_movements(server, occurred_on DESC);
CREATE TRIGGER update_server_credit_movements_updated_at BEFORE UPDATE ON public.server_credit_movements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.renew_client_with_credit(
  p_client_id uuid,
  p_expected_due_date date,
  p_due_date date,
  p_financial_due_date date,
  p_cost numeric,
  p_monthly_paid numeric,
  p_prev_paid numeric,
  p_payment_amount numeric DEFAULT 0,
  p_payment_cost numeric DEFAULT 0
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_client public.clients%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não encontrado'; END IF;
  IF v_client.due_date <> p_expected_due_date THEN RAISE EXCEPTION 'Este cliente já foi renovado. Atualize a página.'; END IF;
  IF p_due_date <= v_client.due_date AND v_client.due_date >= CURRENT_DATE THEN RAISE EXCEPTION 'Novo vencimento inválido'; END IF;
  IF p_due_date <= CURRENT_DATE OR p_financial_due_date < p_due_date THEN RAISE EXCEPTION 'Datas de renovação inválidas'; END IF;
  IF p_cost < 0 OR p_monthly_paid < 0 OR p_prev_paid < 0 OR p_payment_amount < 0 OR p_payment_cost < 0 THEN RAISE EXCEPTION 'Valores inválidos'; END IF;
  UPDATE public.clients SET due_date = p_due_date, financial_due_date = p_financial_due_date,
    cost = p_cost, paid = p_monthly_paid, prev_cost = p_cost, prev_paid = p_prev_paid WHERE id = p_client_id;
  IF p_payment_amount > 0 THEN
    INSERT INTO public.payments (client_id, client_name, server, amount, cost, paid_at)
    VALUES (v_client.id, v_client.name, v_client.server, p_payment_amount, p_payment_cost, CURRENT_DATE);
  END IF;
  INSERT INTO public.server_credit_movements(server, kind, quantity, occurred_on, client_id, note)
  VALUES (v_client.server, 'renewal', -1, CURRENT_DATE, v_client.id, v_client.name);
END;
$$;
REVOKE ALL ON FUNCTION public.renew_client_with_credit(uuid,date,date,date,numeric,numeric,numeric,numeric,numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.renew_client_with_credit(uuid,date,date,date,numeric,numeric,numeric,numeric,numeric) TO authenticated;