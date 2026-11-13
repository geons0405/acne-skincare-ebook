const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function onRequestPost({ env }) {
  if (!env.PADDLE_API_KEY || !env.PADDLE_PRICE_ID) {
    return json({ error: "The payment service is not fully configured. Check the production Paddle API key and price ID in Cloudflare Pages." }, 503);
  }

  const environment = env.PADDLE_ENV === "sandbox" ? "sandbox" : "production";
  const apiBase = environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const checkoutBaseUrl = "https://acne-skincare-ebook.pages.dev/";

  const response = await fetch(apiBase + "/transactions", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + env.PADDLE_API_KEY,
      "Content-Type": "application/json",
      "Paddle-Version": "1"
    },
    body: JSON.stringify({
      items: [{ price_id: env.PADDLE_PRICE_ID, quantity: 1 }],
      collection_mode: "automatic",
      checkout: { url: checkoutBaseUrl },
      custom_data: {
        product: "the-acne-skincare-recipe-book",
        source: "website"
      }
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload.data?.id) {
    const paddleCode = payload.error?.code || payload.code || "";
    if (paddleCode === "checkout_url_domain_not_approved" || response.status === 403) {
      return json({ error: "The website domain is still awaiting Paddle approval. Please try again after it is approved." }, 409);
    }
    console.error("Paddle transaction creation failed:", response.status, paddleCode, payload.error?.detail || payload.error?.message || "Unknown Paddle error");
    return json({ error: "Paddle could not create the checkout. Please try again later." }, 502);
  }

  const checkoutUrl = payload.data.checkout?.url;
  if (!checkoutUrl) {
    console.error("Paddle transaction created without a checkout URL:", payload.data.id);
    return json({ error: "Paddle created the transaction but did not return a payment link. Please contact support." }, 502);
  }

  return json({
    transactionId: payload.data.id,
    checkoutUrl
  });
}
