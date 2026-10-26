import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getRepo } from "./data/repo";
import { initializeBusiness } from "./data/store";

/**
 * Accounts: people who sign in, and the business each one owns.
 * Stored in global collections (not scoped to a business).
 */

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number, opts: object) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string | null;
  googleSub: string | null;
  businessId: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
}

export class AccountError extends Error {
  constructor(
    public readonly code: "email_taken" | "invalid_credentials" | "use_google",
    message: string,
  ) {
    super(message);
    this.name = "AccountError";
  }
}

const USERS = "user";
const BUSINESSES = "business";
const GOOGLE_INDEX = "user_by_google";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
const newId = (prefix: string) => `${prefix}_${randomBytes(8).toString("hex")}`;

/* -------------------------------- passwords -------------------------------- */

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, 64, SCRYPT);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const actual = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length, SCRYPT);
  return timingSafeEqual(actual, expected);
}

// Keeps response time equal whether or not the email exists.
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

/* --------------------------------- lookups --------------------------------- */

export async function getUserByEmail(email: string) {
  return getRepo().get<User>(USERS, normalizeEmail(email));
}

export async function getBusiness(id: string) {
  return getRepo().get<Business>(BUSINESSES, id);
}

export async function listBusinesses() {
  return getRepo().list<Business>(BUSINESSES);
}

async function saveUser(user: User) {
  await getRepo().put(USERS, user.id, user, { ts: user.createdAt });
}

async function createBusinessFor(ownerId: string, businessName: string, vertical?: string): Promise<Business> {
  const business: Business = { id: newId("biz"), name: businessName, ownerId, createdAt: new Date().toISOString() };
  await getRepo().put(BUSINESSES, business.id, business, { ts: business.createdAt });
  await initializeBusiness(business.id, { name: businessName, vertical: vertical || "Negocio con citas" });
  return business;
}

/* ------------------------------ email sign-up ------------------------------ */

export async function registerWithPassword(input: {
  name: string;
  businessName: string;
  vertical?: string;
  email: string;
  password: string;
}): Promise<User> {
  const email = normalizeEmail(input.email);
  const existing = await getUserByEmail(email);
  if (existing) {
    throw existing.passwordHash
      ? new AccountError("email_taken", "Ya existe una cuenta con ese correo. Inicia sesión.")
      : new AccountError("use_google", "Ese correo ya está registrado con Google. Usa “Continuar con Google”.");
  }
  const business = await createBusinessFor(email, input.businessName, input.vertical);
  const now = new Date().toISOString();
  const user: User = {
    id: email,
    email,
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    googleSub: null,
    businessId: business.id,
    createdAt: now,
    lastLoginAt: now,
  };
  await saveUser(user);
  return user;
}

export async function authenticate(emailRaw: string, password: string): Promise<User> {
  const user = await getUserByEmail(emailRaw);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (user && !user.passwordHash) {
    throw new AccountError("use_google", "Esta cuenta se creó con Google. Usa “Continuar con Google”.");
  }
  if (!user || !ok) throw new AccountError("invalid_credentials", "El correo o la contraseña no son correctos.");
  await saveUser({ ...user, lastLoginAt: new Date().toISOString() });
  return user;
}

/* ------------------------------- Google sign-in ------------------------------ */

/**
 * Signs in with a verified Google identity. Links to an existing account with
 * the same verified email, or creates a new account and business.
 */
export async function signInWithGoogle(profile: { sub: string; email: string; name: string }): Promise<{ user: User; isNew: boolean }> {
  const repo = getRepo();
  const email = normalizeEmail(profile.email);
  const linkedEmail = await repo.get<{ email: string }>(GOOGLE_INDEX, profile.sub);
  const existing = await getUserByEmail(linkedEmail?.email ?? email);
  const now = new Date().toISOString();

  if (existing) {
    const user = { ...existing, googleSub: profile.sub, lastLoginAt: now, name: existing.name || profile.name };
    await saveUser(user);
    await repo.put(GOOGLE_INDEX, profile.sub, { email: user.email });
    return { user, isNew: false };
  }

  const firstName = profile.name.split(" ")[0] || "Mi";
  const business = await createBusinessFor(email, `Negocio de ${firstName}`);
  const user: User = {
    id: email,
    email,
    name: profile.name,
    passwordHash: null,
    googleSub: profile.sub,
    businessId: business.id,
    createdAt: now,
    lastLoginAt: now,
  };
  await saveUser(user);
  await repo.put(GOOGLE_INDEX, profile.sub, { email });
  return { user, isNew: true };
}

export async function renameBusiness(id: string, name: string) {
  const b = await getBusiness(id);
  if (b && b.name !== name) await getRepo().put(BUSINESSES, id, { ...b, name }, { ts: b.createdAt });
}
