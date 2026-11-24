# Notemaker

**[中文](README.md) · [English](README.en.md)**

Turn source material into visual notes that explain the big picture before the details. Open offline, edit directly, and explicitly save a complete HTML file to your computer.

Notemaker is an installable AI skill with a small, framework-free HTML generator. Inputs may include documents, slide decks, courses, meeting transcripts, papers, user notes, search results, or model-written summaries. Its structure adapts to the material rather than imposing a research curriculum.

![Notemaker demo](docs/demo-preview.png)

## What it produces

- An **overall introduction and content map first**, with the note-wide synthesis at the end.
- Every major section follows **introduction → content subsections → a final summary subsection**. Introductions establish context/scope/questions; closing summaries connect the material, conclusions, and open issues.
- Sections may represent course modules, meeting agenda items, literature themes, or project areas. Names and summary content adapt to the sources; Day labels are only one possible example.
- Section/topic navigation, search, zoomable figures, code, tables, printing, and a mobile directory.
- Source labels and a distinction between source facts, model synthesis, and unresolved questions.
- Edit mode for titles, introductions, summaries, body text, code, captions, new sections/topics, embedded local images, theme, accent color, and font size.
- One self-contained HTML with embedded data, images, CSS, and JavaScript. Reading/editing requires no server, account, CDN, or network.

## Where does Save actually write?

**Browser storage and a success toast are not file persistence.**

| Available capability | Save behavior |
| --- | --- |
| Supported and permitted file picker API | Choose a target file on the first save. Mark saved only after write and close complete. Subsequent saves in the same session can reuse that handle; reopening requires choosing again. |
| No file picker API | Download a new, complete edited HTML. The UI reports “download requested; reopen to verify,” never “original overwritten.” |
| Cancelled picker, denied permission, failed write/close | Preserve the draft and unsaved state. Retry or explicitly export a copy. |

A standalone HTML cannot overwrite its own path automatically in every browser. Safari/Firefox configurations without the picker can still export a complete HTML; users can replace the old file themselves. There is no automatic saving. Cancel discards the current editing session. Because the page cannot observe download completion reliably, an exported copy does not clear its unsaved warning.

## Install the skill

Copy `skills/notemaker/` into `~/.codex/skills/notemaker/`, or use your AI client's GitHub skill installer with this repository and subdirectory.

Example requests:

> Use $notemaker to turn this slide deck and my course notes into visual HTML. Introduce each module, develop its examples, and finish with a dedicated summary subsection. Preserve sources and let me edit and save locally.

> Use $notemaker for these meeting notes. Separate discussion, decisions, action items, and unresolved questions. Do not invent owners or dates.

> Use $notemaker to synthesize these papers and your search findings. Organize around questions, methods, evidence, and limitations; label model inferences.

## Generator and demo

Only Python 3.10+ and its standard library are needed to build. Node is only for development tests.

```sh
python skills/notemaker/scripts/build_note.py examples/general-note.json --output examples/general-note.html
```

Open `examples/general-note.html`. All course/meeting/literature examples are fictional; no private user material is published.

The AI using the skill reads sources and authors a grounded model according to the [schema](skills/notemaker/references/content-and-schema.md). The generator packages that model; it does not itself parse slides, search the web, or call an AI API.

To continue from a file edited and saved in the browser:

```sh
python skills/notemaker/scripts/build_note.py edited-note.html --extract recovered.json
```

Recover the latest embedded model instead of rebuilding an old JSON and overwriting user edits. Local raster images referenced by `asset:relative/path` are embedded at build time. Numerical figures must come from actual plotting/data rather than generative redraws.

## Development and checks

```sh
npm ci
npx playwright install chromium
npm test
```

Tests cover real HTML downloads and reopening, images/code/settings, edit/cancel, search, section summaries, mobile navigation, and simulated file handles for success/cancellation/write or close failure/repeated saves. Simulated handles are not evidence that a real OS picker or macOS/Safari was tested. Source HTML passes a runtime allowlist; scripts, event handlers, unsafe URLs, and remote images are removed.

Structure: `skills/notemaker/SKILL.md` for the workflow, `references/` for content and saving contracts, `scripts/build_note.py` for build/extraction, `assets/` for the offline editor, `examples/` for fictional notes, and `tests/` for behavioral checks.

API references: [showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker), [createWritable](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable), [download](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download).
