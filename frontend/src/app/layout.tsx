import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { GlobalModals } from "@/components/layout/GlobalModals";
import { Toaster } from "sonner";
import { AuthGuard } from "@/components/AuthGuard"; // <-- Importado aqui

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ColecionaDex - Gerenciador de Coleção Pokémon",
  description: "Gerencie sua coleção de cartas Pokémon TCG",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {/* AuthGuard envolvendo a estrutura principal */}
          <AuthGuard>
            <div className="flex h-screen overflow-hidden bg-background">
              <Sidebar />
              <div className="flex flex-col flex-1 h-full overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
                  {children}
                </main>
              </div>
            </div>
          </AuthGuard>
          <GlobalModals />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
