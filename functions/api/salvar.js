// Cloudflare Pages Function — rota /api/salvar
// Binding D1 esperado: DB (banco "banco-volten")
// Opcional: variável de ambiente SYNC_TOKEN (senha de sincronização)

const STORES = ["clients", "barbers", "services", "appointments", "finance", "products", "stock"];

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

// Cria a tabela automaticamente na primeira chamada
const garantirTabela = (db) =>
  db.prepare(
    "CREATE TABLE IF NOT EXISTS registros (" +
    "store TEXT NOT NULL, id TEXT NOT NULL, data TEXT, " +
    "updated INTEGER NOT NULL DEFAULT 0, deleted INTEGER NOT NULL DEFAULT 0, " +
    "PRIMARY KEY (store, id))"
  ).run();

// GET /api/salvar  → lista os registros (opcional: ?store=clients&since=1700000000000)
export async function onRequestGet(context) {
  try {
    const negado = naoAutorizado(context);
    if (negado) return negado;

    const db = context.env.DB;
    await garantirTabela(db);

    const url = new URL(context.request.url);
    const store = url.searchParams.get("store");
    const since = Number(url.searchParams.get("since") || 0);

    let sql = "SELECT store, id, data, updated, deleted FROM registros WHERE updated > ?";
    const params = [since];
    if (store) {
      sql += " AND store = ?";
      params.push(store);
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
    const stmt = db.prepare(
      "INSERT INTO registros (store, id, data, updated, deleted) VALUES (?, ?, ?, ?, ?) " +
      "ON CONFLICT(store, id) DO UPDATE SET data = excluded.data, " +
      "updated = excluded.updated, deleted = excluded.deleted " +
      "WHERE excluded.updated >= registros.updated"
    );

    const lote = [];
    for (const r of lista) {
      if (!STORES.includes(r.store) || !r.id) continue;
      const dados = typeof r.data === "string" ? r.data : JSON.stringify(r.data ?? null);
      lote.push(stmt.bind(r.store, String(r.id), dados, Number(r.updated) || Date.now(), r.deleted ? 1 : 0));
    }

    for (let i = 0; i < lote.length; i += 50) {
      await db.batch(lote.slice(i, i + 50));
    }

    return json({ success: true, saved: lote.length });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
