# Torneios da ColecionaDex

Primeira versão: liga independente no modelo Challenge, categoria única, sem Top Cut, de 4 a 128 jogadores. Não integra o TOM nem envia resultados ao Play! Pokémon.

## Ativação no Supabase

Execute **uma vez**, no SQL Editor do projeto Supabase utilizado pelo frontend:

`frontend/supabase/migrations/20261103_add_tournaments.sql`

A migração cria tabelas novas, políticas RLS e funções transacionais. Não altera as cartas, coleções ou trocas existentes. O cadastro de `francishpm@gmail.com` precisa existir previamente em Authentication: a migração vincula seu UUID à tabela privada de organizadores. E-mails enviados pelo navegador ou dados editáveis do perfil não concedem essa permissão.

Se a conta só tiver sido criada depois da migração, um administrador do banco pode executar:

```sql
insert into public.tournament_admins(user_id)
select id from auth.users where lower(email) = 'francishpm@gmail.com'
on conflict do nothing;
```

Nenhuma credencial `service_role` é necessária no navegador. O repositório contém a migração, mas ela não é aplicada automaticamente ao banco remoto.

Para habilitar **Excluir torneio**, execute também `frontend/supabase/migrations/20261103_add_tournament_deletion.sql`. Não execute novamente a migração inicial. Somente o organizador pode excluir, confirmando com o código do evento. A operação é definitiva e remove inscrições, partidas, resultados e auditoria daquele evento; preserva contas, favoritos e outros torneios.

## Fluxo para testar

1. Entre como Francis, abra **Torneios** no menu e crie um evento.
2. Copie o código de cinco dígitos. Cada evento recebe um código exclusivo, incluindo zeros à esquerda.
3. Em pelo menos quatro contas diferentes, informe esse código, nome de jogador, nome de deck e Pokémon favorito. O favorito é salvo no perfil e também na inscrição para preservar o histórico.
4. Como organizador, encerre as inscrições e inicie. A quantidade inicial de participantes fixa as rodadas: 4–8 → 3, 9–16 → 4, 17–32 → 5, 33–64 → 6, 65–128 → 7.
5. Em contas adversárias, envie **Venci / Perdi**, **Perdi / Venci** ou **Empate / Empate**. Só respostas compatíveis confirmam a partida. Um único envio não pontua. Divergências podem ser corrigidas pelos jogadores até a confirmação.
6. Confira a tela de resultado com o Pokémon favorito. Ela é exibida uma vez por partida/resultado na sessão do navegador. Vitória tem celebração; derrota tem animação de queda; empate tem confirmação neutra. Sprites animados disponíveis até a geração V; demais usam imagem estática. Falhas de download têm alternativa visual. Preferência de movimento reduzido é respeitada.
7. O organizador pode corrigir resultados com motivo obrigatório, incluindo após confirmação. O banco registra autor, horário, resultado anterior e novo. Confrontos já gerados não são alterados retroativamente.
8. A próxima rodada só abre quando todas as partidas estiverem confirmadas. Na última rodada, o mesmo controle finaliza o torneio.

Atualização automática a cada dez segundos enquanto a aba estiver visível, além do botão Atualizar. O Dashboard mostra um atalho para eventos em andamento.

## Regras e limites

- Referência implementada: **Play! Pokémon Tournament Rules Handbook, revisão de 01/01/2025**, tabelas Swiss Only e critérios de resistência. Cópia do documento oficial: https://media.pocketmonsters.net/pdf/play-pokemon-tournament-rules-handbook-en-2025-01-01.pdf
- O PDF vigente no domínio oficial estava bloqueado durante esta implementação. A revisão atual precisa ser validada antes de usar como ferramenta de evento oficial. A versão da regra é registrada no torneio.
- Categoria única é uma configuração desta liga, não uma implementação das regras de combinação de divisões etárias oficiais.
- Vitória e bye: 3 pontos; empate: 1; derrota: 0.
- Byes não entram no numerador nem no denominador de vitórias para resistência e não criam um adversário fictício. O mesmo jogador não recebe dois byes. O bye é escolhido entre os jogadores de menor pontuação elegíveis para um emparceiramento válido.
- Emparelhamento prioriza pontuações próximas com ordem sorteada e busca alternativas sem repetir confrontos. Se não houver solução dentro do tempo de execução do banco, a transação é cancelada; a rodada não fica parcialmente criada.
- Ordem: pontos, média de vitórias dos adversários (piso de 25%), média de resistência dos adversários. Para exatamente dois jogadores ainda empatados, aplica confronto direto; se necessário, desempata pela chave aleatória persistida na inscrição. Outros empates completos usam a mesma chave aleatória, para que a classificação não mude a cada atualização.
- Correções administrativas amplas são uma escolha desta liga, com auditoria; não implementam todas as restrições de correções de súmulas de eventos oficiais.
- Sem desistências, cancelamentos, inscrições tardias, alteração de deck após inscrição, temporizador ou opção Cup nesta versão.
- O código permite inscrição, mas não concede papel de organizador. Apenas membros do evento e o organizador consultam seus participantes e partidas. Os códigos não devem ser tratados como senhas de alta segurança.
- Sprites: repositório público PokeAPI/sprites. O catálogo de espécies reutiliza a rota existente do projeto.

## Verificação técnica

```powershell
cd frontend
npm.cmd test
npm.cmd run build
```

`tests/tournamentDatabase.test.ts` usa PostgreSQL local isolado via PGlite, sem acessar seu Supabase. Executa a migração real e testa permissões de usuário/organizador, isolamento entre eventos, confirmação dupla, conflitos, auditoria, byes, limites de rodadas e prevenção de confrontos repetidos.
