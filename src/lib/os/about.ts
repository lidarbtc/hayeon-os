export const REPO_URL = 'https://github.com/lidarbtc/hayeon-os';
export const SITE_URL = 'https://hayeon.eth.link';
/** The owner's directory of tripleS fan sites. */
export const TRIPLES_URL = 'https://triples.love';
/** Another fan's archive of HaYeon: photos and translated Cosmo talks. */
export const ARCHIVE_URL = 'https://hayeonarchive.com';

/** Tags a link that leaves the site, so the other side can tell where the visit came from. */
export function outbound(url: string) {
  const tagged = new URL(url);
  tagged.searchParams.set('utm_source', 'hayeon.eth.link');
  return tagged.href;
}
