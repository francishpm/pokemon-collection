import { Bell, Plus, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8">

        <div>
          <h1 className="text-3xl font-bold text-blue-600">
            CardDex
          </h1>

          <p className="text-sm text-gray-500">
            Sua coleção Pokémon em um só lugar.
          </p>
        </div>

        <div className="flex items-center gap-3">

          <Button>
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

      </div>
    </header>
  );
}