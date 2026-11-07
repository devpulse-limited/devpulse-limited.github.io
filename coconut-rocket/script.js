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

// ---- The hero scene: the game's shaft in game px (390 x 844), scaled to fit ----
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
  const hudCoin = scene.querySelector('.hud .coins i');
  if (hudCoin) {
    hudCoin.style.backgroundSize = `${SHEET.cols * 100}% ${SHEET.rows * 100}%`;
    hudCoin.style.backgroundPosition = framePos(0);
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const coins = [];
  for (let i = 0; i < 6; i++) {
    const el = document.createElement('i');
    el.className = 'coin';
    el.style.backgroundSize = `${SHEET.cols * 100}% ${SHEET.rows * 100}%`;
    scene.prepend(el);
    coins.push({ el, x: rand(80, 310), y: rand(-80, 520), ph: Math.floor(rand(0, 96)), got: false });
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

  // Kiko's rocket, with the game's four flame frames swapped in turn.
  const pilot = scene.querySelector('#pilot');
  const monster = scene.querySelector('#monster');
  const flames = [1, 2, 3, 4].map(n => {
    const img = new Image();
    img.src = `/coconut-rocket/assets/images/pilot-kiko-flame-${n}.png`;
    return img.src;
  });
  const metresEl = document.querySelector('#metres');
  const coinCountEl = document.querySelector('#coin-count');
  const hint = document.querySelector('#try-hint');

  // Flight, in game px per second (the pilot's centre). Home is where the home screen hovers it.
  const HOME_X = W / 2, HOME_Y = 420, TOP = 190, CAUGHT = 690;
  const LIFT = 1500, GRAVITY = 900, MAX_UP = 420, MAX_DOWN = 480;
  let x = HOME_X, y = HOME_Y, v = 0, targetX = HOME_X;
  let held = false, lastInput = -Infinity, time = 0, last = performance.now();
  let metres = 0, coinCount = 0, flameFrame = 0, flameClock = 0, safeUntil = 0;

  const toGameX = event => {
    const box = scene.getBoundingClientRect();
    return Math.max(70, Math.min(W - 70, (event.clientX - box.left) / scale));
  };
  scene.addEventListener('pointerdown', event => {
    if (event.button > 0) return;
    held = true;
    targetX = toGameX(event);
    lastInput = performance.now();
    hint?.classList.add('done');
  });
  scene.addEventListener('pointermove', event => {
    if (held) targetX = toGameX(event);
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    scene.addEventListener(type, () => { held = false; lastInput = performance.now(); });
  }
  window.addEventListener('blur', () => { held = false; });
  scene.addEventListener('contextmenu', event => event.preventDefault());

  function caught(now) {
    safeUntil = now + 1200;
    scene.classList.remove('caught', 'shake');
    void scene.offsetWidth;
    scene.classList.add('caught', 'shake');
    metres = 0;
    coinCount = 0;
    v = -MAX_UP;
    held = false;
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const still = motion.matches;
    if (!document.hidden) {
      time += dt;
      const active = held || now - lastInput < 1800;
      if (still) {
        x = HOME_X; y = HOME_Y; v = 0;
      } else if (active) {
        v += (held ? -LIFT : GRAVITY) * dt;
        v = Math.max(-MAX_UP, Math.min(MAX_DOWN, v));
        y += v * dt;
        if (y < TOP) { y = TOP; v = Math.max(v, 0); }
        if (y > CAUGHT) {
          if (now > safeUntil) caught(now);
          y = CAUGHT;
        }
        x += (targetX - x) * Math.min(1, dt * 8);
      } else {
        // The home screen's hover: ease back to the middle and bob there.
        const target = HOME_Y + Math.sin(time * 1.7) * 10;
        v += ((target - y) * 3.2 - v * 2.4) * dt * 4;
        y += v * dt;
        x += (HOME_X - x) * Math.min(1, dt * 2);
        targetX = x;
      }

      // The shaft scrolls past: coins drift down faster while the thrusters fire.
      const climb = still ? 0 : (active ? (held ? 260 : 110) : 60);
      if (active && !still) metres += dt * (held ? 9 : 3);
      for (const c of coins) {
        if (!still) c.y += climb * dt;
        if (c.y > H + 40) {
          c.y = rand(-260, -40);
          c.x = rand(80, 310);
          c.got = false;
          c.el.classList.remove('got');
        }
        if (!c.got && !still && Math.hypot(c.x - x, c.y - y) < 48) {
          c.got = true;
          coinCount++;
          c.el.classList.add('got');
        }
        const f = (Math.floor(time * 60 * 1.2) + c.ph) % SHEET.frames;
        c.el.style.backgroundPosition = framePos(still ? c.ph : f);
        c.el.style.transform = `translate(${(c.x * scale).toFixed(1)}px, ${(c.y * scale).toFixed(1)}px)`;
      }

      flameClock += dt;
      if (flameClock > 0.07 && !still) {
        flameClock = 0;
        flameFrame = (flameFrame + 1) % flames.length;
        pilot.src = flames[flameFrame];
      }
      const tilt = Math.max(-0.25, Math.min(0.25, (targetX - x) / 300 + v / 4000));
      pilot.style.transform = `translate(${(x * scale).toFixed(1)}px, ${(y * scale).toFixed(1)}px) rotate(${tilt.toFixed(3)}rad)`;

      // Scissorjaw falls behind while you climb and closes in as you drop, breathing as it waits.
      const lag = Math.max(-30, Math.min(110, (HOME_Y - y) * 0.45));
      const breathe = still ? 0 : Math.sin(time * 2.2) * 5;
      monster.style.transform = `translateY(${((lag + breathe) * scale).toFixed(1)}px)`;

      metresEl.textContent = Math.floor(metres);
      coinCountEl.textContent = coinCount;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
