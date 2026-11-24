# Paper reading: explain the contribution and test its evidence

Use with the shared HTML schema and section opening/closing structure. Match depth to the request; a substantial technical reading note should let the reader explain the contribution without guessing how the method works. Do not impose an experimental template on a theoretical, survey, or guidance paper. Do not choose an essay with no technical evaluation as the sole test of research-paper reading.

## Read before outlining

Identify the exact version and document type. Read the full available text; inspect the original pages containing the important figures, tables, algorithms and equations. Make a local evidence inventory containing source location, what question each item answers, and whether its pixels/math were actually checked. Inspect appendices when the main claims depend on them. Unavailable material narrows the delivered scope.

Find the central dependency: what unsolved difficulty motivates which change, and what evidence could establish that the change helps? Use that reasoning to select sections rather than mechanically converting the source table of contents. Brief metadata belongs near the source link, not in repeated content pages.

## Develop the explanation

For an empirical methods paper, the reader should be able to answer:

- **Need:** What concrete task is difficult? What does an existing approach do, and where does it fail or cost too much?
- **Contribution:** What changes? Distinguish the authors' novelty claim from established components and from independently verified novelty. State the comparison explicitly.
- **Mechanism:** Trace an example from input through the critical operations to output. Explain why those operations address the difficulty. A list of module names is insufficient.
- **Mathematics:** Preserve load-bearing formulas, notation and assumptions with exact locators. Define symbols and units/dimensions as needed, then translate the operation into plain language. Work through a small numerical example when it resolves a likely misunderstanding; label added calculations as the note author's. Explain what a formula does not imply. Do not add unrelated formulas to satisfy a quota.
- **Evidence:** Explain the task/data/split, relevant baseline, metric direction and comparison conditions before interpreting a result. Include representative numerical findings, mechanism tests/ablations and important negative results. Keep percentage points distinct from relative percent change. A whole system's benchmark win is not proof that one component caused all of it.
- **Judgment:** Connect the central claims to the strongest evidence and the remaining gaps. Separate reported findings, author explanations/hypotheses, and the note author's critique. Specific failure cases or missing controls are more useful than generic caution.

## Make the visuals part of the reasoning

Embed the source's useful method illustration and evidence chart/table when present. Preserve figure/table numbers, panel labels, axis units, legend, caption meaning and page location. Choose a complete readable crop or full page after visual inspection; do not mistake an in-text figure mention for its actual image. Each visual needs a nearby reading guide: where to look, what is compared, what pattern/number matters, and which claim it supports.

If an explanatory diagram is newly drawn, label it as such and keep the original evidence separate. Do not generate lookalike experimental data. For dense tables, a checked subset can accompany the original; label selected rows and retain conditions/footnotes. For offline math, use readable Unicode/escaped formulas or an embedded rendered equation plus editable textual notation; do not require an online math CDN.

Lack of figures/formulas can be legitimate, but verify it from the actual source. Do not invent them, and do not use absence in a guidance article to excuse ignoring them in a methods paper. A text-only extraction cannot establish absence.

## Review the generated note

Walk through the actual body as a reader. Can you state what is new relative to what, execute one example, read the central equation, and check a result against its original figure/table? Do introductions prepare those questions and closing summaries integrate their answers? If not, revise the reusable workflow and regenerate the source-based note. Visual counts, word counts and structural tests are diagnostics, not comprehension or fidelity scores.
