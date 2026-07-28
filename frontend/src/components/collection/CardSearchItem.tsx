import { Button } from "@/components/ui/button";
import { PokemonCard } from "@/types/pokemon-card";

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
            <img
                src={card.images.small}
                alt={card.name}
                className="h-20 rounded"
            />

            <div className="flex-1">
                <p className="font-medium">
                    {card.name}
                </p>

                <p className="text-sm text-muted-foreground">
                    {card.set.name}
                </p>

                <p className="text-xs text-muted-foreground">
                    #{card.number}/{card.set.printedTotal}
                </p>
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