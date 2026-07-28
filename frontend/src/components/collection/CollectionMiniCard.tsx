import { CollectionView } from "@/hooks/useCollection";

interface CollectionMiniCardProps {
  card: CollectionView;
}

export function CollectionMiniCard({
  card,
}: CollectionMiniCardProps) {
  return (
    <div className="flex w-28 flex-col items-center gap-2 transition-transform hover:scale-105">

      <img
        src={card.pokemon.images.small}
        alt={card.pokemon.name}
        className="h-36 rounded-lg shadow-md"
      />

      <p
        className="w-full truncate text-center text-xs font-medium"
        title={card.pokemon.name}
      >
        {card.pokemon.name}
      </p>

    </div>
  );
}