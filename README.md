# The Acne Skincare Recipe Book

Premium landing page and secure PDF delivery for Anaya's 24-page digital guide.

## Stack

- Cloudflare Pages for the public site and Pages Functions.
- Paddle Billing for the one-time USD 9.99 checkout.
- Cloudflare R2 private bucket for the PDF. The PDF is intentionally **not** stored in this public GitHub repository.
- The download endpoint checks the transaction directly with Paddle and only serves the file when the transaction is `completed` and contains the configured ebook price.

## Paddle catalog already prepared

- Product: `Ebook` — `pro_01m7ap7yfdcxn2wk96yc2hwm48`
- One-time price: `US$9.99` — `pri_01m7av1fqfep3gkzvd8q6bj189`
- Client-side token created for this website: `Acne Skincare Ebook Website`
- The connected Paddle account is in **production**. The created product, price and client token are live-mode resources.

## Deploy to Cloudflare Pages

1. Import `geons0405/acne-skincare-ebook` in Cloudflare Pages.
2. Set the build output directory to `public`. No build command is required.
3. Create a private R2 bucket named `acne-skincare-ebook-private`.
4. Upload the original PDF to that bucket with this exact object key: `the-acne-skincare-recipe-book.pdf`.
5. In Pages → Settings → Bindings, add the R2 bucket binding: variable name `EBOOKS`, bucket `acne-skincare-ebook-private`.
6. Add these environment variables to the Pages project (Production):
   - `PADDLE_API_KEY` — Paddle API key (secret; create it in Paddle and never put it in GitHub).
   - `PADDLE_CLIENT_TOKEN` — the public client-side token created for this site (copy it from the Paddle token list).
   - `PADDLE_PRICE_ID` — `pri_01m7av1fqfep3gkzvd8q6bj189`.
   - `PADDLE_ENV` — `production`.
   - `PADDLE_WEBHOOK_SECRET` — notification destination secret (secret; create after the site has a stable HTTPS URL).
7. Add the deployed website domain to Paddle Website approval. Live checkout won't work until Paddle approves the domain.
8. After deployment and domain approval, create a Paddle notification destination pointing to `https://YOUR-DOMAIN/api/webhook`. Subscribe to `transaction.completed`, then save its endpoint secret as `PADDLE_WEBHOOK_SECRET`.

## Test before launch

- This repo is wired to the live Paddle product and live client token. Do not switch to sandbox unless you also create a separate sandbox product, price and client token.
- Confirm the website domain is approved in Paddle before attempting a live checkout.
- Complete a controlled live purchase and confirm the success page redirects with `transaction_id`.
- Confirm that `/api/download` refuses unpaid or unrelated transactions.
- Confirm that a completed ebook transaction downloads the PDF.

## Important

- Never upload the source PDF to `public/`, GitHub, or any public URL.
- Never put the Paddle API key or webhook secret in frontend JavaScript.
- A success-page redirect is not proof of payment. The server checks the transaction with Paddle before returning the PDF.
- The book is educational content, not medical advice and not a promise to cure acne.

## Current deployment note

Production Pages configuration has been refreshed; the public client token and Paddle price settings must be available to the Pages Functions runtime after deployment.
