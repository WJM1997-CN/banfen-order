export async function onRequestGet({ env }) {
  const row = await env.DB.prepare(
    "SELECT value FROM settings WHERE key = 'banfen_price'"
  ).first();
  const price = row ? Number(row.value) : 12;
  return Response.json({ price });
}

export async function onRequestPost({ request, env }) {
  const pin = request.headers.get("x-admin-pin") || "";
  if (pin !== env.ADMIN_PIN) return new Response("Unauthorized", { status: 401 });

  const body = await request.json();
  const price = Number(body?.price);
  if (!Number.isFinite(price) || price <= 0) return new Response("Invalid price", { status: 400 });

  await env.DB.prepare(
    "INSERT INTO settings(key,value) VALUES('banfen_price', ?) " +
      "ON CONFLICT(key) DO UPDATE SET value=excluded.value"
  ).bind(String(price)).run();

  return Response.json({ ok: true, price });
}
