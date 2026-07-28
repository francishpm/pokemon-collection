import { useEffect, useState } from "react";

import { PokemonCard } from "@/types/pokemon-card";

import {
    CardCondition,
    CardLanguage,
} from "@/types/collection-card";

import { useCollectionStore } from "@/store/collectionStore";
import { toast } from "sonner";
import { savePokemonInCache } from "@/services/pokemonCache";
import { CollectionCard as CollectionCardType } from "@/types/collection-card";


interface AddCardDialogProps {
    card: PokemonCard | null;
    editingCard: CollectionCardType | null;
    onSuccess: () => void;
}

export function AddCardDialog({
    card,
    editingCard,
    onSuccess,
}: AddCardDialogProps) {

    const [condition, setCondition] =
        useState<CardCondition>("NM");

    const [language, setLanguage] =
        useState<CardLanguage>("PT");

    const [acquisitionValue, setAcquisitionValue] = useState("");

    const [acquisitionDate, setAcquisitionDate] = useState("");

    const [notes, setNotes] = useState("");

    const { addCard, updateCard } = useCollectionStore();

    useEffect(() => {
        if (!editingCard) {
            setCondition("NM");
            setLanguage("PT");
            setAcquisitionValue("");
            setAcquisitionDate("");
            setNotes("");
            return;
        }

        setCondition(editingCard.condition);
        setLanguage(editingCard.language);
        setAcquisitionValue(
            editingCard.acquisitionValue?.toString() ?? ""
        );
        setAcquisitionDate(
            editingCard.acquisitionDate ?? ""
        );
        setNotes(
            editingCard.notes ?? ""
        );
    }, [editingCard]);


    const handleSave = () => {
        if (!card) return;

        if (editingCard) {
            updateCard({
                ...editingCard,
                condition,
                language,
                acquisitionValue: acquisitionValue
                    ? Number(acquisitionValue)
                    : undefined,
                acquisitionDate: acquisitionDate || undefined,
                notes: notes || undefined,
            });

            toast.success("Carta atualizada com sucesso!");
        } else {
            savePokemonInCache(card);
            addCard({
                id: crypto.randomUUID(),
                pokemonCardId: card.id,
                language,
                condition,
                acquisitionValue: acquisitionValue
                    ? Number(acquisitionValue)
                    : undefined,
                acquisitionDate: acquisitionDate || undefined,
                createdAt: new Date().toISOString(),
                notes: notes || undefined,
            });

            toast.success("Carta adicionada com sucesso!");
        }

        setCondition("NM");
        setLanguage("PT");
        setAcquisitionValue("");
        setAcquisitionDate("");
        setNotes("");

        onSuccess();
    };

    if (!card) return null;

    return (
        <div className="space-y-6">
            <div className="flex gap-4">
                <img
                    src={card.images.small}
                    alt={card.name}
                    className="h-32 rounded-lg"
                />

                <div className="flex-1 space-y-1">
                    <h2 className="text-2xl font-bold">
                        {card.name}
                    </h2>

                    <p className="text-muted-foreground">
                        {card.set.name}
                    </p>

                    <p className="text-sm text-muted-foreground">
                        #{card.number}/{card.set.printedTotal}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">
                    Condição
                </label>

                <select
                    value={condition}
                    onChange={(e) =>
                        setCondition(e.target.value as CardCondition)
                    }
                    className="w-full rounded-md border px-3 py-2"
                >
                    <option value="NM">NM</option>
                    <option value="SP">SP</option>
                    <option value="MP">MP</option>
                    <option value="HP">HP</option>
                    <option value="D">D</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">
                    Idioma
                </label>

                <select
                    value={language}
                    onChange={(e) =>
                        setLanguage(e.target.value as CardLanguage)
                    }
                    className="w-full rounded-md border px-3 py-2"
                >
                    <option value="PT">Português</option>
                    <option value="EN">Inglês</option>
                    <option value="JP">Japonês</option>
                </select>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">
                    Valor de aquisição
                </label>

                <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={acquisitionValue}
                    onChange={(e) => setAcquisitionValue(e.target.value)}
                    placeholder="Ex: 150.00"
                    className="w-full rounded-md border px-3 py-2"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">
                    Data de aquisição
                </label>

                <input
                    type="date"
                    value={acquisitionDate}
                    onChange={(e) => setAcquisitionDate(e.target.value)}
                    className="w-full rounded-md border px-3 py-2"
                />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">
                    Observações
                </label>

                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Ex: Comprada em evento, assinatura, curiosidades..."
                    className="w-full rounded-md border px-3 py-2"
                />
            </div>
            <button
                onClick={handleSave}
                className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
                Salvar
            </button>
        </div>
    );
}