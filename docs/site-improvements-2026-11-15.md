# Website improvements — 15 November 2026

Implemented review priorities 1, 2, 6 and 7. Production deployment was authorised on 16 November 2026.

## Media and loading

- Replaced automatically loaded visitor-direction GIFs with a labelled entrance photograph (93,542 bytes) and an optional MP4 (824,972 bytes), with controls, no autoplay and `preload="none"`. Written directions remain available without playing the video.
- Retained the original source GIF in assets. Its deployed variants measured 6,657,666, 25,356,343 and 53,959,193 bytes during the review; the revised pages do not reference them.
- Generated responsive WebP images for the three existing introduction slides. Their larger variants total 200,014 bytes. Only the first slide is prioritised; the others use lazy loading. Navigation is manual.
- Added explicit image dimensions to update cards and gallery thumbnails.

## Enquiries

- Both contact locations use the same form name and field names as before, adding `enquiry-type`, visible labels and name/email autocomplete.
- Preserved Netlify form detection, the existing honeypot name and reCAPTCHA. A native POST targets `/contact-submitted/` for confirmation; no client-side success message is displayed before the server response.
- CVs and attachments go to `m.diluca@bham.ac.uk`, also provided as a fallback contact route. The address was verified against the [University staff profile](https://www.birmingham.ac.uk/staff/profiles/psychology/diluca-massimiliano).
- Removed the promise of automatic SharePoint access. Access and training are discussed after enquiry review.

## Events and archives

- Media links to the complete news, blog and event archives. The Media event groups show up to six entries each; the event archive shows all entries.
- Upcoming events are sorted earliest first, past events latest first. Hugo determines the initial grouping, and JavaScript refreshes it on page load and restoration to account for dates passing after a build.
- Past event detail pages show an archive notice. The Robotics Institute visit now describes the scheduled arrangements without asserting that attendance or delivery was verified.
- Event content inherits an early publication date unless explicitly overridden, allowing future attendance dates to appear in production without publishing future-dated content elsewhere. Authors can still use `draft` or an explicit `publishDate` to control release.
- All-day events remain current until midnight after their final day, using Europe/London time.

## Accessibility and metadata

- Added a main-content landmark, skip link, visible keyboard focus, consistent heading levels on principal pages, and unique section IDs.
- Added descriptions to principal pages and separated utility pages from the sitemap; utility pages carry `noindex`. This is search-index guidance, not access control.
- Removed automatic introduction rotation and respected reduced motion in CSS, update-card scrolling and the theme's jQuery animations.
- Local overrides of the pinned Hugo Blox base layout, block parser and search partial carry these changes. Review them when upgrading the theme.

## Validation

- Production Hugo build passed: 621 pages, using Hugo 0.152.2 extended.
- Checked 622 internal link/anchor occurrences across 11 principal pages, including URL-decoded asset names.
- Verified main landmarks, one main page heading, unique IDs and descriptions on those pages; checked utility `noindex` and sitemap exclusion.
- DOM tests passed for required form fields and email validation; event regrouping across dates; six-card limits; past-event notices; actual Bootstrap next-slide interaction without starting autoplay; and reduced-motion preference changes.
- An isolated fixture build verified future-event publication without `--buildFuture` and British Summer Time all-day boundaries.
- BhamXR data validation passed; `git diff --check` and JavaScript syntax checks passed.
- Existing theme warnings about a sitemap render-hook filename and deprecated `_build` remain.

Build command:

```sh
hugo --minify --destination /tmp/vrlab-improvements-preview --environment production
```

Browser access became available on 16 November 2026. The desktop homepage and a 390 × 844 mobile viewport were inspected before deployment. A mobile carousel-arrow overlap was corrected. Live form delivery and notification receipt still require a submission test; no enquiry was sent during these checks. Publication-topic changes already in progress were not edited as part of this work.

The predeployment rebuild on 16 November passed with 658 pages, including the subsequently committed publication updates. Publication topic validation (31 papers), BhamXR validation and the DOM checks also passed.
