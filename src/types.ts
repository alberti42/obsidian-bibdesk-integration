// types.ts
//
// Central type definitions for the obsidian-bibdesk-integration plugin.
// These types flow through three main pipelines:
//
// 1. BibTeX parsing pipeline:
//    Raw .bib text -> ParserWorkerInput -> Web Worker (Peggy parser)
//    -> WorkerReply (containing ParserWorkerOutput = BibTeXEntry[])
//    -> BibtexManager reduces into BibTeXDict (keyed by citekey)
//
// 2. PDF resolution pipeline:
//    x-bdsk:// URL -> ParsedUri -> BibTeXEntry.fields["bdsk-file-N"]
//    -> Bookmark (via binary plist) -> bookmark_resolver binary -> filepath
//    -> ParsedPath -> ParsedPathWithIndex (preserves bdsk-file index)
//
// 3. Citation formatting pipeline:
//    BibTeXEntry.authors (ParsedAuthors) + AuthorFormatOptions -> formatted author string
//    BibTeXEntry.fields + JournalReferenceOptions -> formatted journal reference

import { HotkeysSettingTab } from "obsidian";

/* ──────────────────────────────────────────────
 * Peggy parser source-location types
 * ──────────────────────────────────────────────
 * Mirror the Location/Position shape produced by Peggy's SyntaxError.
 * Used in bibtex_parser.worker.ts to extract line/column information
 * from parse errors so the worker can construct human-readable
 * diagnostics pointing to the offending lines in the .bib file.
 */

export interface Location {
    start: Position;
    end: Position;
}

export interface Position {
    offset: number;
    line: number;
    column: number;
}

/* ──────────────────────────────────────────────
 * Core bibliography data model
 * ──────────────────────────────────────────────
 * These types represent the parsed BibTeX data that the entire plugin
 * operates on. The Peggy grammar parser (running in a Web Worker)
 * produces BibTeXEntry[] arrays, which BibtexManager reduces into
 * a BibTeXDict for O(1) lookups by citekey. All fuzzy modals
 * (citekeyFuzzyModal.ts) use BibTeXEntry as their generic item type.
 */

// The primary in-memory bibliography store, keyed by citekey.
// Populated in BibtexManager.parseBibtexData() from the flat
// BibTeXEntry[] array returned by the parser worker.
export interface BibTeXDict {
    [key: string]: BibTeXEntry;
}

// Represents a single bibliography entry. This is the most widely used
// type in the codebase — it flows through parsing, storage, UI display,
// citation formatting, and PDF resolution:
//   - bibtex_parser.worker.ts: produced by the Peggy grammar parser
//   - bibtex_manager.ts: stored in BibTeXDict, accessed for formatting
//   - citekeyFuzzyModal.ts: displayed in fuzzy search modals, used to
//     open PDFs, insert citations, or insert citekeys
//   - utils.ts: fields["bdsk-file-N"] read for bookmark resolution
export interface BibTeXEntry {
    citekey: string;                       // e.g., "Einstein:1935"
    type: string;                          // e.g., "article", "book", "inproceedings"
    authors: ParsedAuthors;                // Pre-parsed by the grammar into first/last pairs
    fields: {[key: string]: string};       // All BibTeX fields (title, year, journal, bdsk-file-1, etc.)
}

/* ──────────────────────────────────────────────
 * Author types
 * ──────────────────────────────────────────────
 * The Peggy grammar decomposes the "author" BibTeX field (splitting
 * on "and") into structured first/last name pairs at parse time, so
 * downstream code (BibtexManager.getFormattedAuthors) can directly
 * format them without re-parsing raw author strings.
 */

// A single author's name, split into first name (or initials) and last name.
export type ParsedAuthor = {first:string, last:string}

// Ordered list of authors for a single BibTeX entry.
export type ParsedAuthors = ParsedAuthor[];

// Dictionary mapping citekeys to their parsed author lists.
// Defined for potential external use; the active codebase stores
// authors directly inside each BibTeXEntry.authors field.
export interface ParsedAuthorsDict {
    [key:string]: ParsedAuthors;
}

/* ──────────────────────────────────────────────
 * Plugin settings
 * ──────────────────────────────────────────────
 * The single source of truth for all user-configurable plugin behavior.
 * Serialized/deserialized by Obsidian's loadData()/saveData().
 *
 * Read by:
 *   - main.ts: plugin initialization, settings tab UI, file watcher setup
 *   - bibtex_manager.ts: getParserOptions() reads debug_parser
 *   - citekeyFuzzyModal.ts: reads pdf_folder and organize_by_years
 *     to determine where PDF++ placeholder files are placed
 *
 * Defaults defined in defaults.ts as DEFAULT_SETTINGS.
 */
export interface BibtexIntegrationSettings {
    bibtex_filepath: string;       // Absolute path to the .bib file
    import_delay_ms: number;       // Delay (ms) before initial parse on plugin load
    debug_parser: boolean;         // Enable verbose Peggy parser logging to console
    pdf_folder: string;            // Vault-relative folder for PDF++ placeholder files
    use_demo_entries: boolean,     // Show demo BibTeX entries when no .bib file is configured
    organize_by_years: boolean;    // Create year-based subfolders within pdf_folder
    use_native_binary: boolean;    // false = AppleScript resolver (default), true = Swift binary
    suppress_resolver_nag: boolean; // suppress the per-resolution AppleScript performance notice
}

/* ──────────────────────────────────────────────
 * macOS bookmark resolution types
 * ──────────────────────────────────────────────
 * BibDesk stores file attachments as macOS security-scoped bookmarks
 * in base64-encoded binary plist data within bdsk-file-N fields.
 * These types support the resolution pipeline:
 *   bdsk-file-N field (base64) -> binary plist -> Bookmark -> bookmark_resolver binary -> filepath
 *
 * Used in utils.ts: resolveBookmark() decodes the plist and uses
 * isBookmark() to validate the payload before passing the bookmark
 * Buffer to the native bookmark_resolver Swift binary.
 */

// Typed representation of the parsed binary plist payload from a
// BibDesk bdsk-file-N field. Contains the raw macOS bookmark data.
export interface Bookmark {
    bookmark: Buffer;
}

// Type guard that validates whether a parsed plist object contains
// the expected "bookmark" key, enabling safe extraction of the
// bookmark Buffer for the native resolver.
export function isBookmark(obj:unknown): obj is Bookmark {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    if(obj.hasOwnProperty('bookmark')) {
        return true;
    } else {
        return false;
    }
}

/* ──────────────────────────────────────────────
 * File path types
 * ──────────────────────────────────────────────
 * Structured decomposition of filesystem paths, used after resolving
 * macOS bookmarks to actual file locations.
 *
 * Used in:
 *   - utils.ts: parseFilePath() produces ParsedPath from a path string
 *   - citekeyFuzzyModal.ts: OpenPdfFuzzyModal.openDocumentForBibEntry()
 *     resolves all bdsk-file-N fields into ParsedPathWithIndex[], filters
 *     by .pdf extension, then either opens directly or shows PdfFileFuzzyModal
 *     for multi-PDF entries
 *   - main.ts: settings tab validates .bib file extension via parseFilePath()
 */

// List of resolved file paths with their original bdsk-file-N indices.
export type ParsedPaths = ParsedPathWithIndex[];

// Pairs a parsed path with its original bdsk-file-N index (0-based).
// The index is used to generate the correct "doc=N" query parameter
// in x-bdsk:// URLs written into PDF++ placeholder files, so the
// right attachment is opened when the user clicks a PDF link.
export type ParsedPathWithIndex = {index:number, parsedPath:ParsedPath};

// Structured decomposition of a filesystem path into its components.
export interface ParsedPath {
    dir: string,       // Directory portion (e.g., "/Users/foo/papers")
    base: string,      // Full filename with extension (e.g., "paper.pdf")
    filename: string,  // Filename without extension (e.g., "paper")
    ext: string,       // Extension including dot (e.g., ".pdf")
    path: string       // Full original path
}

/* ──────────────────────────────────────────────
 * URI parsing types
 * ──────────────────────────────────────────────
 * Used to parse x-bdsk:// custom URIs that BibDesk uses for linking
 * to bibliography entries and their attachments. For example:
 *   "x-bdsk://Einstein:1935?doc=2"
 *   -> { scheme: "x-bdsk", address: "Einstein:1935", queries: { doc: "2" } }
 *
 * Produced by parseUri() in utils.ts. Consumed by
 * BibtexManager.getPdfUrlFromUrl() which destructures the result
 * and calls getPdfUrlFromBibDeskUri(address, queries) to resolve
 * the correct bdsk-file-N field from the matching BibTeXEntry.
 */

export interface ParsedUri {
    scheme: string;      // URI scheme (e.g., "x-bdsk", "file")
    address: string;     // Path/authority portion (e.g., the citekey)
    queries: Queries;    // Parsed query parameters
}

// URL query parameters as key-value pairs. Values are null for
// bare keys without "=value" (e.g., "?flag" -> { flag: null }).
export interface Queries {
    [key: string]: string|null;
}

/* ──────────────────────────────────────────────
 * Citation formatting options
 * ──────────────────────────────────────────────
 * Control how author names and journal references are formatted
 * for display in fuzzy modals and when inserting citations into
 * the editor. Different contexts use different option combinations:
 *
 *   - Fuzzy modal item text (search scoring): FirstAndLastAuthor
 *   - Fuzzy modal display: JustFirstAuthor + includeEtAl
 *   - Inserted citation: AllAuthors or JustFirstAuthor
 *   - Modal journal ref: HighlightType.None
 *   - Inserted journal ref: HighlightType.MarkDown
 *
 * Consumed by BibtexManager.getFormattedAuthors() and
 * BibtexManager.getFormattedJournalReference().
 * Defaults defined in defaults.ts.
 */

// Controls which authors are shown and how they are formatted.
export interface AuthorFormatOptions {
    formatType: FormatType,              // Which subset of authors to include
    onlyLastName: boolean,               // Show "Einstein" vs "A. Einstein"
    includeEtAl: boolean,               // Append "et al." when authors are truncated
    precedeLastAuthorsByAnd: boolean,    // Use "A, B, and C" vs "A, B, C"
}

// Selects which authors from the list to include in the formatted output.
export enum FormatType {
    AllAuthors,            // Show every author
    JustFirstAuthor,       // Show only the first author
    JustLastAuthor,        // Show only the last author
    FirstAndLastAuthor,    // Show first and last, omitting middle authors
}

// Controls how the journal volume number is visually emphasized,
// depending on the target rendering context.
export enum HighlightType {
    HTML,       // Wraps volume in <strong>...</strong> (for HTML widgets)
    MarkDown,   // Wraps volume in **...** (for Markdown editor insertion)
    None,       // No emphasis (for plain text display, e.g., fuzzy modal)
}

// Controls journal reference formatting (year inclusion, volume emphasis).
export interface JournalReferenceOptions {
    includingYear: boolean,              // Whether to append the publication year
    highlightVolume: HighlightType,      // How to emphasize the volume number
}

/* ──────────────────────────────────────────────
 * Web Worker message protocol
 * ──────────────────────────────────────────────
 * Types for the postMessage/onmessage boundary between the main
 * thread and the BibTeX parser Web Worker. The parsing runs off
 * the main thread to avoid blocking the Obsidian UI.
 *
 * Message flow:
 *   Main thread (BibtexManager via WorkerManager)
 *     -- postMessage(ParserWorkerInput) -->
 *   Web Worker (bibtex_parser.worker.ts)
 *     -- postMessage(WorkerReply) -->
 *   Main thread (WorkerManager resolves/rejects promise)
 *
 * WorkerManager<ParserWorkerOutput, ParserWorkerInput> is the
 * generic typed wrapper that manages this communication.
 */

// The envelope sent from the worker back to the main thread.
// WorkerExitStatus acts as a discriminant: on Success the output
// contains parsed entries and error is null; on Fail the output
// is empty and error carries full diagnostic information.
export interface WorkerReply {
    exitStatus: WorkerExitStatus;
    error: WorkerErrorMsg | null;
    output: ParserWorkerOutput;
}

// Captures error details from the worker thread (parse errors or
// runtime exceptions) for logging and display on the main thread.
export interface WorkerErrorMsg {
    errorName: string;
    errorMsg: string;
    errorStack: string | undefined;
}

// Discriminant for WorkerReply: determines whether WorkerManager
// resolves (Success) or rejects (Fail) its promise.
export enum WorkerExitStatus {
    Success = 0,
    Fail = -1,
}

// The message sent from the main thread to the parser worker.
// Produced in BibtexManager.parseBibtexData() and consumed in
// bibtex_parser.worker.ts's onmessage handler.
export interface ParserWorkerInput {
    bibtexText: string;      // Raw .bib file content to parse
    options: ParserOptions;  // Parser configuration flags
}

// The parsed result returned by the worker on success.
// Alias for BibTeXEntry[] — named separately to clarify the
// Worker API boundary in WorkerManager's generic type parameters.
export type ParserWorkerOutput = BibTeXEntry[];

// Configuration flags passed to the Peggy parser in the worker.
// Currently only controls debug logging; extensible for future options.
export interface ParserOptions {
    debug_parser: boolean;
}

/* ──────────────────────────────────────────────
 * Bookmark resolver status
 * ──────────────────────────────────────────────
 * Returned by ensureBookmarkResolver() in utils.ts, which downloads
 * the native bookmark_resolver Swift binary from GitHub releases if
 * it is missing or at the wrong version. Consumed in main.ts during
 * plugin initialization for logging.
 */
export type BookmarkResolverStatus = "up-to-date" | "downloaded" | "failed";

/* ──────────────────────────────────────────────
 * Obsidian internal API type guard
 * ──────────────────────────────────────────────
 * Used in main.ts (settings tab) when the user clicks the "Hotkeys"
 * link: app.setting.openTabById('hotkeys') returns an untyped object.
 * This guard checks for the setQuery() method (an undocumented
 * Obsidian internal) so the hotkeys pane can be pre-filtered to
 * show only this plugin's commands. The HotkeysSettingTab interface
 * is augmented in src/types/obsidian-augment.d.ts.
 */
export function isHotkeysSettingTab(obj: unknown): obj is HotkeysSettingTab {
    // Check if `obj` is an object and has the `setQuery` method
    return typeof obj === 'object' && obj !== null && 'setQuery' in obj && typeof (obj as HotkeysSettingTab).setQuery === 'function';
}
