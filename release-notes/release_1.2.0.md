# Release notes

## New features

- A new **Bookmark Resolver** section is now available in the plugin settings (macOS only), giving you direct control over how PDF links from your BibDesk library are opened. You can switch between the default AppleScript-based resolver — which you can inspect at any time in Script Editor for full transparency — and a faster compiled binary.
- The first time you open a PDF using the default AppleScript resolver, a notice appears explaining the trade-offs and offering to take you straight to the relevant settings.

## Improvements under the hood

- The bookmark resolver script now reports its own version, making automatic updates more reliable and consistent with how the compiled binary is already managed.

## Bug fixes

- The notice offering to silence future resolver alerts now takes you to the Settings page rather than suppressing the alert silently, ensuring you stay in control of your configuration.
