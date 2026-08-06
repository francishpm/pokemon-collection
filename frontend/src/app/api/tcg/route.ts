import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cardId = searchParams.get("id");

    if (!cardId) {
      return NextResponse.json({ error: "O ID da carta é obrigatório" }, { status: 400 });
    }

    const tcgResponse = await fetch(`https://api.pokemontcg.io/v2/cards/${cardId}`);
    
    if (!tcgResponse.ok) {
        throw new Error(`A TCG API falhou. Status: ${tcgResponse.status}`);
    }
    
    const tcgData = await tcgResponse.json();
    const card = tcgData.data;

    if (!card) {
       return NextResponse.json({ success: false, message: "Carta não encontrada." });
    }
    
    const prices = card.tcgplayer?.prices;
    let marketPriceUSD = 0;
    let tipoPrecoUsado = "Market"; // Só para sabermos internamente o que ele achou

    // 🔥 MODO SOBREVIVÊNCIA: Caça qualquer preço disponível!
    if (prices) {
        for (const key in prices) {
            const priceData = prices[key];
            
            if (priceData?.market) {
                marketPriceUSD = priceData.market;
                tipoPrecoUsado = "Market";
                break; // Se achou o Market, é o melhor. Para a busca!
            } else if (priceData?.mid && marketPriceUSD === 0) {
                marketPriceUSD = priceData.mid;
                tipoPrecoUsado = "Mid";
            } else if (priceData?.low && marketPriceUSD === 0) {
                marketPriceUSD = priceData.low;
                tipoPrecoUsado = "Low";
            }
        }
    }

    // Se mesmo varrendo TUDO o preço continuar 0, encerramos a busca graciosamente
    if (marketPriceUSD === 0) {
         return NextResponse.json({
            success: true,
            prices: { usd: 0, brl: 0, usdText: "", brlText: "" }
         });
    }

    const cotacaoResponse = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL");
    
    if (!cotacaoResponse.ok) {
        throw new Error(`A API de Cotação falhou. Status: ${cotacaoResponse.status}`);
    }

    const cotacaoData = await cotacaoResponse.json();
    const valorDolarHoje = parseFloat(cotacaoData.USDBRL.ask);

    const marketPriceBRL = marketPriceUSD * valorDolarHoje;

    const brlFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(marketPriceBRL);
    const usdFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(marketPriceUSD);

    return NextResponse.json({
      success: true,
      cotacaoDolarUsada: valorDolarHoje,
      tipoPrecoUsado: tipoPrecoUsado,
      prices: {
        usd: marketPriceUSD,
        brl: marketPriceBRL,
        usdText: usdFormatted,
        brlText: brlFormatted
      }
    });

  } catch (error) {
    console.error("Erro na API TCG:", error);
    const message = error instanceof Error ? error.message : "Erro inesperado ao consultar a carta.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
