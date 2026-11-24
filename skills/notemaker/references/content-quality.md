# Content quality: source coverage before presentation polish

A working editor, long introduction, or passing browser test does not establish note quality. The main subsections must do the substantive work. Do not replace source information with a tutorial about how to take notes.

## Author from a source-to-content map

Before drafting, identify the actual units that matter: slide/page ranges, agenda issues with their discussion, or the paper's arguments/rules/experiments. Map each to a topic, or record why it is intentionally omitted, only listed on an agenda, or unread. Title/credits slides may share one metadata topic; an agenda item with no discussion must remain explicitly unrecorded. Do not fabricate completion to make coverage look neat.

Keep source-grounded detail in body subsections: relevant definitions, concrete claims, reasons/evidence, examples, status and qualifications. Use the introduction to orient the reader and the conclusion to integrate that body. They should not carry more substance than the body while repeating generic warnings.

## Generate, then evaluate the skill's output

When improving this skill, update and validate the skill first. Apply that revised workflow to the raw material and produce a separate new model/HTML; retain the previous output as a baseline. Do not quietly hand-polish the baseline and attribute those edits to a better generator.

1. Read the source, identify important units and unread parts, and plan topic IDs with a coverage map.
2. Draft the main content from those units first: what the material actually says, its reasons/evidence, and its qualifications. Add explanatory examples only with explicit attribution as note-author additions.
3. Write the opening and closing around that developed content. Remove generic note-taking advice unless that is itself the material's subject.
4. Run the distribution/coverage diagnostic and inspect representative body topics against the source. Record substantive defects, not just UI failures or text length.
5. If review fails, revise the reusable instruction responsible and regenerate the affected material from its source. Keep the new output and review evidence identifiable. Do not call a hand-edit to the old note a successful skill evaluation.

Use different source types to check transfer: source-specific detail, traceability, status fidelity and explanation should improve without forcing every case into the same outline. Local source cases need not be publicly redistributed to publish the reusable skill changes.

## Adapt the review to the source

- **Slides:** retain learning objectives, actual concepts, specific requirements where stated, and the relationship between slides. Explain compressed bullets. Attribute added worked examples; do not call them slide content. Retain historical dates and metadata discrepancies. Disclose image-only or visually unreviewed content.
- **Meetings:** for each material issue, preserve what was asked, who responded when recorded, the reasoning and disagreement, exact status, and follow-up. Separate proposer from assigned owner. A suggestion, intention, agreement and completed action are different. Do not turn agenda headings into invented discussions, assign unstated dates, or treat historical statuses as current.
- **Papers:** identify the paper type. Explain the actual contributions/arguments and evidence at useful granularity. A ten-rule article should account for all ten rules rather than hide them in broad categories; an experimental paper needs its actual method, setup, baselines and limitations rather than a forced ten-rule template. Separate author statements, note-author interpretation and invented illustrative examples. Never invent metrics or experiments.

## Check substance, then interface

Read representative body subsections against the material, not just the home page. Can a reader recover the actual issues, claims or procedures without reopening every source? Are the important distinctions preserved? Does a summary connect content that was genuinely developed? Are tables specific enough to retrieve information, rather than repeating “待确认” without explaining what is uncertain?

`scripts/audit_note.py` reports body versus framing text and checks an optional source-coverage map. It is a diagnostic, not a quality score: adequate text length and complete links cannot prove factual fidelity or explanatory clarity. Use its warnings to direct review; do not pad content merely to silence them.

Coverage-map example:

```json
{"units":[
  {"source":"source-1","location":"slides 2–3","status":"covered","topics":["course-goals","project"]},
  {"source":"source-1","location":"slide 4 image","status":"unread","reason":"Only slide text was extracted; image not visually checked."}
]}
```

Allowed statuses: covered, intentional-omission, agenda-only, unread. Covered units must reference existing topic IDs. Other statuses require a reason. Store coverage maps for actual materials locally unless publication is authorized. Deliver concise findings and meaningful limits; never label functional tests as editorial validation.
