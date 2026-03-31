#!/usr/bin/env node
/**
 * E2E test: Modification history tracking
 * Verifies that "last modified by" and "modification history" are displayed
 * in EditSongScreen and SetlistScreen after creating/editing songs and setlists.
 *
 * Uses the __appStore zustand hook exposed on window to bypass Firebase auth.
 */
const puppeteer = require('puppeteer');

const BASE = process.env.APP_URL || 'http://localhost:4175/Music-ABCF/';
let browser, page;
let passed = 0, failed = 0;
const failures = [];

async function ok(desc, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${desc}`); }
  catch (e) { failed++; failures.push({ desc, msg: e.message }); console.error(`  ✗ ${desc}\n    ${e.message}`); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function screenshot(name) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true });
}

async function setup() {
  browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle2', timeout: 15000 });
  await sleep(2000);

  // Bypass auth by directly setting store state
  const storeAvailable = await page.evaluate(() => typeof window.__appStore === 'function');
  if (!storeAvailable) {
    throw new Error('__appStore not exposed on window — rebuild with main.tsx hook');
  }

  // Set uid + userEmail to bypass LoginScreen
  await page.evaluate(() => {
    const store = window.__appStore;
    store.getState().setUid('e2e-test-user', 'tester@example.com');
  });
  await sleep(1000);

  // Verify we got past the login screen
  const hasTabBar = await page.$('.tab-bar');
  if (!hasTabBar) {
    // The app may need a page reload after setting uid
    await page.reload({ waitUntil: 'networkidle2', timeout: 15000 });
    await sleep(1000);
    await page.evaluate(() => {
      const store = window.__appStore;
      store.getState().setUid('e2e-test-user', 'tester@example.com');
    });
    await sleep(1500);
  }

  const tabNow = await page.$('.tab-bar');
  if (!tabNow) throw new Error('Could not bypass login screen');
  console.log('  Auth bypassed — app loaded');
}

// ─── Navigation ──────────────────────────────────────────────────────────────

async function goToTab(label) {
  const tabs = await page.$$('.tab-item');
  for (const t of tabs) {
    const text = await t.evaluate(el => el.textContent);
    if (text.includes(label)) { await t.click(); break; }
  }
  await sleep(400);
}

// ─── Song Tests ──────────────────────────────────────────────────────────────

async function testSongCreationModHistory() {
  console.log('\n── Song: Creation stamps modification history ──');

  await goToTab('Songs');

  // Click FAB to add song
  const fab = await page.$('.fab');
  await ok('FAB button exists', async () => { if (!fab) throw new Error('FAB not found'); });
  await fab.click();
  await page.waitForSelector('.add-song-screen', { timeout: 5000 });

  // Fill in title, artist
  const inputs = await page.$$('.input-field');
  await inputs[0].click({ clickCount: 3 }); await inputs[0].type('History Test Song');
  await inputs[1].click({ clickCount: 3 }); await inputs[1].type('Test Artist');

  // Fill chord text
  const textarea = await page.$('.chord-textarea');
  await textarea.click();
  await textarea.type('G    C    D\nAmazing grace how sweet the sound');

  // Accept the alert and click Add Song
  page.once('dialog', d => d.accept());
  const addBtn = await page.$('.btn-primary.full-width');
  await addBtn.click();
  await sleep(500);

  // Should be back on song list
  await page.waitForSelector('.song-card', { timeout: 5000 });

  // Find the song and click edit
  const cards = await page.$$('.song-card');
  let editBtn = null;
  for (const card of cards) {
    const titleEl = await card.$('.song-title');
    if (!titleEl) continue;
    const title = await titleEl.evaluate(el => el.textContent);
    if (title === 'History Test Song') {
      editBtn = await card.$('.edit-btn');
      break;
    }
  }

  await ok('song was created and appears in list', async () => {
    if (!editBtn) throw new Error('Song card with edit button not found');
  });

  await editBtn.click();
  await page.waitForSelector('.add-song-screen', { timeout: 5000 });
  await sleep(300);

  // Check "last modified by"
  await ok('shows "Last modified by" on new song', async () => {
    const modInfo = await page.$('.mod-info');
    if (!modInfo) throw new Error('.mod-info not found');
    const text = await modInfo.evaluate(el => el.textContent);
    if (!text.includes('Last modified by')) throw new Error('Missing label: ' + text);
    if (!text.includes('tester@example.com')) throw new Error('Missing email: ' + text);
  });

  // Check modification history "created" entry
  await ok('shows modification history with "created" entry', async () => {
    const history = await page.$('.mod-history');
    if (!history) throw new Error('.mod-history not found');
    const items = await page.$$('.mod-history-item');
    if (items.length === 0) throw new Error('No history items');
    const firstText = await items[0].evaluate(el => el.textContent);
    if (!firstText.includes('created')) throw new Error('Missing "created": ' + firstText);
    if (!firstText.includes('tester@example.com')) throw new Error('Missing email in history: ' + firstText);
  });

  await screenshot('01-song-created-mod-history');

  // Go back
  const back = await page.$('.text-btn');
  await back.click();
  await sleep(300);
}

async function testSongEditModHistory() {
  console.log('\n── Song: Edit adds "edited" history entry ──');

  await goToTab('Songs');

  // Find "History Test Song" and click edit
  const cards = await page.$$('.song-card');
  let editBtn = null;
  for (const card of cards) {
    const titleEl = await card.$('.song-title');
    if (!titleEl) continue;
    const title = await titleEl.evaluate(el => el.textContent);
    if (title === 'History Test Song') {
      editBtn = await card.$('.edit-btn');
      break;
    }
  }
  if (!editBtn) { console.log('  ⚠ Skipping — song not found'); return; }

  await editBtn.click();
  await page.waitForSelector('.add-song-screen', { timeout: 5000 });
  await sleep(300);

  // Change the tempo
  const tempoInput = await page.$('input[type="number"]');
  await tempoInput.click({ clickCount: 3 });
  await tempoInput.type('120');

  // Save
  page.once('dialog', d => d.accept());
  const saveBtn = await page.$('.btn-primary.full-width');
  await saveBtn.click();
  await sleep(500);
  await page.waitForSelector('.song-card', { timeout: 5000 });

  // Go back to edit screen
  const cards2 = await page.$$('.song-card');
  for (const card of cards2) {
    const titleEl = await card.$('.song-title');
    if (!titleEl) continue;
    const title = await titleEl.evaluate(el => el.textContent);
    if (title === 'History Test Song') {
      const eb = await card.$('.edit-btn');
      await eb.click();
      break;
    }
  }
  await page.waitForSelector('.add-song-screen', { timeout: 5000 });
  await sleep(300);

  await ok('shows 2 history entries after edit', async () => {
    const items = await page.$$('.mod-history-item');
    if (items.length < 2) throw new Error(`Expected ≥2, got ${items.length}`);
  });

  await ok('most recent entry is "edited"', async () => {
    const items = await page.$$('.mod-history-item');
    // History is displayed in reverse order (most recent first)
    const firstText = await items[0].evaluate(el => el.textContent);
    if (!firstText.includes('edited')) throw new Error('Expected "edited": ' + firstText);
  });

  await ok('"created" entry still present', async () => {
    const items = await page.$$('.mod-history-item');
    const lastText = await items[items.length - 1].evaluate(el => el.textContent);
    if (!lastText.includes('created')) throw new Error('Expected "created": ' + lastText);
  });

  await screenshot('02-song-edited-mod-history');

  const back = await page.$('.text-btn');
  await back.click();
  await sleep(300);
}

// ─── Setlist Tests ───────────────────────────────────────────────────────────

async function testSetlistCreationModHistory() {
  console.log('\n── Setlist: Creation stamps modification history ──');

  await goToTab('Setlists');
  await sleep(300);

  // Create a setlist
  const input = await page.$('.input-field');
  await input.click({ clickCount: 3 });
  await input.type('History Test Setlist');
  const addBtn = await page.$('.btn-primary.small');
  if (!addBtn) {
    // Might be a different selector; try pressing Enter
    await page.keyboard.press('Enter');
  } else {
    await addBtn.click();
  }
  await sleep(400);

  // Find and click the setlist
  const cards = await page.$$('.song-card');
  let target = null;
  for (const card of cards) {
    const titleEl = await card.$('.song-title');
    if (!titleEl) continue;
    const title = await titleEl.evaluate(el => el.textContent);
    if (title === 'History Test Setlist') { target = card; break; }
  }

  await ok('setlist created', async () => {
    if (!target) throw new Error('Setlist not found');
  });

  await target.click();
  await sleep(400);

  // Check "last modified by"
  await ok('shows "Last modified by" on new setlist', async () => {
    const modInfo = await page.$('.mod-info');
    if (!modInfo) throw new Error('.mod-info not found');
    const text = await modInfo.evaluate(el => el.textContent);
    if (!text.includes('Last modified by')) throw new Error('Missing label: ' + text);
  });

  // Check history "created" entry
  await ok('shows modification history "created" for setlist', async () => {
    const history = await page.$('.mod-history');
    if (!history) throw new Error('.mod-history not found');
    const items = await page.$$('.mod-history-item');
    if (items.length === 0) throw new Error('No history items');
    const firstText = await items[0].evaluate(el => el.textContent);
    if (!firstText.includes('created')) throw new Error('Missing "created": ' + firstText);
  });

  await screenshot('03-setlist-created-mod-history');
}

async function testSetlistAddSongModHistory() {
  console.log('\n── Setlist: Adding song stamps history ──');

  // We should still be in the setlist edit view from previous test
  // Find a song in the "Add Songs" list and click it — uses .setlist-add-row buttons
  const addRows = await page.$$('.setlist-add-row');
  if (!addRows || addRows.length === 0) {
    console.log('  ⚠ No available songs to add, skipping');
    return;
  }

  await addRows[0].click();
  await sleep(500);

  await ok('history has "added song" entry after adding a song', async () => {
    const items = await page.$$('.mod-history-item');
    if (items.length < 2) throw new Error(`Expected ≥2, got ${items.length}`);
    const texts = await Promise.all(items.map(i => i.evaluate(el => el.textContent)));
    const hasAdded = texts.some(t => t.includes('added song'));
    if (!hasAdded) throw new Error('No "added song" entry found: ' + JSON.stringify(texts));
  });

  await screenshot('04-setlist-added-song-mod-history');

  // Go back
  const back = await page.$('.text-btn');
  if (back) await back.click();
  await sleep(300);
}

// ─── Store State Tests ───────────────────────────────────────────────────────

async function testStoreModFields() {
  console.log('\n── Store: Verify modificationHistory fields in state ──');

  await ok('songs in store have lastModifiedBy field', async () => {
    const result = await page.evaluate(() => {
      const store = window.__appStore;
      const songs = store.getState().songs;
      const modSongs = songs.filter(s => s.lastModifiedBy);
      return { total: songs.length, withMod: modSongs.length, firstEmail: modSongs[0]?.lastModifiedBy || '' };
    });
    if (result.withMod === 0) throw new Error('No songs have lastModifiedBy');
    console.log(`      ${result.withMod}/${result.total} songs have lastModifiedBy`);
  });

  await ok('songs in store have modificationHistory array', async () => {
    const result = await page.evaluate(() => {
      const store = window.__appStore;
      const songs = store.getState().songs;
      const withHist = songs.filter(s => s.modificationHistory && s.modificationHistory.length > 0);
      return { total: songs.length, withHist: withHist.length };
    });
    if (result.withHist === 0) throw new Error('No songs have modificationHistory');
    console.log(`      ${result.withHist}/${result.total} songs have modificationHistory`);
  });

  await ok('setlists in store have lastModifiedBy field', async () => {
    const result = await page.evaluate(() => {
      const store = window.__appStore;
      const setlists = store.getState().setlists;
      const withMod = setlists.filter(s => s.lastModifiedBy);
      return { total: setlists.length, withMod: withMod.length };
    });
    if (result.withMod === 0) throw new Error('No setlists have lastModifiedBy');
    console.log(`      ${result.withMod}/${result.total} setlists have lastModifiedBy`);
  });

  await ok('userEmail is set in store', async () => {
    const email = await page.evaluate(() => window.__appStore.getState().userEmail);
    if (!email) throw new Error('userEmail is null');
    if (email !== 'tester@example.com') throw new Error(`Expected tester@example.com, got ${email}`);
  });
}

// ─── CSS Styling Tests ───────────────────────────────────────────────────────

async function testModHistoryStyling() {
  console.log('\n── CSS: Modification history styles ──');

  await goToTab('Songs');
  // Navigate to a song edit screen that has modification history
  const cards = await page.$$('.song-card');
  let editBtn = null;
  for (const card of cards) {
    const titleEl = await card.$('.song-title');
    if (!titleEl) continue;
    const title = await titleEl.evaluate(el => el.textContent);
    if (title === 'History Test Song') {
      editBtn = await card.$('.edit-btn');
      break;
    }
  }
  if (!editBtn) { console.log('  ⚠ Skipping styling tests — song not found'); return; }

  await editBtn.click();
  await page.waitForSelector('.add-song-screen', { timeout: 5000 });
  await sleep(300);

  await ok('.mod-info has visible text', async () => {
    const modInfo = await page.$('.mod-info');
    if (!modInfo) throw new Error('.mod-info not found');
    const box = await modInfo.boundingBox();
    if (!box || box.height === 0) throw new Error('mod-info has zero height');
  });

  await ok('.mod-history has visible container', async () => {
    const modHistory = await page.$('.mod-history');
    if (!modHistory) throw new Error('.mod-history not found');
    const box = await modHistory.boundingBox();
    if (!box || box.height === 0) throw new Error('mod-history has zero height');
  });

  await ok('.mod-action badge has color styling', async () => {
    const badge = await page.$('.mod-action');
    if (!badge) throw new Error('.mod-action not found');
    const bg = await badge.evaluate(el => getComputedStyle(el).backgroundColor);
    if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') throw new Error('No background color: ' + bg);
  });

  await ok('.mod-history-list has max-height scroll', async () => {
    const list = await page.$('.mod-history-list');
    if (!list) throw new Error('.mod-history-list not found');
    const overflow = await list.evaluate(el => getComputedStyle(el).overflowY);
    if (overflow !== 'auto' && overflow !== 'scroll') throw new Error('Expected overflow-y auto/scroll, got: ' + overflow);
  });

  await screenshot('05-mod-history-styling');

  const back = await page.$('.text-btn');
  await back.click();
  await sleep(300);
}

// ─── Main ────────────────────────────────────────────────────────────────────

(async () => {
  try {
    require('fs').mkdirSync('screenshots', { recursive: true });
    console.log('Setting up…');
    await setup();
    console.log('Running modification history tests…\n');

    await testSongCreationModHistory();
    await testSongEditModHistory();
    await testSetlistCreationModHistory();
    await testSetlistAddSongModHistory();
    await testStoreModFields();
    await testModHistoryStyling();

    console.log(`\n═══════════════════════════════════════`);
    console.log(`  ${passed} passed, ${failed} failed`);
    console.log(`═══════════════════════════════════════`);
    if (failures.length > 0) {
      console.log('\nFailures:');
      failures.forEach(f => console.log(`  ✗ ${f.desc}: ${f.msg}`));
    }
    process.exitCode = failed > 0 ? 1 : 0;
  } catch (e) {
    console.error('Fatal:', e);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
