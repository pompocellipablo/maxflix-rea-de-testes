export type Client = {
  id: string;
  name: string;
  login: string;
  server: string;
  cost: number;
  paid: number;
  due_date: string;
  financial_due_date: string | null;
  whatsapp: string | null;
  prev_cost: number;
  prev_paid: number;
  created_at?: string;
};

export const SERVERS = [
  "Elite",
  "Now",
  "Five",
  "Uniplay",
  "UniP2P",
  "Fast",
  "All Play",
  "GF",
  "Blade",
  "Club",
] as const;

export const SERVER_COSTS: Record<string, number | null> = {
  Elite: 10,
  Now: 8.5,
  Five: 6.5,
  Uniplay: null,
  UniP2P: null,
  Fast: null,
  "All Play": null,
  GF: null,
  Blade: null,
  Club: null,
};

export const DEFAULT_TEMPLATE =
  "Olá {nome}, tudo bem? Seu acesso vence em {vencimento}. Para continuar assistindo sem interrupção, faça a renovação no valor de R$ {valor}. Qualquer dúvida é só chamar!";

/** Parse a YYYY-MM-DD string as a local date at midnight (no timezone drift). */
export function parseDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function today(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Whole-day difference, ignoring any time component. */
export function daysUntil(dateStr: string, base = today()): number {
  const target = parseDate(dateStr);
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function monthsRemaining(dateStr: string, base = today()): number {
  const target = parseDate(dateStr);
  let months =
    (target.getFullYear() - base.getFullYear()) * 12 + (target.getMonth() - base.getMonth());
  if (target.getDate() < base.getDate()) months -= 1;
  return Math.max(months, 0);
}

export type StatusKey = "vencido" | "hoje" | "breve" | "ativo";

export type Status = {
  key: StatusKey;
  label: string;
  /** days until due date (negative when overdue) */
  days: number;
};

export function getStatus(client: Client, base = today()): Status {
  const days = daysUntil(client.due_date, base);
  if (days < 0) return { key: "vencido", label: "Vencido", days };
  if (days === 0) return { key: "hoje", label: "Vence hoje", days };
  if (days <= 5)
    return { key: "breve", label: days === 1 ? "Vence em 1 dia" : `Vence em ${days} dias`, days };

  if (client.financial_due_date && daysUntil(client.financial_due_date, base) > 0) {
    const months = monthsRemaining(client.financial_due_date, base);
    if (months > 0) {
      return {
        key: "ativo",
        label: `Ativo — ${months} ${months === 1 ? "mês restante" : "meses restantes"}`,
        days,
      };
    }
  }
  return { key: "ativo", label: "Ativo", days };
}

export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return parseDate(value).toLocaleDateString("pt-BR");
}

/** Next monthly cycle from the current due date, rolled forward past today. */
export function nextDueDate(dueDate: string, base = today()): string {
  let next = addMonths(parseDate(dueDate), 1);
  let guard = 0;
  while (next.getTime() < base.getTime() && guard < 120) {
    next = addMonths(next, 1);
    guard += 1;
  }
  return toISODate(next);
}

export function whatsappLink(client: Client, template: string): string {
  const digits = (client.whatsapp ?? "").replace(/\D/g, "");
  const message = template
    .replaceAll("{nome}", client.name)
    .replaceAll("{login}", client.login)
    .replaceAll("{vencimento}", formatDate(client.due_date))
    .replaceAll("{servidor}", client.server)
    .replaceAll("{valor}", (client.paid || client.prev_paid || 0).toFixed(2).replace(".", ","));
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function toCSV(clients: Client[]): string {
  const header = [
    "Nome",
    "Login",
    "Servidor",
    "Vencimento",
    "Vencimento financeiro",
    "Custo",
    "Valor pago",
    "Lucro",
    "WhatsApp",
    "Status",
  ];
  const rows = clients.map((c) => [
    c.name,
    c.login,
    c.server,
    formatDate(c.due_date),
    formatDate(c.financial_due_date),
    c.cost.toFixed(2).replace(".", ","),
    c.paid.toFixed(2).replace(".", ","),
    (c.paid - c.cost).toFixed(2).replace(".", ","),
    c.whatsapp ?? "",
    getStatus(c).label,
  ]);
  return [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
}
