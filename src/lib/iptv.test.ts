import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { renewalDates } from "./iptv";

describe("datas da renovação", () => {
  const renewalDay = new Date(2026, 8, 27);

  test("vencido: mensal usa dia da renovação para ambas as datas", () => {
    assert.deepEqual(renewalDates("2026-08-25", 1, renewalDay), {
      dueDate: "2026-10-27",
      financialDueDate: "2026-10-27",
    });
  });

  test("vencido: meses adiantados cobrem o período desde o dia do pagamento", () => {
    assert.deepEqual(renewalDates("2026-08-25", 2, renewalDay), {
      dueDate: "2026-10-27",
      financialDueDate: "2026-11-27",
    });
  });

  test("antecipado: mantém a data contratada como base", () => {
    assert.deepEqual(renewalDates("2026-10-15", 6, renewalDay), {
      dueDate: "2026-11-15",
      financialDueDate: "2027-04-15",
    });
  });

  test("limita meses inválidos", () => {
    assert.throws(() => renewalDates("2026-09-27", 0, renewalDay));
    assert.throws(() => renewalDates("2026-09-27", 2.5, renewalDay));
    assert.throws(() => renewalDates("2026-09-27", 121, renewalDay));
  });
});