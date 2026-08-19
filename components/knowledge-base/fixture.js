/* Sample data for the Knowledge Base browser, as an inline JS global.
   NEVER ship this as a fetched .json — a double-clicked file:// page cannot fetch it. */
window.KB_FIXTURE = {
  kind: 'kb',
  detailPage: '../../mockups/kb_placeholder.html',
  addHref: '../../mockups/intranet_kb_add.html',
  guidelinesHref: '../../mockups/intranet_kb_guidelines.html',
  groups: ['RCDS', 'IIDS', 'GBRC', 'GENERAL'],
  items: {
    RCDS: ['Example KB Entry 1', 'Example KB Entry 2', 'Example KB Entry 3', 'Example KB Entry 4', 'Example KB Entry 5'],
    IIDS: ['Example KB Entry 1', 'Example KB Entry 2', 'Example KB Entry 3', 'Example KB Entry 4', 'Example KB Entry 5'],
    GBRC: ['Example KB Entry 1', 'Example KB Entry 2', 'Example KB Entry 3', 'Example KB Entry 4', 'Example KB Entry 5'],
    GENERAL: ['Example KB Entry 1', 'Example KB Entry 2', 'Example KB Entry 3', 'Example KB Entry 4', 'Example KB Entry 5'],
  },
};
