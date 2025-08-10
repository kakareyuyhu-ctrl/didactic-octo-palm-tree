(() => {
  const form = document.getElementById('lookup-form');
  const input = document.getElementById('url-input');
  const statusEl = document.getElementById('status');
  const resultEl = document.getElementById('result');

  const thumbEl = document.getElementById('thumb');
  const titleEl = document.getElementById('title');
  const authorEl = document.getElementById('author');
  const canonicalWrapEl = document.getElementById('canonical-wrap');
  const durationEl = document.getElementById('duration');
  const openBtn = document.getElementById('open-btn');
  const copyBtn = document.getElementById('copy-btn');
  const embedEl = document.getElementById('embed');

  const dlBest = document.getElementById('dl-best');
  const dlNwmBtn = document.getElementById('dl-nwm-btn');
  const dlWmBtn = document.getElementById('dl-wm-btn');
  const dlAudioBtn = document.getElementById('dl-audio-btn');
  const dlNowm = document.getElementById('dl-nwm');
  const dlWm = document.getElementById('dl-wm');
  const dlAudio = document.getElementById('dl-audio');

  let bestDownloadUrl = '';
  let nowmUrl = '';
  let wmUrl = '';
  let audioUrl = '';
  let bestFilenameBase = 'tiktok-video';

  const withTimeout = async (promise, ms, onTimeout) => {
    let to;
    const timeoutPromise = new Promise((_, rej) => {
      to = setTimeout(() => { rej(new Error('timeout')); onTimeout && onTimeout(); }, ms);
    });
    try { return await Promise.race([promise, timeoutPromise]); }
    finally { clearTimeout(to); }
  };

  function setStatus(message, type = 'info') {
    statusEl.textContent = message || '';
    statusEl.setAttribute('data-state', type === 'error' ? 'error' : (type === 'loading' ? 'loading' : '')); 
  }

  function showResult(show) {
    if (show) { resultEl.hidden = false; resultEl.classList.add('visible'); }
    else { resultEl.classList.remove('visible'); resultEl.hidden = true; }
  }

  function sanitizeText(value) {
    const span = document.createElement('span');
    span.textContent = value ?? '';
    return span.innerHTML;
  }

  function normalizeTikTokUrl(raw) {
    let url = String(raw || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) { url = 'https://' + url; }
    try {
      const u = new URL(url);
      if (/^(m\.)?tiktok\.com$/i.test(u.hostname)) { u.hostname = 'www.tiktok.com'; }
      return u.toString();
    } catch (_) { return url; }
  }

  function secondsToHms(seconds) {
    const s = Math.max(0, Number(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return [h, m, sec].filter((v, i) => v !== 0 || i > 0).map(v => String(v).padStart(2, '0')).join(':');
  }

  async function fetchOEmbed(targetUrl, signal) {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' }, signal });
    if (!res.ok) throw new Error(`oEmbed failed: ${res.status}`);
    return res.json();
  }

  async function fetchViaReader(targetUrl, signal) {
    const readerUrl = `https://r.jina.ai/${targetUrl}`;
    const res = await fetch(readerUrl, { redirect: 'follow', signal });
    if (!res.ok) throw new Error(`Reader fetch failed: ${res.status}`);
    return res.text();
  }

  function extractCanonicalFromHtml(html) {
    const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i);
    let canonical = '';
    if (canonicalMatch) {
      const hrefMatch = canonicalMatch[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) canonical = hrefMatch[1];
    }
    if (!canonical) {
      const ogUrlMatch = html.match(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i);
      if (ogUrlMatch) canonical = ogUrlMatch[1];
    }
    return canonical;
  }

  function extractMetaFromHtml(html) {
    const title = (html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [,''])[1]
      || (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [,''])[1];
    const image = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || [,''])[1];

    let author = '';
    const ldMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    if (ldMatch) {
      try {
        const json = JSON.parse(ldMatch[1]);
        if (json && json.author) {
          if (Array.isArray(json.author) && json.author[0]?.name) author = json.author[0].name;
          else if (typeof json.author === 'object' && json.author.name) author = json.author.name;
        }
      } catch (_) {}
    }
    return { title, image, author };
  }

  async function fetchTikwm(targetUrl, signal) {
    const endpoint = `https://www.tikwm.com/api/?hd=1&url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' }, signal });
    if (!res.ok) throw new Error(`tikwm failed: ${res.status}`);
    const json = await res.json();
    if (json?.code !== 0 || !json?.data) throw new Error('tikwm error');
    return json.data;
  }

  async function fetchTikmate(targetUrl, signal) {
    const endpoint = `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' }, signal });
    if (!res.ok) throw new Error(`tikmate lookup failed: ${res.status}`);
    const json = await res.json();
    if (!json?.id || !json?.token) throw new Error('tikmate error');
    const videoUrl = `https://tikmate.app/download/${json.token}/${json.id}.mp4`;
    return { videoUrl };
  }

  function setDownloads({ nowm, wm, audio, filenameBase }) {
    const safeBase = (filenameBase || 'tiktok-video').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 100);
    bestFilenameBase = safeBase;

    nowmUrl = nowm || '';
    wmUrl = wm || '';
    audioUrl = audio || '';

    bestDownloadUrl = nowmUrl || wmUrl || '';
    if (bestDownloadUrl) { dlBest.classList.remove('hidden'); dlBest.classList.add('attention'); }
    else { dlBest.classList.add('hidden'); dlBest.classList.remove('attention'); }

    if (nowmUrl) { dlNwmBtn.classList.remove('hidden'); dlNowm.href = nowmUrl; dlNowm.setAttribute('download', `${safeBase}.mp4`); }
    else { dlNwmBtn.classList.add('hidden'); dlNowm.removeAttribute('href'); dlNowm.removeAttribute('download'); }

    if (wmUrl) { dlWmBtn.classList.remove('hidden'); dlWm.href = wmUrl; dlWm.setAttribute('download', `${safeBase}_wm.mp4`); }
    else { dlWmBtn.classList.add('hidden'); dlWm.removeAttribute('href'); dlWm.removeAttribute('download'); }

    if (audioUrl) { dlAudioBtn.classList.remove('hidden'); dlAudio.href = audioUrl; dlAudio.setAttribute('download', `${safeBase}.mp3`); }
    else { dlAudioBtn.classList.add('hidden'); dlAudio.removeAttribute('href'); dlAudio.removeAttribute('download'); }
  }

  function renderFromOEmbed(targetUrl, data) {
    const { title, author_name, thumbnail_url, html } = data;
    if (thumbnail_url && !thumbEl.src) thumbEl.src = thumbnail_url;
    if (title && !titleEl.textContent) titleEl.innerHTML = sanitizeText(title);
    if (author_name && !authorEl.textContent) authorEl.innerHTML = sanitizeText(`@${author_name}`);
    canonicalWrapEl.textContent = targetUrl;
    openBtn.href = targetUrl;

    if (html) {
      embedEl.innerHTML = String(html);
      if (!document.querySelector('script[src^="https://www.tiktok.com/embed.js"]')) {
        const s = document.createElement('script'); s.async = true; s.src = 'https://www.tiktok.com/embed.js'; document.body.appendChild(s);
      }
    }
  }

  function renderMetaBasics(targetUrl, meta) {
    const { title, image, author } = meta || {};
    if (image && !thumbEl.src) thumbEl.src = image;
    if (title && !titleEl.textContent) titleEl.innerHTML = sanitizeText(title);
    if (author && !authorEl.textContent) authorEl.innerHTML = sanitizeText(`@${author}`);
    canonicalWrapEl.textContent = targetUrl;
    openBtn.href = targetUrl;
  }

  function applyTikwmData(targetUrl, data) {
    const title = data.title || '';
    const author = data.author?.unique_id || data.author?.nickname || '';
    const thumb = data.cover || data.origin_cover || data.dynamic_cover || '';
    const duration = Number(data.duration || 0);

    if (thumb && !thumbEl.src) thumbEl.src = thumb;
    if (title && !titleEl.textContent) titleEl.innerHTML = sanitizeText(title);
    if (author && !authorEl.textContent) authorEl.innerHTML = sanitizeText(`@${author}`);
    if (!canonicalWrapEl.textContent) canonicalWrapEl.textContent = targetUrl;
    if (!openBtn.href) openBtn.href = targetUrl;

    durationEl.textContent = duration ? `Duration: ${secondsToHms(duration)}` : '';

    const nowm = data.hdplay || data.play || '';
    const wm = data.wmplay || '';
    const audio = data.music || '';
    setDownloads({ nowm, wm, audio, filenameBase: title || data.id });
  }

  function applyTikmateData(targetUrl, data, filenameBase) {
    renderMetaBasics(targetUrl, {});
    setDownloads({ nowm: data.videoUrl, wm: '', audio: '', filenameBase });
  }

  async function resolveCanonicalIfShort(url, signal) {
    try {
      const u = new URL(url);
      if (/^(vm|vt)\.tiktok\.com$/i.test(u.hostname)) {
        const html = await fetchViaReader(url, signal);
        const canonical = extractCanonicalFromHtml(html);
        return canonical || url;
      }
    } catch (_) {}
    return url;
  }

  function autoDownloadBlob(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url; link.download = filename; document.body.appendChild(link); link.click();
    setTimeout(() => { URL.revokeObjectURL(url); link.remove(); }, 0);
  }

  async function autoDownloadUrl(url, filename, fallbackAnchor) {
    try {
      setStatus('Starting download…', 'loading');
      const res = await withTimeout(fetch(url, { mode: 'cors' }).catch(() => fetch(url)), 15000);
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      autoDownloadBlob(blob, filename);
      setStatus('', 'info');
    } catch (e) {
      if (fallbackAnchor && fallbackAnchor.href) fallbackAnchor.click();
      setStatus('Direct download blocked by CORS. Using direct link.', 'info');
    }
  }

  async function quickDownload() {
    if (!bestDownloadUrl) return;
    const ext = bestDownloadUrl.includes('.mp3') ? 'mp3' : 'mp4';
    await autoDownloadUrl(bestDownloadUrl, `${bestFilenameBase}.${ext}`, dlNowm);
  }
  async function downloadNowm() { if (!nowmUrl) return; await autoDownloadUrl(nowmUrl, `${bestFilenameBase}.mp4`, dlNowm); }
  async function downloadWm() { if (!wmUrl) return; await autoDownloadUrl(wmUrl, `${bestFilenameBase}_wm.mp4`, dlWm); }
  async function downloadAudio() { if (!audioUrl) return; await autoDownloadUrl(audioUrl, `${bestFilenameBase}.mp3`, dlAudio); }

  async function preheat() {
    // Fire-and-forget HEADs to warm DNS/TLS
    [
      'https://www.tiktok.com/oembed',
      'https://www.tikwm.com/api/',
      'https://api.tikmate.app/api/lookup',
      'https://r.jina.ai/http://example.com'
    ].forEach(u => { fetch(u, { method: 'HEAD', mode: 'no-cors' }).catch(() => {}); });
  }

  async function handleLookup(event) {
    event.preventDefault();
    preheat();
    showResult(false);
    thumbEl.removeAttribute('src'); titleEl.textContent = ''; authorEl.textContent = '';
    canonicalWrapEl.textContent = ''; durationEl.textContent = ''; embedEl.innerHTML = '';
    bestDownloadUrl = nowmUrl = wmUrl = audioUrl = '';
    setDownloads({ nowm: '', wm: '', audio: '', filenameBase: '' });

    setStatus('Fetching details…', 'loading');

    const raw = input.value; const normalized = normalizeTikTokUrl(raw);
    if (!normalized) { setStatus('Please paste a valid TikTok URL.', 'error'); return; }

    const acGeneral = new AbortController();
    const { signal } = acGeneral;

    const canonicalPromise = resolveCanonicalIfShort(normalized, signal);
    const oembedPromise = fetchOEmbed(normalized, signal).catch(() => null);
    const readerPromise = fetchViaReader(normalized, signal).catch(() => '');

    // Race TikWM vs Tikmate with aggressive timeout and cancellation
    const acTikwm = new AbortController();
    const acTikmate = new AbortController();

    const targetUrl = await withTimeout(canonicalPromise, 6000, () => acGeneral.abort()).catch(() => normalized);

    const tikwmP = withTimeout(fetchTikwm(targetUrl, acTikwm.signal), 8000, () => acTikwm.abort()).catch(() => null);
    const tikmateP = withTimeout(fetchTikmate(targetUrl, acTikmate.signal), 8000, () => acTikmate.abort()).catch(() => null);

    let first = await Promise.race([tikwmP.then(r => ({ src: 'tikwm', r })), tikmateP.then(r => ({ src: 'tikmate', r }))]);
    if (!first || !first.r) { first = { src: 'none', r: null }; }

    // Cancel the loser
    if (first.src === 'tikwm') acTikmate.abort();
    else if (first.src === 'tikmate') acTikwm.abort();

    if (first.r && first.r.videoUrl) applyTikmateData(targetUrl, first.r, new URL(targetUrl).pathname.split('/').pop());
    else if (first.r) applyTikwmData(targetUrl, first.r);
    else {
      const [tw, tm] = await Promise.all([tikwmP, tikmateP]);
      if (tw) applyTikwmData(targetUrl, tw); else if (tm) applyTikmateData(targetUrl, tm, new URL(targetUrl).pathname.split('/').pop());
    }

    // Fill details; if reader and oembed both pending, whichever first updates UI
    const details = await Promise.race([oembedPromise.then(o => ({ o })), readerPromise.then(h => ({ h }))]).catch(() => ({}));
    if (details?.o) renderFromOEmbed(targetUrl, details.o);
    else if (details?.h) renderMetaBasics(targetUrl, extractMetaFromHtml(details.h));

    if (nowmUrl || wmUrl || audioUrl) { showResult(true); dlBest.classList.add('attention'); setStatus('', 'info'); input.blur(); }
    else { setStatus('Could not fetch details. Please verify the link is public and try again.', 'error'); }
  }

  async function handleCopy() {
    const text = canonicalWrapEl.textContent || '';
    if (!text) return;
    try { await navigator.clipboard.writeText(text); copyBtn.textContent = 'Copied!'; setTimeout(() => (copyBtn.textContent = 'Copy share link'), 1200); } catch (_) {}
  }

  form.addEventListener('submit', handleLookup);
  copyBtn.addEventListener('click', handleCopy);
  dlBest.addEventListener('click', quickDownload);
  dlNwmBtn.addEventListener('click', downloadNowm);
  dlWmBtn.addEventListener('click', downloadWm);
  dlAudioBtn.addEventListener('click', downloadAudio);
})();