const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function onRequestPost({ env }) {
  if (!env.PADDLE_API_KEY || !env.PADDLE_PRICE_ID) return json({ error: "The payment service is not fully configured." }, 503);
  const environment = env.PADDLE_ENV === "production" ? "production" : "sandbox";
  const apiBase = environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const response = await fetch(apiBase + "/transactions", {
    method: "POST",
    headers: { "Authorization": "Bearer " + env.PADDLE_API_KEY, "Content-Type": "application/json", "Paddle-Version": "1" },
    body: JSON.stringify({ items: [{ price_id: env.PADDLE_PRICE_ID, quantity: 1 }], collection_mode: "automatic", custom_data: { product: "the-acne-skincare-recipe-book", source: "website" } })
  });
  const payload = await response.json();
  if (!response.ok || !payload.data?.id) return json({ error: "Paddle could not create the checkout. Please try again." }, 502);
  return json({ transactionId: payload.data.id });
}