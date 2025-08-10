# NovaTok — Ultra‑fast TikTok Downloader

A premium, ultra‑fast TikTok downloader with smart fallbacks and no API keys.

- Supports multiple URL formats: `tiktok.com`, `m.tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com`
- Primary API: TikWM (no‑watermark, watermark, audio)
- Fallback API: Tikmate (direct MP4)
- Details via TikTok oEmbed and HTML metadata

## Quick start

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Notes

- No API keys are required. Endpoints may change or rate‑limit.
- Respect creators' rights and platform terms. Only download content you have permission to use.
