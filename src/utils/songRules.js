export function getSongIdentityKey(song) {
  return `${(song?.title ?? '').trim().toLowerCase()}::${(song?.artist ?? '').trim().toLowerCase()}`;
}

export function isDuplicateSong(existingSong, candidateSong) {
  if (!existingSong || !candidateSong) return false;
  return getSongIdentityKey(existingSong) === getSongIdentityKey(candidateSong);
}
