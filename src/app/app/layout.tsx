import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Sidebar } from "@/components/app/Sidebar";
import { logoutAction } from "./actions";

export const metadata: Metadata = { title: "Panel", robots: { index: false } };

export default function AppLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:h-dvh lg:flex-col lg:items-stretch lg:justify-start lg:border-r lg:border-b-0 lg:px-4 lg:py-6">
        <Link href="/" className="lg:px-2" aria-label="Velora, sitio público">
          <Logo />
        </Link>
        <Sidebar />
        <form action={logoutAction} className="hidden lg:mt-auto lg:block">
          <button type="submit" className="w-full rounded-xl px-3 py-2.5 text-left text-[15px] text-muted hover:bg-porcelain hover:text-ink">
            Cerrar sesión
          </button>
        </form>
      </aside>
      <div className="min-w-0 pb-24 lg:pb-0">{children}</div>
    </div>
  );
}
