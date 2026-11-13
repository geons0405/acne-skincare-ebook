# Deployment

This repository is connected to the Cloudflare Pages project `acne-skincare-ebook`.

- Production branch: `main`
- Build output directory: `public`
- Private ebook storage: Cloudflare R2 bucket `acne-skincare-ebook-private`
- Pages Functions R2 binding: `EBOOKS`

The ebook PDF must remain in the private R2 bucket and must not be committed to this public repository.

Checkout and secure downloads require the Paddle environment variables documented in the project setup notes. Do not commit credentials or webhook secrets.
