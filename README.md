# Planejamento da Espanha

## Abrir no VS Code
1. Extraia este ZIP.
2. No VS Code, use Arquivo > Abrir Pasta e selecione a pasta extraída.
3. Abra index.html com a extensão Live Server (Open with Live Server), ou abra diretamente no navegador.

Não é necessário instalar dependências ou executar um build. O projeto usa HTML, CSS e JavaScript.

## Estrutura
```
index.html            Estrutura da página (menu, cabeçalho, modal)
css/styles.css        Todos os estilos
js/state.js           Constantes, dados iniciais, estado e utilitários (salvar, formatar, toast)
js/views.js           Renderização das páginas e tabelas
js/forms.js           Navegação e formulários de pendências e entradas
js/backup.js          Exportar/importar backup JSON
js/exchange-rate.js   Cotação EUR/BRL (AwesomeAPI)
js/reorder.js         Reordenar pendências (setas e arrastar)
js/categories.js      Gerenciar categorias
js/main.js            Inicialização (carregado por último)
```
Os scripts são carregados em ordem no `index.html` e compartilham variáveis globais, então mantenha essa ordem.

## Funcionalidades
- Visão geral com entradas, custos e saldo.
- Pendências editáveis, pagamento, prazos e observações.
- Reordenação por arraste e setas.
- Categorias personalizáveis e filtros.
- Cotação EUR/BRL automática ao abrir e a cada hora (AwesomeAPI).
- Exportação e importação de backup JSON.

## Dados
Os dados são salvos no localStorage deste navegador, na chave espanha-assuncao-v1. O app começa vazio; os lançamentos ficam só no navegador de cada aparelho e nunca vão para o repositório. Para transferir seus lançamentos entre aparelhos, exporte o backup em um e importe no outro.

A publicação em Vercel, GitHub Pages ou outra hospedagem estática pode usar index.html diretamente, sem build. A publicação não sincroniza dados entre dispositivos. Para isso, será preciso adicionar banco de dados e autenticação.

A cotação exige internet; em caso de falha, o app mantém o último valor salvo e mostra um aviso.
