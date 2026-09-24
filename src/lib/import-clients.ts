import { SERVERS, SERVER_COSTS, toISODate } from "./iptv";

export type ImportRow = {
  line: number;
  name: string;
  login: string;
  server: string;
  cost: number;
  paid: number;
  due_date: string;
  financial_due_date: string | null;
  whatsapp: string | null;
};

export type ImportError = { line: number; message: string };

export const TEMPLATE_CSV = [
  "Nome;Login;Servidor;Vencimento;Vencimento financeiro;Custo;Valor pago;WhatsApp",
  "João da Silva;joao123;Elite;15/10/2026;15/01/2027;10,00;35,00;5511999998888",
  "Maria Souza;maria_tv;Five;02/11/2026;;6,50;30,00;5521988887777",
].join("\n");

function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function detectSeparator(header: string): string {
  const semi = (header.match(/;/g) ?? []).length;
  const comma = (header.match(/,/g) ?? []).length;
  const tab = (header.match(/\t/g) ?? []).length;
  if (tab > semi && tab > comma) return "\t";
  return comma > semi ? "," : ";";
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const FIELD_ALIASES: Record<string, string[]> = {
  name: ["nome", "cliente", "nome do cliente"],
  login: ["login", "usuario", "usuário", "user"],
  server: ["servidor", "server", "painel"],
  due_date: ["vencimento", "data de vencimento", "vence em", "validade"],
  financial_due_date: [
    "vencimento financeiro",
    "financeiro",
    "vencimento financeiro (opcional)",
    "pago ate",
    "pago até",
  ],
  cost: ["custo", "custo do credito", "custo do crédito", "credito", "crédito"],
  paid: ["valor pago", "valor", "pago", "mensalidade"],
  whatsapp: ["whatsapp", "zap", "telefone", "celular", "contato"],
};

function mapHeader(cells: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  cells.forEach((cell, index) => {
    const key = normalize(cell);
    for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
      if (map[field] === undefined && aliases.some((a) => normalize(a) === key)) map[field] = index;
    }
  });
  return map;
}

export function parseMoney(value: string): number {
  const clean = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

export function parseDateCell(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const br = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (br) {
    const day = Number(br[1]);
    const month = Number(br[2]);
    let year = Number(br[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    return toISODate(date);
  }
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (Number.isNaN(date.getTime())) return null;
    return toISODate(date);
  }
  return null;
}

function matchServer(value: string): string | null {
  const key = normalize(value);
  if (!key) return null;
  const exact = SERVERS.find((s) => normalize(s) === key);
  if (exact) return exact;
  const partial = SERVERS.find((s) => normalize(s).replace(/\s/g, "") === key.replace(/\s/g, ""));
  return partial ?? null;
}

export function parseClientsCSV(text: string): { rows: ImportRow[]; errors: ImportError[] } {
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { rows, errors: [{ line: 1, message: "Arquivo vazio ou sem linhas de clientes." }] };
  }

  const sep = detectSeparator(lines[0]!);
  const header = mapHeader(splitLine(lines[0]!, sep));

  for (const field of ["name", "login", "server", "due_date"]) {
    if (header[field] === undefined) {
      errors.push({
        line: 1,
        message: `Coluna obrigatória não encontrada: ${
          { name: "Nome", login: "Login", server: "Servidor", due_date: "Vencimento" }[field]
        }.`,
      });
    }
  }
  if (errors.length) return { rows, errors };

  const cell = (cells: string[], field: string) => {
    const index = header[field];
    return index === undefined ? "" : (cells[index] ?? "").trim();
  };

  lines.slice(1).forEach((line, i) => {
    const lineNumber = i + 2;
    const cells = splitLine(line, sep);
    const name = cell(cells, "name");
    const login = cell(cells, "login");
    const serverRaw = cell(cells, "server");
    const dueRaw = cell(cells, "due_date");

    if (!name || !login) {
      errors.push({ line: lineNumber, message: "Nome e login são obrigatórios." });
      return;
    }
    const server = matchServer(serverRaw);
    if (!server) {
      errors.push({ line: lineNumber, message: `Servidor inválido: "${serverRaw}".` });
      return;
    }
    const due = parseDateCell(dueRaw);
    if (!due) {
      errors.push({ line: lineNumber, message: `Vencimento inválido: "${dueRaw}".` });
      return;
    }
    const financialRaw = cell(cells, "financial_due_date");
    const financial = financialRaw ? parseDateCell(financialRaw) : null;
    if (financialRaw && !financial) {
      errors.push({ line: lineNumber, message: `Vencimento financeiro inválido: "${financialRaw}".` });
      return;
    }
    const costRaw = cell(cells, "cost");
    const cost = costRaw ? parseMoney(costRaw) : (SERVER_COSTS[server] ?? 0);
    const paid = parseMoney(cell(cells, "paid"));
    const whatsapp = cell(cells, "whatsapp").replace(/\D/g, "");

    rows.push({
      line: lineNumber,
      name,
      login,
      server,
      cost,
      paid,
      due_date: due,
      financial_due_date: financial,
      whatsapp: whatsapp || null,
    });
  });

  return { rows, errors };
}
