const json = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const PAYPAL_API = "https://api-m.paypal.com";

async function getPayPalAccessToken(env) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_CLIENT_SECRET) throw new Error("PayPal API credentials are missing.");
  const credentials = btoa(env.PAYPAL_CLIENT_ID + ":" + env.PAYPAL_CLIENT_SECRET);
  const response = await fetch(PAYPAL_API + "/v1/oauth2/token", {
    method: "POST",
    headers: { "Authorization": "Basic " + credentials, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw new Error("Could not authenticate with PayPal.");
  return data.access_token;
}

async function verifyPayPalWebhook(request, event, env) {
  if (!env.PAYPAL_WEBHOOK_ID) throw new Error("PayPal webhook ID is missing.");
  const accessToken = await getPayPalAccessToken(env);
  const verification = {
    auth_algo: request.headers.get("PAYPAL-AUTH-ALGO"),
    cert_url: request.headers.get("PAYPAL-CERT-URL"),
    transmission_id: request.headers.get("PAYPAL-TRANSMISSION-ID"),
    transmission_sig: request.headers.get("PAYPAL-TRANSMISSION-SIG"),
    transmission_time: request.headers.get("PAYPAL-TRANSMISSION-TIME"),
    webhook_id: env.PAYPAL_WEBHOOK_ID,
    webhook_event: event
  };
  if (Object.values(verification).some(value => !value)) return false;
  const response = await fetch(PAYPAL_API + "/v1/notifications/verify-webhook-signature", {
    method: "POST",
    headers: { "Authorization": "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify(verification)
  });
  const result = await response.json().catch(() => ({}));
  return response.ok && result.verification_status === "SUCCESS";
}

function getOrderId(resource) {
  return resource?.supplementary_data?.related_ids?.order_id || resource?.id || "";
}

export async function onRequestPost({ request, env }) {
  if (!env.EBOOKS) return json({ error: "Payment storage is not configured." }, 503);
  let event;
  try {
    event = await request.json();
  } catch {
    return json({ error: "Invalid webhook payload." }, 400);
  }

  try {
    if (!await verifyPayPalWebhook(request, event, env)) return json({ error: "PayPal signature verification failed." }, 401);
  } catch (error) {
    console.error("PayPal webhook verification error:", error.message);
    return json({ error: "PayPal webhook verification is not configured correctly." }, 503);
  }

  const resource = event.resource || {};
  const orderId = getOrderId(resource);
  if (!orderId) return json({ received: true, ignored: "No order reference in event." });

  const key = "paypal-paid/" + orderId + ".json";
  if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
    const amount = resource.amount || {};
    const expectedMerchant = (env.PAYPAL_MERCHANT_ID || "").trim();
    const actualMerchant = (resource.payee?.merchant_id || "").trim();
    const expectedEmail = (env.PAYPAL_MERCHANT_EMAIL || "").trim().toLowerCase();
    const actualEmail = (resource.payee?.email_address || "").trim().toLowerCase();
    const merchantMatches = (expectedMerchant && actualMerchant === expectedMerchant) || (expectedEmail && actualEmail === expectedEmail);
    if (!merchantMatches) {
      console.error("PayPal capture rejected: payee does not match configured merchant.");
      return json({ error: "Payment recipient did not match the configured merchant." }, 422);
    }
    if (resource.status !== "COMPLETED" || amount.currency_code !== "USD" || amount.value !== "9.99" || resource.final_capture === false) {
      return json({ error: "Payment does not match the ebook price and currency." }, 422);
    }
    const record = {
      provider: "paypal",
      event_id: event.id,
      order_id: orderId,
      capture_id: resource.id,
      status: "COMPLETED",
      amount: "9.99",
      currency: "USD",
      paid_at: resource.update_time || event.create_time
    };
    await env.EBOOKS.put(key, JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
    await env.EBOOKS.put("paypal-capture/" + resource.id + ".json", JSON.stringify(record), { httpMetadata: { contentType: "application/json" } });
    return json({ received: true, payment: "confirmed" });
  }

  if (["PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED", "CHECKOUT.PAYMENT-APPROVAL.REVERSED"].includes(event.event_type)) {
    await env.EBOOKS.delete(key);
    return json({ received: true, payment: "revoked" });
  }

  return json({ received: true, ignored: event.event_type || "unknown" });
}
