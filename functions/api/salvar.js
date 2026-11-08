// Cloudflare Pages Function — rota /api/salvar
// Binding D1 esperado: DB (banco "banco-volten")
// Variáveis de ambiente opcionais:
//   SYNC_TOKEN  → senha de sincronização
//   MASTER_PIN  → senha do MASTER (padrão 1989). Só quem tem essa senha consegue liberar lojas.
//
// Multi-lojas: a Loja 1 usa os nomes de store normais (clients, finance...).
// As lojas 2, 3... usam sufixo "@N" (clients@2, finance@3...).
// O registro global/lojas (lista de lojas liberadas) só é gravado com o header x-master-pin correto,
// e gravações em lojas 2+ são recusadas enquanto a loja não estiver liberada.

const STORES = ["clients", "barbers", "services", "appointments", "finance", "products", "stock", "settings"];
const GLOBAL_IDS = ["lojas", "adm"];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });

function naoAutorizado(context) {
  const token = context.env.SYNC_TOKEN;
  if (token && context.request.headers.get("x-sync-token") !== token) {
    return json({ error: "Não autorizado" }, 401);
  }
  return null;
}

const masterOk = (context) =>
  context.request.headers.get("x-master-pin") === (context.env.MASTER_PIN || "1989");

// "clients" → {base:"clients", n:1} · "clients@2" → {base:"clients", n:2} · "global" → {base:"global", n:1}
function parseStore(s) {
  const m = /^([a-z]+)(?:@(\d{1,2}))?$/.exec(String(s || ""));
  if (!m) return null;
  if (m[1] === "global") return m[2] ? null : { base: "global", n: 1 };
  const n = m[2] ? Number(m[2]) : 1;
  if (!STORES.includes(m[1]) || n < 1 || n > 20) return null;
  return { base: m[1], n };
}

// Cria a tabela automaticamente na primeira chamada
const garantirTabela = (db) =>
  db.prepare(
    "CREATE TABLE IF NOT EXISTS registros (" +
    "store TEXT NOT NULL, id TEXT NOT NULL, data TEXT, " +
    "updated INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0, " +
    "PRIMARY KEY (store, id))"
  ).run();

// Lojas liberadas pelo master (a Loja 1 sempre está liberada)
async function lojasAtivas(db) {
  const on = [1];
  const row = await db
    .prepare("SELECT data FROM registros WHERE store = 'global' AND id = 'lojas' AND deleted = 0")
    .first();
  try {
    const j = JSON.parse((row && row.data) || "null");
    if (j && Array.isArray(j.stores)) {
      j.stores.forEach((x) => {
        if (x && x.on && Number(x.n) > 1) on.push(Number(x.n));
      });
    }
  } catch (e) { /* config inválida: só Loja 1 */ }
  return on;
}

// GET /api/salvar
//   ?verify=master            → confere o header x-master-pin
//   ?loja=1|2|3...            → registros daquela loja (a loja 1 = sem sufixo)
//   ?store=global             → configurações globais (lojas liberadas / ADM)
//   ?store=clients&since=...  → filtros antigos continuam funcionando
export async function onRequestGet(context) {
  try {
    const negado = naoAutorizado(context);
    if (negado) return negado;

    const url = new URL(context.request.url);
    if (url.searchParams.get("verify") === "master") {
      return masterOk(context)
        ? json({ success: true, master: true })
        : json({ error: "Senha master inválida" }, 403);
    }

    const db = context.env.DB;
    await garantirTabela(db);

    const store = url.searchParams.get("store");
    const loja = Number(url.searchParams.get("loja") || 0);
    const since = Number(url.searchParams.get("since") || 0);

    let sql = "SELECT store, id, data, updated, deleted FROM registros WHERE updated > ?";
    const params = [since];
    if (store) {
      sql += " AND store = ?";
      params.push(store);
    }
    if (loja === 1) {
      sql += " AND store NOT LIKE '%@%' AND store <> 'global'";
    } else if (loja > 1) {
      sql += " AND store LIKE ?";
      params.push("%@" + loja);
    }
    const { results } = await db.prepare(sql).bind(...params).all();

    return json({ success: true, now: Date.now(), records: results });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

// POST /api/salvar → grava/atualiza registros
// Aceita { records: [{ store, id, data, updated, deleted }] } ou um único registro.
// Mantém também o formato antigo { nome, email } (tabela minha_tabela).
export async function onRequestPost(context) {
  try {
    const negado = naoAutorizado(context);
    if (negado) return negado;

    const body = await context.request.json();
    const db = context.env.DB;

    // Compatibilidade com o formato original
    if (!body.records && !body.store && body.nome !== undefined) {
      const info = await db
        .prepare("INSERT INTO minha_tabela (nome, email) VALUES (?, ?)")
        .bind(body.nome, body.email)
        .run();
      return json({ success: true, result: info });
    }

    await garantirTabela(db);

    const lista = Array.isArray(body.records) ? body.records : [body];

    // Só o master altera a lista de lojas liberadas
    if (lista.some((r) => r && r.store === "global" && r.id === "lojas") && !masterOk(context)) {
      return json({ error: "Somente o master pode liberar lojas." }, 403);
    }

    let ativas = null;
    const stmt = db.prepare(
      "INSERT INTO registros (store, id, data, updated, deleted) VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT(store, id) DO UPDATE SET data = excluded.data, " +
      "updated = excluded.updated, deleted = excluded.deleted " +
      "WHERE excluded.updated >= registros.updated"
    );

    const lote = [];
    let recusados = 0;
    for (const r of lista) {
      if (!r || !r.id) continue;
      const ps = parseStore(r.store);
      if (!ps) continue;
      if (ps.base === "global") {
        if (!GLOBAL_IDS.includes(String(r.id))) continue;
      } else if (ps.n > 1) {
        if (!ativas) ativas = await lojasAtivas(db);
        if (!ativas.includes(ps.n)) {
          recusados++;
          continue;
        }
      }
      const dados = typeof r.data === "string" ? r.data : JSON.stringify(r.data ?? null);
      lote.push(stmt.bind(r.store, String(r.id), dados, Number(r.updated) || Date.now(), r.deleted ? 1 : 0));
    }

    for (let i = 0; i < lote.length; i += 50) {
      await db.batch(lote.slice(i, i + 50));
    }

    return json({ success: true, saved: lote.length, rejected: recusados });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
