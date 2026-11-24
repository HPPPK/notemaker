# Local persistence contract

## Native picker

Feature-detect `window.showSaveFilePicker` and `window.isSecureContext`; do not guess from OS or user-agent. The API has limited browser availability. HTTPS/localhost or trustworthy local contexts may expose it, but support must be checked at runtime. Request a target only from a click/keyboard user gesture. The page cannot silently know or overwrite its own file path.

First Save / Save As opens the picker. Later Save in the same tab may reuse that handle. Reloading does not persist it. `createWritable()` obtains the stream, `write()` transfers the complete HTML, and `close()` commits. Only then mark clean. On failure/cancel: preserve the draft and dirty flag; display the reason without exposing private paths; do not silently fall back to a different target.

## Download fallback

Create an HTML Blob, an object URL, and an explicit anchor download with a useful `.html` filename. Revoke the object URL after enough time for the browser to begin handling it. This exports an actual file, but the page cannot know if the user cancelled the download, where it landed, or whether an existing file was overwritten. Say “HTML download requested; reopen the downloaded file to verify.” Keep the current tab dirty until a verified native save or user cancellation of edits. Never show a fake “saved” toast.

Users of browsers without a picker (including many Safari/Firefox configurations) can save a new HTML and, using the browser/filesystem, replace an old file themselves. If **all browsers must directly overwrite the same path**, a user-authorized local application/server is required; a standalone HTML alone cannot guarantee that. Do not add a local daemon without discussing that change in scope.

## Serialization

The exported HTML embeds a `script type="application/json" id="notemaker-data"` model, CSS, runtime, images and optional reviewed widgets. Escape `<` in embedded JSON so `</script>` in notes/code cannot terminate the data element. Do not serialize a stale template or editable DOM alone. Remove transient content/navigation/dialogs from the document clone; on reopen the canonical model renders afresh, retaining all sections/topics and the ability to edit/save again. Cancel restores the pre-edit model and appearance.

## Required checks

Native success, rejection before file choice, permission denial, failure during write/close, repeated saves, Save As, saving while editing, and download fallback. Test a real download, inspect bytes on disk, reopen it, verify modified text/images/code/settings plus offline behavior. Mocked file handles are appropriate for error-path tests but do not prove a real OS picker was tested. Closing with unsaved changes must trigger a warning when the browser allows one.

References verified during implementation:

- [MDN: showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker)
- [MDN: createWritable](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemFileHandle/createWritable) — changes are reflected after close.
- [MDN: download](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download) — proposed filename is not download-completion evidence.
