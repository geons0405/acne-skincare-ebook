# The Acne Skincare Recipe Book

Premium landing page and secure PDF delivery for Anaya's 24-page digital guide.

## Stack
- Cloudflare Pages for the public site and Pages Functions.
- Paddle Billing for the one-time USD 9.99 checkout.
- Cloudflare R2 private bucket for the PDF. The PDF is intentionally **not** stored in this public GitHub repository.
- The download endpoint checks the transaction directly with Paddle and only serves the file when the transaction is `completed` and contains the configured ebook price.

## Deploy to Cloudflare Pages
1. Import `geons0405/acne-skincare-ebook` in Cloudflare Pages.
2. Set the build output directory to `public`. No build command is required.
3. Create a private R2 bucket named `acne-skincare-ebook-private`.
4. Upload the original PDF to that bucket with this exact object key: `the-acne-skincare-recipe-book.pdf`.
5. In Pages → Settings → Bindings, add the R2 bucket binding: variable name `EBOOKS`, bucket `acne-skincare-ebook-private`.
6. Add these environment variables to the Pages project (Production and Preview as appropriate):
   - `PADDLE_API_KEY` — Paddle API key (secret).
   - `PADDLE_CLIENT_TOKEN` — Paddle client-side token.
   - `PADDLE_PRICE_ID` — `pri_01m7av1fqfep3gkzvd8q6bj189`.
   - `PADDLE_ENV` — `sandbox` while testing; change to `production` only after the live Paddle product, price, token and approved checkout domain are ready.
   - `PADDLE_WEBHOOK_SECRET` — notification destination secret (secret).
7. In Paddle, add the deployed website domain to Website approval and create a notification destination pointing to `https://YOUR-DOMAIN/api/webhook`. Subscribe to `transaction.completed`, then save the notification secret as `PADDLE_WEBHOOK_SECRET`.
8. In Paddle, create a client-side token and set it as `PADDLE_CLIENT_TOKEN`. Keep the API key and webhook secret private.

## Test before launch
- Start in Paddle sandbox mode.
- Complete a sandbox purchase and confirm the success page redirects with `transaction_id`.
- Confirm that `/api/download` refuses unpaid or unrelated transactions.
- Confirm that a completed ebook transaction downloads the PDF.
- Switch to live mode only after the domain is approved and the account is cleared for this product.

## Important
- Never upload the source PDF to `public/`, GitHub, or any public URL.
- Never put the Paddle API key or webhook secret in frontend JavaScript.
- A success-page redirect is not proof of payment. The server checks the transaction with Paddle before returning the PDF.
- The book is educational content, not medical advice and not a promise to cure acne.