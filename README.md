# ColecionaDex

Aplicativo para gerenciar uma coleção de cartas Pokémon TCG, acompanhar preços,
montar uma Pokédex e compartilhar vitrines públicas de coleção e trocas.

## Tecnologias

- Next.js, React e TypeScript
- Supabase Auth e PostgreSQL com Row Level Security
- Tailwind CSS e Zustand
- Catálogos TCGdex/Pokémon TCG API e referências da Liga Pokémon

## Desenvolvimento local

1. Entre em `frontend` e execute `npm install`.
2. Configure `frontend/.env.local`.
3. Aplique, em ordem, as migrations de `frontend/supabase/migrations` no Supabase.
4. Execute `npm run dev` e abra `http://localhost:3000`.

Variáveis utilizadas:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_POKEMON_TCG_API_KEY=
```

A chave da Pokémon TCG API é opcional. Credenciais `service_role` do Supabase nunca
devem ser colocadas no frontend ou versionadas.

## Validação

```bash
cd frontend
npm run lint
npm run test
npm run build
```

Arquivos `.env*`, builds, cobertura e dependências são ignorados pelo Git.
