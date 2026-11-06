export async function onRequestPost(context) {
  try {
    const data = await context.request.json();
    const info = await context.env.DB.prepare(
      "INSERT INTO minha_tabela (nome, email) VALUES (?, ?)"
    )
    .bind(data.nome, data.email)
    .run();

    return new Response(JSON.stringify({ success: true, result: info }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
