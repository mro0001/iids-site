/* Synthetic sample entry for the KB entry renderer, as an inline JS global.
   NEVER ship as a fetched .json — a double-clicked file:// page cannot fetch it.
   source_url here is illustrative sample data (shows the linked-source path);
   created_date/last_updated are system-managed in production. */
window.KB_ENTRY_FIXTURE = {
  id: 'iids-submitting-a-proposal',
  group: 'IIDS',
  title: 'Submitting a proposal through IIDS',
  source: 'IIDS Standard Admin Procedures',
  source_url: 'https://www.iids.uidaho.edu/',
  gist: 'Email the IIDS grant manager at least 3 weeks before your deadline — 4 if it has subawards.',
  tags: ['track:working-with-iids', 'topic:proposals'],
  entry_type: 'procedural',
  keywords: ['proposal', 'deadline', 'subaward'],
  visibility: 'internal',
  created_date: '2026-07-17',
  last_updated: '2026-07-17',
  body: [
    'Planning to submit a proposal on an IIDS award? Loop in the IIDS office early — the lead time depends on whether subawards are involved.',
    '',
    '## Lead times',
    '- **No subawards or contracts:** contact the Program Manager at least **3 weeks** before the deadline.',
    '- **With subawards or contracts:** allow **4 weeks**.',
    '',
    '## What IIDS handles',
    '- Proposal submission, grant reporting, and grant projections',
    '- Sponsor prior-approval requests and spending plans',
    '- Subaward processing',
    '- Liaison between you and the Office of Sponsored Programs (OSP)',
    '',
    'All financial and grant questions start with the [IIDS admin contacts](iids-admin-contacts.md).'
  ].join('\n')
};

/* Draft-state sample: exercises the adoption:'draft' banner. Synthetic — the
   banner must come from the metadata key alone, so this body carries no draft
   wording of its own. */
window.KB_ENTRY_FIXTURE_DRAFT = {
  id: 'iids-policy-example',
  group: 'IIDS',
  title: 'Policy: Example Draft Policy',
  source: 'IIDS service and affiliation policies',
  source_url: null,
  gist: 'A synthetic policy entry showing how a draft renders before adoption.',
  tags: ['track:policies', 'topic:example'],
  entry_type: 'substantive',
  keywords: ['policy', 'draft'],
  visibility: 'public',
  adoption: 'draft',
  created_date: '2026-08-08',
  last_updated: '2026-08-08',
  body: [
    '## 1. Purpose',
    '',
    'This entry exists to show the draft banner. The banner renders from the entry\'s `adoption` header key, not from any sentence in this body.',
    '',
    '## 2. Rule',
    '- The rule text reads like adopted policy on purpose — the banner alone must carry the draft signal.'
  ].join('\n')
};
