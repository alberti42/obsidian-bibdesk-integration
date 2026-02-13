// types.ts

import { HotkeysSettingTab } from "obsidian";

export interface Location {
    start: Position;
    end: Position;
}

export interface Position {
    offset: number;
    line: number;
    column: number;
}

export interface BibTeXDict {
    [key: string]: BibTeXEntry;   // The fields within the entry (e.g., "author", "title", "year", etc.)
}

export interface BibTeXEntry {
    citekey: string;
    type: string;
    authors: ParsedAuthors;
    fields: {[key: string]: string};   // The fields within the entry (e.g., "author", "title", "year", etc.)
}

export type ParsedAuthor = {first:string, last:string}
export type ParsedAuthors = ParsedAuthor[];
export interface ParsedAuthorsDict {
    [key:string]: ParsedAuthors;
}

export interface BibtexIntegrationSettings {
    bibtex_filepath: string;
    import_delay_ms: number;
    debug_parser: boolean;
    pdf_folder: string;
    use_demo_entries: boolean,
    organize_by_years: boolean;
}

export interface Bookmark {
    bookmark: Buffer;
}

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

export type ParsedPaths = ParsedPathWithIndex[];

export type ParsedPathWithIndex = {index:number, parsedPath:ParsedPath};

export interface ParsedPath {
    dir: string,
    base: string,
    filename: string,
    ext: string,
    path: string
}

export interface ParsedUri {
    scheme: string;
    address: string;
    queries: Queries;
}

export interface Queries {
    [key: string]: string|null;
}

/* Citation formats */

export interface AuthorFormatOptions {
    formatType: FormatType,
    onlyLastName: boolean,
    includeEtAl: boolean,
    precedeLastAuthorsByAnd: boolean,
}

export enum FormatType {
    AllAuthors,
    JustFirstAuthor,
    JustLastAuthor,
    FirstAndLastAuthor,
}

export enum HighlightType {
    HTML,
    MarkDown,
    None,
}

export interface JournalReferenceOptions {
    includingYear: boolean,
    highlightVolume: HighlightType,
}

export interface WorkerReply {
    exitStatus: WorkerExitStatus;
    error: WorkerErrorMsg | null;
    output: ParserWorkerOutput;
}

export interface WorkerErrorMsg {
    errorName: string;
    errorMsg: string;
    errorStack: string | undefined;
}

export enum WorkerExitStatus {
    Success = 0,
    Fail = -1,
}

export interface ParserWorkerInput {
    bibtexText: string;
    options: ParserOptions;
}

export type ParserWorkerOutput = BibTeXEntry[];

export interface ParserOptions {
    debug_parser: boolean;
}

export type BookmarkResolverStatus = "up-to-date" | "downloaded" | "failed";

export function isHotkeysSettingTab(obj: unknown): obj is HotkeysSettingTab {
    // Check if `obj` is an object and has the `setQuery` method
    return typeof obj === 'object' && obj !== null && 'setQuery' in obj && typeof (obj as HotkeysSettingTab).setQuery === 'function';
}
