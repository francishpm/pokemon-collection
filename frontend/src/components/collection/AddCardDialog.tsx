import { useEffect, useState } from "react";
import { PokemonCard } from "@/types/pokemon-card";
import { CardCondition, CardLanguage, CollectionCard as CollectionCardType } from "@/types/collection-card";
import { useCollectionStore } from "@/store/collectionStore";
import { savePokemonInCache } from "@/services/pokemonCache";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConditionSelector } from "./ConditionSelector";
import { PriceInput } from "./PriceInput";
import { cn } from "@/lib/utils";

interface AddCardDialogProps {
  card: PokemonCard | null;
  editingCard: CollectionCardType | null;
  onSuccess: () => void;
}

export function AddCardDialog({ card, editingCard, onSuccess }: AddCardDialogProps) {
  const [condition, setCondition] = useState<CardCondition>("NM");
  const [language, setLanguage] = useState<CardLanguage>("PT");
  const [acquisitionValue, setAcquisitionValue] = useState("");
  const [acquisitionDate, setAcquisitionDate] = useState("");
  const [notes, setNotes] = useState("");

  const [dadosMercado, setDadosMercado] = useState<any>(null);
  const [carregandoMercado, setCarregandoMercado] = useState(false);

  const { addCard, updateCard } = useCollectionStore();

  useEffect(() => {
    if (!card) return; // <-- Mudança 1: Removemos a trava do editingCard aqui

    const buscarPrecoMercado = async () => {
      setCarregandoMercado(true);
      try {
        const res = await fetch(`/api/tcg?id=${card.id}`);
        const data = await res.json();

        if (data.success) {
          setDadosMercado(data);
        }
      } catch (error) {
        console.error("Erro ao buscar dados do mercado:", error);
      } finally {
        setCarregandoMercado(false);
      }
    };

    buscarPrecoMercado();
  }, [card]); // <-- Mudança 2: Removemos o editingCard da lista de dependências aqui

  useEffect(() => {
    if (!editingCard) {
      setCondition("NM");
      setLanguage("PT");
      setAcquisitionValue("");
      setAcquisitionDate(new Date().toISOString().split("T")[0]);
      setNotes("");
      return;
    }

    setCondition(editingCard.condition);
    setLanguage(editingCard.language);
    setAcquisitionValue(editingCard.acquisitionValue?.toString() ?? "");
    setAcquisitionDate(editingCard.acquisitionDate ?? "");
    setNotes(editingCard.notes ?? "");
  }, [editingCard]);

  const handleSave = () => {
    if (!card) return;

    const baseCardData = {
      condition,
      language,
      acquisitionValue: acquisitionValue ? Number(acquisitionValue) : undefined,
      acquisitionDate: acquisitionDate || undefined,
      notes: notes || undefined,
    };

    if (editingCard) {
      updateCard({
        ...editingCard,
        ...baseCardData,
      });
      toast.success("Carta atualizada com sucesso!");
    } else {
      savePokemonInCache(card);
      addCard({
        id: crypto.randomUUID(),
        pokemonCardId: card.id,
        createdAt: new Date().toISOString(),
        ...baseCardData,
      });
      toast.success("Carta adicionada com sucesso!");
    }

    onSuccess();
  };

  if (!card) return null;

  const languages: { id: CardLanguage; label: string }[] = [
    { id: "PT", label: "Português" },
    { id: "EN", label: "Inglês" },
    { id: "JP", label: "Japonês" },
  ];

  // Variável para facilitar a checagem se o preço existe e é maior que 0
  const temPreco = dadosMercado && dadosMercado.prices.usd > 0;

  return (
    <div className="space-y-6">
      <div className="flex gap-4 rounded-xl bg-muted/20 p-4 border shadow-sm items-stretch">
        <img src={card.images.small} alt={card.name} className="h-36 rounded-md object-contain drop-shadow-md" />

        <div className="flex-1 flex flex-col justify-between py-1">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">{card.name}</h2>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {card.set.name} • #{card.number}/{card.set.printedTotal}
            </p>
          </div>

          {/* CAIXA DE VALOR DE MERCADO CAMALEÃO */}
          <div className={cn(
            "mt-3 rounded-lg border p-3 shadow-sm transition-colors",
            temPreco ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200 bg-slate-50"
          )}>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              temPreco ? "text-emerald-800/70" : "text-slate-500"
            )}>
              Média Global (TCGPlayer)
            </p>

            {carregandoMercado ? (
              <div className="h-7 w-32 animate-pulse rounded bg-slate-200 mt-1" />
            ) : temPreco ? (
              <div className="mt-1 flex flex-col">
                <span className="text-2xl font-black text-emerald-700 tracking-tight">{dadosMercado.prices.brlText}</span>
                <span className="text-xs font-semibold text-emerald-600/70 mt-0.5">
                  {dadosMercado.prices.usdText} (Dólar a R$ {dadosMercado.cotacaoDolarUsada?.toFixed(2).replace('.', ',')})
                </span>
              </div>
            ) : (
              <div className="mt-1 flex flex-col">
                <span className="text-lg font-bold text-slate-400">Preço indisponível</span>
                <span className="text-xs font-medium text-slate-400 mt-0.5">Sem registros recentes globais.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Condição da Carta</label>
          <ConditionSelector value={condition} onChange={setCondition} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Idioma</label>
          <div className="flex gap-2">
            {languages.map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setLanguage(lang.id)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-all",
                  language === lang.id
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-background text-muted-foreground hover:bg-slate-100 border-input"
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Valor Pago (Opcional)</label>
            <PriceInput value={acquisitionValue} onChange={setAcquisitionValue} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Data de Aquisição</label>
            <Input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none">Observações</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Ex: Comprada no evento, tirada no booster de R$ 14,00..."
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900"
          />
        </div>
      </div>

      <Button onClick={handleSave} className="w-full font-bold bg-slate-900 hover:bg-slate-800" size="lg">
        {editingCard ? "Salvar Alterações" : "Adicionar à Coleção"}
      </Button>
    </div>
  );
}