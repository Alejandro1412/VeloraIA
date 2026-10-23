import "server-only";
import { neon } from "@neondatabase/serverless";

/**
 * Tiny document repository. One generic table keeps the schema migration-free
 * while `ts` and `parent` columns give us indexed range and child lookups.
 * Two drivers: Postgres (Neon / Vercel Postgres) when DATABASE_URL is set,
 * or an in-memory store for local development and demo deployments.
 */

export type Kind = "settings" | "service" | "customer" | "appointment" | "conversation" | "message";

export interface ListOptions {
  from?: string;
  to?: string;
  parent?: string;
  limit?: number;
  order?: "asc" | "desc";
}

export interface PutMeta {
  ts?: string;
  parent?: string;
}

export interface Repo {
  readonly driver: "postgres" | "memory";
  get<T>(kind: Kind, id: string): Promise<T | null>;
  list<T>(kind: Kind, opts?: ListOptions): Promise<T[]>;
  put<T>(kind: Kind, id: string, data: T, meta?: PutMeta): Promise<void>;
  remove(kind: Kind, id: string): Promise<void>;
}

/* ---------------------------------- memory --------------------------------- */

interface Row {
  data: unknown;
  ts: string;
  parent: string | null;
}

class MemoryRepo implements Repo {
  readonly driver = "memory" as const;
  private tables = new Map<Kind, Map<string, Row>>();

  private table(kind: Kind) {
    let t = this.tables.get(kind);
    if (!t) this.tables.set(kind, (t = new Map()));
    return t;
  }

  async get<T>(kind: Kind, id: string) {
    const row = this.table(kind).get(id);
    return row ? (structuredClone(row.data) as T) : null;
  }

  async list<T>(kind: Kind, opts: ListOptions = {}) {
    let rows = [...this.table(kind).values()];
    if (opts.parent !== undefined) rows = rows.filter((r) => r.parent === opts.parent);
    if (opts.from) rows = rows.filter((r) => r.ts >= opts.from!);
    if (opts.to) rows = rows.filter((r) => r.ts < opts.to!);
    rows.sort((a, b) => (opts.order === "desc" ? b.ts.localeCompare(a.ts) : a.ts.localeCompare(b.ts)));
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return rows.map((r) => structuredClone(r.data) as T);
  }

  async put<T>(kind: Kind, id: string, data: T, meta: PutMeta = {}) {
    this.table(kind).set(id, {
      data: structuredClone(data),
      ts: meta.ts ?? new Date().toISOString(),
      parent: meta.parent ?? null,
    });
  }

  async remove(kind: Kind, id: string) {
    this.table(kind).delete(id);
  }
}

/* --------------------------------- postgres -------------------------------- */

class PostgresRepo implements Repo {
  readonly driver = "postgres" as const;
  private sql: ReturnType<typeof neon>;
  private ready: Promise<void> | null = null;

  constructor(url: string) {
    this.sql = neon(url);
  }

  private migrate() {
    this.ready ??= (async () => {
      await this.sql`create table if not exists velora_records (
        kind text not null,
        id text not null,
        parent text,
        ts timestamptz not null default now(),
        data jsonb not null,
        primary key (kind, id)
      )`;
      await this.sql`create index if not exists velora_records_kind_ts on velora_records (kind, ts)`;
      await this.sql`create index if not exists velora_records_parent on velora_records (kind, parent, ts)`;
    })().catch((err) => {
      this.ready = null;
      throw err;
    });
    return this.ready;
  }

  async get<T>(kind: Kind, id: string) {
    await this.migrate();
    const rows = (await this.sql`select data from velora_records where kind = ${kind} and id = ${id}`) as { data: T }[];
    return rows[0]?.data ?? null;
  }

  async list<T>(kind: Kind, opts: ListOptions = {}) {
    await this.migrate();
    const limit = opts.limit ?? 5000;
    const from = opts.from ?? null;
    const to = opts.to ?? null;
    const parent = opts.parent ?? null;
    const rows = (opts.order === "desc"
      ? await this.sql`select data from velora_records
          where kind = ${kind}
            and (${parent}::text is null or parent = ${parent})
            and (${from}::timestamptz is null or ts >= ${from}::timestamptz)
            and (${to}::timestamptz is null or ts < ${to}::timestamptz)
          order by ts desc limit ${limit}`
      : await this.sql`select data from velora_records
          where kind = ${kind}
            and (${parent}::text is null or parent = ${parent})
            and (${from}::timestamptz is null or ts >= ${from}::timestamptz)
            and (${to}::timestamptz is null or ts < ${to}::timestamptz)
          order by ts asc limit ${limit}`) as { data: T }[];
    return rows.map((r) => r.data);
  }

  async put<T>(kind: Kind, id: string, data: T, meta: PutMeta = {}) {
    await this.migrate();
    const ts = meta.ts ?? new Date().toISOString();
    const parent = meta.parent ?? null;
    await this.sql`insert into velora_records (kind, id, parent, ts, data)
      values (${kind}, ${id}, ${parent}, ${ts}::timestamptz, ${JSON.stringify(data)}::jsonb)
      on conflict (kind, id) do update set parent = excluded.parent, ts = excluded.ts, data = excluded.data`;
  }

  async remove(kind: Kind, id: string) {
    await this.migrate();
    await this.sql`delete from velora_records where kind = ${kind} and id = ${id}`;
  }
}

/* --------------------------------- factory --------------------------------- */

const globalForRepo = globalThis as unknown as { __veloraRepo?: Repo };

export function getRepo(): Repo {
  if (!globalForRepo.__veloraRepo) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    globalForRepo.__veloraRepo = url ? new PostgresRepo(url) : new MemoryRepo();
  }
  return globalForRepo.__veloraRepo;
}
