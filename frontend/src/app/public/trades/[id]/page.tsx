"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { ArrowLeftRight, ArrowUpDown, ImageOff, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface PublicTrade {
  id: string;
  price: number | null;
  condition: string | null;
  language: string | null;
  card_id: string;
  card_name: string | null;
  card_image_url: string | null;
  card_set_name: string | null;
  card_number: string | null;
  card_set_printed_total: number | null;
}

export default function PublicTradesPage() {
  const params = useParams();
  const shareToken = params.id as string;
  const [trades, setTrades] = useState<PublicTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"default" | "price-asc" | "price-desc" | "name">("default");

  useEffect(() => {
    let isMounted = true;

    const fetchPublicTrades = async () => {
      if (!shareToken) return;
      setLoading(true);

      try {
        const { data, error } = await supabase.rpc("get_public_trades", { share_token: shareToken });

        if (error) throw error;
        if (isMounted) setTrades((data ?? []) as PublicTrade[]);
      } catch (error) {
        console.error("Erro ao carregar vitrine:", error);
        if (isMounted) setTrades([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchPublicTrades();
    return () => {
      isMounted = false;
    };
  }, [shareToken]);

  const filteredTrades = trades.filter((trade) =>
    (trade.card_name ?? trade.card_id).toLowerCase().includes(search.trim().toLowerCase())
  ).sort((a, b) => {
    if (sort === "name") return (a.card_name ?? a.card_id).localeCompare(b.card_name ?? b.card_id, "pt-BR");
    if (sort === "price-asc" || sort === "price-desc") {
      // Cards offered only for exchange stay after priced cards.
      if (a.price == null && b.price != null) return 1;
      if (a.price != null && b.price == null) return -1;
      if (a.price == null && b.price == null) return 0;
      return sort === "price-asc" ? a.price! - b.price! : b.price! - a.price!;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 w-full absolute top-0 left-0 z-[100] overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2 mt-8">
          <div className="inline-flex items-center justify-center p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-2">
            <ArrowLeftRight className="text-blue-600 dark:text-blue-400" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Vitrine de Trocas e Vendas</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Confira as cartas disponíveis para negócio. Achou algo legal? Entre em contato comigo para fechar acordo!
          </p>
        </div>

        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Buscar carta na vitrine..."
              className="h-12 rounded-full border-slate-200 bg-white pl-10 dark:border-slate-800 dark:bg-slate-900"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <label className="relative flex h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <ArrowUpDown size={16} className="text-blue-500" />
            <span className="sr-only">Organizar por</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-full min-w-40 appearance-none bg-transparent pr-1 outline-none">
              <option value="default">Mais recentes</option>
              <option value="price-asc">Menor valor</option>
              <option value="price-desc">Maior valor</option>
              <option value="name">Nome (A–Z)</option>
            </select>
          </label>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center mt-12 gap-3 text-slate-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="animate-pulse font-medium">Arrumando a vitrine...</p>
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mt-8">
            <p className="text-slate-500 font-medium">Nenhuma carta disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 mt-8">
            {filteredTrades.map((trade) => (
              <div key={trade.id} className="relative rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-3 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                {trade.card_image_url ? (
                  <Image src={trade.card_image_url} alt={trade.card_name ?? "Carta Pokémon"} width={245} height={342} className="mx-auto h-40 md:h-52 w-full object-contain" />
                ) : (
                  <div className="mx-auto flex h-40 md:h-52 w-full items-center justify-center text-slate-400">
                    <ImageOff size={32} aria-label="Imagem não disponível" />
                  </div>
                )}
                <div className="mt-3 flex flex-col items-center gap-1 text-center">
                  <h3 className="line-clamp-2 h-11 text-sm font-bold leading-5">{trade.card_name ?? "Carta sem dados salvos"}</h3>
                  {trade.card_set_name && (
                    <p className="text-xs text-slate-500">
                      {trade.card_set_name} {trade.card_number ? `• #${trade.card_number}${trade.card_set_printed_total ? `/${trade.card_set_printed_total}` : ""}` : ""}
                    </p>
                  )}
                  <div className="flex justify-center gap-2 mt-1">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{trade.condition || "NM"}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{trade.language || "PT"}</span>
                  </div>
                </div>
                <div className="mt-3 flex justify-center">
                  <span className="inline-flex rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                    {trade.price ? trade.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Apenas troca"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && trades.length > 0 && filteredTrades.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-800 dark:bg-slate-900">
            Nenhuma carta encontrada para essa busca.
          </div>
        )}
      </div>
    </div>
  );
}
