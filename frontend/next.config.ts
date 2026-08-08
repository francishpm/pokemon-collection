import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "assets.tcgdex.net" },
      { protocol: "https", hostname: "images.scrydex.com" },
      { protocol: "https", hostname: "repositorio.sbrauble.com" },
    ],
  },
};

export default nextConfig;
