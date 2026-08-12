# Telpurnar

Promotional website for **Telpurnar** — an Icelandic short film, 2026.

Þrjár vinkonur hittast eina kvöldstund. Á yfirborðinu virðist allt vera í
himnalagi en allar hafa þær þó sinn djöful að draga.

**Live site:** https://telpurproductions.is/
(also served from https://hilmirkarlsson.github.io/Telpurnar/ — the domain is
canonical, so every absolute URL and the `<link rel="canonical">` point there)

**Screening:** Bíó Paradís, 13. og 14. ágúst 2026, kl. 19:45, salur 3

---

## Credits

| | |
|---|---|
| Guðríður Jóhannsdóttir | Leikkona, handritshöfundur & framleiðandi |
| Hanna Álfheiður Gunnarsdóttir | Leikkona, handritshöfundur & framleiðandi |
| Diljá Pétursdóttir | Leikkona |
| Tómas Marshall | Myndataka |
| Skúli Helgi Sigurgíslason | Hljóð |
| Tristan Gylfi Baldursson | Aðstoð á setti |
| Hrannar | Tónlist |
| Hilmir Karlsson | Vefsíðuhönnuður |

Telpur Productions is a new Icelandic production team giving young artists a
platform. Telpurnar is its first project.

---

## Built with

Vanilla HTML, CSS and JavaScript — no framework, no build step, no dependencies
to install. Open `index.html` and it runs.

"Sticker-poster" visual identity — Luckiest Guy + Fredoka, mint / raspberry /
gold / cream. Sticky horizontal scroll-jack galleries driven by live
`getBoundingClientRect` (not ScrollTrigger, which mis-measures under async
fonts + smooth scroll), a shared lightbox, click-to-reveal director cards, and
Lenis for wheel smoothing.

**Nothing loads from a third-party host.** Fonts and Lenis are served from this
repo, so no external outage or network filter can block first paint.

### Local preview

```sh
python3 -m http.server 8000
# → http://127.0.0.1:8000
```

A plain file:// open mostly works too, but use a server if you're touching
fonts or anything that cares about origins.

---

## Conventions worth knowing before you edit

**Images are WebP with a three-step `srcset`.** Gallery frames ship at 900w /
1200w / 1500w with `sizes="(max-width: 767px) 150vw, 1066px"` — those numbers
are the *measured* card widths, not guesses, so change them together if the
gallery layout changes. Source JPEGs were removed once converted; they're in
git history if you need to re-export. Regenerate with `sharp`:

```js
sharp(src).resize({ width: w, withoutEnlargement: true })
          .webp({ quality: 75 }).toFile(out)   // 900 / 1200 / 1500
```

**Gallery frames must stay real `<img>` inside `.gallery-still`.** They were
CSS background images once, which cost alt text, lazy-loading and `srcset` —
and fetched every full-size photo on every page load. `object-fit: cover`
reproduces the old framing exactly.

**The loader defaults to hidden.** `.loader` is only raised by the `.js-loading`
class that the inline script in `<head>` adds, with a 4s failsafe. Any new
"invisible until JS animates it in" rule must be gated behind `.js` the same way
`.hero-title` and `.reveal` are — otherwise a no-JS visitor sees a blank page.

**Anything sticky at `top: 0` must clear the fixed nav** — use `--nav-h`.

**Small text uses `--crimson-text`, not `--crimson`.** The brand pink is only
3.4:1 on gold; the darker token clears WCAG AA on all three light surfaces.
Large display type keeps `--crimson`.

**Icelandic is the source of truth.** Every string carries `data-is` /
`data-en`; `Lang.apply()` swaps them. The visible IS/EN toggle is currently
disabled — the English copy is maintained and ready for when it returns.
Elements with `data-is-touch` / `data-en-touch` swap to tap wording on coarse
pointers.

---

## Pending

- **Hero imagery.** The hero is a static wordmark while short-film stills are
  outstanding. The WebGL displacement renderer, CSS slideshow and dot controls
  that used to drive it were removed rather than left as dead code — restore
  from git history (`script.js` before v68) when the imagery lands.
- **Score.** The tracklist shows `[Lag 1–4]` placeholders. It's a plain listing;
  the previous version played a synthesised Web Audio drone under Hrannar's
  credit, which was removed. Wire a real `<audio>` element in when the
  recordings exist.
- **Email.** `telpur@telpurproductions.is` arrives with the domain — verify it
  actually receives mail before relying on it. Instagram
  ([@telpurproductions](https://www.instagram.com/telpurproductions/)) is the
  live channel meanwhile.
- **No ticket link**, by design — the site is for during and after the
  screening, not for selling seats.

---

© 2026 Telpur Productions · Ísland
