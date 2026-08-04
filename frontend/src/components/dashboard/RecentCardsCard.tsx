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
      <CardContent className="flex-1 flex flex-col justify-center">

        {recentCards.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nenhuma carta cadastrada.
          </p>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-2">
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