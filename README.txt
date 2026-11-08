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

--- MULTI-LOJAS (tela inicial / ADM / MASTER) ---
* Ao abrir o app aparece a TELA INICIAL: [Loja] e [ADM].
  - Loja: entra no dashboard normal (se houver mais de uma loja liberada, pergunta qual).
  - ADM: pede nome + senha de ADM (padrão 2506). Mostra o resumo de cada loja, o resumo da loja principal,
    o relatório de todas/escolhidas (PDF e CSV) e as configurações (loja principal, abrir direto na loja, senha).
* MASTER (só o criador): botão INVISÍVEL no canto SUPERIOR DIREITO da tela inicial. Toque ali, digite 1989.
  Marque as lojas liberadas (até 10) e dê nome. Salvar desbloqueio → vale para todos os aparelhos do cliente.
* Cada loja tem dados separados (clientes, caixa, estoque...). A Loja 1 usa o banco que já existia (nada se perde).
  No D1 as lojas 2, 3... são gravadas com sufixo @2, @3 (ex.: clients@2).
* A function /api/salvar recusa gravar em loja não liberada e só aceita liberar loja com a senha master.
  Para trocar a senha master no servidor: Cloudflare Pages > Settings > Variables > MASTER_PIN.
  (Se MASTER_PIN não existir, vale 1989.)
* IMPORTANTE: reenvie a pasta functions/ junto com o resto.
* O ADM pode renomear cada loja em ADM > Configurações > Nome das lojas (vazio = volta ao nome padrão).

--- AJUSTES FINAIS ---
* Estoque: removidas as setas de baixar/retirar manualmente. Ficou só ➕ (adicionar ao estoque) e 🛒 (venda, que lança no financeiro).
  A baixa de estoque acontece no ato da venda (Caixa > Receber pagamento). Editar/excluir produto continua pedindo a senha de ADM.
* Senha de cada loja: em ADM > Configurações > "Senha de entrada das lojas" o dono define a senha de cada loja (padrão 2506; vazio volta ao padrão).
  Quem toca em "Loja" só entra com a senha da loja escolhida. O ADM abre qualquer loja sem senha. Sincroniza entre aparelhos (registro global/adm).
* Tema: em ADM > Configurações > "Tema do aplicativo" o dono escolhe Escuro ou Claro para todas as lojas e aparelhos.
  O botão de alternar tema saiu das Configurações da loja.
* Master: o botão do canto superior direito da tela inicial agora tem um pontinho visível (claro no fundo preto, escuro no fundo branco).
