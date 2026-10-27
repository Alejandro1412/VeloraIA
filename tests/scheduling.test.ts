import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { getSlots, pickStaff } from "../src/lib/domain/availability";
import { localToUtc } from "../src/lib/domain/time";
import { DEFAULT_SETTINGS } from "../src/lib/data/seed";
import { subscriptionFor, GRACE_DAYS, PLANS } from "../src/lib/billing";
import { checkoutUrl, parseReference, verifyEvent, depositReference, type WompiEvent } from "../src/lib/wompi";
import type { Appointment, Staff } from "../src/lib/domain/types";

const NOW = localToUtc("2026-10-22", "20:00", -300); // Thursday evening, Bogotá
const FRIDAY = "2026-10-23";
const service = { id: "svc", durationMinutes: 60 };
const settings = { ...DEFAULT_SETTINGS, capacity: 1 };

const staff = (id: string, extra: Partial<Staff> = {}): Staff => ({ id, name: id, serviceIds: [], daysOff: [], color: "#000", active: true, ...extra });
const apt = (time: string, staffId?: string, minutes = 60, serviceId = "svc"): Appointment => {
  const start = localToUtc(FRIDAY, time, -300);
  return {
    id: `a_${time}_${staffId ?? "x"}`,
    serviceId,
    customerId: "c",
    start: start.toISOString(),
    end: new Date(start.getTime() + minutes * 60_000).toISOString(),
    status: "booked",
    source: "web",
    notes: "",
    reminderSentAt: null,
    createdAt: NOW.toISOString(),
    staffId,
  };
};
const times = (s: { time: string }[]) => s.map((x) => x.time);

test("each professional has their own agenda", () => {
  const team = [staff("ana"), staff("luis")];
  const booked = [apt("09:00", "ana")];
  const all = getSlots({ date: FRIDAY, service, settings, appointments: booked, now: NOW, staff: team });
  const nine = all.find((s) => s.time === "09:00");
  assert.deepEqual(nine?.staffIds, ["luis"]);
  const onlyAna = getSlots({ date: FRIDAY, service, settings, appointments: booked, now: NOW, staff: team, staffId: "ana" });
  assert.ok(!times(onlyAna).includes("09:00"));
  assert.equal(pickStaff(nine!, booked), "luis");
});

test("professionals only offer their services and skip their days off", () => {
  const team = [staff("ana", { serviceIds: ["other"] }), staff("luis", { daysOff: [5] })];
  assert.equal(getSlots({ date: FRIDAY, service, settings, appointments: [], now: NOW, staff: team }).length, 0);
});

test("closures block the whole business or one professional", () => {
  const team = [staff("ana"), staff("luis")];
  const closedAll = getSlots({ date: FRIDAY, service, settings, appointments: [], now: NOW, staff: team, closures: [{ id: "c", from: FRIDAY, to: FRIDAY, reason: "Festivo" }] });
  assert.equal(closedAll.length, 0);
  const anaOff = getSlots({ date: FRIDAY, service, settings, appointments: [], now: NOW, staff: team, closures: [{ id: "c", from: FRIDAY, to: FRIDAY, reason: "Vacaciones", staffId: "ana" }] });
  assert.ok(anaOff.length > 0 && anaOff.every((s) => s.staffIds.join() === "luis"));
});

test("service days and buffers are respected", () => {
  const mondaysOnly = getSlots({ date: FRIDAY, service: { ...service, days: [1] }, settings, appointments: [], now: NOW });
  assert.equal(mondaysOnly.length, 0);

  // A 09:00–10:00 appointment with 30 min buffer keeps 10:00 busy.
  const withBuffer = getSlots({ date: FRIDAY, service, settings, appointments: [apt("09:00")], now: NOW, bufferFor: () => 30 });
  assert.ok(!times(withBuffer).includes("10:00"));
  assert.ok(times(withBuffer).includes("10:30"));

  // The new service's own buffer must fit before the next appointment.
  const ownBuffer = getSlots({ date: FRIDAY, service: { ...service, bufferMinutes: 30 }, settings, appointments: [apt("11:00")], now: NOW });
  assert.ok(!times(ownBuffer).includes("10:00"));
  assert.ok(times(ownBuffer).includes("09:30"));
});

test("legacy appointments without professional take one seat", () => {
  const team = [staff("ana")];
  const slots = getSlots({ date: FRIDAY, service, settings, appointments: [apt("09:00")], now: NOW, staff: team });
  assert.ok(!times(slots).includes("09:00"));
});

test("subscription: trial, paid month and grace period", () => {
  const created = new Date("2026-10-01T00:00:00Z");
  const trial = subscriptionFor({ id: "biz_x", createdAt: created.toISOString() }, new Date("2026-10-05T00:00:00Z"));
  assert.equal(trial.trial, true);
  assert.equal(trial.serving, true);
  assert.equal(trial.limits, PLANS.profesional);

  const lapsed = subscriptionFor({ id: "biz_x", createdAt: created.toISOString() }, new Date(created.getTime() + (14 + GRACE_DAYS + 1) * 86_400_000));
  assert.equal(lapsed.serving, false);

  const paid = subscriptionFor({ id: "biz_x", createdAt: created.toISOString(), plan: "esencial", paidUntil: "2026-12-15T00:00:00Z" }, new Date("2026-11-20T00:00:00Z"));
  assert.equal(paid.trial, false);
  assert.equal(paid.plan, "esencial");
  assert.equal(paid.limits.ai, false);
  assert.equal(subscriptionFor({ id: "demo", createdAt: created.toISOString() }).serving, true);
});

test("wompi: signed checkout, references and event verification", () => {
  const keys = { publicKey: "pub_test_abc", integritySecret: "test_integrity_xyz" };
  const url = new URL(checkoutUrl(keys, { reference: "dep_a1_k", amount: 50000, redirectUrl: "https://x.test/ok" }));
  assert.equal(url.searchParams.get("amount-in-cents"), "5000000");
  assert.equal(url.searchParams.get("signature:integrity"), createHash("sha256").update("dep_a1_k5000000COPtest_integrity_xyz").digest("hex"));

  const ref = depositReference("apt_123");
  assert.deepEqual(parseReference(ref), { kind: "deposit", appointmentId: "apt_123" });
  assert.deepEqual(parseReference("sub_biz_0123456789abcdef_esencial_k1"), { kind: "subscription", businessId: "biz_0123456789abcdef", plan: "esencial" });

  const data = { transaction: { id: "t1", status: "APPROVED", reference: ref, amount_in_cents: 5000000 } };
  const checksum = createHash("sha256").update(`t1APPROVED5000000${1700000000}secret`).digest("hex");
  const event: WompiEvent = {
    event: "transaction.updated",
    data,
    signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum },
    timestamp: 1700000000,
  };
  assert.equal(verifyEvent(event, "secret"), true);
  assert.equal(verifyEvent(event, "wrong"), false);
  assert.equal(verifyEvent({ ...event, data: { transaction: { ...data.transaction, status: "DECLINED" } } }, "secret"), false);
});
