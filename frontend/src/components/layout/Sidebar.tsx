"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ChartColumn,
    ChartPie,
    ChartNoAxesCombined,
    FolderOpen,
    BookMarked,
    BookOpen,
    Layers3,
    House,
    Star,
    Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const pathname = usePathname();

    if (pathname.startsWith("/public")) return null;

    const links = [
        { href: "/", icon: House, label: "Dashboard" },
        { href: "/collection", icon: FolderOpen, label: "Minha coleção" },
        { href: "/album", icon: BookMarked, label: "Álbum" },
        { href: "/statistics", icon: ChartPie, label: "Estatísticas" },
        { href: "/pokedex", icon: BookOpen, label: "Pokédex" },
        { href: "/master-sets", icon: Layers3, label: "Master Sets" },
        { href: "/wishlist", icon: Star, label: "Wishlist" },
        { href: "/trades", icon: Repeat, label: "Trocas" },
        { href: "/market", icon: ChartColumn, label: "Ranking de Valiosas" },
        { href: "/price-history", icon: ChartNoAxesCombined, label: "Histórico de preços" },
    ];

    return (
        <aside className="hidden md:flex h-screen w-72 shrink-0 flex-col border-r border-border bg-background p-8">
            <div>
                <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-500">
                    ColecionaDex
                </h1>
                <p className="text-sm text-muted-foreground">
                    Sua coleção Pokémon
                </p>
            </div>

            <nav className="mt-12 space-y-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(`${link.href}/`));

                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-4 py-3 font-medium transition-colors",
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
        </aside>
    );
}
