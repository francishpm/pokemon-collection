import { NextResponse } from "next/server";

const ALLOWED_HOST = "repositorio.sbrauble.com";
const ALLOWED_PATH = "/arquivos/up/comp/imgnum/files/img/";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get("url");
  if (!source) return NextResponse.json({ error: "URL ausente." }, { status: 400 });

  let url: URL;
  try {
    url = new URL(source);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }

  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST || !url.pathname.startsWith(ALLOWED_PATH)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
    headers: { "User-Agent": "Mozilla/5.0 ColecionaDex/1.0" },
  });
  if (!response.ok) {
    return NextResponse.json({ error: "Imagem indisponível." }, { status: response.status });
  }

  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
