CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  login TEXT NOT NULL,
  server TEXT NOT NULL,
  cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  financial_due_date DATE,
  whatsapp TEXT,
  prev_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  prev_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO anon, authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Painel aberto - clientes" ON public.clients FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.settings (
  id TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
  whatsapp_template TEXT NOT NULL DEFAULT 'Olá {nome}, tudo bem? Seu acesso vence em {vencimento}. Para continuar assistindo sem interrupção, faça a renovação no valor de R$ {valor}. Qualquer dúvida é só chamar!',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Painel aberto - configuracoes" ON public.settings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

INSERT INTO public.settings (id) VALUES ('default');

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();