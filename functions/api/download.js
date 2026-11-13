const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function onRequestGet({ request, env }) {
  const transactionId = new URL(request.url).searchParams.get("transaction_id") || "";
  if (!/^txn_[a-z0-9]{26}$/i.test(transactionId)) return json({ error: "A valid payment reference is required." }, 400);
  if (!env.PADDLE_API_KEY || !env.PADDLE_PRICE_ID || !env.EBOOKS) return json({ error: "Secure download is not configured yet." }, 503);
  const environment = env.PADDLE_ENV === "production" ? "production" : "sandbox";
  const apiBase = environment === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const verification = await fetch(apiBase + "/transactions/" + encodeURIComponent(transactionId), {
    headers: { "Authorization": "Bearer " + env.PADDLE_API_KEY, "Paddle-Version": "1" }
  });
  if (!verification.ok) return json({ error: "We could not verify this payment reference." }, 404);
  const payload = await verification.json(), transaction = payload.data;
  const hasBook = Array.isArray(transaction?.items) && transaction.items.some(item => item.price_id === env.PADDLE_PRICE_ID && Number(item.quantity) === 1);
  if (transaction?.status !== "completed" || !hasBook) return json({ error: "Payment has not been confirmed for this ebook yet. Please wait and try again." }, 409);
  const object = await env.EBOOKS.get("the-acne-skincare-recipe-book.pdf");
  if (!object) return json({ error: "The ebook file has not been uploaded to secure storage yet." }, 503);
  const headers = new Headers(); object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'attachment; filename="The-Acne-Skincare-Recipe-Book.pdf"');
  headers.set("Cache-Control", "private, no-store, max-age=0"); headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}