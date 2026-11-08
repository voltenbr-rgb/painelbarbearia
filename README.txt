BARBER DASHBOARD PRO
Publicação: Cloudflare Pages > Upload direto > envie esta pasta (index.html na raiz). Sem build, sem Node.
Instalar: abra o site no Chrome/Android > menu > "Instalar app". Funciona offline após o primeiro acesso.
Dados: IndexedDB do navegador. SEM sincronização entre dispositivos e SEM autenticação segura multiusuário.
Faça backup em Configurações > Exportar backup JSON. Camada de dados isolada em assets/js/app.js (put/del/load) para futura migração à Cloudflare D1.
PDF: Relatórios > Baixar PDF > "Salvar como PDF" na janela de impressão.

--- ATUALIZAÇÃO ---
* Senha de ADM (padrão 2506, altere em Configurações) agora também é pedida para: excluir agendamento, editar/excluir lançamento do Financeiro e editar/excluir produto do Estoque.
* Caixa > Receber pagamento: escolha um produto do estoque + quantidade; ao registrar, dá baixa no estoque (saída 'venda') e lança a entrada no financeiro.
* Configurações (nome, dados, logo, senha) salvam automaticamente e são sincronizadas pelo banco D1 para todos os aparelhos. Imagens são reduzidas antes de salvar.
* IMPORTANTE: reenvie também a pasta functions/ ao Cloudflare Pages (a function agora aceita a tabela 'settings').
* Botão de Suporte (WhatsApp 67 99646-2518) no menu e em Configurações.
