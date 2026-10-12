# Manual checks

Posture can't be scripted in the Simulator, so every release is checked by hand on the iPhone Duo Simulator (Xcode 27.1) before it's tagged. The release workflow refuses to publish `vX.Y.Z` unless `docs/manual-checks/vX.Y.Z.md` is committed and has no unchecked items.

## Format

- One file per release: `docs/manual-checks/vX.Y.Z.md`, copied from [`TEMPLATE.md`](TEMPLATE.md).
- Every check is a Markdown task item. `- [x]` means it passed. A remaining `- [ ]` blocks the release. If a check doesn't apply, tick it and say why in the notes.
- Screenshots go in `docs/manual-checks/vX.Y.Z/` and are linked from the results table. They double as doc images.
- The results table has one dated row per run (example Host, Safari).

## Running a release check

```sh
cp docs/manual-checks/TEMPLATE.md docs/manual-checks/vX.Y.Z.md   # then fill it in
UDID=…   # select the iPhone Duo by id, not name (see README)
xcrun simctl io "$UDID" screenshot --display=primary   docs/manual-checks/vX.Y.Z/outer-split.png
xcrun simctl io "$UDID" screenshot --display=primary-1 docs/manual-checks/vX.Y.Z/inner-book-split.png
pnpm release:check vX.Y.Z   # the same gate the release workflow runs
```

`--display=primary` is the outer display (466×678 pt); `--display=primary-1` is the inner display (669×951 pt). Set Posture by hand in Device Hub (Xcode 27.1 → Open Developer Tool).
