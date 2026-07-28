import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    id: string;
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

export function CollectionCardActions({
    id,
    onEdit,
    onDelete,
}: Props) {
    return (
        <div
            className="
                absolute
                right-3
                top-3
                flex
                gap-2
                rounded-full
                bg-black/50
                p-2
                backdrop-blur-sm
                opacity-0
                transition-all
                duration-300
                group-hover:opacity-100
            "
        >
            <Button
                variant="ghost"
                size="icon"
                className="
                    h-8
                    w-8
                    rounded-full
                    border-0
                    bg-white/20
                    text-white
                    hover:bg-white/30
                "
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
                    h-8
                    w-8
                    rounded-full
                    border-0
                    bg-red-500/20
                    text-red-200
                    hover:bg-red-500/40
                "
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