import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { Magnetic } from "@/components/fx/Magnetic";
import { VERTICAL_PAGES, verticalPage } from "@/lib/landing-verticals";

export function generateStaticParams() {
  return VERTICAL_PAGES.map((v) => ({ tipo: v.slug }));
}

export async function generateMetadata({ params }: PageProps<"/para/[tipo]">): Promise<Metadata> {
  const v = verticalPage((await params).tipo);
  if (!v) return {};
  return {
    title: `Recepcionista IA para ${v.name.toLowerCase()}`,
    description: v.sub,
    openGraph: { title: `Velora para ${v.name.toLowerCase()}`, description: v.sub },
  };
}

export default async function VerticalLanding({ params }: PageProps<"/para/[tipo]">) {
  const v = verticalPage((await params).tipo);
  if (!v) notFound();
  const signup = `/registro?tipo=${encodeURIComponent(v.vertical)}`;

  return (
    <>
      <Nav />
      <main>
        {/* hero */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40">
          <div aria-hidden className="pointer-events-none absolute -top-40 right-[-10%] size-[520px] rounded-full bg-cobalt/15 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute top-60 left-[-10%] size-[420px] rounded-full bg-mint/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1240px] items-center gap-14 px-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="animate-[rise_900ms_var(--ease-out-expo)_both]">
              <p className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-sm text-ink-2">
                <span aria-hidden>{v.emoji}</span> Velora para {v.name.toLowerCase()}
              </p>
              <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,5rem)] leading-[0.95] font-semibold tracking-[-0.045em]">{v.headline}</h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-2">{v.sub}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Magnetic>
                  <Link href={signup} className="btn-cobalt px-6 py-3.5 text-base">
                    Probar 14 días gratis
                  </Link>
                </Magnetic>
                <Magnetic>
                  <Link href="/#demo" className="btn-ghost px-6 py-3.5 text-base">
                    Hablar con la demo
                  </Link>
                </Magnetic>
              </div>
              <p className="mt-6 flex items-baseline gap-3 text-sm text-muted">
                <span className="font-display text-3xl font-semibold text-ink">{v.stat.value}</span>
                {v.stat.label}
              </p>
            </div>

            {/* chat mock */}
            <div className="animate-[rise_1000ms_var(--ease-out-expo)_200ms_both] rounded-[36px] border border-line bg-paper p-3 shadow-[0_50px_120px_-60px_rgba(14,27,61,.6)]">
              <div className="rounded-[28px] bg-porcelain p-5">
                <div className="flex items-center gap-3 border-b border-line-soft pb-4">
                  <span className="grid size-10 place-items-center rounded-full bg-night font-display font-semibold text-white">S</span>
                  <span>
                    <span className="block text-[15px] font-semibold">Sofía</span>
                    <span className="text-xs text-mint">en línea</span>
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2.5">
                  {v.chat.map((m, i) => (
                    <p
                      key={i}
                      className={`max-w-[85%] animate-[rise_600ms_var(--ease-out-expo)_both] rounded-2xl px-3.5 py-2.5 text-[15px] leading-snug ${
                        m.who === "in" ? "self-end rounded-br-md bg-night text-white" : "self-start rounded-bl-md border border-line-soft bg-paper"
                      }`}
                      style={{ animationDelay: `${600 + i * 450}ms` }}
                    >
                      {m.text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* pains */}
        <section className="bg-night py-24 text-white">
          <div className="mx-auto max-w-[1240px] px-5">
            <h2 className="max-w-2xl font-display text-[clamp(2rem,4vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em]">Lo que hoy te cuesta clientes</h2>
            <ul className="stagger mt-12 grid gap-4 md:grid-cols-3">
              {v.pains.map((p) => (
                <li key={p.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-6 transition-colors hover:bg-white/[0.08]">
                  <p className="font-display text-2xl font-semibold tracking-tight">{p.title}</p>
                  <p className="mt-3 text-white/70">{p.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* features */}
        <section className="py-24">
          <div className="mx-auto max-w-[1240px] px-5">
            <h2 className="max-w-3xl font-display text-[clamp(2rem,4vw,3.4rem)] leading-[1] font-semibold tracking-[-0.03em]">
              Hecho para {v.name.toLowerCase()}
            </h2>
            <ul className="stagger mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {v.features.map((f, i) => (
                <li key={f.title} className="spotlight rounded-[24px] border border-line bg-paper p-6">
                  <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-cobalt to-mint font-display font-semibold text-white">{i + 1}</span>
                  <p className="mt-5 font-display text-xl font-semibold tracking-tight">{f.title}</p>
                  <p className="mt-2 text-ink-2">{f.body}</p>
                </li>
              ))}
            </ul>
            <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-[28px] bg-gradient-to-br from-cobalt to-[#5b3cff] p-8 text-white sm:flex-row sm:items-center sm:p-10">
              <div>
                <p className="font-display text-3xl font-semibold tracking-tight">Tu recepcionista lista hoy.</p>
                <p className="mt-2 text-white/80">14 días gratis, sin tarjeta. Configúrala en 2 minutos.</p>
              </div>
              <Magnetic>
                <Link href={signup} className="btn bg-white px-6 py-3.5 text-base text-cobalt hover:bg-white/90">
                  Crear mi cuenta
                </Link>
              </Magnetic>
            </div>
            <p className="mt-10 text-sm text-muted">
              También para:{" "}
              {VERTICAL_PAGES.filter((x) => x.slug !== v.slug).map((x, i, arr) => (
                <span key={x.slug}>
                  <Link href={`/para/${x.slug}`} className="text-cobalt hover:underline">
                    {x.name.toLowerCase()}
                  </Link>
                  {i < arr.length - 1 ? " · " : ""}
                </span>
              ))}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
