import test from 'node:test';
import assert from 'node:assert/strict';
import { getSongIdentityKey, isDuplicateSong } from '../songRules.js';

test('duplicate detection matches title and artist ignoring case and whitespace', () => {
  const existingSong = { title: ' Amazing Grace ', artist: ' John Newton ' };
  const candidate = { title: 'amazing grace', artist: 'john newton' };

  assert.equal(getSongIdentityKey(existingSong), getSongIdentityKey(candidate));
  assert.equal(isDuplicateSong(existingSong, candidate), true);
});

test('duplicate detection distinguishes different artists or titles', () => {
  const existingSong = { title: 'Amazing Grace', artist: 'John Newton' };
  const candidate = { title: 'Amazing Grace', artist: 'Chris Tomlin' };

  assert.equal(isDuplicateSong(existingSong, candidate), false);
});
