# Aziza — Build Roadmap

## Deployed (Phase 1)
- [x] Auth — email/password, no Google
- [x] Library UI — sidebar, book grid, covers, search
- [x] Add book — EPUB/PDF/MOBI/CBZ/CBR upload, metadata + cover extraction, IndexedDB + Supabase
- [x] Supabase schema — book_metadata, bookmarks, voice_assignments, reading_sessions

## Deploy to Vercel (do this next)
- [ ] `npm run build` passes clean
- [ ] Push to GitHub repo
- [ ] Import to Vercel, set env vars (SUPABASE_URL, SUPABASE_ANON_KEY, APP_URL)
- [ ] Confirm live URL works end-to-end

## Phase 2 — Book Reader
- [ ] Click book → open reader page `/app/reader/[id]`
- [ ] Load file from IndexedDB
- [ ] EPUB render via epubjs (paginated or scroll)
- [ ] PDF render via pdfjs-dist
- [ ] Chapter nav, progress tracking, bookmarks
- [ ] Update progress_pct in Supabase on read

## Phase 3 — TTS (kokoro-js)
- [ ] Install kokoro-js (WASM/ONNX, ~80MB model, loads once)
- [ ] Play/pause/stop, sentence highlight
- [ ] Playback speed (0.75x / 1x / 1.25x / 1.5x / 2x)
- [ ] Character voice detection + assignment UI
- [ ] Background audio (Wake Lock API)
- [ ] Sleep timer

## Phase 4 — Habits + Settings pages
- [ ] Reading streaks, session time tracking
- [ ] Daily reminder push notification
- [ ] Settings page (default voice, theme, notifications)

## Phase 5 — PWA
- [ ] Workbox service worker (full offline after install)
- [ ] App manifest, icons, splash screen
- [ ] Install prompt
