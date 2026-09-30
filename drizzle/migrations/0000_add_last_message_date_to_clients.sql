alter table public.clients
  add column if not exists last_message_date date;

comment on column public.clients.last_message_date is
  'Data local da última mensagem de renovação/cobrança enviada ao cliente.';