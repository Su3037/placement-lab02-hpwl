// Film player: MP4 playback + captions/chapters from the same clock + exact frame-to-lab handoff.
// The MP4 frame i was rendered at t = i / fps (see site/media/film.zh.render.json), so the state of the frame on
// screen is stateAt(frameAt(currentTime) / fps). That state, not a chapter preset, is what goes to the lab.
import {stateAt, labHandoff, frameAt, frameTime} from './timeline.js';
import {Scene} from './scene.js';
import {escapeText as E} from './board.js';

const FPS = 30;
const ts = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function createPlayer(root, {fixtures, script, clock, text, lang, lab, media}) {
  const capDefault = lang === 'en' ? 'en' : 'off';
  root.innerHTML = `
  <div class="player">
    <div class="video-wrap"><video data-k="video" controls preload="metadata" playsinline poster="media/poster.zh.jpg">
      <source src="${media.film}" type="video/mp4">
      <track kind="subtitles" srclang="zh" label="中文" src="media/film.zh.vtt">
      <track kind="subtitles" srclang="en" label="English" src="media/film.en.vtt">
      <track kind="chapters" srclang="${lang}" src="media/chapters.${lang}.vtt" default>
    </video></div>
    <p class="video-error" data-k="err" hidden>${text.filmMissing}</p>
    <div class="caption-bar" data-k="cap" aria-live="off"></div>
    <div class="player-tools">
      <button type="button" class="primary" data-a="try">${text.tryFrame}</button>
      <label>${text.captionLabel} <select data-k="capsel"><option value="off">${text.capOff}</option><option value="zh">${text.capZh}</option><option value="en">${text.capEn}</option></select></label>
      <label><input type="checkbox" data-k="live"> ${text.livePreview}</label>
      <span class="frame-info" data-k="info"></span>
    </div>
    <div class="live-preview" data-k="preview" hidden><div class="scaler" data-k="scaler"></div></div>
    <nav class="chapters" aria-label="${E(text.chapters)}"><h3>${text.chapters}</h3><ol>${clock.segments.map((s, i) => `<li><button type="button" data-seek="${s.start}" data-cue="${s.id}">${ts(s.start)} · ${E(script.chapters[s.chapter][lang])} · ${E(script.cues[i].title[lang])}</button></li>`).join('')}</ol></nav>
    <details class="transcript"><summary>${text.transcript}</summary>${script.cues.map((c, i) => `<h4><button type="button" class="link" data-seek="${clock.segments[i].start}">${ts(clock.segments[i].start)}</button> ${E(c.title[lang])}</h4><p>${c.lines.map(l => E(l[lang])).join('<br>')}</p>`).join('')}</details>
  </div>`;
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const video = $('video');
  $('capsel').value = capDefault;
  let raf = 0;

  const current = () => {
    const f = Math.min(frameAt(video.currentTime || 0, FPS), Math.round(clock.duration * FPS) - 1);
    const t = frameTime(f, FPS);
    return {f, t, state: stateAt(t, fixtures, script, clock)};
  };
  function update() {
    const {f, t, state} = current();
    const sel = $('capsel').value;
    $('cap').textContent = sel !== 'off' && state.caption ? state.caption[sel] : '';
    $('cap').hidden = sel === 'off';
    $('info').textContent = text.frameInfo(t, f, state.cueId);
    root.querySelectorAll('.chapters button').forEach(b => b.classList.toggle('on', b.dataset.cue === state.cueId));
    if (!$('preview').hidden) {
      $('scaler').innerHTML = Scene(state, script, {lang});
      $('scaler').style.transform = `scale(${$('preview').clientWidth / 1920})`;
    }
  }
  const loop = () => { update(); if (!video.paused) raf = requestAnimationFrame(loop); };
  video.addEventListener('play', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
  ['pause', 'seeked', 'timeupdate', 'loadedmetadata'].forEach(ev => video.addEventListener(ev, update));
  video.addEventListener('error', () => { $('err').hidden = false; }, true);
  video.querySelector('source').addEventListener('error', () => { $('err').hidden = false; });
  $('capsel').addEventListener('change', update);
  $('live').addEventListener('change', e => { $('preview').hidden = !e.target.checked; update(); });
  window.addEventListener('resize', () => { if (!$('preview').hidden) update(); });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-seek]');
    if (b) { video.currentTime = Number(b.dataset.seek) + 0.001; update(); return; }
    if (e.target.closest('[data-a="try"]')) {
      video.pause();
      const {state} = current();
      lab.load(labHandoff(state));
      document.getElementById('lab')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }
  });
  update();
  return {video, current};
}
