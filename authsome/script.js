'use strict';

// Until AuthSome is out, the App Store badge is a button that opens the "coming soon" dialog. Without scripts it stays
// a label on glass, which says the same. At launch it becomes a link in index.html and this goes (README, "At launch").
const comingSoon = document.querySelector('#coming-soon');
const badge = document.querySelector('[data-coming-soon]');
if (badge && comingSoon) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = badge.className;
  button.setAttribute('aria-haspopup', 'dialog');
  button.append(...badge.childNodes);
  button.addEventListener('click', () => comingSoon.showModal());
  badge.replaceWith(button);
}
for (const button of document.querySelectorAll('[data-close-dialog]')) {
  button.addEventListener('click', () => button.closest('dialog').close());
}
// A click on the backdrop closes the dialog too. The backdrop's clicks arrive at the dialog itself, as do clicks on its
// own padding, so the click has to fall outside its box.
if (comingSoon) {
  comingSoon.addEventListener('click', event => {
    if (event.target !== comingSoon) return;
    const box = comingSoon.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) comingSoon.close();
  });
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
const screenElement = document.querySelector('#screen');
if (screenElement && (typeof PROFILES === 'undefined' || typeof LOGOS === 'undefined')) {
  // accounts.js did not arrive, so there are no Accounts to draw. The page stands as it does without scripts (the
  // .no-demo rules in styles.css), with the Mac capture in place of the tiles.
  document.documentElement.classList.add('no-demo');
  const capture = document.createElement('img');
  capture.className = 'capture';
  capture.src = 'assets/images/mac-personal.jpg';
  capture.width = 1600;
  capture.height = 1000;
  capture.alt = 'AuthSome on a Mac. The chosen Account and its 2FA code across the top, and the other Accounts in a grid below.';
  document.querySelector('#tiles').after(capture);
} else if (screenElement) {
  const PERIOD = 30;
  const FADE = 500;   // the colour fade, colour-in in styles.css, in milliseconds
  const profiles = PROFILES;   // accounts.js

  // Runs anticlockwise from the top, so hiding the end of the countdown ring takes it away clockwise, as in the app.
  const SQUIRCLE = 'M50 0C12 0 0 12 0 50C0 88 12 100 50 100C88 100 100 88 100 50C100 12 88 0 50 0Z';
  const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const darkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const band = document.querySelector('#band-layers');
  const root = document.documentElement;
  const themeColour = document.querySelector('meta[name="theme-color"]');

  // Sample 2FA codes, plainly not real ones: one digit repeated, counting up from 000 000 to 999 999 and round again
  // with each period. Every Account shows the same one. Nothing here works a code out from a Secret.
  const sampleCode = counter => { const digit = String(counter % 10); return `${digit.repeat(3)} ${digit.repeat(3)}`; };
  const counterNow = () => Math.floor(Date.now() / 1000 / PERIOD);
  const secondsLeft = () => PERIOD - (Date.now() / 1000 % PERIOD);

  const account = document.querySelector('#account');
  const tiles = document.querySelector('#tiles');
  account.innerHTML = `
    <div class="profile">
      <button class="chip" type="button" id="profile-button" aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu"><span></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      <ul class="profile-menu" id="profile-menu" role="menu" aria-label="Profiles" hidden>${profiles.map((profile, index) => `<li role="none"><button type="button" role="menuitemradio" tabindex="-1" data-profile="${index}">${TICK}${profile.name}</button></li>`).join('')}</ul>
    </div>
    <div class="who">
      <span class="ringed"><svg viewBox="-4 -4 108 108" aria-hidden="true"><path class="ring-track" d="${SQUIRCLE}"/><path class="ring-time" pathLength="100" stroke-dasharray="100" d="${SQUIRCLE}"/></svg><span class="icon squircle"></span></span>
      <div role="status"><p class="issuer"></p><p class="account-name"></p></div>
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
  let shownColour = '';

  const logo = entry => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${LOGOS[entry.brand]}"/></svg>`;
  // The grain over the hero, as the app's GrainTexture makes it: one 256 pixel tile of noise, a pixel of it to a pixel
  // of the screen, repeated across the hero and blended as overlay at a tenth strength.
  const grain = (() => {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 256;
    const context = tile.getContext('2d');
    const noise = context.createImageData(256, 256);
    for (let at = 0; at < noise.data.length; at += 4) {
      noise.data[at] = noise.data[at + 1] = noise.data[at + 2] = Math.floor(Math.random() * 256);
      noise.data[at + 3] = 255;
    }
    context.putImageData(noise, 0, 0);
    return `url(${tile.toDataURL()}) 0 0 / ${256 / (window.devicePixelRatio || 1)}px`;
  })();
  // Laid once over the colour layers, not inside each one, so its image is not parsed again with every Account.
  const grainLayer = document.createElement('div');
  grainLayer.className = 'grain';
  grainLayer.setAttribute('aria-hidden', 'true');
  grainLayer.style.background = grain;
  band.after(grainLayer);
  const paletteOf = entry => brandPalette(entry.colour, darkScheme.matches);
  // A Brand icon, as the app's BrandIconView draws it.
  const iconStyle = palette => `--ink:${css(palette.text)};--fill:linear-gradient(135deg, ${css(palette.top)}, ${css(palette.bottom)});--shadow:${css(palette.bottom, 0.35)};--ring:${css(palette.accent)}`;
  const current = () => profiles[open].accounts[chosen[open]];

  // The hero's background for an Account: laid over the last one and faded in, so the colour changes softly. The
  // layers beneath go once it has faded in, never before, so the band's plain fallback colour cannot show through.
  // A timer settles it as well as the end of the fade, because a browser that is not painting never ends the fade and
  // would be left showing the last Account's colour and logo.
  function showColour(shown, palette) {
    const key = `${shown.brand} ${shown.colour} ${darkScheme.matches}`;
    if (key === shownColour) return;
    shownColour = key;
    // The wash down the screen takes the Brand's own colour, fainter for a yellow in the dark, which turns olive. It
    // fades by a transition, which the timer below turns off once the fade is over, so that is put back first.
    screenElement.style.transition = '';
    screenElement.style.setProperty('--tint', css(palette.base, darkScheme.matches && isStrongYellow(palette.base) ? 0.45 : 1));
    // The header lies outside the screen, so the text colour and the glass under its wordmark and links are set on the
    // page. The headline's soft shade is for white letters only.
    root.style.setProperty('--on-brand', css(palette.text));
    root.style.setProperty('--glass', palette.text === WHITE ? 'rgb(0 0 0 / .3)' : 'rgb(255 255 255 / .4)');
    if (palette.text === WHITE) root.style.removeProperty('--headline-shade'); else root.style.setProperty('--headline-shade', 'none');
    if (themeColour) themeColour.content = css(palette.top);
    const colour = document.createElement('div');
    colour.className = 'band-colour';
    colour.style.backgroundImage = `url(${heroColourImage(palette)})`;
    const sphere = (tone, size, x, y) => `<span class="sphere" style="--tone:${css(tone)};--size:${size};--x:${x};--y:${y}"></span>`;
    colour.innerHTML = sphere(palette.secondTone, 95, 85, 80) + sphere(mix(palette.top, WHITE, 0.12), 85, 15, 20)
      + sphere(mix(palette.bottom, palette.secondTone, 0.4), 65, 50, 55) + sphere(mix(palette.secondTone, palette.top, 0.5), 50, 25, 85)
      + `<span class="light"></span><span class="watermark">${logo(shown)}</span>`;
    const settle = () => {
      if (!colour.isConnected) return;   // a later Account's colour has already cleared this one away
      colour.style.animation = 'none';
      while (colour.previousSibling) colour.previousSibling.remove();
    };
    const first = !band.children.length;
    band.append(colour);
    if (first || reducedMotion.matches) {
      settle();   // the first one is simply there
    } else {
      colour.addEventListener('animationend', settle, { once: true });
      // The wash's fade is a little longer, and is ended the same way unless a later colour is fading in over this one.
      setTimeout(() => {
        settle();
        if (colour.isConnected && !colour.nextSibling) screenElement.style.transition = 'none';
      }, FADE + 200);
    }
  }

  function showAccount(codeChanged) {
    const shown = current();
    const counter = counterNow();
    const palette = paletteOf(shown);
    showColour(shown, palette);
    const icon = account.querySelector('.ringed .icon');
    icon.style.cssText = iconStyle(palette);
    icon.innerHTML = logo(shown);
    // The Issuer and Account name are a status, read out when another Account is chosen. They are written only when
    // they change, so the same Account is not read out again with every new 2FA code.
    const issuer = account.querySelector('.issuer');
    const name = account.querySelector('.account-name');
    if (issuer.textContent !== shown.issuer) issuer.textContent = shown.issuer;
    if (name.textContent !== shown.name) name.textContent = shown.name;
    account.querySelector('.code').textContent = sampleCode(counter);
    account.querySelector('.next').textContent = `Next ${sampleCode(counter + 1)}`;
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
        // Folder names are headings, as in the app, and each list of tiles is named after its Folder.
        html += folder ? `<h3 class="folder" id="folder-${at}">${folder}</h3><ul class="tiles" aria-labelledby="folder-${at}">` : '<ul class="tiles" aria-label="Accounts">';
      }
      html += `<li><button class="tile" type="button" data-account="${at}" aria-pressed="false"><span class="tile-icon" style="${iconStyle(paletteOf(entry))}"><svg viewBox="-3 -3 106 106" aria-hidden="true"><path d="${SQUIRCLE}"/></svg><span class="icon squircle">${logo(entry)}</span></span>${entry.issuer}</button></li>`;
    });
    tiles.innerHTML = `${html}</ul>`;
    showAccount(false);
  }

  // The Profile menu works as a menu does: opening it puts the keyboard on the open Profile, the arrow keys, Home and
  // End move through it, and Escape or Tab closes it. Focus goes back to the button unless it has moved on elsewhere.
  const menuItems = [...profileMenu.querySelectorAll('button')];
  function openMenu() {
    profileMenu.hidden = false;
    profileButton.setAttribute('aria-expanded', 'true');
    menuItems[open].focus();
  }
  function closeMenu(returnFocus) {
    if (profileMenu.hidden) return;
    const focusWasInside = profileMenu.contains(document.activeElement);
    profileMenu.hidden = true;
    profileButton.setAttribute('aria-expanded', 'false');
    if (returnFocus || focusWasInside) profileButton.focus();
  }
  profileButton.addEventListener('click', () => { if (profileMenu.hidden) openMenu(); else closeMenu(true); });
  profileButton.addEventListener('keydown', event => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    openMenu();
  });
  profileMenu.addEventListener('click', event => {
    const choice = event.target.closest('[data-profile]');
    if (!choice) return;
    closeMenu(true);
    showProfile(Number(choice.dataset.profile));
  });
  profileMenu.addEventListener('keydown', event => {
    const at = menuItems.indexOf(document.activeElement);
    const last = menuItems.length - 1;
    const to = { ArrowDown: at === last ? 0 : at + 1, ArrowUp: at <= 0 ? last : at - 1, Home: 0, End: last }[event.key];
    if (to !== undefined) {
      event.preventDefault();
      menuItems[to].focus();
    } else if (event.key === 'Tab') {
      // Tab leaves the menu. Closing it first sends focus on from the button, in the page's own order.
      closeMenu(true);
    }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.profile')) closeMenu(false); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(true); });

  tiles.addEventListener('click', event => {
    const tile = event.target.closest('.tile');
    if (!tile) return;
    chosen[open] = Number(tile.dataset.account);
    showAccount(false);
  });

  // The countdown ring is full when a 2FA code starts and empties as its time runs out. The browser's own animation
  // runs it down, so nothing here draws each frame. With Reduce Motion it steps once a second instead, as in the app.
  let ringRun = null;
  function runRing() {
    if (ringRun) ringRun.cancel();
    ringRun = null;
    if (reducedMotion.matches || !ring.animate) return;
    ringRun = ring.animate({ strokeDashoffset: [0, 100] }, { duration: PERIOD * 1000, iterations: Infinity });
    ringRun.currentTime = (PERIOD - secondsLeft()) * 1000;
  }
  function everySecond() {
    if (counterNow() !== shownCounter) showAccount(true);
    const left = secondsLeft();
    const ending = left < 5;
    account.querySelector('.next').classList.toggle('soon', ending);
    account.querySelector('.ringed').classList.toggle('ending', ending);
    if (!ringRun) {
      ring.style.strokeDashoffset = ((1 - Math.ceil(left) / PERIOD) * 100).toFixed(2);
    } else if (Math.abs(ringRun.currentTime % (PERIOD * 1000) - (PERIOD - left) * 1000) > 250) {
      // Back in step with the clock, after the device slept or the tab was held back.
      ringRun.currentTime = (PERIOD - left) * 1000;
    }
  }

  showProfile(0);
  runRing();
  everySecond();
  // The tiles are drawn again in the new scheme's colours, so a tile that had the keyboard is given it back.
  darkScheme.addEventListener('change', () => {
    const focused = document.activeElement && document.activeElement.closest('.tile');
    const at = focused ? focused.dataset.account : null;
    showProfile(open);
    if (at !== null) tiles.querySelector(`[data-account="${at}"]`).focus();
  });
  reducedMotion.addEventListener('change', () => { ring.style.strokeDashoffset = ''; runRing(); everySecond(); });
  setInterval(everySecond, 500);

  // The spheres rest while the band is off screen, as the app's do. They run until an observer says otherwise, so a
  // browser without one loses nothing.
  if ('IntersectionObserver' in window) {
    const bandElement = document.querySelector('.band');
    new IntersectionObserver(entries => {
      bandElement.classList.toggle('resting', !entries[entries.length - 1].isIntersecting);
    }).observe(bandElement);
  }
}
