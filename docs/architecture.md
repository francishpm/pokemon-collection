# CardDex - Modelo de Dados

## Objetivo

O CardDex será dividido em dois grandes grupos de dados:

- Catálogo de Cartas
- Dados do Usuário

---

# Catálogo de Cartas

Representa todas as cartas existentes do Pokémon TCG.

Origem:
Pokémon TCG API

Cada carta será armazenada apenas uma vez.

Exemplos de dados:

- id
- name
- number
- set
- rarity
- supertype
- subtypes
- hp
- types
- attacks
- weaknesses
- imageUrl

---

# Coleção do Usuário

Representa uma carta física pertencente ao usuário.

Cada registro representa apenas UMA carta.

Não existe quantidade.

Exemplos de dados:

- id
- pokemonCardId
- condition
- language
- finish
- acquisitionValue
- acquisitionDate
- favorite
- notes
- createdAt

---

# Wishlist

Representa cartas desejadas pelo usuário.

Cada registro referencia uma carta do catálogo.

---

# Histórico de Preços

Armazena a evolução do preço de uma carta ao longo do tempo.

---

# Regras do Projeto

- Uma carta física = um registro.
- Não existe campo quantidade.
- O catálogo é separado da coleção.
- A coleção referencia o catálogo através do pokemonCardId.
- As imagens não serão armazenadas.
- Apenas a URL da imagem será salva.
- Valor de Aquisição representa o valor da carta quando entrou para a coleção.

# Entidades

## PokemonCard

Representa uma carta existente no catálogo do CardDex.

Origem:
Pokémon TCG API

Nunca pertence ao usuário.

---

## CollectionCard

Representa uma carta física pertencente ao usuário.

Cada registro representa apenas uma cópia.

Uma CollectionCard sempre referencia uma PokemonCard.

---

## WishlistCard

Representa uma carta desejada pelo usuário.

Sempre referencia uma PokemonCard.

---

## PriceHistory

Representa o histórico de preço de uma PokemonCard.

Uma carta poderá possuir vários registros de preço ao longo do tempo.

---

## User

Representa o proprietário da coleção.

No momento existirá apenas um usuário local.

No futuro poderá existir autenticação.

# Relacionamentos

PokemonCard

↓

CollectionCard

Uma carta do catálogo pode existir em várias coleções.

Cada CollectionCard referencia apenas uma PokemonCard.

---

PokemonCard

↓

WishlistCard

Uma carta pode existir em várias listas de desejos.

---

PokemonCard

↓

PriceHistory

Uma carta possui vários registros de preço.

---

User

↓

CollectionCard

Um usuário possui várias cartas.

---

User

↓

WishlistCard

Um usuário possui uma wishlist.