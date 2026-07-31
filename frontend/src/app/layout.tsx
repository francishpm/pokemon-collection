import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { GlobalModals } from "@/components/layout/GlobalModals";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CardDex",
  description: "Gerenciador de Coleção de Cartas Pokémon",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          {/* Sidebar Global e Fixa */}
          <Sidebar />

          {/* Área Principal (Topbar + Conteúdo da Página) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <Topbar />
            
            {/* O scroll acontece apenas aqui dentro */}
            <main className="flex-1 overflow-y-auto p-8">
              <div className="mx-auto max-w-7xl">
                {children}
              </div>
            </main>
          </div>
        </div>

        {/* Utilitários Globais invisíveis até serem chamados */}
        <GlobalModals />
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}