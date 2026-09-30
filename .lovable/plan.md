# Conectar exclusivamente ao Supabase externo

## Situação confirmada

- O código cliente ainda contém referências ao projeto externo `xqmmlrjkjbwzyuaqyrqj`.
- Porém, este projeto Lovable está atualmente vinculado ao Lovable Cloud e sua configuração interna aponta para outro backend.
- A integração oficial não permite trocar um projeto que já recebeu Lovable Cloud diretamente para um Supabase externo. Desativar o Cloud no workspace ou restaurar uma versão anterior não remove esse vínculo deste projeto.
- Nenhuma alteração de código, dados, banco ou configuração foi feita durante esta análise.

## Procedimento seguro

1. No menu principal do workspace, abra **Connectors → Lovable Cloud** e use **Disable Cloud** para impedir que novos projetos recebam Cloud automaticamente. Isso não altera este projeto nem seus dados.
2. Crie um novo projeto Lovable sem backend anexado, usando o mesmo repositório/código como origem. Não ative Cloud nesse novo projeto.
3. No novo projeto, abra **Project Settings → Integrations → Supabase → Connect**.
4. Conclua a autorização do workspace e selecione explicitamente o projeto existente com ref `xqmmlrjkjbwzyuaqyrqj`. Não escolha “criar novo projeto”.
5. Confirme que a integração mostra a URL `https://xqmmlrjkjbwzyuaqyrqj.supabase.co` antes de continuar.
6. Deixe a integração preencher as variáveis do navegador e do servidor. Não copie chaves manualmente, não altere `.env` e não execute migrations.
7. Faça primeiro uma validação somente de leitura: conferir as tabelas existentes e confirmar a contagem esperada de aproximadamente 331 clientes.
8. Depois, teste login e leitura do painel. Só então faça uma alteração controlada em um registro de teste, evitando qualquer importação ou rotina de criação de banco.

## Proteções durante a conexão

- Não executar migrations, seeds, importações ou criação de tabelas.
- Não usar ferramentas vinculadas ao backend atual para consultar ou alterar os dados reais.
- Não substituir dados existentes no Supabase externo.
- Não usar o endereço/chaves do Lovable Cloud no novo projeto.

## Limitação

A conexão externa não pode ser concluída dentro deste projeto já vinculado ao Cloud. Ela precisa ser feita em um novo projeto Lovable sem backend anexado; depois disso, o projeto externo existente permanece como única fonte de dados.
