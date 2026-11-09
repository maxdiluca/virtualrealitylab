(() => {
  const root = document.querySelector('.publication-database');
  const form = root?.querySelector('.publication-filters');
  if (!form) return;
  const search = form.querySelector('input');
  const type = form.querySelector('#publication-type');
  const year = form.querySelector('#publication-year');
  const count = root.querySelector('#publication-count');
  const empty = root.querySelector('#publication-empty');
  const topicLinks = [...root.querySelectorAll('[data-topic]')];
  const clearTopic = root.querySelector('.publication-topic-clear');
  const selection = root.querySelector('.publication-topic-selection');
  let topic = '';
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const records = [...root.querySelectorAll('.publication-record')].map(element => ({ element, topics: (JSON.parse(element.dataset.topics || "[]") || []).map(normalize), text: normalize(element.textContent + " " + element.dataset.authors + " " + (element.dataset.topics || "")) }));
  function readURL() {
    const params = new URLSearchParams(location.search);
    search.value = params.get('publication_query') || '';
    type.value = params.get('type') || location.hash.slice(1);
    year.value = params.get('year') || '';
    topic = normalize(params.get('topic') || '');
    if (!topicLinks.some(link => normalize(link.dataset.topic) === topic)) topic = '';
    // Unknown or obsolete filters should not hide the entire collection.
    if (type.selectedIndex < 0) type.value = '';
    if (year.selectedIndex < 0) year.value = '';
  }
  function filter(updateURL = true) {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let shown = 0;
    records.forEach(({ element, text, topics }) => {
      const match = (!type.value || element.dataset.type === type.value) &&
        (!year.value || element.dataset.year === year.value) && (!topic || topics.includes(topic)) && terms.every(term => text.includes(term));
      element.hidden = !match;
      if (match) shown++;
    });
    count.textContent = `${shown} of ${records.length} publications`;
    empty.hidden = shown !== 0;
    topicLinks.forEach(link => {
      if (normalize(link.dataset.topic) === topic) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    if (selection) {
      selection.hidden = !topic;
      selection.querySelector('strong').textContent = topic;
    }
    if (clearTopic) clearTopic.hidden = !topic;
    if (updateURL) {
      const url = new URL(location.href);
      for (const [key, value] of [['publication_query', search.value.trim()], ['type', type.value], ['year', year.value], ['topic', topic]]) {
        if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      }
      url.hash = '';
      history.replaceState(null, '', url);
    }
  }
  function selectTopic(event, value) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    topic = normalize(value);
    filter();
  }
  topicLinks.forEach(link => {
    // Preserve native taxonomy links without JavaScript; enhanced links can be shared.
    const url = new URL(location.href);
    url.search = ''; url.hash = ''; url.searchParams.set('topic', link.dataset.topic);
    link.href = url;
    link.addEventListener('click', event => selectTopic(event, link.dataset.topic));
  });
  clearTopic?.addEventListener('click', event => selectTopic(event, ''));
  form.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => filter());
  form.addEventListener('change', () => filter());
  form.addEventListener('reset', () => {
    search.value = ''; type.value = ''; year.value = ''; topic = '';
    filter();
  });
  window.addEventListener('popstate', () => { readURL(); filter(false); });
  readURL();
  filter(false);
})();
