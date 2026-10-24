const IMAGE_HOSTS = new Set([
  "assets.tcgdex.net", "images.pokemontcg.io", "images.scrydex.com", "repositorio.sbrauble.com",
]);

// Return image bytes from our origin. Some catalogue responses contain duplicate
// Access-Control-Allow-Origin headers, which browsers reject when drawing to canvas.
export async function GET(request: Request) {
  let url: URL;
  try {
    url = new URL(new URL(request.url).searchParams.get("url") ?? "");
  } catch {
    return new Response("URL inválida", { status: 400 });
  }
  if (url.protocol !== "https:" || !IMAGE_HOSTS.has(url.hostname) || url.port || url.username || url.password) {
    return new Response("Origem não permitida", { status: 403 });
  }
  try {
    const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(15_000) });
    const type = response.headers.get("content-type") ?? "";
    if (!response.ok || !/^image\/(webp|png|jpeg|gif|avif)(;|$)/i.test(type)) {
      return new Response("Imagem indisponível", { status: 502 });
    }
    return new Response(await response.arrayBuffer(), {
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Não foi possível carregar a imagem", { status: 502 });
  }
}
