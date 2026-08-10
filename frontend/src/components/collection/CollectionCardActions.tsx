import { Pencil, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    id: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
    canRepresentPokedex?: boolean;
    isPokedexRepresentative?: boolean;
    onSetPokedexRepresentative?: (id: string) => void;
}

export function CollectionCardActions({
    id,
    onEdit,
    onDelete,
    canRepresentPokedex = false,
    isPokedexRepresentative = false,
    onSetPokedexRepresentative,
}: Props) {
    return (
        <div
            className="
                absolute
                right-1.5
                top-1.5
                z-10
                flex
                gap-1
                rounded-full
                bg-black/50
                p-1
                backdrop-blur-sm
                opacity-100
                transition-all
                duration-300
                md:right-3
                md:top-3
                md:gap-2
                md:p-2
                md:opacity-0
                md:group-hover:opacity-100
                md:group-focus-within:opacity-100
            "
        >
            {canRepresentPokedex && onSetPokedexRepresentative && (
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 rounded-full border-0 text-white hover:bg-amber-400/40 md:h-8 md:w-8 ${
                        isPokedexRepresentative ? "bg-amber-400/40 text-amber-200" : "bg-white/20"
                    }`}
                    aria-label={isPokedexRepresentative ? "Carta escolhida para a Pokédex" : "Usar carta na Pokédex"}
                    title={isPokedexRepresentative ? "Escolhida para a Pokédex" : "Usar na Pokédex"}
                    onClick={(e) => {
                        e.stopPropagation();
                        onSetPokedexRepresentative(id);
                    }}
                >
                    <Star size={15} fill={isPokedexRepresentative ? "currentColor" : "none"} />
                </Button>
            )}

            <Button
                variant="ghost"
                size="icon"
                className="
                    h-7
                    w-7
                    rounded-full
                    border-0
                    bg-white/20
                    text-white
                    hover:bg-white/30
                    md:h-8
                    md:w-8
                "
                aria-label="Editar carta"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(id);
                }}
            >
                <Pencil size={15} />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="
                    h-7
                    w-7
                    rounded-full
                    border-0
                    bg-red-500/20
                    text-red-200
                    hover:bg-red-500/40
                    md:h-8
                    md:w-8
                "
                aria-label="Excluir carta"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                }}
            >
                <Trash2 size={15} />
            </Button>
        </div>
    );
}
