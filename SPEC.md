# Aziza — Ebook Reader PWA
**Named after:** Aziza — Urhobo/West African deity of practical wisdom and transmission of knowledge to humans  
**Type:** Progressive Web App (installable on mobile + desktop)  
**Owner:** Personal use (Godwin Idiovo)  
**Status:** Pre-build

---

## Vision

A deeply personal ebook reader + listener that gives every book a voice — expressive, character-differentiated, emotion-aware TTS. Offline-first: books play without internet. Cloud sync via Supabase: reading progress, bookmarks, habits, and voice assignments sync across laptop and phone. Share library access with friends. African mythology aesthetic: dark, bold, not safe.

---

## Supported File Formats

| Format | Library | Notes |
|--------|---------|-------|
| EPUB | `epub.js` | Primary format |
| PDF | `pdf.js` | Full render support |
| MOBI | Server-side convert → EPUB | Via `calibre` headless or `mobi` npm package |
| CBZ / CBR | JSZip + Canvas | Comics and manhwa (image-based) |

---

## Feature Inventory

### Library
- [ ] Upload book from device (drag-and-drop + file picker)
- [ ] Show: cover image, title, author, % read, last opened date
- [ ] Multiple books open simultaneously, each saves position
- [ ] Smart chapter detection: skip copyright/ToC/colophon pages, open at Chapter 1
- [ ] Delete book from library
- [ ] Search library by title/author
- [ ] Sort by: last opened, title, % complete, date added

### Reader — Text Books (EPUB / PDF)
- [ ] Paginated or scroll view toggle
- [ ] Font family selector (min 3 options)
- [ ] Font size control
- [ ] Line height control
- [ ] Theme: Dark / Sepia / Abyss (pitch black)
- [ ] Tap/click word → definition popup (free dictionary API or offline wordlist)
- [ ] Progress bar showing % through book
- [ ] Chapter navigation drawer
- [ ] Bookmarks: add / view / jump to
- [ ] Current chapter title shown in header

### Reader — Comics / Manhwa Mode (CBZ)
- [ ] Panel-by-panel scroll (full width, single column)
- [ ] OCR text extraction from panels (tesseract.js, offline)
- [ ] Dialogue rendered as screenplay: [Character]: "text"
- [ ] Up to 40 voice assignments per title
- [ ] Auto-advance reading mode with TTS

### Text-to-Speech (TTS)
- [ ] Engine: `kokoro-js` — runs fully in-browser, no API key, no cost
- [ ] Play / Pause / Stop controls
- [ ] Playback speed: 0.75× / 1× / 1.25× / 1.5× / 2×
- [ ] Sentence + word highlight as audio plays
- [ ] Emotion detection from dialogue tags: "he shouted" → louder/faster; "she whispered" → softer/slower
- [ ] Character voice differentiation: up to 8 named characters per book, each assigned a distinct Kokoro voice
- [ ] Voice assignment UI: detect character names from text → user assigns voice per character
- [ ] Background audio: keeps playing when screen locks (PWA + Wake Lock API)
- [ ] Sleep timer: auto-stop after 15 / 30 / 60 min

### Reading Habits
- [ ] Daily reading streak (days read in a row)
- [ ] Time read today / this week / all time
- [ ] Pages / % completed per session
- [ ] Most active reading hour (heatmap)
- [ ] Books completed counter
- [ ] Optional daily reminder notification (PWA Push API — browser prompts for permission)

### PWA / Offline
- [ ] Service worker via Workbox — full offline after first install
- [ ] IndexedDB via `idb` — books, bookmarks, voice assignments, habits all stored locally
- [ ] "Add to home screen" install prompt on first visit
- [ ] Works on Chrome (desktop + Android) and Safari (iOS — limited PWA, no push notifications)
- [ ] App manifest: Aziza branding, splash screen, theme color

### Settings
- [ ] Default TTS voice
- [ ] Default reading theme
- [ ] Notification time for daily reminder
- [ ] Clear all data / reset

---

## Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14 (App Router) | PWA-compatible, fast |
| Styling | Tailwind CSS + CSS custom properties | Token-based dark theme |
| EPUB | `epub.js` | Battle-tested, maintained |
| PDF | `pdfjs-dist` | Mozilla, no server needed |
| Comics | `jszip` + `canvas` | CBZ is just a ZIP of images |
| TTS | `kokoro-js` | Free, local, ONNX/WASM in browser |
| OCR | `tesseract.js` | Free, runs in browser |
| Local storage | `idb` (IndexedDB) | Book binary files — never uploaded |
| Cloud sync | Supabase | Auth + metadata + progress + bookmarks |
| Offline | `workbox-webpack-plugin` | Next.js PWA service worker |
| Dictionary | `free-dictionary-api` | Word tap definition, no key needed |

**Sync model:**
- Book FILES (EPUB/PDF binary) → IndexedDB only, never leave device
- Book METADATA (title, author, cover thumbnail, % progress) → Supabase
- Bookmarks, voice assignments, habits, streaks → Supabase
- Offline: reads from IndexedDB cache; queues sync changes for when back online
- Result: laptop and phone stay in sync on progress; actual book files uploaded once per device

---

## Screen Inventory

1. **Library** — grid of books with covers, progress, last opened
2. **Reader — Text** — reading surface with controls overlay
3. **Reader — Comics** — panel viewer with dialogue overlay
4. **TTS Control Panel** — voice assignment, speed, character list
5. **Habits Dashboard** — streaks, time read, progress charts
6. **Settings** — preferences, notification, data management
7. **Empty State** — first-time empty library with upload CTA
8. **Install Prompt** — PWA install nudge screen

---

## Design Direction

### Aesthetic brief
- **Dark always.** Use scene = night reading, commuting, dim room. Dark is the only answer.
- **African mythology-inspired.** Not "African pattern as decoration." The world of Aziza: forest spirits, Urhobo shrines, Benin bronze, deep indigo Adire cloth.
- **NOT safe.** Reject: near-black + neon accent (generic dark mode). Reject: cream + serif (generic ebook app). Reject: glowing card edges.
- **Color commitment:** Benin bronze/shrine palette — near-black (`#0D0C0A`) + warm amber-gold (`#C9892A`) + deep ochre + muted forest green. Full palette, not neutrals + accent.
- **Type:** NOT from the default AI list. Research needed — something with character that reads well at small size in dark environments.
- **Motion:** One authored moment (book opening into reader). No scatter effects.

### Reference surfaces to study
- `mobbin.com/explore/web` — reader/library screens, empty states, navigation
- `bpando.org/book-design` — editorial/book aesthetic for reader surface
- `dribbble.com/search/web-app-ui` — dark dashboard and reader UI

---

## Build Phases & Checklist

### Phase 0 — Setup
- [ ] Create Next.js project with TypeScript + Tailwind
- [ ] Configure PWA (next-pwa or custom Workbox)
- [ ] Supabase project created, tables: `users`, `book_metadata`, `bookmarks`, `voice_assignments`, `habits`
- [ ] Set up IndexedDB schema (`book_files`, `offline_queue`)
- [ ] Define design tokens (colors, type, spacing)
- [ ] Create `.env.example`

### Phase 1 — UI Mockup (HTML, no logic)
- [ ] Library screen — desktop + mobile
- [ ] Reader screen — text mode
- [ ] Reader screen — comics mode
- [ ] TTS control panel overlay
- [ ] Habits screen
- [ ] Settings screen
- [ ] Empty state
- [ ] **Review all screens in browser before Phase 2**

### Phase 2 — File Parsing
- [ ] EPUB upload + render (epub.js)
- [ ] PDF upload + render (pdfjs-dist)
- [ ] CBZ upload + image extraction (jszip)
- [ ] MOBI conversion flow
- [ ] Metadata extraction (title, author, cover)
- [ ] Store in IndexedDB

### Phase 3 — Reader Core
- [ ] Pagination / scroll toggle
- [ ] Font controls
- [ ] Theme switching
- [ ] Chapter navigation
- [ ] Bookmarks
- [ ] Progress tracking
- [ ] Word tap → definition

### Phase 4 — TTS Integration
- [ ] Kokoro-js initialization (WASM model load)
- [ ] Play/pause/stop with sentence sync
- [ ] Word/sentence highlight
- [ ] Playback speed
- [ ] Character detection (regex on dialogue tags)
- [ ] Voice assignment UI
- [ ] Comics TTS mode
- [ ] Background audio + Wake Lock

### Phase 5 — Habits
- [ ] Daily streak logic
- [ ] Session time tracking
- [ ] Storage + display
- [ ] Push notification (daily reminder)

### Phase 6 — PWA Polish
- [ ] Offline verification (airplane mode test)
- [ ] Install prompt
- [ ] Splash screen + icon
- [ ] iOS Safari compatibility check
- [ ] Performance audit (Lighthouse)

### Phase 7 — Finish
- [ ] Full design review (all screens, desktop + mobile)
- [ ] Fix list from review
- [ ] DESIGN.md written
- [ ] README written

---

## Design QA Checklist (run before marking Phase 1 done)

- [ ] All text contrast ≥ 4.5:1 on dark backgrounds
- [ ] No gradient text
- [ ] No colored border-left as decoration
- [ ] No glass/blur as decoration
- [ ] Hover, active, disabled states on all interactive elements
- [ ] Scrollbar styled to match theme
- [ ] Text selection color styled
- [ ] Focus rings visible and styled
- [ ] Mobile: no horizontal overflow
- [ ] Mobile: touch targets ≥ 44px
- [ ] Typography: body measure 65–75ch, clear scale steps
- [ ] Spacing: more space above headings than below
- [ ] Empty states designed (not just hidden)

---

## File Structure (planned)

```
aziza/
├── SPEC.md                  ← this file
├── .env.example
├── package.json
├── public/
│   ├── manifest.json        ← PWA manifest
│   ├── icons/               ← app icons (192, 512)
│   └── sw.js                ← service worker
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx          ← library
│   │   ├── reader/[id]/
│   │   │   └── page.tsx
│   │   ├── habits/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── components/
│   │   ├── library/
│   │   ├── reader/
│   │   ├── tts/
│   │   └── habits/
│   ├── lib/
│   │   ├── db.ts             ← IndexedDB (idb)
│   │   ├── epub.ts
│   │   ├── pdf.ts
│   │   ├── cbz.ts
│   │   └── tts.ts            ← kokoro-js wrapper
│   └── styles/
│       └── globals.css
└── mockup/
    └── index.html            ← Phase 1 static UI mockup
```

---

## Open Questions / Decisions Pending

- [ ] Font choice for headings (research: non-default, dark-world character)
- [ ] Kokoro-js voice list — which voices to map to which character archetypes
- [ ] MOBI conversion: client-side npm package vs. note to user "convert to EPUB first"
- [ ] Share with friends: export/import book file directly (no server needed)?
- [ ] Comics OCR accuracy on low-res manhwa scans — fallback plan?
