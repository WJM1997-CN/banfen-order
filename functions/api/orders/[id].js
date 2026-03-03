export async function onRequestPatch({ request, env, params }) {
  const pin = request.headers.get("x-admin-pin") || "";
  if (pin !== env.ADMIN_PIN) return new Response("Unauthorized", { status: 401 });

  const id = params.id;
  const body = await request.json();
  const status = String(body?.status || "");

  const allowed = new Set(["PLACED", "IN_PROGRESS", "DONE", "CANCELLED"]);
  if (!allowed.has(status)) return new Response("Invalid status", { status: 400 });

  await env.DB.prepare("UPDATE orders SET status = ? WHERE id = ?")
    .bind(status, id).run();

  return Response.json({ ok: true });
}
