"use client";

import { Bell, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

const pages = {
  "/": {
    title: "Dashboard",
    subtitle: "Visão geral da sua coleção.",
  },
  "/collection": {
    title: "Minha coleção",
    subtitle: "Gerencie todas as suas cartas Pokémon.",
  },
  "/wishlist": {
    title: "Wishlist",
    subtitle: "Cartas que você deseja adquirir.",
  },
  "/market": {
    title: "Mercado",
    subtitle: "Acompanhe preços e tendências.",
  },
  "/settings": {
    title: "Configurações",
    subtitle: "Personalize o CardDex.",
  },
};

interface TopbarProps {
  onAddCard?: () => void;
}

export function Topbar({ onAddCard }: TopbarProps) {
  const pathname = usePathname();

  const page =
    pages[pathname as keyof typeof pages] ?? {
      title: "CardDex",
      subtitle: "",
    };

  return (
    <header className="flex items-center justify-between border-b bg-white px-8 py-6">

      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {page.title}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {page.subtitle}
        </p>
      </div>

      <div className="flex items-center gap-3">

        <Button onClick={onAddCard}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar carta
        </Button>

        <Button variant="outline" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <Button variant="outline" size="icon">
          <User className="h-5 w-5" />
        </Button>

      </div>

    </header>
  );
}