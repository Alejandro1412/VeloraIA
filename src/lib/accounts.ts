import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getRepo } from "./data/repo";
import { initializeBusiness } from "./data/store";
import { TRIAL_DAYS } from "./billing";

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
  /** Owners manage settings, team and billing; staff work the agenda and chats. */
  role?: Role;
  /** Other businesses (branches) this person can switch to. */
  memberships?: { businessId: string; role: Role }[];
  createdAt: string;
  lastLoginAt: string;
}

export interface Business {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  plan?: "esencial" | "profesional" | "sedes";
  trialEndsAt?: string;
  paidUntil?: string;
}

export type Role = "owner" | "staff";

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
  const now = new Date();
  const business: Business = {
    id: newId("biz"),
    name: businessName,
    ownerId,
    createdAt: now.toISOString(),
    trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * 86_400_000).toISOString(),
  };
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
    role: "owner",
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
    role: "owner",
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

/* ---------------------------------- team ---------------------------------- */

export interface Invite {
  token: string;
  businessId: string;
  role: Role;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  usedBy?: string;
}

const INVITES = "invite";
const INVITE_DAYS = 7;

export async function createInvite(businessId: string, createdBy: string): Promise<Invite> {
  const now = new Date();
  const invite: Invite = {
    token: randomBytes(18).toString("base64url"),
    businessId,
    role: "staff",
    createdBy,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + INVITE_DAYS * 86_400_000).toISOString(),
  };
  await getRepo().put(INVITES, invite.token, invite, { ts: invite.createdAt, parent: businessId });
  return invite;
}

export async function getValidInvite(token: string): Promise<Invite | null> {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(token)) return null;
  const invite = await getRepo().get<Invite>(INVITES, token);
  if (!invite || invite.usedBy || invite.expiresAt < new Date().toISOString()) return null;
  return invite;
}

export async function listInvites(businessId: string) {
  const all = await getRepo().list<Invite>(INVITES, { parent: businessId, order: "desc" });
  const now = new Date().toISOString();
  return all.filter((i) => !i.usedBy && i.expiresAt > now);
}

export async function revokeInvite(businessId: string, token: string) {
  const invite = await getRepo().get<Invite>(INVITES, token);
  if (invite?.businessId === businessId) await getRepo().remove(INVITES, token);
}

async function markInviteUsed(invite: Invite, email: string) {
  await getRepo().put(INVITES, invite.token, { ...invite, usedBy: email }, { ts: invite.createdAt, parent: invite.businessId });
}

/** Creates a staff account that joins the inviting business. */
export async function registerWithInvite(input: { token: string; name: string; email: string; password: string }): Promise<User> {
  const invite = await getValidInvite(input.token);
  if (!invite) throw new AccountError("invalid_credentials", "La invitación ya no es válida. Pide una nueva al dueño del negocio.");
  const email = normalizeEmail(input.email);
  if (await getUserByEmail(email)) throw new AccountError("email_taken", "Ese correo ya tiene una cuenta en Velora. Usa otro correo para unirte a este equipo.");
  const now = new Date().toISOString();
  const user: User = {
    id: email,
    email,
    name: input.name.trim(),
    passwordHash: await hashPassword(input.password),
    googleSub: null,
    businessId: invite.businessId,
    role: invite.role,
    createdAt: now,
    lastLoginAt: now,
  };
  await saveUser(user);
  await markInviteUsed(invite, email);
  return user;
}

export async function joinWithGoogle(invite: Invite, profile: { sub: string; email: string; name: string }): Promise<User> {
  const email = normalizeEmail(profile.email);
  const now = new Date().toISOString();
  const user: User = {
    id: email,
    email,
    name: profile.name,
    passwordHash: null,
    googleSub: profile.sub,
    businessId: invite.businessId,
    role: invite.role,
    createdAt: now,
    lastLoginAt: now,
  };
  await saveUser(user);
  await getRepo().put(GOOGLE_INDEX, profile.sub, { email });
  await markInviteUsed(invite, email);
  return user;
}

export async function listTeam(businessId: string): Promise<User[]> {
  const users = await getRepo().list<User>(USERS);
  return users
    .filter((u) => u.businessId === businessId || u.memberships?.some((m) => m.businessId === businessId))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/* -------------------------------- branches -------------------------------- */

/** Every business the person can open, with their role in each. */
export function userBusinesses(user: User): { businessId: string; role: Role }[] {
  const all = [{ businessId: user.businessId, role: user.role ?? "owner" }, ...(user.memberships ?? [])];
  return all.filter((m, i) => all.findIndex((x) => x.businessId === m.businessId) === i);
}

export async function getUser(id: string) {
  return getRepo().get<User>(USERS, id);
}

/** Creates another location owned by the same person. */
export async function createBranch(userId: string, name: string, vertical?: string): Promise<Business> {
  const user = await getUser(userId);
  if (!user) throw new AccountError("invalid_credentials", "Tu sesión expiró. Vuelve a entrar.");
  const business = await createBusinessFor(user.email, name, vertical);
  await saveUser({ ...user, memberships: [...(user.memberships ?? []), { businessId: business.id, role: "owner" }] });
  return business;
}

/** Remembers the last opened business so the next sign-in lands there. */
export async function rememberBusiness(userId: string, businessId: string) {
  const user = await getUser(userId);
  if (!user) return null;
  const access = userBusinesses(user).find((m) => m.businessId === businessId);
  if (!access) return null;
  const memberships = userBusinesses(user).filter((m) => m.businessId !== businessId);
  await saveUser({ ...user, businessId, role: access.role, memberships });
  return access;
}

/** Back-office updates from the IONEX admin panel. */
export async function updateBusiness(id: string, patch: Partial<Pick<Business, "plan" | "trialEndsAt" | "paidUntil">>) {
  const b = await getBusiness(id);
  if (!b) throw new AccountError("invalid_credentials", "Negocio no encontrado");
  const updated = { ...b, ...patch };
  await getRepo().put(BUSINESSES, id, updated, { ts: b.createdAt });
  return updated;
}

export async function listUsers() {
  return getRepo().list<User>(USERS);
}

export async function removeMember(businessId: string, email: string) {
  const user = await getUserByEmail(email);
  if (!user) return;
  if (user.businessId !== businessId) {
    // Member through another location: just drop access to this one.
    if (user.memberships?.some((m) => m.businessId === businessId)) {
      await saveUser({ ...user, memberships: user.memberships.filter((m) => m.businessId !== businessId) });
    }
    return;
  }
  if ((user.role ?? "owner") === "owner") throw new AccountError("invalid_credentials", "No puedes quitar al dueño del negocio.");
  await getRepo().remove(USERS, user.id);
  if (user.googleSub) await getRepo().remove(GOOGLE_INDEX, user.googleSub);
}

/* ----------------------------- password reset ----------------------------- */

const RESETS = "password_reset";
const RESET_MINUTES = 60;
const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** Returns a one-time token for the account, or null when there is no password account. */
export async function createPasswordReset(emailRaw: string): Promise<{ token: string; user: User } | null> {
  const user = await getUserByEmail(emailRaw);
  if (!user) return null;
  const token = randomBytes(32).toString("base64url");
  await getRepo().put(RESETS, sha256(token), {
    email: user.email,
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000).toISOString(),
  });
  return { token, user };
}

export async function resetPassword(token: string, newPassword: string): Promise<User> {
  const repo = getRepo();
  const key = sha256(token);
  const record = await repo.get<{ email: string; expiresAt: string }>(RESETS, key);
  if (!record || record.expiresAt < new Date().toISOString()) {
    throw new AccountError("invalid_credentials", "El enlace expiró o ya se usó. Pide uno nuevo.");
  }
  const user = await getUserByEmail(record.email);
  if (!user) throw new AccountError("invalid_credentials", "La cuenta ya no existe.");
  const updated = { ...user, passwordHash: await hashPassword(newPassword), lastLoginAt: new Date().toISOString() };
  await saveUser(updated);
  await repo.remove(RESETS, key);
  return updated;
}
