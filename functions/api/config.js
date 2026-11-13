export async function onRequestGet({ env }) {
  return Response.json({
    clientToken: env.PADDLE_CLIENT_TOKEN || "",
    environment: env.PADDLE_ENV || "production"
  }, { headers: { "Cache-Control": "no-store" } });
}