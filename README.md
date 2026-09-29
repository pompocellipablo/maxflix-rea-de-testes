# MaxFlix - Controle de Clientes 

Crie um aplicativo web de gestão de clientes para um negócio de IPTV, com interface limpa, responsiva (mobile-first) e em português brasileiro. O sistema deve funcionar como um painel de controle (dashboard) com tabela de clientes e lógica de automação de status por data.

Estrutura de dados do cliente

Cada cliente deve ter os seguintes campos: nome do cliente, login (usuário de acesso ao painel IPTV), servidor (seleção via dropdown, ver lista abaixo), custo do crédito (preenchido automaticamente conforme o servidor escolhido, mas editável manualmente), valor pago pelo cliente (input manual), lucro (calculado automaticamente: valor pago − custo do crédito), data de vencimento (data padrão de expiração do acesso), data de vencimento financeiro (usada apenas quando o cliente pagou um pacote de vários meses adiantado), WhatsApp (número do cliente), status (calculado automaticamente, não editável diretamente), e histórico de custo e valor pago anteriores (usado para restaurar os valores quando um cliente vencido for renovado).

Servidores e custo automático do crédito

Ao selecionar o servidor no cadastro/edição do cliente, o campo de custo deve ser preenchido automaticamente com os valores abaixo, mas permanecer editável manualmente:

Elite: R$ 10,00. Now: R$ 8,50. Five: R$ 6,50. Uniplay, UniP2P, Fast, All Play, GF, Blade e Club: sem valor fixo pré-definido (campo de custo livre para preenchimento manual, mantendo a mesma estrutura de cálculo de lucro).

Regras de status automático (baseado na data de vencimento)

O status deve ser recalculado automaticamente todos os dias, comparando a data atual com a data de vencimento. Importante: a comparação deve considerar apenas dia, mês e ano (ignorando horário/timestamp), para evitar que clientes com vencimento hoje sejam incorretamente classificados como vencidos.

Vencido: a data de vencimento já passou (é anterior ao dia atual). Vence hoje: a data de vencimento é exatamente igual ao dia atual. Vence em 2 dias, vence em 3 dias, vence em 4 dias, vence em 5 dias: faltam exatamente essa quantidade de dias para o vencimento. Ativo: o vencimento está a mais de 5 dias de distância, e não há vencimento financeiro futuro pendente. Ativo (X meses restantes): quando o cliente possui uma data de vencimento financeiro futura (indicando pacote de meses pagos adiantado), o status deve exibir "Ativo" seguido do número de meses restantes até essa data (ex: "Ativo — 5 meses restantes").

A lógica de vencimento financeiro serve para pacotes de meses pagos adiantado. O vencimento normal continua controlando a necessidade de renovação mensal no Painel IPTV, mas o vencimento financeiro indica até quando o cliente já pagou. Quando a renovação do vencimento normal ocorrer dentro do período coberto pelo vencimento financeiro, o sistema deve exibir um aviso "Renovação sem custo — pacote pago até [data do vencimento financeiro]".

Botão de renovação de cliente

Cada cliente deve ter um botão "Renovar Cliente" que, ao ser clicado: atualiza a data de vencimento para o próximo ciclo mensal a partir da data de vencimento atual; não altera a data de vencimento financeiro se ela for posterior à nova data de vencimento calculada (a data de vencimento financeiro só deve ser atualizada manualmente pelo usuário, quando o cliente pagar um novo pacote de meses); e, se o cliente estava com status "vencido" (custo e valor pago zerados), restaura automaticamente os últimos valores de custo e valor pago armazenados no histórico, recalculando o lucro.

Regra de zeramento de valores para clientes vencidos

Quando o status do cliente mudar para "Vencido": o campo de custo do crédito é zerado (R$ 0,00), o campo de valor pago é zerado (R$ 0,00), o lucro é recalculado como R$ 0,00, e esses valores não entram no somatório de lucro total do dashboard enquanto o cliente estiver vencido. Os valores reais de custo e valor pago (antes do zeramento) devem ser armazenados internamente, para que, ao renovar o cliente, retornem automaticamente aos campos e voltem a compor o cálculo de lucro.

Botão de mensagem de renovação (WhatsApp)

Cada cliente deve ter um botão "Enviar Renovação" que abre uma conversa no WhatsApp (usando link wa.me com o número do cliente) já com uma mensagem de texto predefinida de renovação. Esse texto padrão deve ser customizável nas configurações do sistema, mas com um modelo inicial pronto de aviso de vencimento/renovação.

Abas e filtros de visualização

O sistema deve ter as seguintes abas: Todos os clientes, Vencidos, Vence hoje, e Vencendo em breve (com um seletor de intervalo de 2 a 5 dias dentro dessa aba, permitindo ao usuário escolher visualizar quem vence em 2, 3, 4 ou 5 dias). Cada aba deve exibir a tabela de clientes filtrada, mantendo todas as colunas: nome, login, servidor, vencimento, vencimento financeiro, custo, valor pago, lucro, WhatsApp, status e botões de ação.

Dashboard/resumo

Incluir no topo: total de clientes, total de clientes ativos, total de clientes vencidos, total de clientes vencendo hoje, total de clientes vencendo nos próximos 5 dias, e lucro total do período (somando apenas clientes não vencidos, conforme regra de zeramento). Destacar visualmente (cor de alerta) os totais de "vence hoje" e "vencidos", por exigirem ação mais urgente.

Funcionalidades gerais

Cadastro, edição e exclusão de clientes; busca por nome ou login; ordenação por data de vencimento; interface visual com cores indicativas de status (verde para ativo, amarelo para vencendo em breve, laranja para vence hoje, vermelho para vencido); persistência de dados em banco de dados integrado; e exportação da lista de clientes filtrada em formato CSV.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://status-zen-iptv.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/ac73e827-59aa-44df-87d5-129f64c25678).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
