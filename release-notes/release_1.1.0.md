# Change log

## New features

- Support for @string macros in BibTeX files (fixes #2)
- Bookmark resolver binary is now signed with Developer ID and hardened runtime

## Bug fixes

- Support citation insertion in canvas cards (fixes #1)
- Make @comment case-insensitive in BibTeX parser to support JabRef (fixes #3)
- Wrap citation title in smart quotes
- Fix bug when opening bib entry with multiple attached files — the modal dialog now starts with an empty string, allowing the user to choose which file to open
- Narrow esbuild fsevents resolve filter to avoid intercepting other imports

## Improvements

- Upgrade TypeScript 4.7 → 5.8 and modernize dev dependencies
