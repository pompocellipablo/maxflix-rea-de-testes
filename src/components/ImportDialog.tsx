import { useState } from "react";
import { formatBRL, formatDate } from "@/lib/iptv";
import {
  parseClientsCSV,
  TEMPLATE_CSV,
  type ImportError,
  type ImportRow,
} from "@/lib/import-clients";

export function ImportDialog({
  saving,
  onClose,
  onImport,
}: {
  saving: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[]) => void;
}) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [fileName, setFileName] = useState("");

  const downloadTemplate = () => {
    const blob = new Blob([`\uFEFF${TEMPLATE_CSV}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-clientes-maxflix.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setFileName(file.name);
    const text = await file.text();
    const result = parseClientsCSV(text);
    setRows(result.rows);
    setErrors(result.errors);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
      <section className="mx-auto my-8 max-w-2xl rounded-2xl bg-panel2/95 p-6 ring-1 ring-line">
        <h2 className="font-display text-xl font-semibold">Importar clientes por planilha</h2>
        <p className="mt-1 text-sm text-mist">
          Baixe o modelo, preencha com seus clientes e envie o arquivo (.csv).
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={downloadTemplate}
            className="font-display rounded-xl bg-panel px-4 py-2.5 text-sm font-medium text-cyan ring-1 ring-cyan/30 hover:bg-cyan/10"
          >
            Baixar modelo CSV
          </button>
          <label className="font-display cursor-pointer rounded-xl bg-panel px-4 py-2.5 text-sm font-medium text-mist ring-1 ring-line hover:bg-frost/5">
            Escolher arquivo
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {fileName && <span className="self-center text-xs text-mist">{fileName}</span>}
        </div>

        <p className="mt-4 text-xs text-mist">
          Colunas aceitas: Nome, Login, Servidor, Vencimento, Vencimento financeiro, Custo, Valor
          pago, WhatsApp. Datas em 31/12/2026 ou 2026-12-31. Sem custo informado, usamos o valor
          padrão do servidor.
        </p>

        {errors.length > 0 && (
          <div className="mt-4 rounded-xl bg-danger/10 p-3 text-xs text-danger ring-1 ring-danger/30">
            <p className="font-display mb-1 text-sm font-semibold">
              {errors.length} linha(s) com problema — serão ignoradas:
            </p>
            <ul className="space-y-0.5">
              {errors.slice(0, 8).map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  Linha {e.line}: {e.message}
                </li>
              ))}
              {errors.length > 8 && <li>… e mais {errors.length - 8}.</li>}
            </ul>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mt-4">
            <p className="font-display text-sm font-semibold text-ok">
              {rows.length} cliente(s) prontos para importar
            </p>
            <div className="mt-2 max-h-64 overflow-auto rounded-xl ring-1 ring-line">
              <table className="w-full text-left text-xs">
                <thead className="bg-panel text-mist">
                  <tr>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Login</th>
                    <th className="px-3 py-2 font-medium">Servidor</th>
                    <th className="px-3 py-2 font-medium">Vencimento</th>
                    <th className="px-3 py-2 font-medium">Custo</th>
                    <th className="px-3 py-2 font-medium">Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.line} className="border-t border-line/60">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-mist">{r.login}</td>
                      <td className="px-3 py-2 text-mist">{r.server}</td>
                      <td className="px-3 py-2 text-mist">{formatDate(r.due_date)}</td>
                      <td className="px-3 py-2 text-mist">{formatBRL(r.cost)}</td>
                      <td className="px-3 py-2 text-mist">{formatBRL(r.paid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <button
            disabled={rows.length === 0 || saving}
            onClick={() => onImport(rows)}
            className="font-display rounded-xl bg-cyan px-4 py-2.5 text-sm font-semibold text-background ring-1 ring-cyan/40 disabled:opacity-40"
          >
            {saving ? "Importando…" : `Importar ${rows.length || ""} cliente(s)`}
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
