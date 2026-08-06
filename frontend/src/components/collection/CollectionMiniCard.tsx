import { CollectionView } from "@/hooks/useCollection";

interface CollectionMiniCardProps {
  card: CollectionView;
}

export function CollectionMiniCard({
  card,
}: CollectionMiniCardProps) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 transition-transform hover:scale-105 sm:w-28 sm:shrink-0">

      <img
        src={card.pokemon.images.small}
        alt={card.pokemon.name}
        className="h-32 max-w-full rounded-lg object-contain shadow-md sm:h-36"
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
