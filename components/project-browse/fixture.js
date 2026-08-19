/* Sample projects for the browse demo. Inline global — never a fetched .json.
   Shaped like the real store, and deliberately uneven so the demo exercises what the real
   collection does: two research areas, three contributions, a project with no funder, a
   low-confidence stub with almost no fields, and one shared subject term so the topic
   cloud has something above the count-of-two threshold. */
window.PROJECT_BROWSE_FIXTURE = [
  {
    objectid: 'demo_lidar', title: 'UAS-mounted aerial lidar for agricultural research',
    description: 'An equipment award that put a drone-mounted lidar system into shared use for ' +
      'agricultural and natural-resources field campaigns.',
    significance: 'Fine-grained canopy structure at field scale had previously required contracted flights.',
    project_type: 'Equipment award', contribution: 'Research computing and data services',
    lead: 'A. Researcher', affiliation: 'University of Idaho, College of Agricultural and Life Sciences',
    funder: 'USDA National Institute of Food and Agriculture', funder_agency: 'USDA',
    award_number: '2021-00000', date: '2021', end_year: '2024', status: 'Complete',
    subject: ['remote sensing', 'lidar', 'precision agriculture'],
    research_area: 'Agriculture', confidence: 'High',
    source_url: 'https://example.org/award/2021-00000'
  },
  {
    objectid: 'demo_genomics_storage', title: 'Population genomics lab data storage',
    description: 'Durable shared storage for a sequencing-heavy population genomics laboratory ' +
      'across a multi-year award period.',
    significance: 'Sequencing datasets outlive the grants that produce them.',
    project_type: 'Data storage engagement', contribution: 'Research data storage',
    lead: 'B. Investigator', affiliation: 'University of Idaho, Department of Biological Sciences',
    funder: 'National Science Foundation', funder_agency: 'NSF',
    award_number: '2400000', date: '2024', end_year: '2027', status: 'Active',
    subject: ['population genomics', 'remote sensing'],
    research_area: 'Biological sciences', confidence: 'High'
  },
  {
    objectid: 'demo_dashboard', title: 'Administrative analytics dashboard',
    description: 'An internal decision-support dashboard built for a campus administrative unit.',
    project_type: 'Software development', contribution: 'Software development',
    lead: 'C. Developer', status: 'Active', date: '2025',
    subject: ['dashboards', 'administrative data'],
    research_area: 'Data science', confidence: 'Medium'
  },
  /* No description on purpose. Fifteen records in the real store have none — nothing about
     them is publicly documented, so there is no description a source supports — and the card
     has to render that as a state rather than as a hole. This is the case that proves it. */
  {
    objectid: 'demo_stub', title: 'Internal engagement with no public record',
    project_type: 'Internal engagement', contribution: 'F&A return only (no service engagement recorded)',
    status: 'Unknown', confidence: 'Low', research_area: 'Other'
  }
];
