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
  const cloud = root.querySelector('.publication-topic-cloud');
  const controls = root.querySelector('.publication-topic-controls');
  const sortLabel = root.querySelector('.publication-topic-sort');
  const sort = sortLabel?.querySelector('select');
  const scope = root.querySelector('.publication-topic-scope');
  const homes = new Map(topicLinks.map(link => [link, link.parentElement]));
  let view = 'cloud';
  let topic = '';
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const aliases = JSON.parse(root.querySelector('.publication-topics')?.dataset.aliases || '{}');
  const canonicalTopic = value => aliases[normalize(value).replace(/[^a-z0-9]+/g, ' ').trim()] || normalize(value);
  const records = [...root.querySelectorAll('.publication-record')].map(element => ({ element, topics: (JSON.parse(element.dataset.topics || "[]") || []).map(normalize), text: normalize(element.textContent + " " + element.dataset.authors + " " + (element.dataset.topicSearch || "") + " " + (element.dataset.topics || "") + " " + (element.dataset.research || "")) }));
  function readURL() {
    const params = new URLSearchParams(location.search);
    search.value = params.get('publication_query') || '';
    type.value = params.get('type') || location.hash.slice(1);
    year.value = params.get('year') || '';
    topic = canonicalTopic(params.get('topic') || '');
    if (!topicLinks.some(link => normalize(link.dataset.topic) === topic)) topic = '';
    // Unknown or obsolete filters should not hide the entire collection.
    if (type.selectedIndex < 0) type.value = '';
    if (year.selectedIndex < 0) year.value = '';
  }
  function arrangeTopics() {
    if (!cloud) return;
    const focusedTopic = topicLinks.includes(document.activeElement) ? document.activeElement : null;
    cloud.dataset.view = view;
    controls.querySelectorAll('[data-topic-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.topicView === view));
    });
    sortLabel.hidden = view !== 'list';
    if (view === 'list') {
      [...topicLinks].sort((a, b) => {
        const difference = sort.value === 'count' ? Number(b.dataset.count) - Number(a.dataset.count) : 0;
        return difference || (a.dataset.topicLabel || a.dataset.topic).localeCompare(b.dataset.topicLabel || b.dataset.topic);
      }).forEach(link => cloud.append(link));
    } else {
      topicLinks.forEach(link => {
        if (link.parentElement !== homes.get(link)) homes.get(link).append(link);
      });
    }
    if (focusedTopic && document.activeElement !== focusedTopic) focusedTopic.focus({ preventScroll: true });
  }
  function filter(updateURL = true) {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let shown = 0;
    let eligible = 0;
    const topicCounts = new Map();
    records.forEach(({ element, text, topics }) => {
      // Facet counts exclude the topic selection so visitors can compare alternatives.
      const baseMatch = (!type.value || element.dataset.type === type.value) &&
        (!year.value || element.dataset.year === year.value) && terms.every(term => text.includes(term));
      if (baseMatch) {
        eligible++;
        new Set(topics).forEach(value => topicCounts.set(value, (topicCounts.get(value) || 0) + 1));
      }
      const match = baseMatch && (!topic || topics.includes(topic));
      element.hidden = !match;
      if (match) shown++;
    });
    count.textContent = `${shown} of ${records.length} publications`;
    empty.hidden = shown !== 0;
    topicLinks.forEach(link => {
      const key = normalize(link.dataset.topic);
      const total = topicCounts.get(key) || 0;
      const selected = key === topic;
      link.dataset.count = total;
      link.classList.toggle('is-empty', total === 0);
      link.querySelector('.publication-topic-count').textContent = total;
      const description = `${link.dataset.topicLabel || link.dataset.topic}: ${total} ${total === 1 ? 'paper' : 'papers'} matching search, year and type${selected ? '; selected, activate to clear' : ''}`;
      link.setAttribute('aria-label', description);
      link.title = `${description}. ${link.dataset.topicDefinition || ''}`.trim();
      if (selected) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      // Modified clicks and copied links retain the current search filters too.
      const url = new URL(location.href);
      url.search = ''; url.hash = '';
      for (const [name, value] of [['publication_query', search.value.trim()], ['type', type.value], ['year', year.value], ['topic', selected ? '' : link.dataset.topic]]) {
        if (value) url.searchParams.set(name, value);
      }
      link.href = url;
    });
    if (scope) scope.textContent = `Counts reflect search, year and type filters (${eligible} ${eligible === 1 ? 'paper' : 'papers'}), before topic selection.`;
    arrangeTopics();
    if (selection) {
      selection.hidden = !topic;
      selection.querySelector('strong').textContent = topicLinks.find(link => link.dataset.topic === topic)?.dataset.topicLabel || topic;
    }
    if (clearTopic) {
      clearTopic.hidden = !topic;
      const url = new URL(location.href);
      url.search = ''; url.hash = '';
      for (const [name, value] of [['publication_query', search.value.trim()], ['type', type.value], ['year', year.value]]) {
        if (value) url.searchParams.set(name, value);
      }
      clearTopic.href = url;
    }
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
    topic = topic === normalize(value) ? '' : normalize(value);
    filter();
  }
  topicLinks.forEach(link => {
    link.addEventListener('click', event => selectTopic(event, link.dataset.topic));
  });
  clearTopic?.addEventListener('click', event => selectTopic(event, ''));
  if (controls) {
    controls.hidden = false;
    controls.querySelectorAll('[data-topic-view]').forEach(button => {
      button.addEventListener('click', () => { view = button.dataset.topicView; arrangeTopics(); });
    });
    sort.addEventListener('change', arrangeTopics);
  }
  form.hidden = false;
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', () => filter());
  form.addEventListener('change', () => filter());
  form.addEventListener('reset', event => {
    event.preventDefault();
    search.value = ''; type.value = ''; year.value = ''; topic = '';
    filter();
  });
  window.addEventListener('popstate', () => { readURL(); filter(false); });
  readURL();
  filter(false);
})();
