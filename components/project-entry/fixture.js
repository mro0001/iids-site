/* Sample projects for the entry demo. Inline global — never a fetched .json.
   Three records on purpose: a fully documented one, a low-confidence stub carrying almost
   nothing (the case the renderer has to handle without looking broken), and one whose source
   is a page on this site rather than a citation, which is the branch that turns the Source
   footnote into a continuation link under the description.
   The stub also carries the two suppressed values (status 'Unknown', research_area 'Other')
   and an evidence_note, so the demo shows what each of them does. */
window.PROJECT_ENTRY_FIXTURE = [
  {
    objectid: 'demo_lidar', title: 'UAS-mounted aerial lidar for agricultural research',
    description: 'An equipment award that put a drone-mounted lidar system into shared use for ' +
      'agricultural and natural-resources field campaigns across the state, replacing contracted ' +
      'overflights with an instrument the university schedules itself.',
    significance: 'Fine-grained canopy structure at field scale had previously required contracted ' +
      'flights, which set the cadence of data collection by budget rather than by the season.',
    project_type: 'Equipment award', contribution: 'Research computing and data services',
    lead: 'A. Researcher', affiliation: 'University of Idaho, College of Agricultural and Life Sciences',
    partners: 'Washington State University', funder: 'USDA National Institute of Food and Agriculture',
    funder_agency: 'USDA', award_number: '2021-00000', date: '2021', end_year: '2024',
    status: 'Complete', program: 'Equipment Grants Program',
    infrastructure: 'Research data storage; high-performance computing, documented at ' +
      'https://example.org/facilities/hpc',
    deliverables: 'Shared lidar instrument; processed point-cloud archive',
    subject: ['remote sensing', 'lidar', 'precision agriculture'],
    research_area: 'Agriculture', confidence: 'High',
    location: 'Moscow, Idaho', location_basis: 'Institution of the lead investigator',
    source_url: 'https://example.org/award/2021-00000'
  },
  {
    objectid: 'demo_stub', title: 'Internal engagement with no public record',
    project_type: 'Internal engagement',
    contribution: 'F&A return only (no service engagement recorded)',
    status: 'Unknown', confidence: 'Low', research_area: 'Other',
    evidence_note: 'Internal source: the IIDS ClickUp workspace.'
  },
  {
    objectid: 'demo_insite', title: 'A project with a page of its own',
    description: 'The record says what the project is; the page it points at is the rest of ' +
      'it. A relative source_url is how a record declares that, and it is the only thing ' +
      'that moves the link out of the Source footnote and under the description.',
    project_type: 'Program', contribution: 'Program support', status: 'Active',
    subject: ['demo'], research_area: 'Data science & computing', confidence: 'High',
    source_url: 'demo.html'
  }
];
