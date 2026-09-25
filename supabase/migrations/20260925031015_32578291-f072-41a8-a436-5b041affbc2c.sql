DROP POLICY IF EXISTS "Painel aberto - clientes" ON public.clients;
REVOKE ALL ON public.clients FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
CREATE POLICY "Usuários conectados gerenciam clientes" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Painel aberto - pagamentos" ON public.payments;
REVOKE ALL ON public.payments FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
CREATE POLICY "Usuários conectados gerenciam pagamentos" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Painel aberto - configuracoes" ON public.settings;
REVOKE ALL ON public.settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
CREATE POLICY "Usuários conectados gerenciam configurações" ON public.settings FOR ALL TO authenticated USING (true) WITH CHECK (true);