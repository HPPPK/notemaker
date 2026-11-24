# Content and schema

The entry page is a synthesis of the **big topic**: why it matters, what the collection covers, main conclusions, limits, and a map. Section landing pages introduce and summarize each major topic before presenting its subtopics. Do not start on the first detail page.

## Source-specific organization

| Material | Useful hierarchy | Evidence to retain |
| --- | --- | --- |
| Course/slides | course → module → concept/example | slide/page, definitions, worked examples, prerequisites |
| Meeting | purpose → agenda → discussion/decisions/actions | transcript timestamps, speakers where known, owner/date only if stated |
| Papers | question → approach → evidence → limitations | title/DOI/link/page/figure, measured results vs author's claims |
| Search findings | question → findings → comparison → gaps | direct source URLs, retrieval date if relevant, contradictions |
| Model summary | scope → synthesis → supporting detail | explicitly mark model synthesis; no invented citations |

Use figures for a mechanism, numerical comparison, timeline, or relation that benefits from one. Label axes/units/legends; explain what readers should compare. Avoid arbitrary diagrams attached to every paragraph.

## JSON model v1

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

IDs must be unique and URL-safe. Introductions/summaries must be nonempty. A body uses semantic HTML: h2–h4, p, lists, tables, blockquote, pre/code, figure/img/figcaption, details/summary, safe links. No scripts, event attributes, forms, iframes, remote images, or arbitrary inline CSS. Do not accept HTML from retrieved sources without reviewing and sanitizing it.

For embedded figures use `<img src="asset:figures/example.png" alt="What the chart shows">`; the builder resolves paths relative to the model JSON, embeds the bytes, and verifies the image signature matches an allowed raster MIME type. Or supply an already embedded raster data URL. Add a figcaption explaining source and interpretation. New local images selected by users are embedded in the saved file.

Optional `widgets` enables the bundled `lag`, `frequency`, or `overlap` classroom demonstrations through `data-lab` markup. These are optional examples, not a required structure for general notes. Inspect assets/widgets.js and example material before using them. Runtime control values need not be treated as measured results.

The renderer uses a strict allowlist and escapes user/source text. Model validation is structural, not fact checking. The producing model remains responsible for evidence, faithful extraction, and explanatory quality.
