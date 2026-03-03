export async function onRequest() {
  return new Response("pong", { headers: { "content-type": "text/plain" } });
}
