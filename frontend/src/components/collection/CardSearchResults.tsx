import { PokemonCard } from "@/types/pokemon-card";
import { CardSearchItem } from "./CardSearchItem";

interface CardSearchResultsProps {
    cards: PokemonCard[];
    loading: boolean;
    onAdd: (card: PokemonCard) => void;
}

export function CardSearchResults({
    cards,
    loading,
    onAdd,
}: CardSearchResultsProps) {
    if (loading) {
        return (
            <div className="p-10 text-center text-muted-foreground">
                Carregando...
            </div>
        );
    }

    if (cards.length === 0) {
        return (
            <div className="p-10 text-center text-muted-foreground">
                Nenhuma carta encontrada.
            </div>
        );
    }

    return (
        <>
            {cards.map((card) => (
                <CardSearchItem
                    key={card.id}
                    card={card}
                    onAdd={onAdd}
                />
            ))}
        </>
    );
}