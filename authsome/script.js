'use strict';

// The App Store listing. It stays null (a "coming soon" message) until AuthSome is out. The link needs no country in
// it: the App Store opens each person's own storefront.
const storeLinks = {
  'App Store': null,
};

const comingSoon = document.querySelector('#coming-soon');
for (const link of document.querySelectorAll('[data-store]')) {
  const url = storeLinks[link.dataset.store];
  if (url) {
    link.href = url;
    link.querySelector('small').textContent = 'Download on the';
  } else if (comingSoon) {
    link.addEventListener('click', event => { event.preventDefault(); comingSoon.showModal(); });
  }
}
for (const button of document.querySelectorAll('[data-close-dialog]')) {
  button.addEventListener('click', () => button.closest('dialog').close());
}

// ---- Brand colours, worked out as the app does (BrandPalette.swift and SRGBColor.swift in the AuthSome repo) ----
// Colours are [red, green, blue] from 0 to 1. Keep the numbers here in step with the app's.
const WHITE = [1, 1, 1];
const BLACK = [0, 0, 0];
const clamp = (value, low = 0, high = 1) => Math.min(Math.max(value, low), high);
const fromHex = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255);
const css = (colour, alpha = 1) => `rgb(${colour.map(part => Math.round(part * 255)).join(' ')} / ${alpha})`;
const mix = (from, to, amount) => from.map((part, at) => part + (to[at] - part) * amount);

function toHSL([red, green, blue]) {
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  const chroma = maximum - minimum;
  if (chroma <= 0) return { hue: 0, saturation: 0, lightness };
  const saturation = chroma / (1 - Math.abs(2 * lightness - 1));
  const sector = maximum === red ? ((green - blue) / chroma) % 6 : maximum === green ? (blue - red) / chroma + 2 : (red - green) / chroma + 4;
  return { hue: (sector * 60 + 360) % 360, saturation, lightness };
}
function fromHSL(hsl) {
  const lightness = clamp(hsl.lightness);
  const chroma = (1 - Math.abs(2 * lightness - 1)) * clamp(hsl.saturation);
  const sector = hsl.hue / 60;
  const second = chroma * (1 - Math.abs(sector % 2 - 1));
  const parts = sector < 1 ? [chroma, second, 0] : sector < 2 ? [second, chroma, 0] : sector < 3 ? [0, chroma, second]
    : sector < 4 ? [0, second, chroma] : sector < 5 ? [second, 0, chroma] : [chroma, 0, second];
  return parts.map(part => clamp(part + lightness - chroma / 2));
}
const withLightness = (colour, lightness) => fromHSL({ ...toHSL(colour), lightness });
const withHue = (colour, hue) => fromHSL({ ...toHSL(colour), hue: (hue % 360 + 360) % 360 });
function luminance(colour) {
  const [red, green, blue] = colour.map(part => part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
function contrast(one, other) {
  const [darker, lighter] = [luminance(one), luminance(other)].sort((a, b) => a - b);
  return (lighter + 0.05) / (darker + 0.05);
}
// Yellows, amber to lemon, turn brown or olive when darkened, so they are kept light.
const isStrongYellow = colour => { const hsl = toHSL(colour); return hsl.hue >= 38 && hsl.hue <= 70 && hsl.saturation >= 0.5; };

// Darkens (for white text) or lightens (for black text) both stops together until the text is readable on both.
function shiftedUntilReadable(top, bottom, text, minimumContrast) {
  const direction = text === WHITE ? -1 : 1;
  let change = 0;
  let shiftedTop = top;
  let shiftedBottom = bottom;
  while (change < 1) {
    if (contrast(text, shiftedTop) >= minimumContrast && contrast(text, shiftedBottom) >= minimumContrast) break;
    change += 0.01;
    shiftedTop = withLightness(top, toHSL(top).lightness + direction * change);
    shiftedBottom = withLightness(bottom, toHSL(bottom).lightness + direction * change);
  }
  return { top: shiftedTop, bottom: shiftedBottom, change };
}

function brandPalette(hex, dark) {
  const base = fromHex(hex);
  const baseLightness = toHSL(base).lightness;
  let lightness = dark ? clamp(baseLightness, 0.30, 0.78) : clamp(baseLightness, 0.18, 0.82);
  if (isStrongYellow(base)) lightness = Math.max(lightness, 0.56);
  const top = withLightness(base, lightness + 0.08);
  const bottom = withLightness(base, lightness - 0.08);

  // White text is large and bold here, so it is held to 3:1. A colour that would need deepening by more than 0.22
  // to reach that would turn muddy, so it takes black text at 4.5:1 instead.
  let stops = shiftedUntilReadable(top, bottom, WHITE, 3);
  let text = WHITE;
  if (stops.change > 0.22) {
    stops = shiftedUntilReadable(top, bottom, BLACK, 4.5);
    text = BLACK;
  }
  const suited = withLightness(base, lightness);
  const accent = shiftedUntilReadable(suited, suited, dark ? BLACK : WHITE, 4.5).top;
  // The second tone is the deeper stop turned 10 degrees round the colour wheel, towards red for warm colours.
  const hue = toHSL(stops.bottom).hue;
  const rotated = withHue(stops.bottom, hue < 75 ? hue - 10 : hue + 10);
  const secondTone = shiftedUntilReadable(rotated, rotated, text, text === WHITE ? 3 : 4.5).top;
  return { base, top: stops.top, bottom: stops.bottom, secondTone, text, accent };
}

// The hero's colour, as the app's HeroBackground lays it out: the lighter shade fills the top and left, and the deeper
// shade and the second tone come in from the bottom right. Drawn small and stretched, so it stays soft.
function heroColourImage(palette) {
  const { top: light, bottom: deep, secondTone } = palette;
  const colours = [
    [light, light, mix(light, secondTone, 0.6)],
    [mix(light, deep, 0.5), deep, secondTone],
    [deep, mix(secondTone, deep, 0.25), secondTone],
  ];
  const through = (at, [first, middle, last]) => at < 0.5 ? first + (middle - first) * at * 2 : middle + (last - middle) * (at - 0.5) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 24;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);
  for (let row = 0; row < canvas.height; row++) {
    for (let column = 0; column < canvas.width; column++) {
      const across = column / (canvas.width - 1);
      const down = row / (canvas.height - 1);
      // The middle points of the app's mesh sit a little off centre: (0.5, 0), (0.55, 0.48) and (0.42, 1).
      const middleAcross = through(down, [0.5, 0.55, 0.42]);
      const middleDown = through(across, [0.5, 0.48, 0.5]);
      const gridAcross = across < middleAcross ? across / middleAcross : 1 + (across - middleAcross) / (1 - middleAcross);
      const gridDown = down < middleDown ? down / middleDown : 1 + (down - middleDown) / (1 - middleDown);
      const cellAcross = Math.min(Math.floor(gridAcross), 1);
      const cellDown = Math.min(Math.floor(gridDown), 1);
      const upper = mix(colours[cellDown][cellAcross], colours[cellDown][cellAcross + 1], gridAcross - cellAcross);
      const lower = mix(colours[cellDown + 1][cellAcross], colours[cellDown + 1][cellAcross + 1], gridAcross - cellAcross);
      mix(upper, lower, gridDown - cellDown).forEach((part, at) => { image.data[(row * canvas.width + column) * 4 + at] = Math.round(part * 255); });
      image.data[(row * canvas.width + column) * 4 + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL();
}

// ---- The screen: a working copy of the app's Grid, showing the app's own screenshot Accounts ----
const screen = document.querySelector('#screen');
if (screen) {
  const PERIOD = 30;
  const profiles = PROFILES;   // accounts.js

  // Runs anticlockwise from the top, so hiding the end of the countdown ring takes it away clockwise, as in the app.
  const SQUIRCLE = 'M50 0C12 0 0 12 0 50C0 88 12 100 50 100C88 100 100 88 100 50C100 12 88 0 50 0Z';
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const band = document.querySelector('#band-colour');

  // Sample 2FA codes, plainly not real ones: one digit repeated, counting up from 000 000 to 999 999 and round again
  // with each period. Every Account shows the same one. Nothing here works a code out from a Secret.
  const sampleCode = counter => { const digit = String(counter % 10); return `${digit.repeat(3)} ${digit.repeat(3)}`; };
  const counterNow = () => Math.floor(Date.now() / 1000 / PERIOD);
  const secondsLeft = () => PERIOD - (Date.now() / 1000 % PERIOD);

  const account = document.querySelector('#account');
  const tiles = document.querySelector('#tiles');
  account.innerHTML = `
    <div class="profile">
      <button class="chip" type="button" id="profile-button" aria-haspopup="menu" aria-expanded="false"><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <ul class="profile-menu" role="menu" aria-label="Profiles" hidden>${profiles.map((profile, index) => `<li role="none"><button type="button" role="menuitemradio" data-profile="${index}">${TICK}${profile.name}</button></li>`).join('')}</ul>
    </div>
    <div class="who">
      <span class="ringed"><svg viewBox="-4 -4 108 108" aria-hidden="true"><path class="ring-track" d="${SQUIRCLE}"/><path class="ring-time" pathLength="100" stroke-dasharray="100" d="${SQUIRCLE}"/></svg><span class="icon squircle"></span></span>
      <div><p class="issuer"></p><p class="account-name"></p></div>
    </div>
    <div class="code-row">
      <p class="code"></p>
      <p class="next"></p>
    </div>`;

  const profileButton = account.querySelector('#profile-button');
  const profileMenu = account.querySelector('.profile-menu');
  const ring = account.querySelector('.ring-time');
  const chosen = profiles.map(() => 0);   // each Profile remembers the Account it last showed
  let open = 0;
  let shownCounter = -1;

  const logo = entry => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${LOGOS[entry.brand]}"/></svg>`;
  const paletteOf = entry => brandPalette(entry.colour, darkScheme.matches);
  // A Brand icon, as the app's BrandIconView draws it.
  const iconStyle = palette => `--ink:${css(palette.text)};--fill:linear-gradient(135deg, ${css(palette.top)}, ${css(palette.bottom)});--shadow:${css(palette.bottom, 0.35)};--ring:${css(palette.accent)}`;
  const current = () => profiles[open].accounts[chosen[open]];

  function showAccount(codeChanged) {
    const shown = current();
    const counter = counterNow();
    const code = sampleCode(counter);
    const next = sampleCode(counter + 1);
    const palette = paletteOf(shown);
    // The wash down the screen takes the Brand's own colour, fainter for a yellow in the dark, which turns olive.
    screen.style.setProperty('--tint', css(palette.base, darkScheme.matches && isStrongYellow(palette.base) ? 0.45 : 1));
    screen.style.setProperty('--on-brand', css(palette.text));
    // The hero's background is laid over the last one and fades in, so the colour changes softly.
    const colour = document.createElement('div');
    colour.className = 'band-colour';
    colour.style.backgroundImage = `url(${heroColourImage(palette)})`;
    const sphere = (tone, size, x, y) => `<span class="sphere" style="--tone:${css(tone)};--size:${size};--x:${x};--y:${y}"></span>`;
    colour.innerHTML = sphere(palette.secondTone, 95, 85, 80) + sphere(mix(palette.top, WHITE, 0.12), 85, 15, 20)
      + sphere(mix(palette.bottom, palette.secondTone, 0.4), 65, 50, 55) + sphere(mix(palette.secondTone, palette.top, 0.5), 50, 25, 85)
      + `<span class="light"></span><span class="watermark">${logo(shown)}</span>`;
    if (!band.children.length) colour.style.animation = 'none';   // the first one is simply there
    band.append(colour);
    while (band.children.length > 2) band.firstChild.remove();
    const icon = account.querySelector('.ringed .icon');
    icon.style.cssText = iconStyle(palette);
    icon.innerHTML = logo(shown);
    account.querySelector('.issuer').textContent = shown.issuer;
    account.querySelector('.account-name').textContent = shown.name;
    account.querySelector('.code').textContent = code;
    account.querySelector('.next').textContent = `Next ${next}`;
    tiles.querySelectorAll('.tile').forEach((tile, index) => tile.setAttribute('aria-pressed', String(index === chosen[open])));
    if (codeChanged) {
      account.classList.remove('code-changing');
      void account.offsetWidth;
      account.classList.add('code-changing');
    }
    shownCounter = counter;
  }

  function showProfile(index) {
    open = index;
    profileButton.querySelector('span').textContent = profiles[index].name;
    for (const item of profileMenu.querySelectorAll('button')) item.setAttribute('aria-checked', String(Number(item.dataset.profile) === index));
    let html = '';
    let folder = null;
    profiles[index].accounts.forEach((entry, at) => {
      if ((entry.folder || '') !== folder) {
        if (folder !== null) html += '</ul>';
        folder = entry.folder || '';
        html += `${folder ? `<p class="folder">${folder}</p>` : ''}<ul class="tiles">`;
      }
      html += `<li><button class="tile" type="button" data-account="${at}" aria-pressed="false" ><span class="tile-icon" style="${iconStyle(paletteOf(entry))}"><svg viewBox="-3 -3 106 106" aria-hidden="true"><path d="${SQUIRCLE}"/></svg><span class="icon squircle">${logo(entry)}</span></span>${entry.issuer}</button></li>`;
    });
    tiles.innerHTML = `${html}</ul>`;
    showAccount(false);
  }

  function closeMenu() {
    profileMenu.hidden = true;
    profileButton.setAttribute('aria-expanded', 'false');
  }
  profileButton.addEventListener('click', () => {
    profileMenu.hidden = !profileMenu.hidden;
    profileButton.setAttribute('aria-expanded', String(!profileMenu.hidden));
  });
  profileMenu.addEventListener('click', event => {
    const choice = event.target.closest('[data-profile]');
    if (!choice) return;
    closeMenu();
    showProfile(Number(choice.dataset.profile));
    profileButton.focus();
  });
  document.addEventListener('click', event => { if (!event.target.closest('.profile')) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  tiles.addEventListener('click', event => {
    const tile = event.target.closest('.tile');
    if (!tile) return;
    chosen[open] = Number(tile.dataset.account);
    showAccount(false);
  });

  // The countdown ring is full when a 2FA code starts and empties as its time runs out.
  const drawRing = () => { ring.style.strokeDashoffset = ((1 - secondsLeft() / PERIOD) * 100).toFixed(2); };
  function everySecond() {
    if (counterNow() !== shownCounter) showAccount(true);
    const ending = secondsLeft() < 5;
    account.querySelector('.next').classList.toggle('soon', ending);
    account.querySelector('.ringed').classList.toggle('ending', ending);
    drawRing();
  }
  // Reduce Motion steps the ring once a second, as the app does, rather than running it down smoothly.
  (function everyFrame() {
    if (!reducedMotion.matches) drawRing();
    requestAnimationFrame(everyFrame);
  })();

  showProfile(0);
  darkScheme.addEventListener('change', () => showProfile(open));
  setInterval(everySecond, 500);
}
