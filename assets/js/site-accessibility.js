// Honour reduced motion in the theme's JavaScript scrolling and fading too.
if (window.matchMedia) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const applyMotion = () => {
    if (window.jQuery) window.jQuery.fx.off = motion.matches;
  };
  applyMotion();
  motion.addEventListener('change', applyMotion);
}

// Refresh event groupings when viewing a build made before an event finished.
function updateEvents() {
  const now = Date.now();
  document.querySelectorAll('[data-event-lists]').forEach(list => {
    const cards = Array.from(list.querySelectorAll('[data-event-end]'));
    const limit = Number(list.dataset.limit);
    ['upcoming', 'past'].forEach(group => {
      const section = list.querySelector(`[data-event-group="${group}"]`);
      const matches = cards.filter(card => (Date.parse(card.dataset.eventEnd) < now) === (group === 'past'));
      matches.sort((a, b) => (Date.parse(a.dataset.eventStart) - Date.parse(b.dataset.eventStart)) * (group === 'past' ? -1 : 1));
      matches.forEach((card, index) => {
        card.hidden = limit > 0 && index >= limit;
        section.querySelector('.lab-event-cards').appendChild(card);
      });
      section.querySelector('[data-events-empty]').hidden = matches.length > 0;
    });
  });
  document.querySelectorAll('[data-event-notice]').forEach(notice => {
    notice.hidden = Date.parse(notice.dataset.eventEnd) >= now;
  });
}
updateEvents();
window.addEventListener('pageshow', updateEvents);
