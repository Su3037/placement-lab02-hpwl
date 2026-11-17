// Film player: four films (科普 → 精讲 → 进阶 → 实验演示), each with a zh and an en version. Captions, chapters
// and the frame-to-lab handoff all come from the clock of the version on screen: MP4 frame i was rendered at
// t = i / fps, so the state of the frame on screen is stateAt(frameAt(currentTime) / fps). That state, not a
// chapter preset, is what goes to the lab.
import {stateAt, labHandoff, frameAt, frameTime, validateClock} from './timeline.js';
import {Scene} from './scene.js';
import {escapeText as E} from './board.js';

const FPS = 30;
const ts = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
async function data(path) { const r = await fetch(path); if (!r.ok) throw new Error(`${path} (HTTP ${r.status})`); return r.json(); }

export function createPlayer(root, {fixtures, films, text, lang, lab}) {
  root.innerHTML = `
  <div class="film-cards" role="tablist">${films.map((f, i) => `<button type="button" role="tab" class="film-card" data-film="${f.id}" aria-selected="${i === 0}">
      <span class="num">${String(i + 1).padStart(2, '0')} · ${E(text.films[f.id].label)}</span><span class="t">${E(f.title[lang].split(' · ').slice(1).join(' · ') || f.title[lang])}</span>
      <span class="dur">${ts(f.langs[lang].duration)}</span></button>`).join('')}</div>
  <p class="film-why" data-k="why"></p>
  <div class="player">
    <div class="video-wrap"><video data-k="video" controls preload="metadata" playsinline></video></div>
    <p class="video-error" data-k="err" hidden>${text.filmMissingOne}</p>
    <div class="caption-bar" data-k="cap" aria-live="off"></div>
    <div class="player-tools">
      <button type="button" class="btn primary" data-a="try">${text.tryFrame}</button>
      <label>${text.filmLang} <select data-k="vlang"><option value="zh">中文</option><option value="en">English</option></select></label>
      <label>${text.captionLabel} <select data-k="capsel"><option value="off">${text.capOff}</option><option value="zh">${text.capZh}</option><option value="en">${text.capEn}</option></select></label>
      <label><input type="checkbox" data-k="live"> ${text.livePreview}</label>
      <span class="frame-info" data-k="info"></span>
    </div>
    <div class="live-preview" data-k="preview" hidden><div class="scaler" data-k="scaler"></div></div>
    <div class="film-nav"><nav class="chapters" data-k="chapters" aria-label="${E(text.chapters)}"></nav><details class="transcript" data-k="transcript"><summary>${text.transcript}</summary><div></div></details></div>
  </div>`;
  const $ = k => root.querySelector(`[data-k="${k}"]`);
  const video = $('video');
  const cache = {};
  let cur = null; // {film, vlang, script, clock}
  let raf = 0;
  $('vlang').value = lang;

  async function load(filmId, vlang) {
    const entry = films.find(f => f.id === filmId);
    const key = `${filmId}.${vlang}`;
    cache[key] ??= Promise.all([data(`data/films/${filmId}.json`), data(entry.langs[vlang].clock), filmId === 'lab' ? data(`data/walk/${vlang}.json`).catch(() => null) : null])
      .then(([script, clock, walk]) => { validateClock(clock, script); return {script, clock, walk}; });
    const {script, clock, walk} = await cache[key];
    cur = {film: entry, vlang, script, clock, walk};
    root.querySelectorAll('.film-card').forEach(b => b.setAttribute('aria-selected', String(b.dataset.film === filmId)));
    $('why').textContent = text.films[filmId].why;
    $('err').hidden = true;
    video.poster = entry.langs[vlang].poster;
    video.innerHTML = `<source src="${entry.langs[vlang].video}" type="video/mp4"><track kind="subtitles" srclang="zh" label="中文" src="${entry.langs.zh.vtt}"><track kind="subtitles" srclang="en" label="English" src="${entry.langs.en.vtt}"><track kind="chapters" srclang="${vlang}" src="${entry.langs[vlang].chapters}" default>`;
    video.querySelector('source').addEventListener('error', () => { $('err').hidden = false; });
    video.load();
    // The picture already carries captions and the bar below can add the other language: keep the native subtitle
    // tracks off unless the viewer turns one on in the video controls.
    const quiet = () => { for (const tr of video.textTracks) if (tr.kind === 'subtitles') tr.mode = 'disabled'; };
    quiet(); video.addEventListener('loadedmetadata', quiet, {once: true});
    // The picture carries Chinese captions (zh version) or English captions (en version); the bar below can add the other language.
    $('capsel').value = vlang === 'zh' && lang === 'en' ? 'en' : 'off';
    root.querySelector('[data-a="try"]').hidden = filmId === 'lab';
    $('chapters').innerHTML = `<h3>${text.chapters}</h3><ol>${clock.segments.map((s, i) => `<li><button type="button" data-seek="${s.start}" data-cue="${s.id}">${ts(s.start)} · ${E(script.chapters[s.chapter][lang])} · ${E(script.cues[i].title[lang])}</button></li>`).join('')}</ol>`;
    $('transcript').querySelector('div').innerHTML = script.cues.map((c, i) => `<h4><button type="button" class="link" data-seek="${clock.segments[i].start}">${ts(clock.segments[i].start)}</button> ${E(c.title[lang])}</h4><p>${c.lines.filter(l => l[lang]).map(l => E(l[lang])).join('<br>')}</p>`).join('');
    update();
  }
  const current = () => {
    if (!cur) return null;
    const f = Math.min(frameAt(video.currentTime || 0, FPS), Math.round(cur.clock.duration * FPS) - 1);
    const t = frameTime(f, FPS);
    return {f, t, film: cur.film.id, vlang: cur.vlang, state: stateAt(t, fixtures, cur.script, cur.clock, {walk: cur.walk})};
  };
  function update() {
    const c = current();
    if (!c) return;
    const sel = $('capsel').value;
    $('cap').textContent = sel !== 'off' && c.state.caption ? c.state.caption[sel] : '';
    $('cap').hidden = sel === 'off';
    $('info').textContent = text.frameInfo(c.t, c.f, c.state.cueId);
    root.querySelectorAll('.chapters button').forEach(b => b.classList.toggle('on', b.dataset.cue === c.state.cueId));
    if (!$('preview').hidden) {
      $('scaler').innerHTML = Scene(c.state, cur.script, {lang: cur.vlang});
      $('scaler').style.transform = `scale(${$('preview').clientWidth / 1920})`;
    }
  }
  const loop = () => { update(); if (!video.paused) raf = requestAnimationFrame(loop); };
  video.addEventListener('play', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); });
  ['pause', 'seeked', 'timeupdate', 'loadedmetadata'].forEach(ev => video.addEventListener(ev, update));
  video.addEventListener('error', () => { $('err').hidden = false; }, true);
  $('capsel').addEventListener('change', update);
  $('vlang').addEventListener('change', e => load(cur.film.id, e.target.value));
  $('live').addEventListener('change', e => { $('preview').hidden = !e.target.checked; update(); });
  window.addEventListener('resize', () => { if (!$('preview').hidden) update(); });
  root.addEventListener('click', e => {
    const card = e.target.closest('.film-card');
    if (card) { load(card.dataset.film, $('vlang').value); return; }
    const b = e.target.closest('[data-seek]');
    if (b) { video.currentTime = Number(b.dataset.seek) + 0.001; update(); return; }
    if (e.target.closest('[data-a="try"]')) {
      video.pause();
      const c = current();
      if (!c?.state.board) return;
      lab.load(labHandoff(c.state));
      document.getElementById('lab')?.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }
  });
  const ready = load(films[0].id, lang);
  return {video, current, load, ready};
}
