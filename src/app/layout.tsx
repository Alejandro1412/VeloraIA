import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Self-hosted variable fonts: no third-party request at build or runtime.
const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-Variable.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

const geist = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://velora.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Velora — Recepcionista IA para negocios con citas",
    template: "%s · Velora",
  },
  description:
    "Velora contesta tu WhatsApp y tus llamadas las 24 horas, agenda citas, envía recordatorios y reduce las inasistencias. Un producto de IONEX.",
  applicationName: "Velora",
  authors: [{ name: "IONEX" }],
  keywords: ["recepcionista IA", "agendamiento WhatsApp", "citas", "odontología", "recordatorios", "Colombia"],
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Velora",
    title: "Velora — Tu agenda se llena sola",
    description: "Recepcionista con IA que agenda, confirma y reprograma citas por WhatsApp y voz, 24/7.",
  },
  twitter: { card: "summary_large_image", title: "Velora — Tu agenda se llena sola" },
};

export const viewport: Viewport = {
  themeColor: "#edf1f6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${bricolage.variable} ${geist.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
