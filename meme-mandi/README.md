# MemT

A Next.js apparel storefront for original Indian meme T-shirts and hoodies. The interface, code, and documentation are in English. PostgreSQL and Prisma hold accounts, server-side bags, product variants, and order-item snapshots.

MemT uses black (`#111111`) and warm yellow (`#ffb800`) as its brand palette. The wordmark pairs white “Mem” with a black “T” inside a yellow block. Shared colour tokens in `src/app/globals.css` carry the palette through navigation, buttons, highlights, account pages, bags, and admin; white and grey surfaces keep product and form content readable.

## Open the current preview

The development store runs at **http://127.0.0.1:3000**. The admin interface is at **/admin**. This checkout already has a private local PostgreSQL database on port **55439** and an ignored `.env` file. Development email is written to `.local-mail/`; it is not delivered to a real inbox. The local demo has dummy accounts and sample orders; live Qikink credentials are unconfigured.

To restart this checkout, run `powershell -ExecutionPolicy Bypass -File scripts/local-db.ps1 start`, then `npm run dev`. Keep the same `127.0.0.1` origin as `APP_URL` for form submissions.

## Fresh installation

Use Node.js 22 or later and PostgreSQL. Copy `.env.example` to `.env`, then set `DATABASE_URL` to your database and `AUTH_SECRET` to a random secret of at least 32 characters. Generate a secret with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm ci
npm run db:migrate
npm run db:seed
npm run dev
```

Seed data adds three original concept products and five sizes per product. Seeding again preserves owner edits. Prices, fabrics, fit, and product photography are starting content for review; supplier SKUs and print-ready artwork deliberately remain unconfigured.

## Local demo

Run `npm run demo:setup` after seeding the catalog. Sign in with **admin@memt.test** and **MemT-Demo-2026!**, then open `/admin` to add or edit products and review two sample orders. For the shopping flow, use **customer@memt.test** with the same password; its account has a sample bag and order history. Both demo accounts are verified so the presentation does not require email setup.

The demo setup only runs with a localhost app and database, development email, and disabled Qikink. It is idempotent, preserves demo edits, and refuses to overwrite an unrelated account. The known passwords and fictitious addresses are for the local demo only; create a separate owner account before production and remove the dummy accounts and orders from any production data.

## Create your admin account

Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a unique `ADMIN_PASSWORD` of at least 14 characters in your private environment, then run `npm run admin:create`. The trusted local bootstrap creates a verified admin; public registration always creates an unverified customer and requires an emailed OTP. Remove `ADMIN_PASSWORD` afterward. Existing accounts are never silently overwritten or promoted.

Sign in at `/login`, open `/admin`, and add or edit products. Each colour-and-size combination needs its own unique store SKU and its exact Qikink SKU. Products can remain drafts. Variants referenced by bags or orders are archived instead of deleted.

## Email verification and password reset

The six-digit code expires in 10 minutes, is stored as an HMAC hash, has a five-attempt limit, and is consumed once. Resends have a 60-second cooldown. Persistent PostgreSQL limits cover login, code issuance, verification, and checkout. Passwords use salted scrypt. Sessions use random, hashed tokens in HttpOnly, SameSite cookies; HTTPS origins enable Secure cookies. Password reset revokes all sessions.

Three delivery options are implemented:

| Provider                | Configuration                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Nodemailer SMTP         | `MAIL_PROVIDER=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` |
| Resend HTTPS            | `MAIL_PROVIDER=resend`, `RESEND_API_KEY`, `MAIL_FROM`                                 |
| Local development inbox | `MAIL_PROVIDER=local`, only available with `npm run dev`                              |

Resend's current free transactional plan allows 3,000 emails per month and 100 per day. Verify your sending domain before delivering OTPs to customers. [Resend pricing](https://resend.com/pricing), [Resend SMTP documentation](https://resend.com/docs/send-with-smtp).

With local delivery, read the newest JSON file in `.local-mail/` to get a test code. This directory is ignored by Git and has no public endpoint. Production refuses the local email sink.

## Qikink integration

The adapter follows [Qikink's publicly available API documentation](https://admins.qikink.com/api-docs/), including its documented `createOrder` endpoint and `auth_token` contract. Confirm this contract with your account's current API access before enabling live submission; newer account-specific APIs may require a different adapter. No authenticated supplier call has been made without your credentials.

Set `QIKINK_API_URL`, `QIKINK_AUTH_TOKEN`, and `QIKINK_ENABLED=true` after account verification. Credentials stay on the server. Copy real SKUs from Qikink; the application never infers or fabricates supplier codes.

- A `Product` groups a design. `ProductVariant` holds the store SKU, supplier SKU, colour, size, integer price in paise, and print configuration.
- My Products variants use `search_from_my_products=true` with the corresponding preconfigured supplier SKU.
- Custom-design variants include print-ready, public HTTPS artwork, design code, placement, and dimensions in inches. Catalog mockups are not print artwork.
- `BagItem` references the selected variant and quantity. Guest bags live in PostgreSQL and merge into the signed-in user's bag.
- `OrderItem` snapshots the purchased name, image, store SKU, supplier SKU, colour, size, price, quantity, and artwork. Commercial details stay unchanged after catalog edits.

In admin, review the order, use **Refresh print details** if mappings were added after checkout, and preview the payload. Refreshing only updates supplier and print fields; it preserves the paid price and selected fit. Orders use cash on delivery and an alphanumeric order number within Qikink's documented 15-character limit. Checkout calculates prices and shipping on the server and uses an idempotency key to prevent duplicate orders.

Live submission is explicit from admin. The application atomically claims an order before calling Qikink, records accepted supplier IDs, and blocks automatic retries after a timeout or ambiguous response. `REVIEW_REQUIRED` and a stale `SUBMITTING` state require checking the order number in Qikink before any retry. Reconcile accepted orders to `SUBMITTED` with their supplier ID, or a confirmed non-created order to `REJECTED`, through a deliberate database operation; there is no blind retry button. Shipment and delivery status are manually confirmed by admin; no undocumented webhook or tracking endpoint is claimed.

## Checks

```sh
npm run typecheck
npm test
npm run test:integration
npm run build
```

Integration tests require the local development server, local email provider, and disabled Qikink. They create and remove their own disposable accounts and products. Coverage includes verification, invalid and replayed codes, reset/session revocation, cart merging and concurrency, quantity limits, origin checks, admin authorization and catalog edits, server-priced and idempotent checkout, order isolation and snapshots, and supplier payload validation. Tests do not send real emails or purchase fulfillment.

## Production deployment

Deploy the standard Next.js server on a Node-compatible host with `npm run build` and `npm start`, using a persistent PostgreSQL database with an appropriate connection pool. Set `APP_URL` to the canonical HTTPS origin, provide a fresh `AUTH_SECRET`, configure real email delivery, run the committed migrations, create the owner account, and review supplier mapping and artwork before enabling Qikink.

The `.next/standalone` output can be packaged for a chosen host. The current start and preview scripts bind to localhost. No production database or deployment provider credentials were supplied, so the current deliverable is the working local store and production build. The Sites environment uses Cloudflare Workers and cannot use this checkout's direct PostgreSQL or SMTP sockets; retaining the requested Next.js/PostgreSQL stack requires Node hosting or a separately configured HTTP database and mail adapter.

Images were created with the built-in image generation tool. Source images and exact prompts are retained in `../assets-source/product-prompts.json`; the final assets are in `public/images/`.
