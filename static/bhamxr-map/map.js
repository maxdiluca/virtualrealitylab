(() => {
  'use strict';
  const root = document.getElementById('bhamxr-map');
  if (!root) return;
  const embedded = new URLSearchParams(window.location.search).get('embed') === '1';
  document.documentElement.classList.toggle('is-embedded', embedded);
  const $ = selector => root.querySelector(selector);
  const search = $('#member-search');
  const list = $('[data-member-list]');
  const panel = $('[data-person-panel]');
  const svg = $('.theme-lines');
  const status = $('[data-load-state]');
  let data, activeGroup = null, activePerson = null, query = '', relatedFilter = null;
  let peopleById = new Map(), groupsById = new Map(), themeButtons = new Map();
  let renderFrame = 0, resizeFrame = 0, lastHeight = 0;
  const mapOrder = ['culture', 'perception', 'ai', 'society', 'health', 'enabling', 'learning'];
  const text = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const normalise = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  // Match recorded interests/methods, allowing spelling, plural and acronym variants.
  // Broad thematic membership is not used as a substitute for a matching tag.
  const tagWords = value => normalise(value)
    .replace(/\bvr\b/g, 'virtual reality').replace(/\bar\b/g, 'augmented reality').replace(/\bmr\b/g, 'mixed reality')
    .replace(/\bxr\b/g, 'extended reality').replace(/\bai\b/g, 'artificial intelligence')
    .replace(/\bhci\b/g, 'human computer interaction').replace(/\bllms?\b/g, 'large language model')
    .replace(/three[ -]dimensional/g, '3d').replace(/behavior/g, 'behaviour')
    .replace(/[^a-z0-9]+/g, ' ').trim().split(/\s+/)
    .filter(word => word && !['and', 'or', 'of', 'the', 'in', 'for', 'with'].includes(word))
    .map(word => word.length > 4 && word.endsWith('ies') ? word.slice(0, -3) + 'y' :
      word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);
  const matchingTags = (person, value) => {
    const terms = tagWords(value);
    if (!terms.length) return [];
    const phrase = ` ${terms.join(' ')} `;
    return [...new Set([...person.interests, ...person.methods])].filter(tag =>
      ` ${tagWords(tag).join(' ')} `.includes(phrase));
  };
  const hasRelatedTag = (person, value) => matchingTags(person, value).length > 0;
  const relatedPeople = (value, sourceId) => data.people.filter(person => person.id !== sourceId && hasRelatedTag(person, value));
  const groupMembers = id => data.people.filter(person => person.groups.includes(id));
  const sharedCount = (a, b) => data.people.filter(person => person.groups.includes(a) && person.groups.includes(b)).length;
  function validData(value) {
    if (!value || !Array.isArray(value.people) || !value.people.length || !Array.isArray(value.groups) || !value.groups.length) return false;
    const groupIds = new Set(value.groups.map(group => group.id));
    const personIds = new Set(value.people.map(person => person.id));
    if (personIds.size !== value.people.length || groupIds.size !== value.groups.length) return false;
    return value.groups.every(group => ['id', 'short', 'label', 'topics'].every(key => typeof group[key] === 'string')) &&
      value.people.every(person => ['id', 'name', 'affiliation', 'summary'].every(key => typeof person[key] === 'string') &&
        ['interests', 'methods', 'groups'].every(key => Array.isArray(person[key]) && person[key].every(item => typeof item === 'string')) &&
        person.groups.every(id => groupIds.has(id)));
  }
  function selectGroup(id) {
    relatedFilter = null;
    activeGroup = id;
    renderSelection();
  }
  function focusResults() {
    const heading = $('#browser-title');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  function selectRelatedTag(value) {
    relatedFilter = { value, sourceId: activePerson };
    activeGroup = null;
    query = ''; search.value = '';
    renderSelection();
    focusResults();
  }
  function buildMap() {
    const nodes = $('[data-theme-nodes]');
    nodes.replaceChildren();
    themeButtons.clear();
    const ordered = [...data.groups].sort((a, b) => mapOrder.indexOf(a.id) - mapOrder.indexOf(b.id));
    ordered.forEach(group => {
      const button = text('button', 'theme-button');
      button.type = 'button';
      button.dataset.themeId = group.id;
      button.setAttribute('aria-controls', 'member-list');
      button.setAttribute('aria-pressed', 'false');
      button.append(text('span', 'theme-label', group.short), text('span', 'theme-count', groupMembers(group.id).length + ' people'), text('span', 'theme-shared'));
      button.addEventListener('click', () => selectGroup(activeGroup === group.id ? null : group.id));
      themeButtons.set(group.id, button);
      nodes.append(button);
    });
    $('[data-hub-count]').textContent = `${data.people.length} people · ${data.groups.length} themes`;
  }
  function drawLines() {
    renderFrame = 0;
    svg.replaceChildren();
    const stage = $('[data-theme-map]').getBoundingClientRect();
    if (window.matchMedia('(max-width: 760px)').matches || stage.width === 0) return;
    svg.setAttribute('viewBox', `0 0 ${stage.width} ${stage.height}`);
    const position = element => {
      const bounds = element.getBoundingClientRect();
      return [bounds.left - stage.left + bounds.width / 2, bounds.top - stage.top + bounds.height / 2];
    };
    const centre = position($('.map-centre'));
    const point = id => position(themeButtons.get(id));
    const line = (a, b, className = '') => {
      const edge = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      edge.setAttribute('x1', a[0]); edge.setAttribute('y1', a[1]);
      edge.setAttribute('x2', b[0]); edge.setAttribute('y2', b[1]);
      if (className) edge.setAttribute('class', className);
      svg.append(edge);
    };
    data.groups.forEach(group => line(centre, point(group.id)));
    if (activeGroup) data.groups.forEach(group => {
      if (group.id !== activeGroup && sharedCount(activeGroup, group.id)) line(point(activeGroup), point(group.id), 'shared-line');
    });
    const person = peopleById.get(activePerson);
    if (person) person.groups.forEach(id => line(centre, point(id), 'person-line'));
  }
  function queueLines() {
    if (!renderFrame) renderFrame = window.requestAnimationFrame(drawLines);
  }
  function matchingPeople() {
    const terms = normalise(query.trim()).split(/\s+/).filter(Boolean);
    return data.people.filter(person => {
      if (activeGroup && !person.groups.includes(activeGroup)) return false;
      if (relatedFilter && (person.id === relatedFilter.sourceId || !hasRelatedTag(person, relatedFilter.value))) return false;
      const haystack = normalise([person.name, person.affiliation, person.summary, ...person.interests, ...person.methods, ...person.groups.map(id => groupsById.get(id).label)].join(' '));
      return terms.every(term => haystack.includes(term));
    });
  }
  function renderSelection() {
    const visible = matchingPeople();
    if (activePerson && !visible.some(person => person.id === activePerson) && activePerson !== relatedFilter?.sourceId) activePerson = null;
    const group = groupsById.get(activeGroup);
    $('[data-group-title]').textContent = relatedFilter ? `People linked by “${relatedFilter.value}”` : group ? group.label : 'All people';
    $('[data-group-topics]').textContent = relatedFilter ? `Matching research interests or methods across all themes. ${peopleById.get(relatedFilter.sourceId).name} is excluded from these results.` : group ? group.topics : 'Browse across disciplines, or select a theme above to narrow the map.';
    $('#search-help').textContent = relatedFilter ? 'Search within these related people, or choose All people to browse the whole map.' : 'Search within the selected theme, or choose All people to search the whole map.';
    $('[data-all]').setAttribute('aria-pressed', String(!activeGroup && !relatedFilter));
    $('[data-clear]').hidden = !query;
    $('[data-result-status]').textContent = `${visible.length} ${relatedFilter ? 'other ' : ''}${visible.length === 1 ? 'person' : 'people'}${group ? ' in this theme' : ' across all themes'}${query.trim() ? ' matching your search' : ''}`;
    $('[data-no-results]').hidden = visible.length !== 0;
    $('[data-no-results]').textContent = relatedFilter && !query.trim() ? `No other members currently have matching interests or methods for “${relatedFilter.value}”. Choose another tag or explore a connected theme.` : 'No matching people. Try another term or reset the filters.';
    list.replaceChildren();
    visible.forEach(person => {
      const item = document.createElement('li');
      const button = text('button', 'member-button');
      button.type = 'button';
      button.dataset.personId = person.id;
      button.setAttribute('aria-pressed', String(person.id === activePerson));
      button.setAttribute('aria-controls', 'person-title');
      button.append(text('span', 'member-name', person.name), text('span', 'member-affiliation', person.affiliation));
      if (relatedFilter) button.append(text('span', 'member-match', 'Matches: ' + matchingTags(person, relatedFilter.value).join('; ')));
      button.addEventListener('click', () => selectPerson(person.id));
      item.append(button); list.append(item);
    });
    renderPerson();
    updateMapState();
  }
  function updateMapState() {
    const person = peopleById.get(activePerson);
    data.groups.forEach(group => {
      const button = themeButtons.get(group.id);
      button.setAttribute('aria-pressed', String(group.id === activeGroup));
      button.classList.toggle('is-person-theme', Boolean(person?.groups.includes(group.id)));
      const count = activeGroup && activeGroup !== group.id ? sharedCount(activeGroup, group.id) : 0;
      button.querySelector('.theme-shared').textContent = count ? `${count} shared with selected theme` : '';
      button.setAttribute('aria-label', `${group.label}, ${groupMembers(group.id).length} people${count ? `, ${count} shared with the selected theme` : ''}`);
    });
    queueLines();
    queueHeight();
  }
  function selectPerson(id) {
    activePerson = id;
    list.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.personId === id)));
    renderPerson();
    updateMapState();
    // Move focus to the detail heading so keyboard and screen-reader users can read it immediately.
    const heading = $('#person-title');
    heading.focus({ preventScroll: true });
    if (window.matchMedia('(max-width: 760px)').matches) panel.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  function addTags(label, values) {
    if (!values.length) return;
    panel.append(text('h4', 'person-label', label));
    const tags = text('ul', 'tag-list');
    values.forEach(value => {
      const count = relatedPeople(value, activePerson).length;
      const item = document.createElement('li');
      const button = text('button', 'interest-link');
      button.type = 'button';
      button.dataset.relatedTag = value;
      button.setAttribute('aria-controls', 'member-list');
      button.setAttribute('aria-label', `${value}: find ${count} other ${count === 1 ? 'person' : 'people'} with matching interests or methods`);
      button.setAttribute('aria-pressed', String(relatedFilter?.sourceId === activePerson && relatedFilter.value === value));
      const badge = text('span', 'tag-count', count);
      badge.setAttribute('aria-hidden', 'true');
      button.append(text('span', '', value), badge);
      button.addEventListener('click', () => selectRelatedTag(value));
      item.append(button); tags.append(item);
    });
    panel.append(tags);
  }
  function renderPerson() {
    panel.replaceChildren();
    const person = peopleById.get(activePerson);
    if (!person) {
      const empty = text('div', 'empty-detail');
      const heading = text('h3', '', 'Select a person');
      heading.id = 'person-title'; heading.tabIndex = -1;
      empty.append(text('p', 'eyebrow', 'Member details'), heading, text('p', '', 'Choose a name to explore their research interests, methods and connections across themes.'));
      panel.append(empty); return;
    }
    const heading = text('h3', '', person.name);
    heading.id = 'person-title'; heading.tabIndex = -1;
    panel.append(text('p', 'eyebrow', 'Member details'), heading, text('p', 'person-affiliation', person.affiliation), text('p', 'person-summary', person.summary));
    panel.append(text('p', 'tag-help', 'Select an interest or method to find other members. Numbers show matching people.'));
    addTags('Research interests', person.interests);
    addTags('Methods & expertise', person.methods);
    if (person.groups.length) {
      panel.append(text('h4', 'person-label', 'Connected themes'));
      const themes = text('div', 'detail-themes');
      person.groups.forEach(id => {
        const button = text('button', 'detail-theme', groupsById.get(id).short);
        button.type = 'button';
        button.addEventListener('click', () => {
          query = ''; search.value = ''; selectGroup(id);
          focusResults();
        });
        themes.append(button);
      });
      panel.append(themes);
    }
  }
  async function loadData() {
    status.hidden = false;
    status.classList.remove('is-error');
    $('[data-load-message]').textContent = 'Loading the expertise map…';
    $('[data-retry]').hidden = true;
    $('[data-content]').hidden = true;
    try {
      const response = await fetch(new URL(root.dataset.membersUrl || './members.json', document.baseURI), { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Data request failed');
      const value = await response.json();
      if (!validData(value)) throw new Error('Invalid map data');
      data = value;
      data.people.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
      peopleById = new Map(data.people.map(person => [person.id, person]));
      groupsById = new Map(data.groups.map(group => [group.id, group]));
      $('[data-title]').textContent = data.title || 'BhamXR expertise map';
      $('[data-intro]').textContent = data.intro || 'Explore research interests and expertise across BhamXR.';
      const date = /^\d{4}-\d{2}-\d{2}$/.test(data.updated || '') ? new Date(data.updated + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/London' }) : '';
      $('[data-meta]').textContent = `${data.people.length} people · ${data.groups.length} overlapping themes${date ? ' · Updated ' + date : ''}`;
      document.title = data.title || 'BhamXR expertise map';
      buildMap();
      status.hidden = true;
      $('[data-content]').hidden = false;
      renderSelection();
    } catch (_) {
      status.classList.add('is-error');
      $('[data-load-message]').textContent = 'The expertise map could not be loaded. Check your connection and try again.';
      $('[data-retry]').hidden = false;
      queueHeight();
    }
  }
  $('[data-all]').addEventListener('click', () => selectGroup(null));
  $('[data-reset]').addEventListener('click', () => { query = ''; search.value = ''; activePerson = null; selectGroup(null); });
  $('[data-clear]').addEventListener('click', () => { query = ''; search.value = ''; renderSelection(); search.focus(); });
  $('[data-retry]').addEventListener('click', loadData);
  $('.search-form').addEventListener('submit', event => event.preventDefault());
  search.addEventListener('input', () => { query = search.value; if (data) renderSelection(); });
  window.addEventListener('resize', () => { if (data) queueLines(); queueHeight(); });

  // Optional iframe resizing. Exact HTTPS origins are configured on the root element.
  // The parent must check event.source against its iframe.contentWindow when receiving.
  let allowedOrigins = [];
  try {
    allowedOrigins = JSON.parse(root.dataset.resizeParentOrigins || '[]').filter(value => {
      const url = new URL(value);
      return url.origin === value && url.protocol === 'https:' &&
        (url.hostname === 'birmingham.ac.uk' || url.hostname.endsWith('.birmingham.ac.uk'));
    });
  } catch (_) { allowedOrigins = []; }
  let parentOrigin = null;
  try {
    const origin = new URL(document.referrer).origin;
    if (allowedOrigins.includes(origin)) parentOrigin = origin;
  } catch (_) { /* No referrer: await an authenticated request from the parent. */ }
  function queueHeight() {
    if (!embedded || window.parent === window || !parentOrigin || resizeFrame) return;
    resizeFrame = window.requestAnimationFrame(() => {
      resizeFrame = 0;
      // Measure content, not viewport height, so the iframe can shrink as well as grow.
      const bounds = root.getBoundingClientRect();
      const height = Math.ceil(bounds.height + bounds.top + window.scrollY);
      if (Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      window.parent.postMessage({ type: 'bhamxr-map:resize', version: 1, height }, parentOrigin);
    });
  }
  window.addEventListener('message', event => {
    if (!embedded || event.source !== window.parent || !allowedOrigins.includes(event.origin)) return;
    if (event.data?.type !== 'bhamxr-map:resize-request') return;
    parentOrigin = event.origin; lastHeight = 0; queueHeight();
  });
  if ('ResizeObserver' in window) new ResizeObserver(() => { if (data) queueLines(); queueHeight(); }).observe(root);
  loadData();
})();
