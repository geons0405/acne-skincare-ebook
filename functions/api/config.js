export async function onRequestGet({ env }) {
  return Response.json({
    // Paddle client-side tokens are designed to be public in browser checkout.
    // Keep the configured Pages variable as the preferred source and use the
    // active website token as a safe fallback for deployments where bindings
    // have not propagated yet.
    clientToken: env.PADDLE_CLIENT_TOKEN || "live_8614fc6bd230f0b7c25b236ca64",
    environment: env.PADDLE_ENV || "production"
  }, { headers: { "Cache-Control": "no-store" } });
}
