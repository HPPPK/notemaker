# Save the current source without a location picker

Edit unlocks notebook cells; Save writes the currently bound HTML. Export is a separately labelled copy operation. A file:// document cannot silently overwrite its own path in every browser, so provide a paired launcher and local runtime rather than promising unsupported HTML permissions.

```sh
python scripts/serve_note.py note.html --create-launchers
python scripts/serve_note.py note.html
```

The first command creates Windows .cmd and macOS/Linux .command launchers beside the note, with sibling _notemaker_runtime/ containing the Python runtime and assets. The second starts directly. Python 3.10+ is required; Node, cloud accounts, and API keys are not. Move the HTML, launcher, and runtime folder together to preserve their relative binding.

## In-place protocol

- Bind only 127.0.0.1 and exactly one resolved source HTML. Use a random capability path per process; no directory browsing or arbitrary-path write endpoint.
- Inject a session descriptor into the served response, never the file on disk: bound filename, endpoint, token, SHA-256 of the exact bytes served. Saved/exported HTML must not retain session secrets.
- Require correct Host, same Origin, session token, JSON content type, a bounded request size, and a valid model. Regenerate HTML using trusted assets, not a client-supplied executable wrapper. Saving requires embedded images; do not read arbitrary client-supplied asset paths.
- Compare the supplied revision with current source bytes. Conflicting tabs/external edits retain their drafts instead of overwriting newer work.
- Back up the original to .notemaker-backups/NOTE_STEM/. Write and fsync a temporary file in the same directory, preserve permissions, recheck the original, atomically replace, and verify persisted bytes. Remove failed temporary files.
- Only a successful response clears dirty state. Freeze editing while saving. Network/model/I/O failures and conflicts preserve the draft. Backups support recovery; they do not resolve an active conflict.

## Standalone reading / explicit export

HTML stays self-contained for offline reading and cell editing. In file:// mode Save explains that its launcher is needed; it does not open a picker or silently download. Export explicitly serializes cells, settings, sources, code and embedded images, strips session/editor DOM, and requests an HTML download. Report the request honestly and retain the current unsaved warning because completion cannot be reliably observed.

## Validation

Test actual temporary files and actual local HTTP requests: same path changes, backup equals original, refreshed/reopened edits persist, repeated saves succeed, conflicts do not overwrite, wrong origin/token/Host is rejected, and simulated atomic replace failure leaves the original intact. Include real exported-file checks. Mock browser file handles do not validate this workflow. Record platforms actually tested; portable launchers are not evidence of macOS testing.
