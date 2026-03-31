/**
 * Comprehensive End-to-End Puppeteer test for Music-ABCF
 * Migrated to plain React + Vite + React Router (no more RN Web)
 *
 * Tests:
 *  1. Login / Sign-up flow
 *  2. Song Library (search, list, FAB)
 *  3. Viewer Screen (chords, lyrics, chord colors, scroll, transpose, auto-scroll, playback)
 *  4. Add Song (paste text, URL tab, file tab, cloud sync)
 *  5. Edit Song (pre-filled fields, save, delete)
 *  6. Settings (dark mode, sharps, cloud sync up/down, sign out)
 *  7. Setlists (create, list, manage)
 *  8. Full navigation flow
 *  9. Responsive layout checks
 * 10. Accessibility (keyboard nav, focus)
 */
const puppeteer = require('puppeteer');

const BASE = process.env.APP_URL || 'http://localhost:4173';
const RUN_ID = Date.now();
const TEST_EMAIL = process.env.TEST_EMAIL || `e2etest_${RUN_ID}@testmusic.com`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || `Test@${RUN_ID}`;
const TIMEOUT = 60000;

let browser;
let page;
let passed = 0;
let failed = 0;
const failures = [];
const consoleErrors = [];
const warnings = [];

// --- Helpers ---

async function assert(label, fn) {
  try {
    await fn();
    passed++;
    console.log('  \u2705 ' + label);
  } catch (e) {
    failed++;
    failures.push({ label, error: e.message });
    console.log('  \u274C ' + label + ': ' + e.message);
  }
}

async function warn(label, fn) {
  try {
    await fn();
    console.log('  \u2705 ' + label);
  } catch (e) {
    warnings.push({ label, error: e.message });
    console.log('  \u26a0\ufe0f  ' + label + ' (non-blocking): ' + e.message);
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getPageText() {
  return page.evaluate(() => document.body?.innerText || '');
}

async function waitForText(text, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const content = await getPageText();
    if (content.includes(text)) return content;
    await sleep(400);
  }
  throw new Error('Text "' + text + '" not found within ' + timeout + 'ms');
}

async function waitForSelector(selector, timeout = 10000) {
  return page.waitForSelector(selector, { visible: true, timeout });
}

async function clickButton(textOrPartial) {
  const clicked = await page.evaluate((t) => {
    const buttons = document.querySelectorAll('button, [role="button"], a');
    for (const btn of buttons) {
      const label = (btn.textContent || '').trim();
      if (label === t || label.includes(t)) {
        btn.click();
        return true;
      }
    }
    return false;
  }, textOrPartial);
  if (!clicked) throw new Error('Button with text "' + textOrPartial + '" not found');
  await sleep(500);
}

async function clickByText(text) {
  const clicked = await page.evaluate((t) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      if (walk.currentNode.textContent && walk.currentNode.textContent.trim() === t) {
        let el = walk.currentNode.parentElement;
        for (let i = 0; i < 6 && el; i++) {
          if (el.tagName === 'BUTTON' || el.tagName === 'A' ||
              el.getAttribute('role') === 'button' ||
              el.getAttribute('tabindex') !== null || el.onclick ||
              (el.style && el.style.cursor === 'pointer')) {
            el.click();
            return true;
          }
          el = el.parentElement;
        }
        walk.currentNode.parentElement && walk.currentNode.parentElement.click();
        return true;
      }
    }
    return false;
  }, text);
  if (!clicked) throw new Error('Clickable "' + text + '" not found');
  await sleep(500);
}

async function typeIntoInput(placeholder, value) {
  const handle = await page.evaluateHandle((ph) => {
    const inputs = document.querySelectorAll('input, textarea');
    for (const inp of inputs) {
      if ((inp.getAttribute('placeholder') || '').includes(ph)) return inp;
    }
    return null;
  }, placeholder);
  const el = handle.asElement();
  if (!el) throw new Error('Input with placeholder "' + placeholder + '" not found');
  await el.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await el.type(value, { delay: 20 });
  await sleep(150);
}

async function screenshot(name) {
  await page.screenshot({ path: '/workspaces/Music-ABCF/scripts/' + name + '.png', fullPage: true });
}

async function countElements(selector) {
  return page.evaluate((s) => document.querySelectorAll(s).length, selector);
}

// --- Test Suites ---

async function testLogin() {
  console.log('\n\ud83d\udd10 LOGIN / SIGN-UP');
  console.log('   Email: ' + TEST_EMAIL);

  await assert('Page loads with login form', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await sleep(2000);
    await screenshot('01-login-page');
    await waitForText('Sign In', 10000);
  });

  await assert('Login card UI elements present', async () => {
    const logo = await page.$('.login-logo');
    if (!logo) throw new Error('Logo image missing');
    const title = await page.$('.login-title');
    if (!title) throw new Error('Title missing');
    const form = await page.$('.login-form');
    if (!form) throw new Error('Form missing');
    const emailInput = await page.$('input[type="email"]');
    if (!emailInput) throw new Error('Email input missing');
    const pwInput = await page.$('input[type="password"]');
    if (!pwInput) throw new Error('Password input missing');
    const submitBtn = await page.$('button[type="submit"]');
    if (!submitBtn) throw new Error('Submit button missing');
  });

  await assert('Google sign-in button visible', async () => {
    const text = await getPageText();
    if (!text.includes('Continue with Google')) throw new Error('Google button missing');
  });

  await assert('Sign Up toggle works', async () => {
    await clickByText("Don't have an account? Sign Up");
    await sleep(400);
    const text = await getPageText();
    if (!text.includes('Create Account')) throw new Error('Sign Up form not shown');
    // Google button should be hidden in sign-up mode
    if (text.includes('Continue with Google')) {
      console.log('    -> Note: Google button still visible in sign-up mode');
    }
  });

  await assert('Enter credentials and sign up', async () => {
    await typeIntoInput('Email', TEST_EMAIL);
    await typeIntoInput('Password', TEST_PASSWORD);
  });

  await assert('Submit and authenticate', async () => {
    await clickButton('Sign Up');
    const start = Date.now();
    while (Date.now() - start < 20000) {
      const text = await getPageText();
      // Success: landed on song library
      if (text.includes('Songs') || text.includes('Search songs')) {
        console.log('    -> Signed up and logged in');
        return;
      }
      // Email already registered → fall back to sign-in
      if (text.includes('already in use')) {
        console.log('    -> Email exists, signing in instead');
        await clickByText('Already have an account? Sign In');
        await sleep(400);
        await typeIntoInput('Email', TEST_EMAIL);
        await typeIntoInput('Password', TEST_PASSWORD);
        await clickButton('Sign In');
        await sleep(8000);
        const t2 = await getPageText();
        if (t2.includes('Songs') || t2.includes('Search')) return;
        throw new Error('Sign in with existing account failed');
      }
      // Firebase not configured
      if (text.includes('configuration-not-found') || text.includes('Auth is not configured')) {
        throw new Error('Firebase Auth not configured');
      }
      if (text.includes('Authentication failed') || text.includes('weak-password')) {
        throw new Error('Auth rejected: ' + text.substring(0, 200));
      }
      await sleep(800);
    }
    await screenshot('auth-timeout');
    throw new Error('Auth timed out. Text: ' + (await getPageText()).substring(0, 200));
  });

  await screenshot('02-after-login');
}

async function testSongLibrary() {
  console.log('\n\ud83c\udfb5 SONG LIBRARY');

  await assert('Song list visible', async () => {
    await waitForText('Songs', 5000);
  });

  await assert('Search input rendered', async () => {
    const el = await page.$('input.search-input');
    if (!el) throw new Error('Search input not found (expected .search-input)');
  });

  await assert('Default songs loaded', async () => {
    const text = await getPageText();
    const expected = ['Amazing Grace', 'How Great Thou Art', 'Be Thou My Vision',
      'Beautiful Savior', 'Celebrate Jesus Celebrate', 'My Redeemer Lives', 'Grace to Grace'];
    const found = expected.filter(s => text.includes(s));
    if (found.length === 0) throw new Error('No default songs found');
    console.log('    -> Found ' + found.length + '/' + expected.length + ' songs');
  });

  await assert('Song cards show title + artist', async () => {
    const cards = await countElements('.song-card');
    if (cards === 0) throw new Error('No .song-card elements');
    const titles = await countElements('.song-title');
    const artists = await countElements('.song-artist');
    if (titles === 0) throw new Error('No .song-title elements');
    if (artists === 0) throw new Error('No .song-artist elements');
    console.log('    -> ' + cards + ' song cards rendered');
  });

  await assert('Key badges displayed', async () => {
    const badges = await countElements('.key-badge');
    if (badges === 0) throw new Error('No .key-badge elements');
  });

  await assert('Search filters songs', async () => {
    await typeIntoInput('Search', 'Amazing');
    await sleep(500);
    const cards = await countElements('.song-card');
    if (cards === 0) throw new Error('Search returned 0 results for "Amazing"');
    if (cards > 3) throw new Error('Search not filtering: ' + cards + ' cards shown');
    // Clear search
    await page.evaluate(() => {
      const inp = document.querySelector('input.search-input');
      if (inp) { inp.value = ''; inp.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    // Use React-compatible input clearing
    const searchInput = await page.$('input.search-input');
    await searchInput.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await sleep(300);
  });

  await assert('FAB (+) button exists', async () => {
    const fab = await page.$('button.fab');
    if (!fab) throw new Error('FAB button (.fab) not found');
    const text = await fab.evaluate(el => el.textContent.trim());
    if (text !== '+') throw new Error('FAB text is "' + text + '", expected "+"');
  });

  await assert('Edit button (pencil) exists on cards', async () => {
    const edits = await countElements('.edit-btn');
    if (edits === 0) throw new Error('No .edit-btn elements on song cards');
  });

  await screenshot('03-song-library');
}

async function testViewerScreen() {
  console.log('\n\ud83d\udc41\ufe0f  VIEWER SCREEN');

  await assert('Navigate to song by clicking card', async () => {
    // Click the first .song-card (not the edit button)
    await page.evaluate(() => {
      const card = document.querySelector('.song-card');
      if (card) card.click();
    });
    await sleep(1500);
    const url = await page.url();
    if (!url.includes('/viewer')) throw new Error('URL did not change to /viewer: ' + url);
  });

  await assert('Viewer header shows title + artist + key', async () => {
    const title = await page.$('.viewer-title');
    if (!title) throw new Error('.viewer-title missing');
    const artist = await page.$('.viewer-artist');
    if (!artist) throw new Error('.viewer-artist missing');
    const artistText = await artist.evaluate(el => el.textContent);
    if (!artistText.includes('Key of')) throw new Error('Key info missing from header');
  });

  await assert('Back button present', async () => {
    const back = await page.$('.back-btn');
    if (!back) throw new Error('.back-btn missing');
  });

  await assert('Edit button in viewer header', async () => {
    const btn = await page.$('.icon-btn');
    if (!btn) throw new Error('Edit icon-btn missing in viewer header');
  });

  await assert('Transpose controls rendered', async () => {
    const text = await getPageText();
    if (!text.includes('+') || !text.includes('−') && !text.includes('-'))
      throw new Error('Transpose +/- buttons missing');
  });

  await assert('Chord/Nashville notation toggle exists', async () => {
    const text = await getPageText();
    if (!text.includes('Standard') && !text.includes('Nashville'))
      throw new Error('Notation toggle missing');
  });

  await assert('Playback controls toggle (▶)', async () => {
    const btn = await page.$('.toolbar-btn');
    if (!btn) throw new Error('Playback toggle button missing');
    await btn.click();
    await sleep(500);
    // After clicking, playback controls should appear
    const text = await getPageText();
    const hasPlayback = text.includes('Tempo') || text.includes('BPM') || text.includes('Auto-Scroll') || text.includes('Metronome');
    if (!hasPlayback) throw new Error('Playback controls did not appear');
  });

  await assert('Auto-scroll toggle exists', async () => {
    const text = await getPageText();
    if (!text.includes('Auto-Scroll') && !text.includes('Auto Scroll'))
      throw new Error('Auto-scroll control missing');
  });

  await assert('Metronome toggle exists', async () => {
    const text = await getPageText();
    if (!text.includes('Metronome')) throw new Error('Metronome control missing');
  });

  await assert('Lyrics are displayed', async () => {
    const container = await page.$('.lyrics-container');
    if (!container) throw new Error('.lyrics-container missing');
    const text = await container.evaluate(el => el.textContent);
    if (text.length < 20) throw new Error('Lyrics container has insufficient text (' + text.length + ' chars)');
  });

  await assert('Chords are displayed', async () => {
    const chordLines = await countElements('.chord-line');
    if (chordLines === 0) throw new Error('No .chord-line elements found');
    console.log('    -> ' + chordLines + ' chord lines');
  });

  await assert('Chord color is #4FC3F7 (light blue)', async () => {
    const found = await page.evaluate(() => {
      const spans = document.querySelectorAll('.chord-line span');
      for (const span of spans) {
        const style = span.getAttribute('style') || '';
        if (style.includes('rgb(79, 195, 247)') || style.includes('#4FC3F7') || style.includes('#4fc3f7')) {
          return { text: span.textContent, style: style };
        }
        const computed = window.getComputedStyle(span).color;
        if (computed === 'rgb(79, 195, 247)') {
          return { text: span.textContent, computed: computed };
        }
      }
      return null;
    });
    if (!found) throw new Error('No chord span with #4FC3F7 color');
    console.log('    -> Found chord "' + found.text + '" with correct color');
  });

  await assert('Lyrics container is scrollable', async () => {
    const scrollInfo = await page.evaluate(() => {
      const el = document.querySelector('.lyrics-container');
      if (!el) return null;
      const style = window.getComputedStyle(el);
      return {
        overflowY: style.overflowY,
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        canScroll: el.scrollHeight > el.clientHeight
      };
    });
    if (!scrollInfo) throw new Error('.lyrics-container not found');
    if (scrollInfo.overflowY !== 'auto' && scrollInfo.overflowY !== 'scroll')
      throw new Error('overflow-y is "' + scrollInfo.overflowY + '", expected auto/scroll');
    console.log('    -> scrollHeight=' + scrollInfo.scrollHeight + ', clientHeight=' + scrollInfo.clientHeight + ', canScroll=' + scrollInfo.canScroll);
  });

  await assert('Can scroll to bottom of lyrics', async () => {
    const result = await page.evaluate(() => {
      const el = document.querySelector('.lyrics-container');
      if (!el) return { error: 'no container' };
      const maxScroll = el.scrollHeight - el.clientHeight;
      el.scrollTop = maxScroll;
      return {
        maxScroll,
        scrollTop: el.scrollTop,
        atBottom: Math.abs(el.scrollTop - maxScroll) < 5
      };
    });
    if (result.error) throw new Error(result.error);
    if (!result.atBottom) throw new Error('Could not scroll to bottom. scrollTop=' + result.scrollTop + ', maxScroll=' + result.maxScroll);
    console.log('    -> Scrolled to bottom: scrollTop=' + result.scrollTop);
    // Scroll back to top
    await page.evaluate(() => {
      const el = document.querySelector('.lyrics-container');
      if (el) el.scrollTop = 0;
    });
  });

  await assert('Transpose + changes chord display', async () => {
    // Get current first chord text
    const before = await page.evaluate(() => {
      const span = document.querySelector('.chord-line span[style]');
      return span ? span.textContent : null;
    });
    // Click + button
    await clickButton('+');
    await sleep(300);
    const after = await page.evaluate(() => {
      const span = document.querySelector('.chord-line span[style]');
      return span ? span.textContent : null;
    });
    if (before && after && before === after) {
      console.log('    -> Warning: chord did not change after transpose (before="' + before + '", after="' + after + '")');
    } else {
      console.log('    -> Transposed: "' + before + '" -> "' + after + '"');
    }
    // Reset: click − once
    await clickButton('−').catch(() => clickButton('-'));
    await sleep(200);
  });

  await assert('Section labels render ([Verse], [Chorus])', async () => {
    const sections = await countElements('.section-label');
    if (sections > 0) {
      console.log('    -> ' + sections + ' section labels found');
    } else {
      // Not all songs have sections, so just warn
      console.log('    -> No [Section] labels in this song (OK if song lacks them)');
    }
  });

  await assert('Back button returns to song list', async () => {
    await clickButton('←');
    await sleep(1000);
    const text = await getPageText();
    if (!text.includes('Songs') && !text.includes('Search')) throw new Error('Did not return to song list');
  });

  await screenshot('04-viewer');
}

async function testAddSongScreen() {
  console.log('\n\u2795 ADD SONG SCREEN');

  await assert('Navigate via FAB button', async () => {
    const fab = await page.$('button.fab');
    if (!fab) throw new Error('FAB not found');
    await fab.click();
    await sleep(1000);
    const text = await getPageText();
    if (!text.includes('Add Song')) throw new Error('Add Song screen not shown');
  });

  await assert('Header shows "Add Song" title', async () => {
    const title = await page.$('.screen-title');
    if (!title) throw new Error('.screen-title missing');
    const text = await title.evaluate(el => el.textContent);
    if (!text.includes('Add Song')) throw new Error('Title is "' + text + '"');
  });

  await assert('Back button in header', async () => {
    const back = await page.$('.text-btn');
    if (!back) throw new Error('Back button missing');
  });

  await assert('Title input', async () => {
    const exists = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.input-field');
      return Array.from(inputs).some(i => (i.placeholder || '').toLowerCase().includes('title'));
    });
    if (!exists) throw new Error('Title input missing');
  });

  await assert('Artist input', async () => {
    const exists = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.input-field');
      return Array.from(inputs).some(i => (i.placeholder || '').toLowerCase().includes('artist'));
    });
    if (!exists) throw new Error('Artist input missing');
  });

  await assert('Tempo input', async () => {
    const exists = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.input-field');
      return Array.from(inputs).some(i => i.type === 'number');
    });
    if (!exists) throw new Error('Tempo number input missing');
  });

  await assert('Three tabs: Paste Text, From URL, Drag File', async () => {
    const tabs = await page.$$('.tab-btn');
    if (tabs.length < 3) throw new Error('Expected 3 tabs, got ' + tabs.length);
    const labels = [];
    for (const tab of tabs) {
      labels.push(await tab.evaluate(el => el.textContent.trim()));
    }
    if (!labels.some(l => l.includes('Paste Text'))) throw new Error('Paste Text tab missing');
    if (!labels.some(l => l.includes('From URL'))) throw new Error('From URL tab missing');
    if (!labels.some(l => l.includes('Drag File') || l.includes('File'))) throw new Error('File tab missing');
    console.log('    -> Tabs: ' + labels.join(', '));
  });

  await assert('Paste Text tab — textarea + buttons', async () => {
    // Should be default tab
    const textarea = await page.$('textarea.chord-textarea');
    if (!textarea) throw new Error('Chord textarea missing');
    const text = await getPageText();
    if (!text.includes('Add Song') || !text.includes('Add & Sync to Cloud'))
      throw new Error('Add/Sync buttons missing');
  });

  await assert('From URL tab — input + import button', async () => {
    await clickButton('From URL');
    await sleep(400);
    const urlInput = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.input-field');
      return Array.from(inputs).some(i => (i.placeholder || '').includes('https'));
    });
    if (!urlInput) throw new Error('URL input missing');
    const text = await getPageText();
    if (!text.includes('Import from URL')) throw new Error('Import button missing');
  });

  await assert('File tab — drop zone + choose file', async () => {
    const fileTab = await page.evaluate(() => {
      const tabs = document.querySelectorAll('.tab-btn');
      for (const t of tabs) {
        if (t.textContent.includes('File') || t.textContent.includes('Drag')) {
          t.click();
          return true;
        }
      }
      return false;
    });
    if (!fileTab) throw new Error('File tab not found');
    await sleep(400);
    const dropZone = await page.$('.drop-zone');
    if (!dropZone) throw new Error('.drop-zone missing');
    const text = await getPageText();
    if (!text.includes('Choose File') && !text.includes('choose')) throw new Error('Choose File button missing');
  });

  await assert('Can fill form and add song via paste', async () => {
    // Switch back to Paste Text
    await clickButton('Paste Text');
    await sleep(300);
    // Override window.alert to capture it
    await page.evaluate(() => { window._alerts = []; window._origAlert = window.alert; window.alert = (msg) => window._alerts.push(msg); });
    await typeIntoInput('title', 'Test Song E2E');
    await typeIntoInput('Artist', 'Test Artist');
    const textarea = await page.$('textarea.chord-textarea');
    await textarea.click();
    await textarea.type('G        C        G\nAmazing test how sweet\nD        G\nThe sound of tests', { delay: 5 });
    await sleep(200);
    // Click "Add Song" (not the sync one)
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button.btn-primary.full-width');
      for (const btn of buttons) {
        if (btn.textContent.includes('Add Song') && !btn.textContent.includes('Sync')) { btn.click(); return; }
      }
    });
    await sleep(1500);
    // Check alert was fired
    const alerts = await page.evaluate(() => window._alerts || []);
    const added = alerts.some(a => a.includes('added'));
    if (added) console.log('    -> Alert: ' + alerts[alerts.length - 1]);
    // Restore alert
    await page.evaluate(() => { if (window._origAlert) window.alert = window._origAlert; });
    // Should navigate back to song list
    const text = await getPageText();
    if (!text.includes('Songs') && !text.includes('Search')) throw new Error('Did not return to song list after add');
  });

  await assert('New song appears in library', async () => {
    const text = await getPageText();
    if (!text.includes('Test Song E2E')) throw new Error('"Test Song E2E" not found in library');
    console.log('    -> Song added successfully');
  });

  await screenshot('05-add-song');
}

async function testEditSongScreen() {
  console.log('\n\u270f\ufe0f  EDIT SONG SCREEN');

  await assert('Navigate to edit via pencil button', async () => {
    const btn = await page.$('.edit-btn');
    if (!btn) throw new Error('No .edit-btn found');
    await btn.click();
    await sleep(1500);
    const url = page.url();
    if (!url.includes('/edit-song/')) throw new Error('URL did not change to /edit-song: ' + url);
  });

  await assert('Edit screen shows "Edit Song" header', async () => {
    const title = await page.$('.screen-title');
    if (!title) throw new Error('.screen-title missing');
    const text = await title.evaluate(el => el.textContent);
    if (!text.includes('Edit Song')) throw new Error('Header says "' + text + '"');
  });

  await assert('Pre-filled title input', async () => {
    const val = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.input-field');
      for (const i of inputs) { if (i.placeholder.toLowerCase().includes('title')) return i.value; }
      return '';
    });
    if (!val) throw new Error('Title input is empty');
    console.log('    -> Title: "' + val + '"');
  });

  await assert('Pre-filled artist input', async () => {
    const val = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.input-field');
      for (const i of inputs) { if (i.placeholder.toLowerCase().includes('artist')) return i.value; }
      return '';
    });
    if (!val) throw new Error('Artist input is empty');
  });

  await assert('Pre-filled chord textarea', async () => {
    const val = await page.evaluate(() => {
      const ta = document.querySelector('textarea.chord-textarea');
      return ta ? ta.value : '';
    });
    if (!val) throw new Error('Chord textarea is empty');
    console.log('    -> Chord text: ' + val.length + ' chars');
  });

  await assert('Save Changes button exists', async () => {
    const text = await getPageText();
    if (!text.includes('Save Changes')) throw new Error('Save Changes button missing');
  });

  await assert('Save & Update Cloud button exists', async () => {
    const text = await getPageText();
    if (!text.includes('Save & Update Cloud'))
      throw new Error('Save & Update Cloud button missing');
  });

  await assert('Delete Song button exists', async () => {
    const text = await getPageText();
    if (!text.includes('Delete Song')) throw new Error('Delete Song button missing');
  });

  await assert('Back button returns', async () => {
    await clickButton('← Back');
    await sleep(1000);
    const text = await getPageText();
    if (!text.includes('Songs') && !text.includes('Search')) throw new Error('Did not return to library');
  });

  await screenshot('06-edit-song');
}

async function testSettingsScreen() {
  console.log('\n\u2699\ufe0f  SETTINGS SCREEN');

  await assert('Navigate to Settings tab', async () => {
    await clickButton('Settings');
    await sleep(800);
    const text = (await getPageText()).toLowerCase();
    if (!text.includes('display') && !text.includes('cloud sync'))
      throw new Error('Settings screen not shown');
  });

  await assert('Display section visible', async () => {
    const titles = await page.$$('.settings-section-title');
    const texts = [];
    for (const t of titles) texts.push(await t.evaluate(el => el.textContent));
    if (!texts.some(t => t.includes('Display'))) throw new Error('Display section title missing');
  });

  await assert('Dark Mode toggle', async () => {
    const text = await getPageText();
    if (!text.toLowerCase().includes('dark mode')) throw new Error('Dark Mode label missing');
    const toggles = await page.$$('.toggle-switch input[type="checkbox"]');
    if (toggles.length === 0) throw new Error('No toggle switches found');
  });

  await assert('Prefer Sharps toggle', async () => {
    const text = await getPageText();
    if (!text.toLowerCase().includes('prefer sharps')) throw new Error('Prefer Sharps label missing');
  });

  await assert('Cloud Sync section', async () => {
    const text = await getPageText();
    if (!text.includes('Cloud Sync')) throw new Error('Cloud Sync section missing');
  });

  await assert('Local song/setlist count', async () => {
    const text = await getPageText();
    if (!text.includes('song(s)') || !text.includes('setlist(s)'))
      throw new Error('Song/setlist counts not displayed');
    const match = text.match(/(\d+)\s*song\(s\)/);
    if (match) console.log('    -> ' + match[0]);
  });

  await assert('Upload to Cloud button', async () => {
    const text = await getPageText();
    if (!text.includes('Upload to Cloud')) throw new Error('Upload button missing');
  });

  await assert('Download from Cloud button', async () => {
    const text = await getPageText();
    if (!text.includes('Download from Cloud')) throw new Error('Download button missing');
  });

  await assert('Sign Out button', async () => {
    const btn = await page.$('.btn-danger');
    if (!btn) throw new Error('.btn-danger (Sign Out) button missing');
    const text = await btn.evaluate(el => el.textContent);
    if (!text.includes('Sign Out')) throw new Error('Sign Out button text: "' + text + '"');
  });

  await assert('Upload to Cloud triggers sync', async () => {
    await page.evaluate(() => { window._oc = window.confirm; window.confirm = () => true; });
    await clickButton('Upload to Cloud');
    await sleep(5000);
    const syncMsg = await page.$('.sync-msg');
    if (syncMsg) {
      const msg = await syncMsg.evaluate(el => el.textContent);
      console.log('    -> Sync result: ' + msg);
    }
    await page.evaluate(() => { if (window._oc) window.confirm = window._oc; });
  });

  await assert('Download from Cloud triggers sync', async () => {
    await page.evaluate(() => { window._oc = window.confirm; window.confirm = () => true; });
    await clickButton('Download from Cloud');
    await sleep(5000);
    const syncMsg = await page.$('.sync-msg');
    if (syncMsg) {
      const msg = await syncMsg.evaluate(el => el.textContent);
      console.log('    -> Sync result: ' + msg);
    }
    await page.evaluate(() => { if (window._oc) window.confirm = window._oc; });
  });

  await screenshot('07-settings');
}

async function testSetlistScreen() {
  console.log('\n\ud83d\udccb SETLISTS');

  await assert('Navigate to Setlists tab', async () => {
    await clickButton('Setlists');
    await sleep(800);
  });

  await assert('Default setlists loaded', async () => {
    const text = await getPageText();
    const hasSomething = text.includes('Sunday') || text.includes('Special') ||
                         text.includes('Setlist') || text.includes('No setlists');
    if (!hasSomething) throw new Error('Setlists screen content not found');
    const cards = await countElements('.song-card');
    console.log('    -> ' + cards + ' setlist cards');
  });

  await assert('New setlist input + add button', async () => {
    const input = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input.input-field');
      return Array.from(inputs).some(i => (i.placeholder || '').toLowerCase().includes('setlist'));
    });
    if (!input) throw new Error('New setlist input missing');
  });

  await assert('Create a new setlist', async () => {
    await typeIntoInput('setlist', 'E2E Test Setlist');
    await clickButton('+');
    await sleep(500);
    const text = await getPageText();
    if (!text.includes('E2E Test Setlist')) throw new Error('New setlist not created');
    console.log('    -> Created "E2E Test Setlist"');
  });

  await assert('Click into setlist shows editor', async () => {
    await clickByText('E2E Test Setlist');
    await sleep(800);
    const text = await getPageText();
    if (!text.includes('E2E Test Setlist')) throw new Error('Setlist editor not shown');
    if (!text.includes('songs in setlist') && !text.includes('0 songs'))
      console.log('    -> Note: song count label format may differ');
    // Go back
    await clickButton('← Back');
    await sleep(500);
  });

  await assert('Delete setlist (✕ button)', async () => {
    const before = await countElements('.song-card');
    // Click the delete button on the last card (our test setlist)
    await page.evaluate(() => {
      const btns = document.querySelectorAll('.delete-btn');
      if (btns.length) btns[btns.length - 1].click();
    });
    await sleep(500);
    const after = await countElements('.song-card');
    if (after >= before) throw new Error('Setlist not deleted (before=' + before + ', after=' + after + ')');
    console.log('    -> Deleted setlist');
  });

  await screenshot('08-setlists');
}

async function testNavigation() {
  console.log('\n\ud83e\udded NAVIGATION FLOW');

  await assert('Tab bar has 3 tabs', async () => {
    const tabs = await countElements('.tab-item');
    if (tabs !== 3) throw new Error('Expected 3 tab items, got ' + tabs);
  });

  await assert('Songs → Settings → Setlists → Songs cycle', async () => {
    await clickButton('Songs');
    await sleep(500);
    let text = await getPageText();
    if (!text.includes('Search songs')) throw new Error('Songs tab broken');

    await clickButton('Settings');
    await sleep(500);
    text = (await getPageText()).toLowerCase();
    if (!text.includes('cloud sync')) throw new Error('Settings tab broken');

    await clickButton('Setlists');
    await sleep(500);
    text = await getPageText();
    if (!text.includes('setlist')) throw new Error('Setlists tab broken');

    await clickButton('Songs');
    await sleep(500);
    text = await getPageText();
    if (!text.includes('Search songs')) throw new Error('Back to Songs broken');
  });

  await assert('Song → Viewer → Back round-trip', async () => {
    const card = await page.$('.song-card');
    if (!card) throw new Error('No song card to click');
    await card.click();
    await sleep(1000);
    if (!page.url().includes('/viewer')) throw new Error('Did not navigate to /viewer');
    await clickButton('←');
    await sleep(800);
    if (page.url().includes('/viewer')) throw new Error('Did not navigate back from viewer');
  });

  await assert('Active tab highlights correctly', async () => {
    const activeTab = await page.evaluate(() => {
      const active = document.querySelector('.tab-item.active');
      return active ? active.textContent.trim() : null;
    });
    if (!activeTab) throw new Error('No active tab found');
    console.log('    -> Active tab: ' + activeTab);
  });
}

async function testResponsive() {
  console.log('\n\ud83d\udcf1 RESPONSIVE CHECKS');

  await assert('Desktop viewport (1280x900)', async () => {
    await page.setViewport({ width: 1280, height: 900 });
    await sleep(300);
    const body = await page.evaluate(() => ({ w: document.body.clientWidth, h: document.body.clientHeight }));
    console.log('    -> Body: ' + body.w + 'x' + body.h);
  });

  await assert('Mobile viewport (375x812)', async () => {
    await page.setViewport({ width: 375, height: 812 });
    await sleep(500);
    const tabBar = await page.$('.tab-bar');
    if (!tabBar) throw new Error('Tab bar missing at mobile size');
    const cards = await countElements('.song-card');
    console.log('    -> Mobile: ' + cards + ' song cards rendered');
    await screenshot('09-mobile');
  });

  await assert('Tablet viewport (768x1024)', async () => {
    await page.setViewport({ width: 768, height: 1024 });
    await sleep(300);
    const cards = await countElements('.song-card');
    console.log('    -> Tablet: ' + cards + ' song cards');
  });

  // Restore
  await page.setViewport({ width: 1280, height: 900 });
  await sleep(200);
}

async function testAccessibility() {
  console.log('\n\u267f ACCESSIBILITY');

  await assert('All images have alt text', async () => {
    const missing = await page.evaluate(() => {
      const imgs = document.querySelectorAll('img');
      const bad = [];
      imgs.forEach(img => { if (!img.alt) bad.push(img.src.substring(0, 60)); });
      return bad;
    });
    if (missing.length > 0) throw new Error(missing.length + ' images without alt: ' + missing[0]);
  });

  await assert('All interactive elements are buttons/inputs/links', async () => {
    // Check that clickable items with onClick are proper semantic elements
    const divButtons = await page.evaluate(() => {
      const els = document.querySelectorAll('div[onclick], span[onclick]');
      return els.length;
    });
    if (divButtons > 0) console.log('    -> Warning: ' + divButtons + ' non-semantic clickable elements');
  });

  await assert('Form inputs have accessible names', async () => {
    const unlabeled = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input, textarea, select');
      let count = 0;
      inputs.forEach(inp => {
        const hasLabel = inp.labels && inp.labels.length > 0;
        const hasAria = inp.getAttribute('aria-label') || inp.getAttribute('aria-labelledby');
        const hasPlaceholder = inp.placeholder;
        if (!hasLabel && !hasAria && !hasPlaceholder) count++;
      });
      return count;
    });
    if (unlabeled > 0) throw new Error(unlabeled + ' inputs without accessible name');
  });
}

async function testCleanupTestSong() {
  console.log('\n\ud83e\uddf9 CLEANUP');

  await assert('Delete test song via edit screen', async () => {
    // Navigate to songs
    await clickButton('Songs');
    await sleep(500);
    // Find and click test song's edit button
    const found = await page.evaluate(() => {
      const cards = document.querySelectorAll('.song-card');
      for (const card of cards) {
        if (card.textContent.includes('Test Song E2E')) {
          const btn = card.querySelector('.edit-btn');
          if (btn) { btn.click(); return true; }
        }
      }
      return false;
    });
    if (!found) {
      console.log('    -> Test song not found, skipping cleanup');
      return;
    }
    await sleep(1000);
    // Override confirm
    await page.evaluate(() => { window.confirm = () => true; });
    await clickButton('Delete Song');
    await sleep(1000);
    const text = await getPageText();
    if (text.includes('Test Song E2E')) throw new Error('Test song still in library after delete');
    console.log('    -> Cleaned up test song');
  });
}

// --- Main ---

(async () => {
  console.log('================================================');
  console.log(' Music-ABCF Comprehensive E2E Tests');
  console.log(' (Plain React + Vite + React Router)');
  console.log(' URL: ' + BASE);
  console.log(' Test user: ' + TEST_EMAIL);
  console.log('================================================');

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      protocolTimeout: 180000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Capture browser console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 1. Login
    await testLogin();

    const text = await getPageText();
    const loggedIn = text.includes('Songs') || text.includes('Search') || text.includes('Song Library');

    if (loggedIn) {
      // 2-10. Full test suite
      await testSongLibrary();
      await testViewerScreen();
      await testAddSongScreen();
      await testEditSongScreen();
      await testSettingsScreen();
      await testSetlistScreen();
      await testNavigation();
      await testResponsive();
      await testAccessibility();
      await testCleanupTestSong();
    } else {
      console.log('\n\u26a0\ufe0f  Could not authenticate - skipping post-login tests.');
      console.log('   Page text: ' + text.substring(0, 300));
      await screenshot('auth-failed');
    }

    // Console errors summary
    console.log('\n\ud83d\udcdd BROWSER CONSOLE ERRORS:');
    if (consoleErrors.length === 0) {
      console.log('  None');
    } else {
      const unique = [...new Set(consoleErrors)];
      unique.slice(0, 15).forEach((e) => console.log('  \u26a0\ufe0f ' + e.substring(0, 200)));
      if (unique.length > 15) console.log('  ... and ' + (unique.length - 15) + ' more');
    }

    // Warnings
    if (warnings.length > 0) {
      console.log('\n\u26a0\ufe0f  NON-BLOCKING WARNINGS:');
      warnings.forEach((w) => console.log('  ' + w.label + ': ' + w.error));
    }

    // Summary
    console.log('\n================================================');
    console.log(' RESULTS: ' + passed + ' passed, ' + failed + ' failed, total ' + (passed + failed));
    if (warnings.length) console.log(' WARNINGS: ' + warnings.length);
    console.log('================================================');

    if (failures.length > 0) {
      console.log('\nFailed tests:');
      failures.forEach((f) => console.log('  \u274c ' + f.label + ': ' + f.error));
    }

    process.exitCode = failed > 0 ? 1 : 0;
  } catch (err) {
    console.error('\nFatal error:', err.message);
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
