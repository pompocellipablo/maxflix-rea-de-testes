import type { Status } from "@/lib/iptv";

const tone: Record<Status["key"], string> = {
  ativo: "bg-ok/15 ring-ok/30 text-ok",
  breve: "bg-warn/15 ring-warn/30 text-warn",
  hoje: "bg-today/15 ring-today/30 text-today",
  vencido: "bg-danger/15 ring-danger/30 text-danger",
};

const dot: Record<Status["key"], string> = {
  ativo: "bg-ok",
  breve: "bg-warn",
  hoje: "bg-today",
  vencido: "bg-danger",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 whitespace-nowrap ${tone[status.key]}`}
    >
      <span className={`size-1.5 rounded-full ${dot[status.key]}`} />
      {status.label}
    </span>
  );
}
