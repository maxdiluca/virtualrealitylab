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
  const homes = new Map(topicLinks.map(link => [link, link.parentElement]));
  const moreTopics = root.querySelector('.publication-topic-more');
  const preview = root.querySelector('.publication-topic-preview');
  let previewedTopic = null;
  let layoutWidth = 0;
  let layoutFrame = null;
  let view = 'cloud';
  let topic = '';
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const aliases = JSON.parse(root.querySelector('.publication-topics')?.dataset.aliases || '{}');
  const canonicalTopic = value => aliases[normalize(value).replace(/[^a-z0-9]+/g, ' ').trim()] || normalize(value);
  const records = [...root.querySelectorAll('.publication-record')].map(element => ({ element, topics: (JSON.parse(element.dataset.topics || "[]") || []).map(normalize), text: normalize(element.textContent + " " + element.dataset.authors + " " + (element.dataset.topicSearch || "") + " " + (element.dataset.topics || "") + " " + (element.dataset.research || "")) }));
  function showTopicPreview(link) {
    if (!preview) return;
    previewedTopic = link;
    const current = link || topicLinks.find(item => item.dataset.topic === topic);
    preview.querySelector('strong').textContent = current?.dataset.topicLabel || 'Select a topic to filter papers';
    preview.querySelector('p').textContent = current?.dataset.topicDefinition || '';
    const total = Number(current?.dataset.count || 0);
    preview.querySelector('.publication-topic-preview-count').textContent = current ? `${total} ${total === 1 ? 'paper' : 'papers'}` : '';
    preview.dataset.group = current?.dataset.group || '';
  }
  function layoutCloud(force = false) {
    if (!cloud || view !== 'cloud' || !window.PublicationCloudLayout) return;
    const width = Math.floor(cloud.clientWidth);
    if (width < 160 || (!force && width === layoutWidth)) return;
    cloud.classList.add('is-measuring');
    const maximum = Math.max(1, ...topicLinks.map(link => Number(link.dataset.total)));
    const compact = width < 600;
    const smallest = compact ? 14 : 16;
    const largest = compact ? 32 : Math.min(56, width * .065);
    const prominent = new Set([...topicLinks].sort((a, b) => Number(b.dataset.total) - Number(a.dataset.total) || a.dataset.topicLabel.localeCompare(b.dataset.topicLabel)).slice(0, 12));
    topicLinks.forEach(link => { link.hidden = compact && !prominent.has(link) && link.dataset.topic !== topic; });
    const visibleLinks = topicLinks.filter(link => !link.hidden);
    if (moreTopics) {
      moreTopics.hidden = !compact || visibleLinks.length === topicLinks.length;
      moreTopics.querySelector('span').textContent = `${visibleLinks.length} of ${topicLinks.length} topics`;
    }
    topicLinks.forEach(link => {
      const ratio = maximum > 1 ? Math.log(Number(link.dataset.total) || 1) / Math.log(maximum) : 0;
      const size = smallest + (largest - smallest) * ratio ** 1.7;
      link.style.setProperty('--cloud-size', `${size}px`);
      link.style.setProperty('--cloud-weight', ratio > .45 ? '700' : '500');
      // A long new topic must remain inside a narrow viewport.
      const measured = link.getBoundingClientRect().width;
      if (measured > width - 24) link.style.setProperty('--cloud-size', `${Math.max(12, size * (width - 24) / measured)}px`);
    });
    const boxes = visibleLinks.map(link => {
      const index = topicLinks.indexOf(link);
      const bounds = link.getBoundingClientRect();
      return { id: index, width: Math.ceil(bounds.width), height: Math.ceil(bounds.height), weight: Number(link.dataset.total) || 1 };
    });
    const layout = window.PublicationCloudLayout.pack(boxes, width, compact ? 5 : 8);
    cloud.classList.remove('is-measuring');
    cloud.classList.toggle('is-packed', !!layout);
    cloud.style.height = layout ? `${layout.height}px` : '';
    if (layout) layout.words.forEach(word => {
      topicLinks[word.id].style.setProperty('--cloud-x', `${word.x}px`);
      topicLinks[word.id].style.setProperty('--cloud-y', `${word.y}px`);
    });
    layoutWidth = width;
  }
  function scheduleLayout(force = false) {
    if (!window.PublicationCloudLayout || typeof requestAnimationFrame !== 'function') return;
    if (force) layoutWidth = 0;
    if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => { layoutFrame = null; layoutCloud(force); });
  }
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
    cloud.style.height = view === 'list' ? '' : cloud.style.height;
    controls.querySelectorAll('[data-topic-view]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.topicView === view));
    });
    sortLabel.hidden = view !== 'list';
    if (view === 'list') {
      topicLinks.forEach(link => { link.hidden = false; });
      if (moreTopics) moreTopics.hidden = true;
      [...topicLinks].sort((a, b) => {
        const difference = sort.value === 'count' ? Number(b.dataset.count) - Number(a.dataset.count) : 0;
        return difference || (a.dataset.topicLabel || a.dataset.topic).localeCompare(b.dataset.topicLabel || b.dataset.topic);
      }).forEach(link => cloud.append(link));
    } else {
      const returning = topicLinks.some(link => link.parentElement !== homes.get(link));
      topicLinks.forEach(link => {
        if (link.parentElement !== homes.get(link)) homes.get(link).append(link);
      });
      scheduleLayout(returning || topicLinks.some(link => link.hidden && link.dataset.topic === topic));
    }
    if (focusedTopic && document.activeElement !== focusedTopic) focusedTopic.focus({ preventScroll: true });
  }
  function filter(updateURL = true) {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    let shown = 0;
    const topicCounts = new Map();
    records.forEach(({ element, text, topics }) => {
      // Facet counts exclude the topic selection so visitors can compare alternatives.
      const baseMatch = (!type.value || element.dataset.type === type.value) &&
        (!year.value || element.dataset.year === year.value) && terms.every(term => text.includes(term));
      if (baseMatch) {
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
    arrangeTopics();
    showTopicPreview(previewedTopic);
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
    link.addEventListener('pointerenter', () => showTopicPreview(link));
    link.addEventListener('pointerleave', () => showTopicPreview(topicLinks.includes(document.activeElement) ? document.activeElement : null));
    link.addEventListener('focus', () => showTopicPreview(link));
    link.addEventListener('blur', () => showTopicPreview(null));
  });
  clearTopic?.addEventListener('click', event => selectTopic(event, ''));
  if (controls) {
    controls.hidden = false;
    controls.querySelectorAll('[data-topic-view]').forEach(button => {
      button.addEventListener('click', () => { view = button.dataset.topicView; arrangeTopics(); });
    });
    sort.addEventListener('change', arrangeTopics);
  }
  moreTopics?.querySelector('button').addEventListener('click', () => { view = 'list'; arrangeTopics(); controls.querySelector('[data-topic-view="list"]').focus(); });
  if (preview) preview.hidden = false;
  if (cloud) {
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => scheduleLayout()).observe(cloud);
    else window.addEventListener('resize', () => scheduleLayout());
    document.fonts?.ready.then(() => scheduleLayout(true));
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
