const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get("order_id") || url.searchParams.get("token") || "";
  if (!/^[A-Z0-9-]{8,64}$/i.test(orderId)) return json({ error: "A valid PayPal order reference is required." }, 400);
  if (!env.EBOOKS) return json({ error: "Secure ebook storage is not configured." }, 503);

  const paymentObject = await env.EBOOKS.get("paypal-paid/" + orderId + ".json");
  if (!paymentObject) return json({ error: "PayPal has not confirmed this payment yet. Wait a moment and try again." }, 409);
  let payment;
  try { payment = await paymentObject.json(); } catch { return json({ error: "The payment record could not be verified." }, 500); }
  if (payment?.provider !== "paypal" || payment?.status !== "COMPLETED" || payment?.order_id !== orderId || payment?.amount !== "9.99" || payment?.currency !== "USD") {
    return json({ error: "This payment is not valid for the ebook download." }, 403);
  }

  const object = await env.EBOOKS.get("The Acne Skincare Recipe Book.pdf");
  if (!object) return json({ error: "The ebook file is not available in secure storage." }, 503);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Disposition", 'attachment; filename="The-Acne-Skincare-Recipe-Book.pdf"');
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
