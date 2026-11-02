"use client";

import { useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { cardImageSources } from "@/lib/cardImageSources";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "onError"> & { src: string; fallbackSrc?: string };

export function CardImage({ src, fallbackSrc, alt, className, ...props }: Props) {
  const sources = cardImageSources([src, fallbackSrc ?? ""]);
  const [failed, setFailed] = useState<string[]>([]);
  const current = sources.find((url) => !failed.includes(url));
  if (!current) {
    return <button type="button" onClick={() => setFailed([])} aria-label={`Tentar carregar imagem de ${alt}`} title="Imagem indisponível. Clique para tentar novamente." className={`inline-flex shrink-0 items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}><ImageOff size={24} /></button>;
  }
  // Multiple providers and our image proxy are tried before showing a placeholder.
  // eslint-disable-next-line @next/next/no-img-element
  return <img {...props} src={current} alt={alt} className={className} onError={() => setFailed((previous) => [...previous, current])} />;
}
