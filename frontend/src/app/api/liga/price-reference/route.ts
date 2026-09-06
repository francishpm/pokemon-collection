import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { collectLigaPrice, LigaPriceQuery } from "@/lib/ligaPriceCollector";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 50_000;
const MAX_REQUESTS_PER_MINUTE = 30;
const requestHistory = new Map<string, number[]>();
const activeUsers = new Set<string>();
const languages = new Set(["PT", "EN", "JP"]);
const conditions = new Set(["M", "NM", "SP", "MP", "HP", "D"]);

async function authenticate(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anonKey) return null;
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

function isOptionalText(value: unknown, maxLength: number) {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function isLigaPriceQuery(value: unknown): value is LigaPriceQuery {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  return typeof card.name === "string" && card.name.trim().length > 0 && card.name.length <= 160
    && typeof card.number === "string" && card.number.trim().length > 0 && card.number.length <= 40
    && typeof card.total === "string" && card.total.trim().length > 0 && card.total.length <= 40
    && typeof card.language === "string" && languages.has(card.language)
    && typeof card.condition === "string" && conditions.has(card.condition)
    && isOptionalText(card.id, 100)
    && isOptionalText(card.setName, 160)
    && isOptionalText(card.edition, 60);
}

function isRateLimited(userId: string) {
  const now = Date.now();
  const recent = (requestHistory.get(userId) ?? []).filter((timestamp) => now - timestamp < 60_000);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE) return true;
  requestHistory.set(userId, [...recent, now]);
  return false;
}

export async function POST(request: Request) {
  const user = await authenticate(request);
  if (!user) return NextResponse.json({ error: "Entre novamente para consultar os valores." }, { status: 401 });
  if (isRateLimited(user.id)) {
    return NextResponse.json({ error: "Muitas consultas em pouco tempo. Aguarde um minuto." }, { status: 429 });
  }
  if (activeUsers.has(user.id)) {
    return NextResponse.json({ error: "Uma consulta de valores já está em andamento." }, { status: 409 });
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Consulta muito grande." }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const cards = body && typeof body === "object" && Array.isArray((body as { cards?: unknown }).cards)
    ? (body as { cards: unknown[] }).cards
    : [];
  if (!cards.length || cards.length > 25 || !cards.every(isLigaPriceQuery)) {
    return NextResponse.json({ error: "Envie entre 1 e 25 cartas." }, { status: 400 });
  }
  const validatedCards = cards as LigaPriceQuery[];

  activeUsers.add(user.id);
  try {
    const results = new Array(validatedCards.length);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < validatedCards.length) {
        const index = nextIndex++;
        results[index] = await collectLigaPrice(validatedCards[index]);
      }
    }
    await worker();
    return NextResponse.json({ results });
  } finally {
    activeUsers.delete(user.id);
  }
}
