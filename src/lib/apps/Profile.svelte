<script lang="ts">
  import { dayCount, t } from '../os/i18n';
  import { birthdayLabel, daysSinceDebut, profile, timeline } from '../os/hayeon';
  import { avatar, photoUrl } from '../os/photos.svelte';
  import { shortcuts } from '../os/shell';
  import Icon from '../ui/Icon.svelte';

  const now = new Date();
</script>

<div class="profile">
  <header>
    <div class="portrait">
      {#if avatar}
        <img src={photoUrl(avatar)} alt={t('정하연', 'Jeong HaYeon')} style:object-position={avatar.focus} />
      {:else}
        <Icon name="hedgehog" size={84} />
      {/if}
    </div>
    <div class="who">
      <h2>{t('정하연', 'Jeong HaYeon')}</h2>
      <p class="latin">{t('Jeong HaYeon', '정하연')}</p>
      <p class="tags"><b>S19</b><span><i></i>Medium Turquoise</span></p>
      <p class="count">{t('생일', 'Birthday')} {birthdayLabel(now)} · {t('데뷔', 'Debut')} {dayCount(daysSinceDebut(now))}</p>
      <button class="btn" onclick={() => shortcuts.photos.open()}>{t('사진 보기', 'View Photos')}</button>
    </div>
  </header>

  <dl>
    {#each profile as [label, value] (label)}
      <dt>{label}</dt>
      <dd>{value}</dd>
    {/each}
  </dl>

  <h3>{t('기록', 'Timeline')}</h3>
  <ol>
    {#each timeline as entry (entry.date)}
      <li><time>{entry.date}</time><span>{entry.text}</span></li>
    {/each}
  </ol>

  <p class="note">{t('팬이 모아 적은 내용이라 틀린 곳이 있을 수 있습니다.', 'Collected by fans, so some of it may be wrong.')}</p>
</div>

<style>
  .profile {
    height: 100%;
    padding: 14px 16px;
    overflow-y: auto;
    background: #fff;
    user-select: text;
    -webkit-user-select: text;
  }

  header {
    display: flex;
    gap: 16px;
    padding: 12px;
    border: 1px solid #0f8f86;
    border-radius: 4px;
    color: #fff;
    background:
      radial-gradient(90% 120% at 80% 130%, rgba(214, 255, 245, 0.9), rgba(214, 255, 245, 0) 62%),
      linear-gradient(115deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 38%),
      linear-gradient(180deg, #0b86a8, #2cc0c2 62%, #52d9bb);
    text-shadow: 0 1px 3px rgba(3, 40, 50, 0.55);
  }

  .portrait {
    flex: none;
    display: grid;
    place-items: center;
    /* Fixed tracks: an auto row would grow to the photo's own height and let it hang out of the frame. */
    grid-template: 100% / 100%;
    width: 110px;
    height: 132px;
    overflow: hidden;
    border-radius: 6px;
    background: linear-gradient(160deg, #d6fff5, #6fe0c8 60%, #25b6b6);
    box-shadow:
      0 0 0 1px rgba(4, 60, 70, 0.65),
      0 0 0 4px rgba(255, 255, 255, 0.7),
      0 0 0 5px rgba(4, 60, 70, 0.45),
      0 6px 16px rgba(0, 40, 50, 0.4);
  }

  .portrait img {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    object-fit: cover;
  }

  .who {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  h2 {
    margin: 2px 0 0;
    font-size: 26px;
    font-weight: 600;
    line-height: 1.15;
  }

  .who p {
    margin: 0;
  }

  .latin {
    opacity: 0.92;
  }

  .tags {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
    margin-top: 8px !important;
    font-size: 12px;
  }

  .tags b {
    padding: 0 7px;
    border-radius: 9px;
    color: #075a70;
    background: var(--hy-mint);
    font-style: italic;
    text-shadow: none;
  }

  .tags span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .tags i {
    width: 11px;
    height: 11px;
    border: 1px solid #fff;
    border-radius: 50%;
    background: var(--hy-turquoise);
  }

  .count {
    margin-top: 4px !important;
    font-size: 12px;
  }

  .who .btn {
    margin-top: auto;
    color: var(--hy-ink);
    text-shadow: none;
  }

  dl {
    display: grid;
    grid-template-columns: minmax(84px, max-content) 1fr;
    gap: 5px 10px;
    margin: 16px 2px 0;
  }

  dt {
    color: #5c7f88;
  }

  dd {
    margin: 0;
  }

  h3 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 18px 0 9px;
    font-size: 13px;
    font-weight: 400;
    color: #0b6f7d;
  }

  h3::after {
    content: '';
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg, #b9dcd8, rgba(185, 220, 216, 0));
  }

  ol {
    margin: 0 2px;
    padding: 0 0 0 14px;
    border-left: 2px solid #b8e8dd;
    list-style: none;
  }

  li {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 0 10px;
    padding: 3px 0;
  }

  li::before {
    content: '';
    position: absolute;
    left: -20px;
    top: 9px;
    width: 8px;
    height: 8px;
    border: 2px solid #fff;
    border-radius: 50%;
    background: var(--hy-turquoise);
    box-shadow: 0 0 0 1px #2aa894;
  }

  time {
    flex: none;
    color: #5c7f88;
    font-variant-numeric: tabular-nums;
  }

  .note {
    margin: 16px 2px 0;
    font-size: 12px;
    color: #7a9399;
  }
</style>
