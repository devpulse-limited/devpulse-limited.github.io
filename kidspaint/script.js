'use strict';

// Replace these two nulls with the published listing URLs when the app launches.
// Until then, every store button opens the honest “coming soon” message.
const storeLinks = {
  'App Store': null,
  'Google Play': null,
};

const reveal = document.querySelector('#colour-reveal');
reveal?.addEventListener('input', () => {
  reveal.closest('.comparison').style.setProperty('--reveal', `${reveal.value}%`);
  reveal.setAttribute('aria-valuetext', `${reveal.value} percent coloured`);
});

// Animation preferences stay in memory; the website needs no cookies or storage.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateMotion() {
  document.documentElement.classList.toggle('motion-paused', motionPreference.matches || document.hidden);
}
motionPreference.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
updateMotion();

const comingSoon = document.querySelector('#coming-soon');
for (const link of document.querySelectorAll('[data-store]')) {
  const store = link.dataset.store;
  if (storeLinks[store]) {
    link.href = storeLinks[store];
    link.querySelector('small').textContent = store === 'App Store' ? 'Download on the' : 'Get it on';
  } else {
    link.addEventListener('click', event => {
      event.preventDefault();
      document.querySelector('#store-name').textContent = store;
      comingSoon.showModal();
    });
  }
}

document.querySelector('[data-open-credits]')?.addEventListener('click', () => {
  document.querySelector('#font-credits').showModal();
});
for (const button of document.querySelectorAll('[data-close-dialog]')) {
  button.addEventListener('click', () => button.closest('dialog').close());
}
// Native dialogs supply focus trapping, Escape dismissal and focus restoration.
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (event.target === dialog && outside) dialog.close();
  });
}

// Construct the support address only after a person requests it. This deters
// simple HTML address harvesting; it is not protection against determined bots.
const emailButton = document.querySelector('[data-reveal-email]');
emailButton?.addEventListener('click', () => {
  const codes = [107,105,100,115,112,97,105,110,116,64,100,101,118,112,117,108,115,101,46,99,111,46,117,107];
  const address = String.fromCharCode(...codes);
  const link = document.createElement('a');
  link.href = `mailto:${address}`;
  link.textContent = address;
  link.className = 'email-address';
  document.querySelector('#email-result').replaceChildren(link);
  emailButton.hidden = true;
  link.focus();
});

// Pick independent motion for each star, shared by its seamless ribbon copy.
const ribbonStars = document.querySelector('.ribbon-group')?.querySelectorAll('svg');
ribbonStars?.forEach((star, index) => {
  const motion = {
    '--twinkle-speed': `${3.2 + Math.random() * 2.8}s`,
    '--turn-speed': `${8 + Math.random() * 12}s`,
    '--star-phase': `${-Math.random() * 6}s`,
    '--turn-phase': `${-Math.random() * 20}s`,
    '--turn-direction': Math.random() < 0.5 ? 'normal' : 'reverse',
  };
  document.querySelectorAll('.ribbon-group').forEach(group => {
    const copy = group.querySelectorAll('svg')[index];
    for (const [property, value] of Object.entries(motion)) copy.style.setProperty(property, value);
  });
});
