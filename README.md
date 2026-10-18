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
js/state.js           Constantes, estado, migração de dados antigos e utilitários (salvar, datas, toast)
js/finance.js         Cálculos: previsão, pagamentos, crédito parcelado, faturas, reservas e saldos, prazos, pasta
js/views.js           Renderização das páginas, listas e resumos
js/forms.js           Navegação e formulários de pendências e entradas
js/records.js         Detalhes da pendência: compras em etapas, pagamentos à vista e no crédito, parcelas
js/sources.js         Fontes de dinheiro, cartões e contas (apelidos), faturas e pasta do Consulado
js/backup.js          Exportar/importar backup JSON
js/exchange-rate.js   Cotação EUR/BRL (AwesomeAPI)
js/reorder.js         Reordenar pendências (setas e arrastar como bloco flutuante)
js/categories.js      Gerenciar categorias
js/main.js            Inicialização
js/cloud.js           Login com Google e sincronização com o Firestore (módulo, carregado por último)
firestore.rules       Regras de acesso ao banco (colar no console do Firebase)
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
Os dados ficam no Firebase (projeto `planejamento-espanha`), em um único documento do Firestore (`planos/familia`) compartilhado pela família. O acesso exige login com Google e só os e-mails listados em `firestore.rules` podem ler ou editar. Essas regras não são publicadas pelo git: depois de alterá-las, copie o conteúdo para Firebase → Firestore → Regras → Publicar.

O app também guarda uma cópia no navegador, então funciona sem internet e sincroniza quando a conexão volta. No primeiro login, o que já estiver lançado no navegador é enviado para a nuvem. "Sair" (em Ajustes) apaga a cópia local do aparelho.

Para o login funcionar no site publicado, `rafaelsassuncao.github.io` precisa estar em Firebase → Authentication → Configurações → Domínios autorizados.

A cotação exige internet; em caso de falha, o app mantém o último valor salvo e mostra um aviso.
