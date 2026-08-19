/* Fixture for news-archive's isolated demo. Shapes copied from real rows in
   backend/news-data/news.json; text trimmed. Deliberately spans three years so the year
   filter has something to do, and includes an item with no image and one with a long body
   so both display paths are visible. */
window.NEWS_FIXTURE = [
  {
    id: 'news-174',
    title: 'IIDS Generative AI Fellow Publishes in MDPI AI',
    date: '2025-04-18',
    image: null,
    source_url: 'https://www.iids.uidaho.edu/news.php?newsid=174',
    body: 'Medical students face a tough challenge: learning an overwhelming amount of complex information quickly. To help make one of the most difficult topics more engaging and easier to remember, the team created short, cinematic, educational films powered by artificial intelligence.'
  },
  {
    id: 'news-170',
    title: 'Director featured in the letter from the President',
    date: '2025-04-04',
    image: null,
    source_url: 'https://www.iids.uidaho.edu/news.php?newsid=170',
    body: 'The director of the Institute for Interdisciplinary Data Sciences discusses the potential of AI and current AI projects happening at the University of Idaho.'
  },
  {
    id: 'news-fixture-long',
    title: 'An item whose body must be cut to an excerpt',
    date: '2024-09-02',
    image: null,
    source_url: null,
    body: ('This body runs well past the excerpt cap so the list has to truncate it on a word ' +
           'boundary rather than mid-word, and has to append an ellipsis so a reader can tell ' +
           'something was left out. ').repeat(3)
  },
  {
    id: 'news-fixture-noimage',
    title: 'An item with no image at all',
    date: '2024-03-11',
    image: null,
    source_url: null,
    body: 'Twelve of the 114 real items carry no image. The row must collapse its thumbnail column rather than leaving a gap.'
  },
  {
    id: 'news-fixture-2018',
    title: 'Data Science Competition',
    date: '2018-03-13',
    image: null,
    source_url: null,
    body: 'The oldest shape in the archive, kept here so the year filter has a third year to separate.'
  }
];
