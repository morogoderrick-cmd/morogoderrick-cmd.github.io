/* Residia site settings.
   Edit this file, or generate it at deploy time from environment variables (see backend-hardening.md).
   Anything you leave out falls back to the defaults inside index.html. */
window.RESIDIA_CONFIG = {
  API_URL:     'http://localhost:5000/api',   // your Residia backend
  PORTAL_URL:  'http://localhost:5173',       // where the portal app runs; sign-in sends people here
  FORGOT_PATH: '/forgot-password',            // portal route for password reset ('' = use the contact form instead)

  WHATSAPP: '',            // e.g. '254712345678' (country code, no + or spaces). Empty hides WhatsApp buttons.
  PHONE:    '',            // e.g. '+254712345678'. Empty hides the call button.

  SHOW_SAMPLES: true,      // true: show sample listings if the backend is down (good for demos). Set to false in production.
  ANALYTICS_DOMAIN: '',    // e.g. 'residia.co.ke' to enable Plausible analytics. Empty = no analytics.
  QUICK_PAY_PATH: '',      // e.g. '/payments/quick-stk'. Empty hides the "Pay rent" section. Needs a backend endpoint.

  VIEWING_SLOTS: ['09:00', '11:00', '14:00', '16:00'],   // times offered in the "Book a viewing" form
  VIEWING_CLOSED_DAYS: [0],                               // days with no viewings: 0 = Sunday ... 6 = Saturday

  // Move-in costs shown on each unit (deposit + first month's rent + fees). Hidden until you set this.
  // Put YOUR real terms here, because visitors will rely on the numbers. Uncomment to turn it on.
  // MOVE_IN: {
  //   rentMonths: 1,                 // months of rent paid up front
  //   depositMonths: 2,              // deposit as a multiple of monthly rent
  //   agencyFeePercent: 0,           // % of monthly rent, or 0 for none
  //   fixedFees: [{ label: 'Water deposit', label_sw: 'Amana ya maji', amount: 2000 }]   // optional extras
  // },
  // A unit's own deposit (a number sent by your API as "deposit") replaces depositMonths for that unit.

  // Admin page (admin.html). Only change these if your backend uses different routes or roles.
  // ADMIN: {
  //   list: '/messages',               // GET: returns every enquiry (managers only)
  //   update: '/messages/{id}',        // called with { status, note } to save a status or note
  //   updateMethod: 'PATCH',
  //   roles: ['admin', 'manager']      // roles allowed in. Checked only if the login response includes a role.
  // },

  // Add real figures and real quotes only. Sections stay hidden while these are empty.
  // STATS: [{ value: '120', label: 'Units managed', label_sw: 'Nyumba zinazosimamiwa' }],
  // TESTIMONIALS: [{ quote: '...', quote_sw: '...', name: 'Jane W.', role: 'Landlord, Eldoret' }],
  STATS: [],
  TESTIMONIALS: []
};
