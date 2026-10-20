import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Retrivra", description: "Self-hostable document intelligence and semantic retrieval." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="sr-only focus:not-sr-only" href="#main">Skip to content</a><header className="border-b border-slate-200 bg-white px-6 py-5"><div className="mx-auto max-w-7xl text-xl font-bold">Retrivra</div></header>{children}<footer className="mx-auto max-w-4xl px-6 py-8 text-sm text-slate-600">Self-hostable. Privacy-conscious. Open source.</footer></body></html>;
}
