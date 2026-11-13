function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0; for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
async function verifySignature(rawBody, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(";").map(part => { const index = part.indexOf("="); return index < 0 ? [part, ""] : [part.slice(0,index),part.slice(index+1)]; }));
  const timestamp = parts.ts, signatures = header.split(";").filter(part => part.startsWith("h1=")).map(part => part.slice(3));
  if (!timestamp || !signatures.length || Math.abs(Date.now()/1000-Number(timestamp))>300) return false;
  const key = await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const digest = await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(timestamp+":"+rawBody));
  const expected = [...new Uint8Array(digest)].map(byte=>byte.toString(16).padStart(2,"0")).join("");
  return signatures.some(signature=>constantTimeEqual(signature,expected));
}
export async function onRequestPost({ request, env }) {
  const rawBody = await request.text(), signature = request.headers.get("Paddle-Signature");
  if (!await verifySignature(rawBody,signature,env.PADDLE_WEBHOOK_SECRET)) return new Response("Invalid signature",{status:401});
  const event = JSON.parse(rawBody);
  if (event.event_type === "transaction.completed") console.log("Verified ebook transaction completed:",event.data?.id||"unknown");
  return new Response("ok",{status:200});
}