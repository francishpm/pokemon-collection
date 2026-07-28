import Link from "next/link";
import {
    ChartColumn,
    FolderOpen,
    House,
    Settings,
    Star,
} from "lucide-react";

export function Sidebar() {
    return (
        <aside className="flex h-screen w-72 flex-col border-r bg-white p-8">

            <div>
                <h1 className="text-4xl font-bold text-blue-600">
                    CardDex
                </h1>

                <p className="text-sm text-gray-500">
                    Sua coleção Pokémon
                </p>
            </div>

            <nav className="mt-12 space-y-2">

                <Link
                    href="/"
                    className="flex items-center gap-3 rounded-lg bg-blue-50 px-4 py-3 font-medium text-blue-600"
                >
                    <House size={20} />
                    Dashboard
                </Link>

                <Link
                    href="/collection"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-100"
                >
                    <FolderOpen size={20} />
                    Minha coleção
                </Link>

                <Link
                    href="/wishlist"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-100"
                >
                    <Star size={20} />
                    Wishlist
                </Link>

                <Link
                    href="/market"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-100"
                >
                    <ChartColumn size={20} />
                    Mercado
                </Link>

                <Link
                    href="/settings"
                    className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-100"
                >
                    <Settings size={20} />
                    Configurações
                </Link>

            </nav>

        </aside>
    );
}