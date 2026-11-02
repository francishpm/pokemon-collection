import { Button } from "@/components/ui/button";
import { PokemonCard } from "@/types/pokemon-card";
import { CardImage } from "./CardImage";

interface CardSearchItemProps {
    card: PokemonCard;

    onAdd: (card: PokemonCard) => void;
}

export function CardSearchItem({
    card,
    onAdd,
}: CardSearchItemProps) {
    return (
        <div className="flex cursor-pointer items-center gap-4 border-b p-4 transition-colors hover:bg-muted last:border-b-0">
            <CardImage
                src={card.images.small}
                fallbackSrc={card.images.large}
                alt={card.name}
                loading="lazy"
                decoding="async"
                className="h-20 w-14 shrink-0 rounded object-contain"
            />

            <div className="flex-1">
                {card.prizePack && <span className="mb-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">Play! Pokémon · Prize Pack</span>}
                <p className="font-medium">
                    {card.name}
                </p>

                <p className="text-sm text-muted-foreground">
                    {card.set.name}
                </p>

                <p className="text-xs text-muted-foreground">
                    #{card.number}/{card.set.printedTotalLabel ?? card.set.printedTotal}
                </p>
                {card.prizePack?.imageUnavailable && <p className="mt-1 text-xs text-muted-foreground">Imagem com selo ainda indisponível.</p>}
            </div>

            <Button
                size="sm"
                onClick={() => onAdd(card)}
            >
                Adicionar
            </Button>
        </div>
    );
}
