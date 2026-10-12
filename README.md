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

## Scanner de cartas

Em **Adicionar carta → Escanear carta pela câmera**, abra a câmera ou envie uma foto JPG, PNG ou WebP. Enquadre uma carta inteira na vertical, com pouca margem, boa luz e sem reflexos. Use **Ler carta**, confira o nome e o número e clique em **Buscar correspondências**. Confirme a imagem e a edição antes de adicionar.

A leitura usa Tesseract.js no navegador; a foto não é enviada a um serviço de reconhecimento. Os recursos de reconhecimento são baixados na primeira leitura. A busca prioriza o número; o nome pode ser usado como filtro adicional. É uma leitura assistida, sem reconhecimento automático de holo/reverse, autenticidade ou conservação.

A câmera exige HTTPS ou localhost. Ao abrir o projeto no celular por um IP HTTP da rede local, use o envio de foto ou configure acesso HTTPS. Esta versão lê textos em português e inglês; cartas em outros idiomas podem exigir preenchimento manual.

O scanner mostra áreas ajustáveis para nome (azul) e número (amarelo). Use Ajustar nome ou Ajustar número para limitar a leitura ao texto desejado, e execute Ler carta novamente. Leituras com baixa confiança ou números conflitantes não preenchem os campos. Nomes muito próximos de uma única espécie podem ser sugeridos a partir do catálogo da Pokédex; isso não confirma a edição da carta.
