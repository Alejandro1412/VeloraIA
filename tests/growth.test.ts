import { test } from "node:test";
import assert from "node:assert/strict";
import { fillMessage } from "../src/lib/campaigns";
import { monthBounds, shiftMonth } from "../src/lib/report";
import { appointmentLink, surveyLink, verifyLink } from "../src/lib/links";

test("campaign placeholders are filled per customer", () => {
  const text = fillMessage("Hola {nombre}, vuelve a {negocio} por tu {servicio}: {enlace}", {
    name: "Ana María Gómez",
    business: "Spa Brisa",
    link: "https://x.test/r",
    service: "Masaje Relajante",
  });
  assert.equal(text, "Hola Ana, vuelve a Spa Brisa por tu masaje relajante: https://x.test/r");
});

test("month helpers", () => {
  assert.deepEqual(monthBounds("2026-12"), { first: "2026-12-01", next: "2027-01-01", label: "diciembre de 2026" });
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-10", 1), "2026-11");
});

test("customer links are signed per appointment and purpose", () => {
  const url = appointmentLink("biz_0123456789abcdef", "apt_1");
  const token = url.split("/").at(-1)!;
  assert.ok(verifyLink("cita", "biz_0123456789abcdef", "apt_1", token));
  assert.ok(!verifyLink("cita", "biz_0123456789abcdef", "apt_2", token));
  assert.ok(!verifyLink("opinion", "biz_0123456789abcdef", "apt_1", token));
  const s = surveyLink("biz_0123456789abcdef", "apt_1").split("/").at(-1)!;
  assert.ok(verifyLink("opinion", "biz_0123456789abcdef", "apt_1", s));
  assert.ok(!verifyLink("cita", "biz_0123456789abcdef", "apt_1", "x".repeat(24)));
});
