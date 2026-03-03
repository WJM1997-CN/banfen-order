function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") || todayKey();

  const { results } = await env.DB.prepare(
    "SELECT * FROM orders WHERE date_key = ? ORDER BY created_at DESC"
  ).bind(date).all();

  return Response.json({ date, orders: results });
}

export async function onRequestPost({ request, env }) {
  const body = await request.json();

  const date_key = body?.date_key || todayKey();
  const dining_mode = body?.dining_mode || "DINE_IN";
  const spice_level = body?.spice_level || "NONE";
  const qty = Number(body?.qty || 1);
  const remark = (body?.remark || "").slice(0, 200);

  if (!Number.isFinite(qty) || qty <= 0) return new Response("Invalid qty", { status: 400 });

  // init counter row
  await env.DB.prepare(
    "INSERT INTO daily_counters(date_key, last_no) VALUES(?, 0) " +
      "ON CONFLICT(date_key) DO NOTHING"
  ).bind(date_key).run();

  // increment
  await env.DB.prepare(
    "UPDATE daily_counters SET last_no = last_no + 1 WHERE date_key = ?"
  ).bind(date_key).run();

  const counterRow = await env.DB.prepare(
    "SELECT last_no FROM daily_counters WHERE date_key = ?"
  ).bind(date_key).first();

  const pickup_no = Number(counterRow?.last_no || 1);

  const priceRow = await env.DB.prepare(
    "SELECT value FROM settings WHERE key='banfen_price'"
  ).first();
  const unitPrice = priceRow ? Number(priceRow.value) : 12;
  const total_amount = unitPrice * qty;

  const id = crypto.randomUUID();
  const created_at = new Date().toISOString();
  const status = "PLACED";

  await env.DB.prepare(
    "INSERT INTO orders(id,date_key,pickup_no,dining_mode,spice_level,qty,remark,total_amount,status,created_at) " +
      "VALUES(?,?,?,?,?,?,?,?,?,?)"
  ).bind(
    id, date_key, pickup_no, dining_mode, spice_level, qty, remark,
    total_amount, status, created_at
  ).run();

  return Response.json({ ok: true, order: { id, date_key, pickup_no, dining_mode, spice_level, qty, remark, total_amount, status, created_at } });
}
