'use strict';

// Replace these two nulls with the published listing URLs when TwinFin launches.
// Until then every store button opens the "coming soon" message.
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
    link.querySelector('small').textContent = store === 'App Store' ? 'Download on the' : 'Get it on';
  } else {
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
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ---- The daily level: #1 was 1 October 2026 (UTC), a new one every midnight UTC (game/core/daily.gd) ----
const DAY = 86400000;
const FIRST_LEVEL = Date.UTC(2026, 9, 1);
const levelLabel = document.querySelector('#daily-level');
const countdown = document.querySelector('#countdown');
function tickDaily() {
  const now = Date.now();
  const level = Math.floor((now - FIRST_LEVEL) / DAY) + 1;
  levelLabel.textContent = level >= 1 ? `Daily level #${level}` : 'Daily level';
  const left = Math.max(0, Math.ceil((DAY - (now % DAY)) / 1000));
  const pad = n => String(n).padStart(2, '0');
  countdown.textContent = `${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`;
}
tickDaily();
setInterval(tickDaily, 1000);

// ---- The hero scene, in game px (390 × 844, waterline at 422) scaled by --s ----
const hero = document.querySelector('.hero');
const macaw = document.querySelector('#macaw');
const fish = document.querySelector('#fish');
const hint = document.querySelector('#try-hint');
const DIV = 422;
let scale = 1;
function layout() {
  const minHeight = window.innerWidth <= 760 ? 700 : 620;
  const height = Math.max(minHeight, Math.min(window.innerHeight, 1000));
  scale = height / 844;
  document.documentElement.style.setProperty('--s', scale.toFixed(4));
}
layout();
window.addEventListener('resize', layout);

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateMotion() {
  document.documentElement.classList.toggle('motion-paused', motion.matches || document.hidden);
}
motion.addEventListener('change', updateMotion);
document.addEventListener('visibilitychange', updateMotion);
updateMotion();

// Hold anywhere on the scene: the macaw climbs and the clownfish dives with it, mirrored in the waterline.
const TOP = 104, BOTTOM = DIV - 34, HOME = 300;
const LIFT = 1900, GRAVITY = 1250, MAX_UP = 430, MAX_DOWN = 520;
let y = HOME, v = 0, held = false, lastInput = -Infinity, time = 0, last = performance.now();

function interactive(target) {
  return !target.closest('a, button, .glass-card, dialog');
}
hero.addEventListener('pointerdown', event => {
  if (!interactive(event.target) || event.button > 0) return;
  held = true;
  lastInput = performance.now();
  hint.classList.add('done');
});
for (const type of ['pointerup', 'pointercancel', 'pointerleave', 'blur']) {
  (type === 'blur' ? window : hero).addEventListener(type, () => { held = false; lastInput = performance.now(); });
}
hero.addEventListener('contextmenu', event => { if (interactive(event.target)) event.preventDefault(); });

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += dt;
  if (motion.matches) {
    y = HOME;
    v = 0;
  } else if (held || now - lastInput < 1600) {
    v += (held ? -LIFT : GRAVITY) * dt;
    v = Math.max(-MAX_UP, Math.min(MAX_DOWN, v));
    y += v * dt;
    if (y < TOP) { y = TOP; v = Math.max(v, 0); }
    if (y > BOTTOM) { y = BOTTOM; v = Math.min(v, 0); }
  } else {
    // The home screen's idle glide: ease back to the middle of the lane and bob there.
    const target = HOME + Math.sin(time * 1.6) * 14;
    const pull = (target - y) * 3.2 - v * 2.4;
    v += pull * dt * 4;
    y += v * dt;
  }
  const tilt = Math.max(-0.35, Math.min(0.35, v / 1600));
  macaw.style.transform = `translateY(${(y * scale).toFixed(1)}px) rotate(${tilt.toFixed(3)}rad)`;
  fish.style.transform = `translateY(${((2 * DIV - y) * scale).toFixed(1)}px) rotate(${(-tilt).toFixed(3)}rad)`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
