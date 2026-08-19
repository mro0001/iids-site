/* Fixture for project-spotlight's isolated demo. Shapes are copied from real records in
   backend/projects-data/iids-projects.csv; the text is trimmed. Nothing here is published. */
window.SPOTLIGHT_FIXTURE = [
  {
    objectid: 'fixture_clean',
    title: 'Characterizing the physical drivers of vegetation-forced bar evolution in gravel-bed streams',
    lead: 'Andrew Tranmer',
    status: 'Active',
    description: 'This NSF project investigates how riparian vegetation patches colonizing exposed gravel bars alter local flow hydraulics and sediment transport during floods. The second sentence should never appear in the byline.'
  },
  {
    objectid: 'fixture_suffixed_lead',
    title: 'Electromagnetic Signals from Merging Supermassive Black Holes',
    lead: 'Zachariah B. Etienne, Professor, Department of Physics, College of Science, University of Idaho',
    status: 'Active',
    description: 'This is the University of Idaho component of a NASA Theoretical and Computational Astrophysics Networks award on electromagnetic signals from merging supermassive black holes.'
  },
  {
    objectid: 'fixture_nickname_lead',
    title: 'Institute for Modeling Collaboration and Innovation',
    lead: 'Frederick M. (Marty) Ytreberg, Department of Physics, director of the Institute for Modeling Collaboration and Innovation (IMCI)',
    status: 'Active',
    description: 'A U of I institute building modeling collaborations across biology, physics and mathematics. Its name contains a parenthetical the PI rule must not split on.'
  },
  {
    objectid: 'fixture_long_desc',
    title: 'Potatoes and Pests: Actionable Science Against Nematodes',
    lead: 'Louise-Marie Dandurand (project director); co-directors Cynthia Gleason, Joseph Kuhl',
    status: 'Active',
    description: 'PAPAS is a USDA-NIFA Specialty Crop Research Initiative project, formally titled "Systems Approach to Controlling Nematodes in US Potato Production", that builds tools and strategies against plant-parasitic nematodes in U.S. potato production, focusing on the pale cyst nematode and the Columbia root-knot nematode across the major growing regions. It runs long on purpose so the byline has to truncate.'
  },

  /* --- each of the following must be EXCLUDED by the selection rule --- */
  {
    objectid: 'fixture_completed',
    title: 'A completed project that must not appear',
    lead: 'Jane Q. Researcher',
    status: 'Completed',
    description: 'Status is not Active, so the spotlight must skip this record.'
  },
  {
    objectid: 'fixture_org_lead',
    title: 'A project led by an organization, not a person',
    lead: 'University of Idaho Library (grant recipient)',
    status: 'Active',
    description: 'The lead names a unit rather than a principal investigator, so it must be skipped.'
  },
  {
    objectid: 'fixture_no_lead',
    title: 'A project with no lead recorded',
    lead: '',
    status: 'Active',
    description: 'No lead field at all, which is the most common reason an active project is skipped.'
  },
  {
    objectid: 'fixture_provenance',
    title: 'A project whose description opens with provenance prose',
    lead: 'Barrie Robison',
    status: 'Active',
    description: 'No public web source uses this name. The record exists because an internal grant line attests it.'
  }
];
