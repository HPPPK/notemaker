# Reading workflow review

The first external examples exposed a content-selection failure: a course-introduction deck was treated as a knowledge lesson, and a guidance article was used as the only paper-reading example. More topics and longer paragraphs did not fix that evaluation gap.

The revised skill separates course learning from paper analysis and uses reader questions to select content before source coverage is counted. Research-paper notes explain motivation, contribution, mechanism, essential mathematics and evidence. Course notes prioritize concepts, original teaching visuals and worked problems; logistics are secondary unless requested.

## External workflows inspected

These are references for workflow comparison, not bundled dependencies or copied templates:

- [xy-lo/paper-reading-skill](https://github.com/xy-lo/paper-reading-skill/blob/main/SKILL.md): read its entrypoint, report template and figure/evidence rules. Useful emphasis: a connected argument and visual explanations tied to findings.
- [Ro0k1es/paper-reader-skills](https://github.com/Ro0k1es/paper-reader-skills/blob/main/SKILL.md): read its entrypoint and reading-note template. Useful emphasis: locate actual figure pages, preserve complete panels, and verify crops visually. Its domain-specific project requirements are not imported into this general skill.
- [v0lka/skills study-paper](https://github.com/v0lka/skills/blob/main/research/study-paper/SKILL.md): read its entrypoint. Useful emphasis: distinguish author claims from evidence and the reader's assessment; adapt reading depth to purpose.

Notemaker retains its own generic HTML information architecture, editable cells and bound-file saving. Its new paper/course references are independently written for this task rather than a verbatim integration of another skill.

## Evaluation and limits

Local evaluation adds an empirical methods paper (Dropout, JMLR 2014) and technical teaching slides (MIT 18.05 Class 26, linear regression). The producing model reviews source text and original visual pages before writing. Generated notes distinguish original figures/results from added calculations, explanations and solutions. Numerical exercises are checked with computation; reported model benchmarks are not reproduced.

The public test suite checks renderer and persistence behavior using fictional material. Local-only cases additionally check selected source details, image loading, math/case content, and preservation after actual source-file Save. These checks do not establish independent scientific correctness or reader comprehension; content still needs source-grounded review. Raw external sources and transformed local notes are not redistributed with the repository.
