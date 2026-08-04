"use client";

import { useState } from "react";
import { Bell, Plus, User, Menu, X, House, FolderOpen, Star, Repeat, ChartColumn, Settings, LogOut, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { useUiStore } from "@/store/uiStore";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useTheme } from "next-themes";

const pages = {
  "/": { title: "Dashboard", subtitle: "Visão geral da sua coleção." },
  "/collection": { title: "Minha coleção", subtitle: "Gerencie todas as suas cartas." },
  "/wishlist": { title: "Wishlist", subtitle: "Cartas que você deseja adquirir." },
  "/trades": { title: "Trocas e Vendas", subtitle: "Gerencie suas duplicatas disponíveis para negócio." },
  "/market": { title: "Ranking de Valiosas", subtitle: "As cartas mais valiosas da sua coleção." },
  "/settings": { title: "Configurações", subtitle: "Personalize o CardDex." },
  "/profile": { title: "Minha Conta", subtitle: "Gerencie as informações da sua conta." },
};

const links = [
  { href: "/", icon: House, label: "Dashboard" },
  { href: "/collection", icon: FolderOpen, label: "Minha coleção" },
  { href: "/wishlist", icon: Star, label: "Wishlist" },
  { href: "/trades", icon: Repeat, label: "Trocas" },
  { href: "/market", icon: ChartColumn, label: "Ranking de Valiosas" },
  { href: "/settings", icon: Settings, label: "Configurações" },
];

export function Topbar() {
  const pathname = usePathname();
  const openSearchModal = useUiStore((state) => state.openSearchModal);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const page = pages[pathname as keyof typeof pages] ?? { title: "CardDex", subtitle: "" };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao tentar sair da conta.");
    } else {
      toast.info("Você saiu da conta.");
      router.push("/login");
    }
  };

  return (
    <>
      <header className="flex items-center justify-between border-b bg-background px-4 py-4 md:px-8 md:py-6 relative z-50">
        <div className="flex items-center gap-3">
          <button
            className="md:hidden p-1 text-slate-600 dark:text-slate-300"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">{page.title}</h1>
            <p className="hidden sm:block mt-1 text-xs md:text-sm text-muted-foreground">{page.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Botão principal fixo para abrir o modal de coleção por padrão */}
          <Button onClick={() => openSearchModal("collection")} className="h-9 px-3 md:px-4 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Adicionar carta</span>
          </Button>

          <Button variant="outline" size="icon" className="h-9 w-9 hidden sm:flex">
            <Bell className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            title="Minha Conta"
            onClick={() => router.push("/profile")}
          >
            <User className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 relative"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Alternar tema"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Alternar tema</span>
          </Button>

          <div className="h-6 w-px bg-border mx-1 hidden sm:block"></div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Sair da conta"
            className="h-9 w-9 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-[73px] left-0 right-0 bottom-0 z-40 bg-background border-t p-4 flex flex-col h-[calc(100vh-73px)]">
          <nav className="space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-4 font-medium transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon size={20} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}