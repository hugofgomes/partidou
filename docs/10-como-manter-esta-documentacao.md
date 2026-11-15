<!-- revisado: 1.0.0 -->
# Como esta documentação se mantém atualizada

## O que atualiza sozinho
A cada build, `tools/build-docs.mjs` lê o código e regenera as seções automáticas: versão e histórico, migrations, tabelas e funções do banco, páginas e rotas de API (com acesso e métodos) e variáveis de ambiente (só nomes).

## O que precisa de revisão humana
- Os capítulos `docs/NN-nome.md` explicam o "porquê" e o "como"; cada um tem a marca `<!-- revisado: x.y.z -->`. Quando a versão do sistema passa dela, a tela avisa que o capítulo pode estar desatualizado.
- As descrições de páginas, APIs e variáveis ficam em `docs/descricoes.json`; itens novos sem descrição saem como aviso no build.

## Regra de ouro
Toda entrega que mude comportamento atualiza o capítulo, a marca `revisado`, `docs/descricoes.json` (se houver item novo) e o histórico de versões.

## Quem vê
Somente o dono da plataforma, em `/super/documentacao` (a rota `/api/docs` valida a sessão e confirma no banco).
