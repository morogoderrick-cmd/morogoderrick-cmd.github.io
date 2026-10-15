# Residia website

Landing page, staff admin page and supporting files for Residia, a property management service in Kenya (M-Pesa rent collection, maintenance tracking, owner reporting).

It is plain HTML, CSS and JavaScript. There is nothing to install or build to run it.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. (Opening `index.html` by double-click also works, but the offline/install features need a web server.)

## What's here

| File | What it is |
|---|---|
| `index.html` | The public site: vacancies, sign-in, enquiries, viewing bookings, owner leads, English and Kiswahili |
| `admin.html` | Staff-only enquiry inbox and vacancy checker (not indexed by search engines) |
| `guides.html`, `privacy.html`, `404.html` | Guides for tenants and owners, privacy policy and terms (draft template), not-found page |
| `config.js` | **Your settings**: API address, portal address, WhatsApp, phone, move-in costs and more |
| `sw.js`, `manifest.webmanifest` | Offline support and "install to home screen" |
| `build-unit-pages.js` | Optional: creates a searchable page per vacant unit plus `sitemap.xml` and `robots.txt` |
| `images/`, `icons/`, `logo-mark.svg` | Photos, app icons and the logo |
| `docs/` | Backend routes the site expects, security notes, and portal feature code |

## Before you go live

1. Edit `config.js`: set `API_URL`, `PORTAL_URL`, `WHATSAPP`, `PHONE`, set `SHOW_SAMPLES: false`, and turn on `MOVE_IN` with your real terms.
2. Fill in the highlighted placeholders in `privacy.html` and have it reviewed by a lawyer.
3. Your backend needs `GET /messages` and `PATCH /messages/:id` for the admin page. See `docs/portal-and-backend-features.md`.
4. Replace the sample photos with your own, or confirm you have the right to use them.
5. Serve over HTTPS (the offline/install features require it).

## Notes

- Keep real secrets (API keys, passwords) out of this repository. `config.js` is public by design and should only hold addresses and display settings.
- Keep this repository **private** while it contains photos you may not own the rights to.
- Generated files (`units/`, `sitemap.xml`, `robots.txt`) are created on the server by `build-unit-pages.js` and are ignored by git.
