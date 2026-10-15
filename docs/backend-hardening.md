# Residia: backend and deployment notes

The landing page can't do these things for you. They go in your backend (examples assume Node + Express) and your deploy setup.

## 1. Security basics

```bash
npm i helmet cors express-rate-limit express-validator
```

```js
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

app.set('trust proxy', 1);            // if you are behind Nginx / Render / Railway etc.
app.use(helmet());
app.use(express.json({ limit: '20kb' }));

// Only your landing page and portal may call the API from a browser
app.use(cors({ origin: [process.env.LANDING_ORIGIN, process.env.PORTAL_ORIGIN], credentials: true }));

// Rate limits
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true });
const messageLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
const payLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 3 });

app.post('/api/auth/login', loginLimiter, loginHandler);
app.post('/api/messages', messageLimiter,
  body('fromName').trim().isLength({ min: 1, max: 100 }),
  body('subject').trim().isLength({ min: 1, max: 150 }),
  body('body').trim().isLength({ min: 1, max: 2500 }),
  (req, res, next) => validationResult(req).isEmpty() ? next() : res.status(400).json({ message: 'Invalid enquiry.' }),
  messageHandler);
```

**Login lockout:** also count failed attempts per account (not just per IP). After about 5 failures, lock the account for 15 minutes. Return the same generic "Invalid email or password" message whether the email exists or not.

**Passwords:** hash with bcrypt or argon2. Never log passwords or tokens.

**HTTPS everywhere:** set `Secure` cookies and redirect HTTP to HTTPS.

## 2. Public endpoints return public fields only

`/units/vacant` is visible to anyone, so shape the response explicitly:

```js
app.get('/api/units/vacant', async (req, res) => {
  const units = await Unit.find({ status: 'vacant' }).populate('property', 'name location lat lng');
  res.json(units.map(u => ({
    id: u._id, label: u.label, type: u.type, rent: u.rent,
    bedrooms: u.bedrooms, bathrooms: u.bathrooms, description: u.description,
    images: u.images,                                   // array of URLs; the page shows a gallery
    property: { name: u.property.name, location: u.property.location, lat: u.property.lat, lng: u.property.lng }
  })));
});
```

Never include owner names, phone numbers, tenant data or internal notes.

## 3. Get notified when an enquiry arrives

In `messageHandler`, after saving the message, send yourself an alert. Email example:

```js
const nodemailer = require('nodemailer');
const mailer = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: 587, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });

await mailer.sendMail({
  from: process.env.SMTP_USER, to: process.env.NOTIFY_EMAIL,
  subject: 'New enquiry: ' + req.body.subject,
  text: req.body.fromName + '\n\n' + req.body.body
});
```

For WhatsApp or SMS alerts, use the WhatsApp Business Cloud API or an SMS provider such as Africa's Talking, called from the same place.

The page's "Vacancy alert" form arrives as a normal message with the subject "Vacancy alert request" (or "Ombi la taarifa ya nyumba" in Swahili). Filter on that to build a call list.

## 4. "Pay rent without logging in" (optional)

The page shows this section only when `QUICK_PAY_PATH` is set in `config.js`, e.g. `'/payments/quick-stk'`. It sends `{ phone: '2547XXXXXXXX', unit: 'A4' }`. Build the endpoint like this:

- Look up the active lease by unit label **and** confirm the phone number belongs to that lease's tenant.
- Work out the amount **on the server** (rent due or outstanding balance). Never trust an amount from the browser.
- Trigger the Daraja STK Push to that phone, then respond only with success or failure. Don't return lease details.
- Rate-limit by IP and by phone number (`payLimiter` above), and use the same response for "unit not found" and "phone doesn't match" so nobody can probe who lives where.

## 5. Portal: receive the token

The landing page redirects to `PORTAL_URL#token=...`. In the portal's entry file:

```js
const m = location.hash.match(/token=([^&]+)/);
if (m) {
  localStorage.setItem('residia_token', decodeURIComponent(m[1]));
  history.replaceState(null, '', location.pathname + location.search);   // remove it from the address bar
}
```

Better still, once the landing page and portal live on the same domain (for example `example.co.ke/` and `example.co.ke/portal`), switch to an httpOnly, Secure, SameSite=Lax cookie set by the login endpoint, and drop the token handoff.

## 6. Configure per environment

`config.js` is plain JavaScript, so generate it at deploy time instead of editing it by hand:

```bash
cat > config.js << EOT
window.RESIDIA_CONFIG = {
  API_URL: '${API_URL}',
  PORTAL_URL: '${PORTAL_URL}',
  WHATSAPP: '${WHATSAPP}',
  PHONE: '${PHONE}',
  SHOW_SAMPLES: false,
  ANALYTICS_DOMAIN: '${ANALYTICS_DOMAIN}',
  QUICK_PAY_PATH: '${QUICK_PAY_PATH}'
};
EOT
```

In production set `SHOW_SAMPLES: false`, so visitors see a friendly "unavailable, try again" message instead of fake listings if the backend is down.

## 7. Deploy checklist

- Serve `404.html` as your 404 page (Netlify and Cloudflare Pages do this automatically; on Nginx use `error_page 404 /404.html;`).
- Serve `sw.js` and `manifest.webmanifest` from the same folder as `index.html`, over HTTPS. Service workers don't register on plain HTTP except `localhost`.
- Fill in the `[highlighted placeholders]` in `privacy.html`, and get a Kenyan lawyer to review it before launch.
- Add the canonical URL and OG image tags (commented in the `<head>` of `index.html`).
- Register with the Office of the Data Protection Commissioner if the Data Protection Act requires it for your business.
- Optional: minify HTML/CSS/JS with a build step. The page is small, so it's a minor gain.

## 8. Test on a weak phone and network

1. Chrome DevTools → Network tab → throttle to "Slow 4G" or "3G", and Performance → CPU 4x slowdown.
2. Run Lighthouse (mobile) and aim for 90+ on Performance and Accessibility.
3. Try it on a real budget Android phone: sign in, filter, open a unit, send an enquiry, switch to Kiswahili, install to the home screen.
4. Turn on airplane mode and reload: the page should still open from the cache.
