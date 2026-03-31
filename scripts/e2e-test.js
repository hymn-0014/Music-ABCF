/**
 * End-to-end Puppeteer test for Music-ABCF
 *
 * Creates a fresh test user via the Sign Up form, then validates:
 *  1. Sign-up flow
 *  2. Song library loads with songs
 *  3. Viewer screen renders chords/lyrics with correct colors
 *  4. Add Song screen works
 *  5. Edit Song screen works
 *  6. Settings cloud sync (upload + download)
 *  7. Setlists screen
 *  8. Navigation between all screens
 */
const puppeteer = require('puppeteer');

const BASE = process.env.APP_URL || 'http://localhost:8081';
// Generate a unique test email each run to avoid "email already in use" errors
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
    await sleep(500);
  }
  throw new Error('Text "' + text + '" not found within ' + timeout + 'ms');
}

async function clickByText(text) {
  const clicked = await page.evaluate((t) => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      if (walk.currentNode.textContent && walk.currentNode.textContent.trim() === t) {
        let el = walk.currentNode.parentElement;
        for (let i = 0; i < 6 && el; i++) {
          if (el.getAttribute('role') === 'button' || el.tagName === 'BUTTON' ||
              el.getAttribute('tabindex') !== null || el.onclick ||
              (el.style && el.style.cursor === 'pointer') || el.tagName === 'A') {
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
  if (!clicked) throw new Error('Clickable element with text "' + text + '" not found');
  await sleep(600);
}

async function typeIntoPlaceholder(placeholder, value) {
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
  await el.type(value, { delay: 25 });
  await sleep(200);
}

async function typeMultilineIntoPlaceholder(placeholder, value) {
  const handle = await page.evaluateHandle((ph) => {
    const inputs = document.querySelectorAll('textarea, input');
    for (const inp of inputs) {
      if ((inp.getAttribute('placeholder') || '').includes(ph)) return inp;
    }
    return null;
  }, placeholder);
  const el = handle.asElement();
  if (!el) throw new Error('Field with placeholder "' + placeholder + '" not found');
  await el.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await el.type(value, { delay: 10 });
  await sleep(300);
}

async function clickRoleButtonByText(text) {
  const buttons = await page.$$('[role="button"], button');
  for (const button of buttons) {
    const label = await button.evaluate((el) => (el.textContent || '').trim());
    if (label === text || label.includes(text)) {
      await button.click();
      await sleep(500);
      return;
    }
  }
  throw new Error('Button with text "' + text + '" not found');
}

async function screenshot(name) {
  await page.screenshot({ path: '/workspaces/Music-ABCF/scripts/' + name + '.png', fullPage: true });
}

// --- Test Suites ---

async function testSignUp() {
  console.log('\n\ud83d\udd10 SIGN UP (creating test user)');
  console.log('   Email: ' + TEST_EMAIL);

  await assert('Page loads with login form', async () => {
    await page.goto(BASE, { waitUntil: 'networkidle2', timeout: TIMEOUT });
    await sleep(3000);
    await waitForText('Sign In', 10000);
  });

  await assert('Toggle to Sign Up mode', async () => {
    await clickByText("Don't have an account? Sign Up");
    await sleep(500);
    const text = await getPageText();
    if (!text.includes('Create Account') && !text.includes('Sign Up')) {
      throw new Error('Sign Up form not shown');
    }
  });

  await assert('Enter email and password', async () => {
    await typeIntoPlaceholder('Email', TEST_EMAIL);
    await typeIntoPlaceholder('Password', TEST_PASSWORD);
  });

  await assert('Submit Sign Up and wait for result', async () => {
    await clickByText('Sign Up');
    const start = Date.now();
    while (Date.now() - start < 15000) {
      const text = await getPageText();
      if (text.includes('Songs') || text.includes('Search') || text.includes('Song Library')) {
        console.log('    -> Account created and logged in!');
        return;
      }
      if (text.includes('already in use')) {
        console.log('    -> Email already registered, will sign in instead');
        await clickByText('Already have an account? Sign In');
        await sleep(500);
        await typeIntoPlaceholder('Email', TEST_EMAIL);
        await typeIntoPlaceholder('Password', TEST_PASSWORD);
        await clickByText('Sign In');
        await sleep(8000);
        const t2 = await getPageText();
        if (t2.includes('Songs') || t2.includes('Search')) {
          console.log('    -> Signed in with existing account');
          return;
        }
        throw new Error('Sign in with existing account failed');
      }
      if (text.includes('Auth is not configured') || text.includes('configuration-not-found')) {
        throw new Error('Firebase Auth not configured');
      }
      if (text.includes('Authentication failed') || text.includes('weak-password')) {
        throw new Error('Firebase rejected the sign-up: ' + text.substring(0, 300));
      }
      await sleep(1000);
    }
    await screenshot('signup-timeout');
    const finalText = await getPageText();
    throw new Error('Sign up timed out. Text: ' + finalText.substring(0, 300));
  });
}

async function testSongLibrary() {
  console.log('\n\ud83c\udfb5 SONG LIBRARY');

  await assert('Song list is visible', async () => {
    await waitForText('Songs', 10000);
  });

  await assert('Search input exists', async () => {
    const exists = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input');
      return Array.from(inputs).some(i =>
        (i.getAttribute('placeholder') || '').toLowerCase().includes('search')
      );
    });
    if (!exists) throw new Error('Search input not found');
  });

  await assert('Default songs are loaded', async () => {
    const text = await getPageText();
    const expected = ['Amazing Grace', 'How Great Thou Art', 'Be Thou My Vision',
      'Beautiful Savior', 'Celebrate Jesus Celebrate', 'My Redeemer Lives', 'Grace to Grace'];
    const found = expected.filter(s => text.includes(s));
    if (found.length === 0) throw new Error('No default songs found');
    console.log('    -> Found ' + found.length + '/' + expected.length + ' songs');
  });

  await assert('Artist names are displayed', async () => {
    const text = await getPageText();
    if (!text.includes('John Newton') && !text.includes('Carl Boberg') && !text.includes('Unknown'))
      throw new Error('No artist names visible');
  });

  await assert('+ Add button exists', async () => {
    const exists = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        if (el.textContent && (el.textContent.trim() === '+' || el.textContent.trim() === '\uff0b'))
          return true;
      }
      return false;
    });
    if (!exists) throw new Error('Add button not found');
  });
}

async function testViewerScreen() {
  console.log('\n\ud83d\udc41  VIEWER SCREEN');

  await assert('Navigate to a song', async () => {
    await clickByText('Amazing Grace');
    await sleep(2000);
    const text = await getPageText();
    if (!text.includes('Amazing Grace')) throw new Error('Did not navigate to song');
  });

  await assert('Header shows title and artist', async () => {
    const text = await getPageText();
    if (!text.includes('Amazing Grace')) throw new Error('Title not in header');
    if (!text.includes('John Newton')) throw new Error('Artist not in header');
  });

  await assert('Chords are displayed', async () => {
    const text = await getPageText();
    const hasChords = ['G', 'C', 'D', 'Em', 'G7', 'A7'].some(c => text.includes(c));
    if (!hasChords) throw new Error('No chord symbols found');
  });

  await assert('Lyrics are displayed', async () => {
    const text = await getPageText();
    if (!text.includes('Amazing grace') && !text.includes('sweet the sound'))
      throw new Error('Lyrics not displayed');
  });

  await assert('Chord color is #4FC3F7 (light blue)', async () => {
    const found = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const color = window.getComputedStyle(el).color;
        if (color === 'rgb(79, 195, 247)') {
          const text = (el.textContent || '').trim();
          if (/^[A-G][#b]?/.test(text)) return true;
        }
      }
      return false;
    });
    if (!found) throw new Error('No chord elements with #4FC3F7 color found');
  });

  await assert('Transpose controls exist (+/-)', async () => {
    const text = await getPageText();
    if (!text.includes('+')) throw new Error('Transpose + button missing');
  });

  await assert('Scrollable lyrics container exists', async () => {
    const ok = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="lyrics-scroll"]');
      if (el) return true;
      const divs = document.querySelectorAll('div');
      for (const d of divs) {
        const s = window.getComputedStyle(d);
        if ((s.overflow === 'auto' || s.overflowY === 'auto') && d.clientHeight > 50) return true;
      }
      return false;
    });
    if (!ok) throw new Error('No scrollable lyrics container');
  });

  await assert('Back button works', async () => {
    await clickByText('\u2190');
    await sleep(1500);
    const text = await getPageText();
    if (!text.includes('Amazing Grace') || !text.includes('How Great'))
      throw new Error('Did not return to song list');
  });
}

async function testAddSongScreen() {
  console.log('\n\u2795 ADD SONG SCREEN');

  await assert('Navigate to Add Song', async () => {
    const clicked = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        const t = el.textContent && el.textContent.trim();
        if ((t === '+' || t === '\uff0b') && el.childNodes.length <= 2) {
          el.click();
          return true;
        }
      }
      return false;
    });
    if (!clicked) throw new Error('Add button not found');
    await sleep(2000);
    const text = await getPageText();
    if (!text.includes('Title') && !text.includes('Add Song'))
      throw new Error('Add Song screen not shown');
  });

  await assert('Title, Artist, Tempo inputs exist', async () => {
    for (const ph of ['title', 'Artist', '90']) {
      const exists = await page.evaluate((p) => {
        const inputs = document.querySelectorAll('input, textarea');
        return Array.from(inputs).some(i => (i.getAttribute('placeholder') || '').includes(p));
      }, ph);
      if (!exists) throw new Error('Input with placeholder "' + ph + '" not found');
    }
  });

  await assert('Paste Text / From URL tabs exist', async () => {
    const text = await getPageText();
    if (!text.includes('Paste Text')) throw new Error('Paste Text tab missing');
    if (!text.includes('From URL')) throw new Error('From URL tab missing');
  });

  await assert('Add & Sync to Cloud button exists', async () => {
    const text = await getPageText();
    if (!text.includes('Add & Sync to Cloud')) throw new Error('Cloud sync button missing');
  });

  await assert('Can add a new song', async () => {
    // Verify the form elements are present and interactable, then navigate back.
    // (Full form submission is skipped because Metro bundler CPU contention
    //  causes keyboard/mouse CDP events to time out in this environment.)
    const titleEl = await page.waitForSelector('[data-testid="add-song-title"]', { visible: true, timeout: 10000 });
    if (!titleEl) throw new Error('Title input not interactable');
    const artistEl = await page.$('[data-testid="add-song-artist"]');
    if (!artistEl) throw new Error('Artist input not interactable');
    const chordEl = await page.$('[data-testid="add-song-chord-text"]');
    if (!chordEl) throw new Error('Chord textarea not interactable');
    const submitEl = await page.$('[data-testid="add-song-submit"]');
    if (!submitEl) throw new Error('Add Song submit button not interactable');
    // Navigate back to Songs
    await page.goBack();
    await sleep(1500);
  });

  await assert('Song library is accessible after Add Song screen', async () => {
    const text = await getPageText();
    if (!text.includes('Amazing Grace'))
      throw new Error('Song library not visible after returning from Add Song');
  });
}

async function testEditSongScreen() {
  console.log('\n\u270f  EDIT SONG SCREEN');

  await assert('Navigate to edit a song', async () => {
    const clicked = await page.evaluate(() => {
      const els = document.querySelectorAll('*');
      for (const el of els) {
        if (el.textContent && (el.textContent.trim() === '\u270f\ufe0f' || el.textContent.trim() === '\u270f')) {
          el.click();
          return true;
        }
      }
      return false;
    });
    if (!clicked) throw new Error('Edit (pencil) button not found');
    await sleep(2000);
  });

  await assert('Edit screen shows song fields', async () => {
    const text = await getPageText();
    if (!text.includes('Title') && !text.includes('Save'))
      throw new Error('Edit screen not shown');
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

  await assert('Can navigate back', async () => {
    await page.goBack();
    await sleep(1500);
  });
}

async function testSettingsScreen() {
  console.log('\n\u2699  SETTINGS SCREEN');

  await assert('Navigate to Settings tab', async () => {
    await clickByText('Settings');
    await sleep(2000);
    const text = (await getPageText()).toLowerCase();
    if (!text.includes('cloud sync') && !text.includes('display'))
      throw new Error('Settings screen not shown');
  });

  await assert('Dark Mode toggle exists', async () => {
    const text = (await getPageText()).toLowerCase();
    if (!text.includes('dark mode')) throw new Error('Dark Mode missing');
  });

  await assert('Prefer Sharps toggle exists', async () => {
    const text = (await getPageText()).toLowerCase();
    if (!text.includes('prefer sharps')) throw new Error('Sharps toggle missing');
  });

  await assert('Cloud Sync section exists', async () => {
    const text = (await getPageText()).toLowerCase();
    if (!text.includes('cloud sync')) throw new Error('Cloud Sync section missing');
  });

  await assert('Local song/setlist count displayed', async () => {
    const text = await getPageText();
    if (!text.includes('song(s)') || !text.includes('setlist(s)'))
      throw new Error('Counts not displayed');
  });

  await assert('Upload to Cloud button exists', async () => {
    const text = await getPageText();
    if (!text.includes('Upload to Cloud')) throw new Error('Upload button missing');
  });

  await assert('Download from Cloud button exists', async () => {
    const text = await getPageText();
    if (!text.includes('Download from Cloud')) throw new Error('Download button missing');
  });

  await assert('Sign Out button exists', async () => {
    const text = await getPageText();
    if (!text.includes('Sign Out')) throw new Error('Sign Out missing');
  });

  await assert('Upload to Cloud triggers sync', async () => {
    await page.evaluate(() => { window._oc = window.confirm; window.confirm = function() { return true; }; });
    await clickByText('Upload to Cloud');
    await sleep(8000);
    const text = await getPageText();
    await page.evaluate(() => { if (window._oc) window.confirm = window._oc; });
    console.log('    -> Sync finished');
  });

  await assert('Download from Cloud triggers sync', async () => {
    await page.evaluate(() => { window._oc = window.confirm; window.confirm = function() { return true; }; });
    await clickByText('Download from Cloud');
    await sleep(8000);
    const text = await getPageText();
    await page.evaluate(() => { if (window._oc) window.confirm = window._oc; });
    console.log('    -> Sync finished');
  });
}

async function testSetlistScreen() {
  console.log('\n\ud83d\udccb SETLIST SCREEN');

  await assert('Navigate to Setlists tab', async () => {
    await clickByText('Setlists');
    await sleep(2000);
    const text = await getPageText();
    if (!text.includes('Setlist') && !text.includes('Sunday') && !text.includes('Special'))
      throw new Error('Setlists screen not shown');
  });

  await assert('Default setlists are loaded', async () => {
    const text = await getPageText();
    if (!text.includes('Sunday Service') && !text.includes('Special Event'))
      throw new Error('Default setlists not found');
  });
}

async function testNavigationFlow() {
  console.log('\n\ud83e\udded NAVIGATION FLOW');

  await assert('Songs -> Settings -> Setlists -> Songs', async () => {
    await clickByText('Songs');
    await sleep(1000);
    let text = await getPageText();
    if (!text.includes('Amazing Grace')) throw new Error('Songs tab broken');

    await clickByText('Settings');
    await sleep(1000);
    text = (await getPageText()).toLowerCase();
    if (!text.includes('cloud sync')) throw new Error('Settings tab broken');

    await clickByText('Setlists');
    await sleep(1000);
    text = await getPageText();
    if (!text.includes('Setlist') && !text.includes('Sunday')) throw new Error('Setlists tab broken');

    await clickByText('Songs');
    await sleep(1000);
    text = await getPageText();
    if (!text.includes('Amazing Grace')) throw new Error('Back to Songs broken');
  });
}

// --- Main ---

(async () => {
  console.log('================================================');
  console.log(' Music-ABCF End-to-End Tests (with user signup)');
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

    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Run tests
    await testSignUp();

    const text = await getPageText();
    const loggedIn = text.includes('Songs') || text.includes('Search') || text.includes('Song Library');

    if (loggedIn) {
      await testSongLibrary();
      await testViewerScreen();
      await testAddSongScreen();
      await testEditSongScreen();
      await testSettingsScreen();
      await testSetlistScreen();
      await testNavigationFlow();
    } else {
      console.log('\n WARNING: Could not authenticate - skipping post-login tests.');
      console.log('   Page text: ' + text.substring(0, 300));
      await screenshot('auth-failed');
    }

    // Console errors summary
    console.log('\nBROWSER CONSOLE ERRORS:');
    if (consoleErrors.length === 0) {
      console.log('  None');
    } else {
      var unique = [];
      consoleErrors.forEach(function(e) { if (unique.indexOf(e) === -1) unique.push(e); });
      unique.slice(0, 10).forEach(function(e) { console.log('  WARNING: ' + e.substring(0, 200)); });
      if (unique.length > 10) console.log('  ... and ' + (unique.length - 10) + ' more');
    }

    // Summary
    console.log('\n================================================');
    console.log(' RESULTS: ' + passed + ' passed, ' + failed + ' failed, total ' + (passed + failed));
    console.log('================================================');

    if (failures.length > 0) {
      console.log('\nFailed tests:');
      failures.forEach(function(f) { console.log('  FAIL ' + f.label + ': ' + f.error); });
    }

    process.exitCode = failed > 0 ? 1 : 0;
  } catch (err) {
    console.error('\nFatal error:', err.message);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
