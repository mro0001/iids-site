/* Sample entries for the KB search demo. Inline global — never a fetched .json.
   Shaped like the real store (group, entry_type, and the track:/topic: tag namespaces) so the
   demo exercises faceting as well as ranking: three groups, two kinds, two entry types. */
window.KB_SEARCH_FIXTURE = [
  { id: 'rcds-blast', group: 'RCDS', title: 'BLAST', gist: 'Search sequences against local NCBI databases.',
    keywords: ['blast', 'blastn', 'ncbi'], tags: ['track:applications', 'topic:sequence-search'],
    entry_type: 'procedural',
    body: 'To use BLAST, load the ncbi-blast module: `module load ncbi-blast`. Run blastn against the local database.' },
  { id: 'rcds-slurm', group: 'RCDS', title: 'Slurm', gist: 'The cluster job scheduler.',
    keywords: ['slurm', 'sbatch', 'scheduler'], tags: ['track:tutorials', 'topic:scheduler'],
    entry_type: 'procedural',
    body: 'Submit jobs to the cluster with sbatch. Slurm replaced the older PBS/Torque scheduler.' },
  { id: 'rcds-gpu', group: 'RCDS', title: 'Requesting a GPU', gist: 'How to ask Slurm for GPU resources.',
    keywords: ['gpu', 'cuda', 'gres'], tags: ['track:tutorials', 'topic:gpu'],
    entry_type: 'procedural',
    body: 'Request a GPU with --gres=gpu:1. Check availability first; GPU nodes are a shared, limited resource.' },
  { id: 'iids-travel', group: 'IIDS', title: 'Travel on an IIDS award', gist: 'Booking and reimbursing travel.',
    keywords: ['travel', 'chrome river', 'reimbursement'], tags: ['track:working-with-iids', 'topic:travel'],
    entry_type: 'procedural',
    body: 'Book travel and file expenses in Chrome River. Pre-approval is required for out-of-state trips.' },
  { id: 'general-glossary', group: 'GENERAL', title: 'Glossary', gist: 'Plain-English codes and systems.',
    keywords: ['glossary', 'epaf', 'jaggaer'], tags: ['shared', 'reference'],
    entry_type: 'substantive',
    body: 'EPAF is the Banner personnel form. Jaggaer is the purchasing system. Chrome River is travel/expense.' },
  /* adoption:'draft' exercises the Draft badge on result rows. */
  { id: 'iids-policy-example', group: 'IIDS', title: 'Policy: Example Draft Policy',
    gist: 'A synthetic policy entry showing the Draft badge before adoption.',
    keywords: ['policy', 'draft'], tags: ['track:policies', 'topic:example'],
    entry_type: 'substantive', adoption: 'draft',
    body: 'The rule text reads like adopted policy on purpose — the badge alone carries the draft signal.' },
];
