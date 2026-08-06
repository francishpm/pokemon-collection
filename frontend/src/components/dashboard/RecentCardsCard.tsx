import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollectionView } from "@/hooks/useCollection";
import { CollectionMiniCard } from "@/components/collection/CollectionMiniCard";

interface RecentCardsCardProps {
  cards: CollectionView[];
}

export function RecentCardsCard({
  cards,
}: RecentCardsCardProps) {

  const recentCards = [...cards]
    .sort(
      (a, b) =>
        new Date(b.collection.createdAt).getTime() -
        new Date(a.collection.createdAt).getTime()
    )
    .slice(0, 5);

  return (
    // Adicionamos 'h-full flex flex-col' para ele esticar até o final
    <Card className="h-full flex flex-col shadow-sm border-slate-200">

      <CardHeader>
        <CardTitle className="text-lg font-semibold">🕒 Últimas cartas adicionadas</CardTitle>
      </CardHeader>

      {/* Adicionamos 'flex-1 justify-center' para ele centralizar as cartas no espaço extra */}
      <CardContent className="flex-1 flex flex-col justify-center px-4 pb-4 sm:px-6 sm:pb-6">

        {recentCards.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma carta cadastrada.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-6 sm:overflow-x-auto sm:pb-2">
            {recentCards.map((card) => (
              <CollectionMiniCard
                key={card.collection.id}
                card={card}
              />
            ))}
          </div>
        )}

      </CardContent>

    </Card>
  );
}
