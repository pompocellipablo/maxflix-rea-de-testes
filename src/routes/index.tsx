import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ClientForm, type ClientDraft } from "@/components/ClientForm";
import { StatusBadge } from "@/components/StatusBadge";
import {
  DEFAULT_TEMPLATE,
  formatBRL,
  formatDate,
  getStatus,
  nextDueDate,
  toCSV,
  whatsappLink,
  type Client,
} from "@/lib/iptv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MaxFlix — Gestão de clientes IPTV" },

      {
        name: "description",
        content:
          "Painel para gerenciar clientes IPTV: vencimentos, renovações, lucro e mensagens de cobrança no WhatsApp.",
      },
      { property: "og:title", content: "MaxFlix — Gestão de clientes IPTV" },
      {
        property: "og:description",
        content:
          "Controle vencimentos, status automáticos, lucro e renovações dos seus clientes IPTV em um só painel.",
      },
    ],
  }),
  component: Painel,
});

type Tab = "todos" | "vencidos" | "hoje" | "breve";

const num = (value: string) => Number(String(value).replace(",", ".")) || 0;

function Painel() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("todos");
  const [range, setRange] = useState(5);
  const [search, setSearch] = useState("");
  const [asc, setAsc] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const clientsQuery = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((c) => ({
        ...c,
        cost: Number(c.cost),
        paid: Number(c.paid),
        prev_cost: Number(c.prev_cost),
        prev_paid: Number(c.prev_paid),
      })) as Client[];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("whatsapp_template")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data?.whatsapp_template ?? DEFAULT_TEMPLATE;
    },
  });

  const template = settingsQuery.data ?? DEFAULT_TEMPLATE;
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["clients"] });

  const saveMutation = useMutation({
    mutationFn: async ({ draft, id }: { draft: ClientDraft; id: string | null }) => {
      const cost = num(draft.cost);
      const paid = num(draft.paid);
      const payload = {
        name: draft.name.trim(),
        login: draft.login.trim(),
        server: draft.server,
        cost,
        paid,
        due_date: draft.due_date,
        financial_due_date: draft.financial_due_date || null,
        whatsapp: draft.whatsapp.trim() || null,
        prev_cost: cost,
        prev_paid: paid,
      };
      if (id) {
        const { error } = await supabase.from("clients").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clients").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      invalidate();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: { due_date?: string; cost?: number; paid?: number };
    }) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });


  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  // Zera custo e valor pago de clientes vencidos, guardando os valores no histórico.
  useEffect(() => {
    const pending = clients.filter(
      (c) => getStatus(c).key === "vencido" && (c.cost > 0 || c.paid > 0),
    );
    if (pending.length === 0) return;
    void (async () => {
      for (const c of pending) {
        await supabase
          .from("clients")
          .update({
            prev_cost: c.cost > 0 ? c.cost : c.prev_cost,
            prev_paid: c.paid > 0 ? c.paid : c.prev_paid,
            cost: 0,
            paid: 0,
          })
          .eq("id", c.id);
      }
      invalidate();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const renew = (client: Client) => {
    const newDue = nextDueDate(client.due_date);
    const status = getStatus(client);
    const restore = status.key === "vencido" && client.cost === 0 && client.paid === 0;
    updateMutation.mutate({
      id: client.id,
      patch: {
        due_date: newDue,
        ...(restore ? { cost: client.prev_cost, paid: client.prev_paid } : {}),
      },
    });
    if (client.financial_due_date && client.financial_due_date >= newDue) {
      setNotice(
        `Renovação sem custo — pacote pago até ${formatDate(client.financial_due_date)} (${client.name})`,
      );
    } else {
      setNotice(`${client.name}: novo vencimento em ${formatDate(newDue)}`);
    }
  };

  const summary = useMemo(() => {
    let ativos = 0;
    let vencidos = 0;
    let hoje = 0;
    let proximos = 0;
    let lucro = 0;
    for (const c of clients) {
      const s = getStatus(c);
      if (s.key === "vencido") vencidos += 1;
      else {
        lucro += c.paid - c.cost;
        if (s.key === "hoje") hoje += 1;
        else if (s.key === "breve") proximos += 1;
        else ativos += 1;
      }
    }
    return { total: clients.length, ativos, vencidos, hoje, proximos, lucro };
  }, [clients]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients
      .filter((c) => {
        const s = getStatus(c);
        if (tab === "vencidos" && s.key !== "vencido") return false;
        if (tab === "hoje" && s.key !== "hoje") return false;
        if (tab === "breve" && s.days !== range) return false;
        if (term && !`${c.name} ${c.login}`.toLowerCase().includes(term)) return false;
        return true;
      })
      .sort((a, b) =>
        asc ? a.due_date.localeCompare(b.due_date) : b.due_date.localeCompare(a.due_date),
      );
  }, [clients, tab, range, search, asc]);

  const exportCSV = () => {
    const blob = new Blob([`\uFEFF${toCSV(filtered)}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "vencidos", label: "Vencidos" },
    { key: "hoje", label: "Vence hoje" },
    { key: "breve", label: "Vencendo em breve" },
  ];

  const tabBtn = (active: boolean) =>
    `font-display text-sm font-medium px-3 py-1.5 rounded-lg ${
      active ? "bg-cyan/15 text-cyan ring-1 ring-cyan/30" : "text-mist hover:bg-frost/5"
    }`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-frost">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-[560px] w-[560px] rounded-[60%] bg-cyan/10 blur-3xl" />
        <div className="absolute bottom-0 -left-32 h-[420px] w-[420px] rounded-[60%] bg-cyan/5 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-cyan/15 ring-1 ring-cyan/30">
              <span className="font-display text-sm font-semibold text-cyan">N</span>
            </div>
            <div className="min-w-0 leading-none">
              <p className="font-display truncate text-base font-semibold">
                Max<span className="text-cyan">Flix</span>
              </p>
              <p className="mt-1 text-[11px] tracking-wide text-mist">Gestão de clientes IPTV</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <div className="hidden w-64 items-center gap-2 rounded-xl bg-panel px-3 py-2 ring-1 ring-line sm:flex">
              <span className="text-sm text-mist">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-frost outline-none placeholder:text-mist/60"
                placeholder="Buscar por nome ou login"
              />
            </div>
            <button
              onClick={() => setSettingsOpen(true)}
              className="font-display rounded-xl bg-panel px-3 py-2 text-sm font-medium text-mist ring-1 ring-line hover:bg-frost/5"
            >
              Mensagem
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="font-display rounded-xl bg-panel px-3 py-2 text-sm font-medium text-mist ring-1 ring-line hover:bg-frost/5"
            >
              Importar
            </button>
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="font-display rounded-xl bg-cyan py-2 pr-3 pl-2 text-sm font-semibold text-background ring-1 ring-cyan/40 transition-transform hover:-translate-y-px"
            >
              <span className="inline-flex items-center gap-1.5">
                <span className="text-base leading-none">+</span> Novo cliente
              </span>
            </button>
          </div>
        </header>

        <div className="mt-4 sm:hidden">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-panel px-3 py-2.5 text-sm text-frost ring-1 ring-line outline-none placeholder:text-mist/60"
            placeholder="Buscar por nome ou login"
          />
        </div>

        <section className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 lg:grid-cols-6">
          <MetricCard label="Clientes" value={String(summary.total)} hint="total cadastrado" />
          <MetricCard
            label="Ativos"
            value={String(summary.ativos)}
            hint="acesso vigente"
            valueClass="text-ok"
          />
          <MetricCard
            label="Vencidos"
            value={String(summary.vencidos)}
            hint="exigem ação"
            valueClass="text-danger"
            cardClass="bg-danger/10 ring-danger/40"
            labelClass="text-danger/80"
            hintClass="text-danger/70"
          />
          <MetricCard
            label="Vence hoje"
            value={String(summary.hoje)}
            hint="renovar agora"
            valueClass="text-today"
            cardClass="bg-today/10 ring-today/40"
            labelClass="text-today/90"
            hintClass="text-today/70"
          />
          <MetricCard
            label="Próx. 5 dias"
            value={String(summary.proximos)}
            hint="janela de cobrança"
            valueClass="text-warn"
          />
          <MetricCard
            label="Lucro total"
            value={formatBRL(summary.lucro)}
            hint="clientes não vencidos"
            valueClass="text-cyan text-2xl"
            cardClass="bg-cyan/10 ring-cyan/40"
            labelClass="text-cyan/80"
            hintClass="text-cyan/70"
          />
        </section>

        <section className="mt-6 flex flex-wrap items-center gap-2 sm:mt-8">
          <nav className="flex flex-wrap items-center gap-1 rounded-xl bg-panel p-1 ring-1 ring-line">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={tabBtn(tab === t.key)}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2 sm:ml-auto">
            {tab === "breve" && (
              <>
                <span className="hidden text-xs text-mist sm:inline">Vence em</span>
                <div className="flex items-center gap-1 rounded-xl bg-panel p-1 ring-1 ring-line">
                  {[2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      onClick={() => setRange(d)}
                      className={`font-display rounded-lg px-2.5 py-1 text-sm font-medium ${
                        range === d
                          ? "bg-cyan/15 text-cyan ring-1 ring-cyan/30"
                          : "text-mist hover:bg-frost/5"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button
              onClick={() => setAsc((v) => !v)}
              className="font-display rounded-xl bg-panel px-3 py-2 text-sm font-medium text-mist ring-1 ring-line hover:bg-frost/5"
            >
              Vencimento {asc ? "↑" : "↓"}
            </button>
            <button
              onClick={exportCSV}
              className="font-display rounded-xl bg-panel px-3 py-2 text-sm font-medium text-mist ring-1 ring-line hover:bg-frost/5"
            >
              Exportar CSV
            </button>
          </div>
        </section>

        {notice && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-cyan/10 px-3 py-2 text-sm text-cyan ring-1 ring-cyan/30">
            <span>{notice}</span>
            <button onClick={() => setNotice(null)} className="text-xs text-cyan/70">
              fechar
            </button>
          </div>
        )}

        {clientsQuery.isLoading ? (
          <p className="mt-6 text-sm text-mist">Carregando clientes…</p>
        ) : filtered.length === 0 ? (
          <p className="mt-6 rounded-xl bg-panel/60 px-4 py-6 text-center text-sm text-mist ring-1 ring-line">
            Nenhum cliente nesta visualização.
          </p>
        ) : (
          <>
            <section className="mt-4 hidden overflow-hidden rounded-2xl bg-panel/60 ring-1 ring-line backdrop-blur-sm md:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] tracking-wide text-mist uppercase">
                      <th className="px-4 py-3 font-medium">Cliente</th>
                      <th className="px-4 py-3 font-medium">Servidor</th>
                      <th className="px-4 py-3 font-medium">Vencimento</th>
                      <th className="px-4 py-3 font-medium">Financeiro</th>
                      <th className="px-4 py-3 font-medium text-right">Custo</th>
                      <th className="px-4 py-3 font-medium text-right">Pago</th>
                      <th className="px-4 py-3 font-medium text-right">Lucro</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c) => {
                      const status = getStatus(c);
                      return (
                        <tr
                          key={c.id}
                          className="border-b border-line/60 transition-colors hover:bg-frost/5"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-mist">
                              {c.login}
                              {c.whatsapp ? ` · ${c.whatsapp}` : ""}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-mist">{c.server}</td>
                          <td className="px-4 py-3 text-mist">{formatDate(c.due_date)}</td>
                          <td className="px-4 py-3 text-mist">
                            {formatDate(c.financial_due_date)}
                          </td>
                          <td className="px-4 py-3 text-right text-mist">{formatBRL(c.cost)}</td>
                          <td className="px-4 py-3 text-right text-mist">{formatBRL(c.paid)}</td>
                          <td
                            className={`px-4 py-3 text-right font-medium ${
                              c.paid - c.cost > 0 ? "text-ok" : "text-danger"
                            }`}
                          >
                            {formatBRL(c.paid - c.cost)}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <RowActions
                              client={c}
                              template={template}
                              onRenew={() => renew(c)}
                              onEdit={() => {
                                setEditing(c);
                                setFormOpen(true);
                              }}
                              onDelete={() => deleteMutation.mutate(c.id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-4 space-y-3 md:hidden">
              {filtered.map((c) => {
                const status = getStatus(c);
                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl p-4 ring-1 ${
                      status.key === "vencido"
                        ? "bg-danger/10 ring-danger/40"
                        : "bg-panel/70 ring-line"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display truncate text-base font-semibold">{c.name}</p>
                        <p className="truncate text-xs text-mist">
                          {c.login} · {c.server}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-mist">Vence</p>
                        <p className="mt-0.5">{formatDate(c.due_date)}</p>
                      </div>
                      <div>
                        <p className="text-mist">Pago</p>
                        <p className="mt-0.5">{formatBRL(c.paid)}</p>
                      </div>
                      <div>
                        <p className="text-mist">Lucro</p>
                        <p
                          className={`mt-0.5 font-medium ${
                            c.paid - c.cost > 0 ? "text-ok" : "text-danger"
                          }`}
                        >
                          {formatBRL(c.paid - c.cost)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => renew(c)}
                        className="font-display flex-1 rounded-xl bg-cyan/15 py-2 text-sm font-medium text-cyan ring-1 ring-cyan/30"
                      >
                        Renovar
                      </button>
                      <a
                        href={whatsappLink(c, template)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-display flex-1 rounded-xl bg-panel2 py-2 text-center text-sm font-medium text-mist ring-1 ring-line"
                      >
                        Enviar renovação
                      </a>
                      <button
                        onClick={() => {
                          setEditing(c);
                          setFormOpen(true);
                        }}
                        className="font-display rounded-xl bg-panel2 px-3 py-2 text-sm font-medium text-mist ring-1 ring-line"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(c.id)}
                        className="font-display rounded-xl bg-panel2 px-3 py-2 text-sm font-medium text-danger ring-1 ring-line"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>

      {formOpen && (
        <ClientForm
          client={editing}
          saving={saveMutation.isPending}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={(draft) => saveMutation.mutate({ draft, id: editing?.id ?? null })}
        />
      )}

      {settingsOpen && (
        <TemplateDialog
          value={template}
          onClose={() => setSettingsOpen(false)}
          onSave={async (value) => {
            await supabase.from("settings").update({ whatsapp_template: value }).eq("id", "default");
            qc.invalidateQueries({ queryKey: ["settings"] });
            setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  valueClass = "text-frost",
  cardClass = "bg-panel ring-line",
  labelClass = "text-mist",
  hintClass = "text-mist",
}: {
  label: string;
  value: string;
  hint: string;
  valueClass?: string;
  cardClass?: string;
  labelClass?: string;
  hintClass?: string;
}) {
  return (
    <div className={`rounded-xl p-4 ring-1 ${cardClass}`}>
      <p className={`text-[11px] tracking-wide uppercase ${labelClass}`}>{label}</p>
      <p className={`font-display mt-2 text-3xl leading-none font-semibold ${valueClass}`}>
        {value}
      </p>
      <p className={`mt-2 text-xs ${hintClass}`}>{hint}</p>
    </div>
  );
}

function RowActions({
  client,
  template,
  onRenew,
  onEdit,
  onDelete,
}: {
  client: Client;
  template: string;
  onRenew: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      <button onClick={onRenew} className="font-display text-xs font-medium text-cyan hover:text-frost">
        Renovar
      </button>
      <a
        href={whatsappLink(client, template)}
        target="_blank"
        rel="noreferrer"
        className="font-display text-xs font-medium text-ok hover:text-frost"
      >
        Enviar renovação
      </a>
      <button onClick={onEdit} className="font-display text-xs font-medium text-mist hover:text-frost">
        Editar
      </button>
      <button onClick={onDelete} className="font-display text-xs font-medium text-danger hover:text-frost">
        Excluir
      </button>
    </div>
  );
}

function TemplateDialog({
  value,
  onClose,
  onSave,
}: {
  value: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
      <section className="mx-auto mt-10 max-w-xl rounded-2xl bg-panel2/90 p-6 ring-1 ring-line">
        <h2 className="font-display text-xl font-semibold">Mensagem de renovação</h2>
        <p className="mt-1 text-sm text-mist">
          Use {"{nome}"}, {"{login}"}, {"{servidor}"}, {"{vencimento}"} e {"{valor}"} para preencher
          automaticamente.
        </p>
        <textarea
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="mt-4 w-full rounded-xl bg-panel px-3 py-2.5 text-sm text-frost ring-1 ring-line outline-none focus:ring-cyan/50"
        />
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onSave(text)}
            className="font-display rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-background ring-1 ring-cyan/40"
          >
            Salvar mensagem
          </button>
          <button
            onClick={onClose}
            className="font-display rounded-xl bg-panel px-4 py-2.5 text-sm font-medium text-mist ring-1 ring-line"
          >
            Cancelar
          </button>
        </div>
      </section>
    </div>
  );
}
