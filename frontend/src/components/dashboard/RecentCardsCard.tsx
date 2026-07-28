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
    <Card>

      <CardHeader>
        <CardTitle>🕒 Últimas cartas adicionadas</CardTitle>
      </CardHeader>

      <CardContent>

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