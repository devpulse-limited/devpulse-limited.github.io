'use strict';

// The store listings. Both stay null (a "coming soon" message) until the game is out. The App Store link needs no
// country in it: the App Store opens each player's own storefront.
const storeLinks = {
  'App Store': null,
  'Google Play': null,
};

// ---- Store buttons and dialogs ----
const comingSoon = document.querySelector('#coming-soon');
for (const link of document.querySelectorAll('[data-store]')) {
  const store = link.dataset.store;
  if (storeLinks[store]) {
    link.href = storeLinks[store];
    const label = link.querySelector('small');
    const icon = label.querySelector('svg');
    label.textContent = store === 'App Store' ? 'Download on the' : 'Get it on';
    if (icon) label.prepend(icon);
  } else if (comingSoon) {
    link.addEventListener('click', event => {
      event.preventDefault();
      document.querySelector('#store-name').textContent = store === 'App Store' ? 'the App Store' : 'Google Play';
      comingSoon.showModal();
    });
  }
}
document.querySelector('[data-open-credits]')?.addEventListener('click', () => document.querySelector('#font-credits').showModal());
for (const button of document.querySelectorAll('[data-close-dialog]')) {
  button.addEventListener('click', () => button.closest('dialog').close());
}
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
}

// ---- Header background once the page scrolls ----
const header = document.querySelector('.site-header');
const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---- Motion: paused for reduced motion and in background tabs ----
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateMotion() {
  document.documentElement.classList.toggle('motion-paused', motion.matches || document.hidden);
}
motion.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
updateMotion();

// ---- The hero scene: a jungle level in game px (390 x 844), scaled to fit ----
const scene = document.querySelector('#scene');
if (scene) {
  const W = 390, H = 844;
  const phone = () => window.innerWidth <= 860;
  let scale = 1;
  function layout() {
    if (phone()) {
      scale = Math.min(window.innerWidth / W, 1.3);
    } else {
      const height = Math.max(560, Math.min(window.innerHeight - 130, 820));
      scale = height / H;
    }
    scene.style.setProperty('--s', scale.toFixed(4));
    scene.parentElement.style.setProperty('--s', scale.toFixed(4));
  }
  layout();
  window.addEventListener('resize', layout);

  // The coin sheet from the game (assets/art/coins.json): 96 frames of one turn, 16 to a row, 112 px cells, the big
  // coin's frames after them. The sheet is 16 x 12 cells.
  const SHEET = { frames: 96, cols: 16, rows: 12 };
  scene.style.setProperty('--coin-img', 'url(/coconut-rocket/assets/images/coins.png)');
  const framePos = f => `${(f % SHEET.cols) / (SHEET.cols - 1) * 100}% ${Math.floor(f / SHEET.cols) / (SHEET.rows - 1) * 100}%`;
  const rand = (a, b) => a + Math.random() * (b - a);
  const coins = [];
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('i');
    el.className = 'coin';
    el.style.backgroundSize = `${SHEET.cols * 100}% ${SHEET.rows * 100}%`;
    scene.prepend(el);
    coins.push({ el, x: rand(80, 310), y: rand(-80, 520), ph: Math.floor(rand(0, 96)) });
  }
  for (let i = 0; i < 16; i++) {
    const el = document.createElement('i');
    el.className = 'mote';
    el.style.left = `${rand(4, 96)}%`;
    el.style.top = `${rand(35, 100)}%`;
    el.style.animationDuration = `${rand(5, 11).toFixed(1)}s`;
    el.style.animationDelay = `${(-rand(0, 10)).toFixed(1)}s`;
    scene.prepend(el);
  }

  // Kiko hovers as on the home screen, with the game's four flame frames swapped in turn. The scene is only a
  // picture: nothing on it responds to taps or the pointer.
  const pilot = scene.querySelector('#pilot');
  const monster = scene.querySelector('#monster');
  const flames = [1, 2, 3, 4].map(n => {
    const img = new Image();
    img.src = `/coconut-rocket/assets/images/pilot-kiko-flame-${n}.png`;
    return img.src;
  });
  const HOME_X = W / 2, HOME_Y = 420, DRIFT = 70;
  let time = 0, last = performance.now(), flameFrame = 0, flameClock = 0;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const still = motion.matches;
    if (!document.hidden) {
      if (!still) time += dt;
      for (const c of coins) {
        if (!still) c.y += DRIFT * dt;
        if (c.y > H + 40) { c.y = rand(-260, -40); c.x = rand(80, 310); }
        const f = (Math.floor(time * 60 * 1.2) + c.ph) % SHEET.frames;
        c.el.style.backgroundPosition = framePos(f);
        c.el.style.transform = `translate(${(c.x * scale).toFixed(1)}px, ${(c.y * scale).toFixed(1)}px)`;
      }
      flameClock += dt;
      if (flameClock > 0.07 && !still) {
        flameClock = 0;
        flameFrame = (flameFrame + 1) % flames.length;
        pilot.src = flames[flameFrame];
      }
      const x = HOME_X + Math.sin(time * 0.6) * 14;
      const y = HOME_Y + Math.sin(time * 1.7) * 10;
      const tilt = Math.cos(time * 0.6) * 0.05;
      pilot.style.transform = `translate(${(x * scale).toFixed(1)}px, ${(y * scale).toFixed(1)}px) rotate(${tilt.toFixed(3)}rad)`;
      monster.style.transform = `translateY(${(Math.sin(time * 2.2) * 5 * scale).toFixed(1)}px)`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
