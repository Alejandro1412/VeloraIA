import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AccountError,
  authenticate,
  hashPassword,
  registerWithPassword,
  signInWithGoogle,
  verifyPassword,
} from "../src/lib/accounts";
import { getSettings, listAppointments, listServices, saveService } from "../src/lib/data/store";
import { withBusiness } from "../src/lib/tenant";

delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;

test("hashes and verifies passwords with scrypt", async () => {
  const hash = await hashPassword("Clave2026");
  assert.match(hash, /^scrypt\$/);
  assert.equal(await verifyPassword("Clave2026", hash), true);
  assert.equal(await verifyPassword("clave2026", hash), false);
});

test("registers a business owner and signs in", async () => {
  const user = await registerWithPassword({
    name: "Laura Gómez",
    businessName: "Spa Aurora",
    vertical: "Estética y spa",
    email: "Laura@Example.com ",
    password: "Aurora2026",
  });
  assert.equal(user.email, "laura@example.com");
  assert.match(user.businessId, /^biz_[a-f0-9]{16}$/);

  const again = await authenticate("laura@example.com", "Aurora2026");
  assert.equal(again.businessId, user.businessId);
  await assert.rejects(authenticate("laura@example.com", "wrong-pass1"), AccountError);
  await assert.rejects(
    registerWithPassword({ name: "X", businessName: "Y", email: "laura@example.com", password: "Another123" }),
    (e: AccountError) => e.code === "email_taken",
  );

  const settings = await withBusiness(user.businessId, () => getSettings());
  assert.equal(settings.name, "Spa Aurora");
  assert.equal(settings.vertical, "Estética y spa");
  assert.equal(settings.address, "");
  const services = await withBusiness(user.businessId, () => listServices());
  assert.ok(services.some((s) => s.name === "Masaje relajante"), "spa starts with spa services");
  assert.ok(!services.some((s) => s.name === "Blanqueamiento"), "no dental services for a spa");
});

test("keeps each business' data isolated", async () => {
  const a = await registerWithPassword({ name: "Ana", businessName: "Vet A", email: "a@vet.co", password: "Perros2026" });
  const b = await registerWithPassword({ name: "Beto", businessName: "Barbería B", email: "b@barber.co", password: "Tijera2026" });

  await withBusiness(a.businessId, () =>
    saveService({ name: "Vacunación", durationMinutes: 20, price: 50000, description: "", keywords: [], active: true }),
  );
  const servicesA = await withBusiness(a.businessId, () => listServices());
  const servicesB = await withBusiness(b.businessId, () => listServices());
  assert.ok(servicesA.some((s) => s.name === "Vacunación"));
  assert.ok(!servicesB.some((s) => s.name === "Vacunación"));

  // New businesses start with an empty agenda; the demo has sample data.
  assert.equal((await withBusiness(b.businessId, () => listAppointments())).length, 0);
  assert.ok((await withBusiness("demo", () => listAppointments())).length > 0);
});

test("Google sign-in creates an account, then links by email", async () => {
  const first = await signInWithGoogle({ sub: "g-123", email: "nuevo@gmail.com", name: "Camilo Díaz" });
  assert.equal(first.isNew, true);
  const second = await signInWithGoogle({ sub: "g-123", email: "nuevo@gmail.com", name: "Camilo Díaz" });
  assert.equal(second.isNew, false);
  assert.equal(second.user.businessId, first.user.businessId);
  await assert.rejects(authenticate("nuevo@gmail.com", "whatever1"), (e: AccountError) => e.code === "use_google");

  // An existing password account gets Google linked instead of duplicated.
  const pw = await registerWithPassword({ name: "Sara", businessName: "Fisio S", email: "sara@fisio.co", password: "Rodilla2026" });
  const linked = await signInWithGoogle({ sub: "g-999", email: "sara@fisio.co", name: "Sara" });
  assert.equal(linked.isNew, false);
  assert.equal(linked.user.businessId, pw.businessId);
});
