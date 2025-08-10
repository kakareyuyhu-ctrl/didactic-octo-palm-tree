# TikTok Downloader (No-Key)

A minimal static site that fetches TikTok video details and provides direct download links, using public, no-key APIs.

- Supports multiple URL formats: `tiktok.com`, `m.tiktok.com`, `vm.tiktok.com`, `vt.tiktok.com`
- Primary API: TikWM (`https://www.tikwm.com/api/?url=...`) – provides no-watermark, watermark, and audio links
- Fallback API: Tikmate lookup (`https://api.tikmate.app/api/lookup?url=...`) – provides a direct MP4 link
- Details via TikTok oEmbed and HTML metadata with a reader fallback

## Quick start

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Notes

- No API keys are required. These public endpoints may change or rate-limit.
- Some links may not be HD if the source doesn't expose it; the app tries `hd=1` with TikWM.
- If downloads fail in your region, try a VPN; availability can be geo-dependent.
- Respect creators' rights and platform terms. Only download content you have permission to use.
