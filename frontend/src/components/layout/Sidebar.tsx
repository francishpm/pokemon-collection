"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    ChartColumn,
    FolderOpen,
    House,
    Settings,
    Star,
    Repeat,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
    const pathname = usePathname();

    const links = [
        { href: "/", icon: House, label: "Dashboard" },
        { href: "/collection", icon: FolderOpen, label: "Minha coleção" },
        { href: "/wishlist", icon: Star, label: "Wishlist" },
        { href: "/trades", icon: Repeat, label: "Trocas" },
        { href: "/market", icon: ChartColumn, label: "Ranking de Valiosas" },
        { href: "/settings", icon: Settings, label: "Configurações" },
    ];

    return (
        <aside className="hidden md:flex h-screen w-72 shrink-0 flex-col border-r border-border bg-background p-8">
            <div>
                <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-500">
                    CardDex
                </h1>
                <p className="text-sm text-muted-foreground">
                    Sua coleção Pokémon
                </p>
            </div>

            <nav className="mt-12 space-y-2">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;

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