# Content and schema

The entry page introduces the **big topic**: why it matters, what the collection covers, and a map. Each major section follows **introduction → content subsections → final summary subsection**. Do not merge a section's conclusions into its introduction or start on its first detail page. A note-wide synthesis also appears at the end, not above the content map.

The renderer uses section `intro` on its opening page and section `summary` on a dedicated closing page, placed last in that section's navigation. Summaries are derived pages, not duplicated entries in `topics`. Their routes are `#summary:SECTION_ID`; the final note-wide summary is `#summary:home`. Only edit a summary on its own closing page. Adding a topic keeps it before that section's closing summary. Existing JSON models remain compatible.

This structure is independent of the subject. Use module names for a course, agenda subjects for a meeting, themes/questions for papers, etc. Day labels belong only in material actually organized by days. Summaries should synthesize source-grounded results and unresolved issues relevant to that domain.

## Source-specific organization

| Material | Useful hierarchy | Evidence to retain |
| --- | --- | --- |
| Course/slides | course → module → concept/example | slide/page, definitions, worked examples, prerequisites |
| Meeting | purpose → agenda → discussion/decisions/actions | transcript timestamps, speakers where known, owner/date only if stated |
| Papers | question → approach → evidence → limitations | title/DOI/link/page/figure, measured results vs author's claims |
| Search findings | question → findings → comparison → gaps | direct source URLs, retrieval date if relevant, contradictions |
| Model-authored material | introduction → supported detail → synthesis | explicitly mark model synthesis; no invented citations |

Use figures for a mechanism, numerical comparison, timeline, or relation that benefits from one. Label axes/units/legends; explain what readers should compare. Avoid arbitrary diagrams attached to every paragraph.

## JSON models v1/v2

```json
{
  "version": 1,
  "title": "Collection title",
  "subtitle": "Scope / audience",
  "intro": "A real introduction to the overall topic.",
  "summary": "A substantive overview of the main conclusions and uncertainties.",
  "settings": {"theme": "light", "accent": "olive", "fontScale": 1},
  "sections": [{"id":"module-1","title":"Major topic","intro":"Context and purpose.","summary":"What the subsections establish."}],
  "topics": [{"id":"topic-1","section":"module-1","title":"Subtopic","intro":"Question this page answers.","body":"<h2>Explanation</h2><p>Safe, grounded HTML.</p>","sources":["source-1"]}],
  "sources": [{"id":"source-1","label":"Source title · p. 4","url":"https://example.org/source","kind":"provided material"}]
}
```

IDs must be unique and URL-safe. Generated introductions/summaries must contain substantive content. A body uses semantic HTML: h2–h4, p, lists, tables, blockquote, pre/code, figure/img/figcaption, details/summary, safe links. No scripts, event attributes, forms, iframes, remote images, or arbitrary inline CSS. Do not accept HTML from retrieved sources without reviewing and sanitizing it.

Version 2 adds editable cells. A topic may use `cells` instead of `body`; a section or the whole note may provide `introCells` and `summaryCells`. Each cell has a unique `id`, `type` (`html` or `code`), and string `source`. HTML cells are sanitized and visually editable; code cells use text editors and never execute. If cells are absent, the runtime converts legacy body HTML or intro/summary paragraphs into cells. Save retains cell order/content; intro/summary strings remain as searchable indexes. A user may intentionally clear every cell; generation quality requirements do not prohibit saving an empty draft.

For complex sections, use several substantive paragraphs rather than a slogan. Intros explain the problem and route through the material; summaries integrate results/decisions, compare distinctions, and retain limitations. Shorter is appropriate only when the material itself is narrow. Character counts can detect placeholder-like output in regression tests, but are not evidence of quality: review the substance.

For embedded figures use `<img src="asset:figures/example.png" alt="What the chart shows">`; the builder resolves paths relative to the model JSON, embeds the bytes, and verifies the image signature matches an allowed raster MIME type. Or supply an already embedded raster data URL. Add a figcaption explaining source and interpretation. New local images selected by users are embedded in the saved file.

Optional `widgets` enables the bundled `lag`, `frequency`, or `overlap` classroom demonstrations through `data-lab` markup. These are optional examples, not a required structure for general notes. Inspect assets/widgets.js and example material before using them. Runtime control values need not be treated as measured results.

The renderer uses a strict allowlist and escapes user/source text. Model validation is structural, not fact checking. The producing model remains responsible for evidence, faithful extraction, and explanatory quality.
