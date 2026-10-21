# ECCR · Build & Teach

A bilingual technical manual and teacher-led walkthrough for creating reading materials,
connecting teacher recordings, and testing a small reading app. Code is available in expandable
sections. A floating conversation viewer connects each chapter to original prompts, response
summaries, and source documents.

- [Technical manual](https://jieunjanetsong.github.io/eccr-journey/#technical/system-map): 10 chapters.
- [Walkthrough](https://jieunjanetsong.github.io/eccr-journey/#tutorial/brief): 8 lessons with editable
  exercises, prompt templates, expected outputs, and acceptance checks.
- [Reading Lab](https://jieunjanetsong.github.io/eccr-journey/starter/): a runnable 3-page,
  11-sentence starter with local images, recordings, backup/restore, printing, and offline caching.
- [Original journey](https://jieunjanetsong.github.io/eccr-journey/archive.html): preserved history,
  selected PDF previews, and the original conversation viewer.

English and Korean interfaces are included. Tutorial prompt templates are newly written;
the conversation viewer labels historical quotations separately.

## Scope and evidence

The historical archive preserves 128 curated records: 53 WhatsApp messages selected from the
1,229-message `_chat.txt`, 37 AI prompts, 37 response summaries, and one production note.
The manual also includes 20 source documents. It does not represent the entire private chat as
published material.

The production audit refers to
[`eccr-picture-audio-site` revision `3b87245`](https://github.com/JiEunJanetSong/eccr-picture-audio-site/tree/3b87245)
on 2026-10-21. That snapshot contains 7 books, 112 page images and 143 audio entries:
132 recording references and 11 entries explicitly missing audio.
The manual distinguishes this snapshot from later print corrections and older instructions.

The starter is a new, smaller learning implementation based on selected Book 7 manuscript
sentences. It does not recreate the complete final PDF editions or the production app's
page-image hotspots. Exact editions require their original illustrations, fonts, coordinates,
and approved recordings. The starter includes no original illustrations or personal recordings.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Generated self-contained manual, walkthrough, and conversation data |
| `archive.html` | Preserved previous site |
| `src/index.template.html`, `src/style.css`, `src/app.js` | Editable interface source |
| `src/content/*.json` | Bilingual content, evidence references, and source documents |
| `starter/` | Independent runnable app and its developer tests |
| `downloads/` | Starter ZIP and printable English/Korean technical manuals |
| `scripts/build-site.py` | Standard-library build script |
| `tests/test_site.py` | Source fidelity, evidence, and downloadable artifact checks |

## Build and preview

Run these commands from the repository root. Python 3 is required to build or serve locally.
No package installation or API key is required.

```sh
python3 scripts/build-site.py
python3 -m http.server 8850 --bind 127.0.0.1
```

Open `http://127.0.0.1:8850/`. The main `index.html` can also be opened directly; the
Reading Lab requires HTTP on localhost or HTTPS because it loads JSON and uses a service worker.
Use Ctrl+C to stop the preview server.

The build generates `index.html`, both printable manuals, and the starter ZIP. Deploy the
whole repository to retain archive links, downloads, and the Reading Lab. GitHub Pages publishes
the root of the `main` branch; `.nojekyll` disables Jekyll.

## Checks

Python checks source fidelity and packaging. Node.js 20+ runs the optional app tests.

```sh
python3 -m unittest discover -s tests -v
node --check src/app.js
node --test starter/tests/model.test.mjs starter/tests/sw.test.mjs
node --input-type=module --check < starter/app.js
node --check starter/sw.js
```

The automated checks cover preserved records, evidence references, prompt/response pairing,
lesson outputs, ZIP consistency, manuscript fidelity, input validation, stale audio removal,
backup data validation, scoped caching, and offline request routing.

Browser acceptance checks include English/Korean navigation, original prompt plus response
display, exercise persistence, mobile layout, and printing. For the Reading Lab, test a short
recording upload, playback after reload, backup/restore, and offline reopening and playback.
Microphone recording requires permission and a real device check.

## Local data

Walkthrough notes and checks are saved in this browser's localStorage. The workbook export
contains those notes; it does not include Reading Lab recordings or images. The Reading Lab
stores its own work in IndexedDB and has a separate full backup. Nothing is uploaded to a server.

When updating the starter's cached files, increment its `sw.js` cache version and rebuild the
ZIP. See `starter/readme.txt` for the complete teacher guide and limitations.

Source teaching materials: Yaw and Janet / ECCR. Produced by Team Kairos.
