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
  const dlNowm = document.getElementById('dl-nwm');
  const dlWm = document.getElementById('dl-wm');
  const dlAudio = document.getElementById('dl-audio');

  let bestDownloadUrl = '';
  let bestFilenameBase = 'tiktok-video';

  function setStatus(message, type = 'info') {
    statusEl.textContent = message || '';
    statusEl.setAttribute('data-state', type === 'error' ? 'error' : (type === 'loading' ? 'loading' : '')); 
  }

  function showResult(show) {
    if (show) {
      resultEl.hidden = false;
      resultEl.classList.add('visible');
    } else {
      resultEl.classList.remove('visible');
      resultEl.hidden = true;
    }
  }

  function sanitizeText(value) {
    const span = document.createElement('span');
    span.textContent = value ?? '';
    return span.innerHTML;
  }

  function normalizeTikTokUrl(raw) {
    let url = String(raw || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    try {
      const u = new URL(url);
      if (/^(m\.)?tiktok\.com$/i.test(u.hostname)) {
        u.hostname = 'www.tiktok.com';
      }
      return u.toString();
    } catch (_) { return url; }
  }

  function secondsToHms(seconds) {
    const s = Math.max(0, Number(seconds || 0));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return [h, m, sec]
      .filter((v, i) => v !== 0 || i > 0)
      .map(v => String(v).padStart(2, '0'))
      .join(':');
  }

  async function fetchOEmbed(targetUrl) {
    const endpoint = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`oEmbed failed: ${res.status}`);
    return res.json();
  }

  async function fetchViaReader(targetUrl) {
    const readerUrl = `https://r.jina.ai/${targetUrl}`;
    const res = await fetch(readerUrl, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Reader fetch failed: ${res.status}`);
    const text = await res.text();
    return text;
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

  async function fetchTikwm(targetUrl) {
    const endpoint = `https://www.tikwm.com/api/?hd=1&url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`tikwm failed: ${res.status}`);
    const json = await res.json();
    if (json?.code !== 0 || !json?.data) throw new Error('tikwm error');
    return json.data;
  }

  async function fetchTikmate(targetUrl) {
    const endpoint = `https://api.tikmate.app/api/lookup?url=${encodeURIComponent(targetUrl)}`;
    const res = await fetch(endpoint, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) throw new Error(`tikmate lookup failed: ${res.status}`);
    const json = await res.json();
    if (!json?.id || !json?.token) throw new Error('tikmate error');
    const videoUrl = `https://tikmate.app/download/${json.token}/${json.id}.mp4`;
    return { videoUrl };
  }

  function setDownloads({ nowm, wm, audio, filenameBase }) {
    const safeBase = (filenameBase || 'tiktok-video').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 100);
    bestFilenameBase = safeBase;

    bestDownloadUrl = nowm || wm || '';
    if (bestDownloadUrl) {
      dlBest.classList.remove('hidden');
      dlBest.classList.add('attention');
    } else {
      dlBest.classList.add('hidden');
      dlBest.classList.remove('attention');
    }

    if (nowm) {
      dlNowm.classList.remove('hidden');
      dlNowm.href = nowm;
      dlNowm.setAttribute('download', `${safeBase}.mp4`);
    } else {
      dlNowm.classList.add('hidden');
      dlNowm.removeAttribute('href');
      dlNowm.removeAttribute('download');
    }
    if (wm) {
      dlWm.classList.remove('hidden');
      dlWm.href = wm;
      dlWm.setAttribute('download', `${safeBase}_wm.mp4`);
    } else {
      dlWm.classList.add('hidden');
      dlWm.removeAttribute('href');
      dlWm.removeAttribute('download');
    }
    if (audio) {
      dlAudio.classList.remove('hidden');
      dlAudio.href = audio;
      dlAudio.setAttribute('download', `${safeBase}.mp3`);
    } else {
      dlAudio.classList.add('hidden');
      dlAudio.removeAttribute('href');
      dlAudio.removeAttribute('download');
    }
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
        const s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.tiktok.com/embed.js';
        document.body.appendChild(s);
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

  async function resolveCanonicalIfShort(url) {
    try {
      const u = new URL(url);
      if (/^(vm|vt)\.tiktok\.com$/i.test(u.hostname)) {
        const html = await fetchViaReader(url);
        const canonical = extractCanonicalFromHtml(html);
        return canonical || url;
      }
    } catch (_) {}
    return url;
  }

  function autoDownloadBlob(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      link.remove();
    }, 0);
  }

  async function quickDownload() {
    if (!bestDownloadUrl) return;
    try {
      dlBest.disabled = true;
      dlBest.textContent = 'Downloading…';
      setStatus('Starting download…', 'loading');
      const res = await fetch(bestDownloadUrl, { mode: 'cors' }).catch(() => fetch(bestDownloadUrl));
      if (!res.ok) throw new Error('download failed');
      const contentType = res.headers.get('content-type') || 'video/mp4';
      const blob = await res.blob();
      const ext = contentType.includes('audio') ? 'mp3' : 'mp4';
      autoDownloadBlob(blob, `${bestFilenameBase}.${ext}`);
      setStatus('', 'info');
    } catch (e) {
      setStatus('Direct download blocked by CORS. Use the link buttons instead.', 'error');
    } finally {
      dlBest.disabled = false;
      dlBest.textContent = 'Quick Download';
    }
  }

  async function handleLookup(event) {
    event.preventDefault();
    showResult(false);
    thumbEl.removeAttribute('src');
    titleEl.textContent = '';
    authorEl.textContent = '';
    canonicalWrapEl.textContent = '';
    durationEl.textContent = '';
    embedEl.innerHTML = '';
    bestDownloadUrl = '';
    setDownloads({ nowm: '', wm: '', audio: '', filenameBase: '' });

    setStatus('Fetching details…', 'loading');

    const raw = input.value;
    const normalized = normalizeTikTokUrl(raw);
    if (!normalized) {
      setStatus('Please paste a valid TikTok URL.', 'error');
      return;
    }

    // Start canonical resolution and oEmbed immediately in parallel
    const canonicalPromise = resolveCanonicalIfShort(normalized);
    const oembedPromise = fetchOEmbed(normalized).catch(() => null);
    const readerPromise = fetchViaReader(normalized).catch(() => '');

    const targetUrl = await canonicalPromise.catch(() => normalized);

    // In parallel: attempt TikWM and Tikmate
    const tikwmP = fetchTikwm(targetUrl).catch(() => null);
    const tikmateP = fetchTikmate(targetUrl).catch(() => null);

    let primary = await tikwmP;
    if (primary) {
      applyTikwmData(targetUrl, primary);
    } else {
      const fallback = await tikmateP;
      if (fallback) {
        applyTikmateData(targetUrl, fallback, new URL(targetUrl).pathname.split('/').pop());
      }
    }

    // Fill in details from whichever returns first
    const oembed = await oembedPromise;
    if (oembed) renderFromOEmbed(targetUrl, oembed);
    else {
      const html = await readerPromise;
      if (html) {
        const meta = extractMetaFromHtml(html);
        renderMetaBasics(targetUrl, meta);
      }
    }

    if (bestDownloadUrl) {
      showResult(true);
      dlBest.classList.add('attention');
      setStatus('', 'info');
      input.blur();
    } else {
      // As a last attempt, if we failed both, try second API if not tried already
      if (!primary) {
        const retry = await tikmateP;
        if (retry) applyTikmateData(targetUrl, retry, new URL(targetUrl).pathname.split('/').pop());
      }
      if (bestDownloadUrl) {
        showResult(true);
        setStatus('', 'info');
      } else {
        setStatus('Could not fetch details. Please verify the link is public and try again.', 'error');
      }
    }
  }

  async function handleCopy() {
    const text = canonicalWrapEl.textContent || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy share link'), 1200);
    } catch (_) {}
  }

  form.addEventListener('submit', handleLookup);
  copyBtn.addEventListener('click', handleCopy);
  dlBest.addEventListener('click', quickDownload);
})();