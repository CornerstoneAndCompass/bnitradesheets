# BNI Trade Sheet - Modular Block System

This document describes the block-and-grid architecture that replaces the current fixed-canvas overlay system.

## Why this change

The previous renderer used a fixed 2665 x 3692 px canvas with absolutely-positioned overlays sitting on top of pre-flattened PNG backgrounds (`template-front.png` etc). That approach broke every time real content varied:

- A chapter with 28 members spilled past the inside-right table.
- Long venue addresses overflowed the date box.
- Leadership Team had a hard-coded 22 row slots.
- Padding tweaks fixed one symptom and revealed another.

The new system is grid-based. Pages are CSS grid containers; content is rendered as composable blocks that know how to grow, shrink and paginate. Templates are data, not pixel positions.

## Page model

```
Page {
  id: string
  size: 'A4'                       // 210 x 297 mm trim
  bleed: 3                         // mm, on every edge
  cols: 12                         // grid columns across the trim area
  gap: { col: 4, row: 4 }          // mm
  margin: { top, right, bottom, left }   // mm, inside the trim
  blocks: Block[]
}
```

The rendered DOM page is `216 x 303 mm` (trim + bleed). The grid lives inside the trim safe zone at `210 x 297 mm`, offset by 3 mm for bleed. Any block with `bleed: 'top' | 'bottom' | 'left' | 'right' | 'all'` extends 3 mm past the trim edge so it survives the printer's cut.

## Block model

```
Block {
  id: string
  type: BlockType                  // one of the registered block types
  col: { start: 1..12, span: 1..12 }
  row: { start: number, span: number }
  bleed?: 'top'|'bottom'|'left'|'right'|'all'
  fields: Record<string, any>      // block-specific config + bound data
  growth?: 'fixed' | 'fill' | 'paginate'
  minHeight?: number               // mm
}
```

`growth` semantics:

- `fixed`: block is exactly its declared row span.
- `fill`: block expands its row span to consume any free vertical space on the page.
- `paginate`: the block can overflow to additional pages. If multiple paginating blocks share a page they all flow in document order.

## Auto-pagination engine

The Member Referral Table is the main paginating block. Behaviour:

1. Block declares `rowsPerPage: { min: 14, target: 16, max: 18 }` and a base row height in mm.
2. Engine receives total member count `N` and the number of pages reserved for member rows in the template (e.g. 2 by default, expandable up to 6).
3. Engine first tries to fit `N` members into the reserved pages at `target` rows per page.
4. If `N` exceeds `pages * max`, more pages are auto-inserted (up to a hard ceiling of 6).
5. Once page count is settled, the engine computes the actual row height per page so the last page is filled without a tail gap. Earlier pages use the same height to keep the look consistent across pages.
6. Special slots (Presenting Today, Golden Mic, I'm New) sit on whichever page their member number falls on. The engine never breaks a designated row across pages.
7. Last page reserves the trailing two rows for "Don't miss this spot!" and "Blink and it's gone." messages if there is space.

Inputs the engine needs:
- `members`: ordered list with id, name, business, category, contact, optional role
- `designations`: `{ presenting_today, golden_mic, im_new }` mapping a row index to a colour
- `reservedPageCount`: how many pages the template reserves for the table
- `maxPageCount`: hard cap (default 6)

Output: an array of `{ pageIndex, rows: MemberRow[], rowHeightMm }` ready for the renderer.

## Block library (v1)

| Block type            | Purpose                                                              | Grows |
| --------------------- | -------------------------------------------------------------------- | ----- |
| `header_bar`          | Red top bar with BNI logo, chapter name, date, venue                 | fixed |
| `welcome_title`       | "WELCOME TO BNI [CHAPTER]" hairline outline title                    | fixed |
| `meeting_agenda`      | Numbered agenda list (BNI standard 20 items, editable)               | fill  |
| `philosophy`          | BNI Philosophy paragraph                                             | fill  |
| `visitor_resources`   | Red panel with QR code and short message                             | fixed |
| `leadership_team`     | 2-column key/value table; auto-rows from chapter.leadership          | fill  |
| `speaker_roster`      | Date / name / category alternating-row table                         | fill  |
| `photo_caption`       | Image with one-line caption beneath                                  | fixed |
| `member_referral`     | Numbered referral table; the paginating workhorse                    | paginate |
| `upcoming_dates`      | Date / event two-column list with optional row highlight             | fill  |
| `feature_presenter`   | Green panel with this-week presenter and next-week presenter         | fixed |
| `targeting_occupations` | 2-column list of occupations the chapter is targeting              | fill  |
| `podcasts`            | Row of podcast tiles with host names and episode counts              | fixed |
| `education_notes`     | Lined writing area with header                                       | fill  |
| `i_have`              | Lined writing area for "I Have" referrals                            | fill  |
| `vp_report`           | KPI table (Last Week / Weekly Budget / 2026 avg)                     | fixed |
| `scan_qr`             | "Scan here for our Facebook page" QR panel                           | fixed |
| `footer_bar`          | Red bottom bar with chapter tagline                                  | fixed |
| `spacer`              | Empty grid space; useful in the editor                               | fixed |

Each block module exports:

```js
{
  type: 'leadership_team',
  label: 'Leadership Team',
  defaultSpan: { cols: 6, rows: 14 },
  fields: [/* schema for the editor */],
  render: ({ fields, content }) => <Component .../>
}
```

## Default template

`templates/default.json` (data, not code) defines the 4-page BNI Royals design as a starting template. Each new chapter clones this template, then can be edited.

Page 1 (Front cover):
- header_bar (cols 1-12, bleed top)
- welcome_title
- meeting_agenda (left col)
- philosophy (centre)
- visitor_resources (right col)
- leadership_team (right block)
- speaker_roster (bottom-left)
- photo_caption
- footer_bar (bleed bottom)

Page 2 (Inside left):
- header_bar (with "MEMBER REFERRAL REQUEST" subtitle)
- member_referral (full width, growth: paginate, page 1)
- footer_bar ("Writing it down makes you 42% more likely to bring a referral")

Page 3 (Inside right):
- Same shell as page 2; member_referral (page 2)
- footer_bar ("1 Referral. 1 one-to-one. 1 CEU. 1 Meeting. 1 Visitor. = Power of one")

Page 4 (Back):
- header_bar (BNI Royals only, no subtitle)
- podcasts | education_notes (top half)
- upcoming_dates | feature_presenter (mid)
- targeting_occupations | i_have (lower-mid)
- scan_qr | vp_report (bottom)
- footer_bar ("Whether you're giving or receiving, log it to close the loop")

If `member_referral` paginates beyond page 3, the engine inserts additional inside pages between page 3 and page 4, each with the same shell as pages 2-3.

## Bleed handling

- Page DOM size: `216 x 303 mm`
- Trim guides: drawn at `3mm` from each edge in editor mode only
- Blocks with `bleed: 'top'`: y starts at `0`, content top extends to the trim edge plus 3mm
- Blocks with `bleed: 'bottom'`: y ends at `303mm`
- Print CSS: `@page { size: 216mm 303mm; margin: 0; }`
- Editor CSS: shows trim line as a faint dashed border for the designer's reference; hidden in print

## Print and PDF output

The renderer outputs N pages as a contiguous DOM tree. Each page wrapper has `page-break-after: always`. The browser's print-to-PDF produces the file the printer needs. A future enhancement: server-side render with Puppeteer + @page rules to skip the browser print dialog.

## Template editor (phase 2)

Out of scope for v1. v1 ships with the default template hard-coded as data. Phase 2 adds a drag-and-drop builder where admins can:
- Add or remove pages
- Drag blocks from the library onto a page
- Resize blocks by dragging grid handles
- Edit each block's field schema
- Save as chapter-specific template

## Migration path

1. Build the block renderer alongside the existing renderer.
2. Add a feature flag (`?modular=1` query param) to swap renderers.
3. Verify modular output matches the PDF for the supplied chapter.
4. Cut over the default editor to the modular renderer.
5. Remove the old absolute-positioned code in a follow-up.

## File layout

```
docs/
  index.html                 # main app (will grow modestly)
  ARCHITECTURE.md            # this doc
  templates/
    default.json             # default 4-page template
  blocks/                    # one file per block type, optional
```

For v1, all block code stays inline in `index.html` to avoid splitting the build pipeline. We can extract later.
