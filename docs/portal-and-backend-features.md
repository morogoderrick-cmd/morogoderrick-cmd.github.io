# Portal and backend features

These are the items from the idea list that need your backend or portal rather than the landing page. The code is a starting point: model and function names (`Lease`, `Payment`, `Unit` and so on) are placeholders for whatever your project calls them.

## 1. Extra fields the landing page can show

Return these from `GET /units/vacant` and the page picks them up automatically:

| Field | What it does |
|---|---|
| `images` (array of URLs) | Photo gallery in the unit pop-up. A single `image` still works. |
| `neighbourhood` (on the unit or its property) | "About the area" text: schools, matatu routes, water, security. |
| `video` (URL) | "Watch video tour" button, e.g. a phone video on YouTube or your own storage. |
| `verified` (true/false) | "Verified by us" badge. Only set it on units you've physically inspected. |
| `property.lat`, `property.lng` | Makes the "View on map" link pin the exact spot. |

## 2. Rent reminders (biggest win for on-time payment)

```bash
npm i node-cron africastalking
```

```js
const cron = require('node-cron');
const AT = require('africastalking')({ apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME });

// Every day at 08:00 Nairobi time
cron.schedule('0 8 * * *', async () => {
  const leases = await Lease.find({ active: true }).populate('tenant unit');
  for (const lease of leases) {
    const daysLeft = daysUntilDue(lease);                 // 3, 0, or negative if overdue
    if (![3, 0, -3].includes(daysLeft)) continue;
    if (await paidThisPeriod(lease)) continue;
    const msg = daysLeft > 0
      ? `Hello ${lease.tenant.firstName}, rent of KES ${lease.rent} for ${lease.unit.label} is due in ${daysLeft} days. Pay by M-Pesa in your Residia portal.`
      : daysLeft === 0
        ? `Hello ${lease.tenant.firstName}, rent for ${lease.unit.label} is due today. Pay by M-Pesa in your Residia portal.`
        : `Hello ${lease.tenant.firstName}, rent for ${lease.unit.label} is overdue. Please pay in your portal or contact the office.`;
    await AT.SMS.send({ to: [lease.tenant.phone], message: msg });   // phone in +2547XXXXXXXX format
  }
}, { timezone: 'Africa/Nairobi' });
```

Things to get right: only message tenants who have agreed to it (put it in the lease or portal terms), keep a log of what was sent, and stop reminders the moment a payment is recorded. If you prefer WhatsApp, the WhatsApp Business Cloud API needs pre-approved message templates.

## 3. Receipts and rent statements

Tenants often need proof of payment for a loan or a visa application.

```bash
npm i pdfkit
```

```js
const PDFDocument = require('pdfkit');

app.get('/api/tenant/statement.pdf', requireTenant, async (req, res) => {
  const payments = await Payment.find({ tenant: req.user.id }).sort({ date: 1 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rent-statement.pdf"');
  const doc = new PDFDocument({ margin: 50 }); doc.pipe(res);
  doc.fontSize(18).text('Rent statement'); doc.moveDown();
  doc.fontSize(11).text(`Tenant: ${req.user.name}`);
  payments.forEach(p => doc.text(`${p.date.toISOString().slice(0, 10)}   KES ${p.amount}   M-Pesa ref ${p.mpesaReceipt}`));
  doc.end();
});
```

Add your company name, address and the unit to the header so it works as proof of residence.

## 4. Maintenance requests with photos

```bash
npm i multer
```

```js
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpe?g|png|webp)$/.test(file.mimetype))
});

app.post('/api/maintenance', requireTenant, upload.array('photos', 4), async (req, res) => {
  const urls = await Promise.all(req.files.map(f => uploadToStorage(f.buffer, f.mimetype)));   // S3, Cloudinary, etc.
  const request = await Maintenance.create({ tenant: req.user.id, description: req.body.description, photos: urls });
  res.status(201).json(request);
});
```

Check the file type on the server (as above), never trust the file extension, and don't serve uploads from the same folder as your code.

## 5. Move-in and move-out checklists

Add an `Inspection` record per lease: `type` (`move-in` or `move-out`), a list of `{ area, condition, notes, photos }`, and sign-off from both tenant and manager. Comparing the two at move-out is what settles deposit disputes. Keep the records for as long as your privacy policy says you keep lease records.

## 6. Enquiry dashboard (so no lead gets lost)

Add a `status` to messages and let managers change it:

```js
// schema
status: { type: String, enum: ['new', 'contacted', 'closed'], default: 'new' },
handledBy: String, note: String

// routes (managers only). admin.html expects exactly these two
app.get('/api/messages', requireAdmin, async (req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }).limit(500));     // must include createdAt, fromName, subject, body, status, note
});
app.patch('/api/messages/:id', requireAdmin, async (req, res) => {
  const { status, note } = req.body;
  const m = await Message.findByIdAndUpdate(req.params.id, { status, note, handledBy: req.user.name }, { new: true });
  res.json(m);
});
```

`admin.html` already does the sorting, new-count badge, filtering, notes and CSV export. If your routes or roles differ, set the `ADMIN` block in `config.js`. Both routes **must** check the user's role on the server: hiding the page isn't security. Viewing requests start with "Viewing request:", vacancy alerts with "Vacancy alert request", and owner leads with "Property management quote request". The landing page sends all three as normal messages, so no new endpoints are needed.

## 7. Vacancies update themselves

Keep the unit's status in step with its lease so the website is never out of date:

```js
// when a lease is created or activated
await Unit.findByIdAndUpdate(lease.unit, { status: 'occupied' });
// when it ends or is terminated
await Unit.findByIdAndUpdate(lease.unit, { status: 'vacant' });
```

Do both inside one database transaction with the lease change, so they can't drift apart. After a unit becomes occupied, re-run `build-unit-pages.js` (or let the nightly job do it) and its search page disappears.

## 8. Searchable unit pages

The unit pop-up on the home page is shareable (the link ends in `#unit=...`), but Google can't index it. `build-unit-pages.js` fixes that. It reads your vacant units and writes one static page per unit, plus `sitemap.xml` and `robots.txt`.

```bash
SITE_URL=https://yourdomain.co.ke API_URL=https://api.yourdomain.co.ke/api WHATSAPP=254712345678 node build-unit-pages.js
```

Put it on a nightly cron job on the server that hosts the site, and also run it after a unit is listed or let. Then submit `sitemap.xml` in Google Search Console.

## 9. Uptime monitoring

Add a health route and point a free monitor (UptimeRobot, Better Stack) at it, with alerts to your phone or email:

```js
app.get('/api/health', async (req, res) => {
  try { await mongoose.connection.db.admin().ping(); res.json({ ok: true }); }   // swap in your own database check
  catch (e) { res.status(503).json({ ok: false }); }
});
```

Monitor both the home page URL and `/api/health`.

## 10. Get found locally (no code)

1. Create a Google Business Profile for your office at business.google.com, using your real address and phone number, and verify it.
2. Choose the category "Property management company", add photos, opening hours and your website link.
3. Ask happy tenants and owners to leave honest reviews, and reply to each one.
4. Keep your name, address and phone number identical on your website, Google, and any directories you list in.
5. After your first reviews arrive, you can add real testimonials and numbers to `config.js` (`TESTIMONIALS`, `STATS`) and the sections will appear automatically.
