import { PokemonCard } from "@/types/pokemon-card";
import { CardSearchItem } from "./CardSearchItem";

interface CardSearchResultsProps {
    cards: PokemonCard[];
    loading: boolean;
    error?: string | null;
    onAdd: (card: PokemonCard) => void;
}

export function CardSearchResults({
    cards,
    loading,
    error,
    onAdd,
}: CardSearchResultsProps) {
    if (loading && cards.length === 0) {
        return (
            <div className="p-10 text-center text-muted-foreground">
                Carregando...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-10 text-center text-sm text-destructive">
                {error}
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
