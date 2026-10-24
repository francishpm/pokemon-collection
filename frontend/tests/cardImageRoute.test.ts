import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../src/app/api/cards/image/route.ts";

const request = (url: string) => new Request(`http://localhost/api/cards/image?${new URLSearchParams({ url })}`);

test("image export proxy restricts sources and does not forward broken CORS headers", async (t) => {
  const bytes = new Uint8Array([82, 73, 70, 70]);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => new Response(bytes, {
    headers: { "content-type": "image/webp", "access-control-allow-origin": "*, *" },
  }));
  assert.equal((await GET(request("http://assets.tcgdex.net/a.webp"))).status, 403);
  assert.equal((await GET(request("https://localhost/a.webp"))).status, 403);
  assert.equal((await GET(request("https://assets.tcgdex.net:8443/a.webp"))).status, 403);
  assert.equal(fetchMock.mock.callCount(), 0);
  const response = await GET(request("https://assets.tcgdex.net/en/me/30th/147/low.webp"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  t.mock.method(globalThis, "fetch", async () => new Response("error", { headers: { "content-type": "text/html" } }));
  assert.equal((await GET(request("https://assets.tcgdex.net/a.webp"))).status, 502);
});
