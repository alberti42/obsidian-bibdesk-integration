    // utils.ts

import * as bplist from 'bplist-parser';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { BibTeXEntry, isBookmark, ParsedPath, ParsedUri, Queries } from 'types';
import { pathToFileURL } from 'url';
import * as chokidar from 'chokidar'; // to watch for file changes
import BibtexIntegration from 'main';
import { Notice, requestUrl, TAbstractFile, TFile, TFolder, Vault } from 'obsidian';

let watcher: chokidar.FSWatcher | null = null;
let watched_filepath: string | null = null;

export let bookmark_resolver_path: string|null = null;

export function set_bookmark_resolver_path(path: string | null) {
    bookmark_resolver_path = path;
}

export let bookmark_resolver_script_path: string | null = null;

export function set_bookmark_resolver_script_path(path: string | null) {
    bookmark_resolver_script_path = path;
}

export let use_native_binary = false;

export function set_use_native_binary(value: boolean) {
    use_native_binary = value;
}

// Joins multiple path segments into a single normalized path.
export function joinPaths(...paths: string[]): string {
    return paths.join('/');
}

export function parseFilePath(filePath: string): ParsedPath {
    const lastSlashIndex = filePath.lastIndexOf('/');

    const dir = lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';
    const base = lastSlashIndex !== -1 ? filePath.substring(lastSlashIndex + 1) : filePath;
    const extIndex = base.lastIndexOf('.');
    const filename = extIndex !== -1 ? base.substring(0, extIndex) : base;
    const ext = extIndex !== -1 ? base.substring(extIndex) : '';

    return { dir, base, filename, ext, path: filePath };
}

export function parseUri(url: string): ParsedUri | null {
    // Regular expression to capture the scheme, address, and optional query string
    const regex = /\s*([^:]+):\/\/([^?]*)(\?(.*))?/;

    const match = url.match(regex);

    if (match) {
        const scheme = match[1];
        const address = decodeURIComponent(match[2]);

        let queries: Queries = {};

        if (match[4]) { // Check if there's a query part
            queries = {};
            const queryString = match[4];
            const fields = queryString.split('&');

            for (const field of fields) {
                const [key, value] = field.split('=');
                queries[key] = value ? decodeURIComponent(value) : null;
            }
        }

        return { scheme, address, queries };
    }

    return null; // Return null if the pattern doesn't match
}

// Convert a POSIX file path to a file URL with proper escaping
export function posixToFileURL(posixPath: string): string {
    const fileUrl = pathToFileURL(posixPath);
    return fileUrl.href; // Return the properly escaped file URL as a string
}

export function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binaryString = '';
    for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binaryString);
}

export function bufferToUint8Array(buffer: Buffer): Uint8Array {
    return new Uint8Array(buffer);
}

// Function to convert binary plist to JSON
export async function convertBinaryPlistToJson(binaryData: Uint8Array): Promise<unknown> {
    try {
        // Parse the binary plist data
        const [parsedData] = bplist.parseBuffer(Buffer.from(binaryData));
        return parsedData;
    } catch (error) {
        console.error("Error parsing binary plist:", error);
        throw error;
    }
}

// Example usage with binary data
export async function processBinaryPlist(binaryData: Uint8Array): Promise<unknown> {
    try {
        const jsonData = await convertBinaryPlistToJson(binaryData);
        return jsonData;
    } catch (error) {
        console.error("Failed to process binary plist:", error);
        return null;
    }
}

export async function fileExists(path:string|null):Promise<boolean> {
    if(path===null) {
        return false;
    }
    return await fs.stat(path).then(() => true, () => false);
}

/*export async function checkFileExists(filePath: string): Promise<boolean> {
    try {
        const stats = await fs.stat(filePath);
        return stats.isFile();  // Check if the path is a directory
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
            return false;  // The directory does not exist
        }
        throw error; // Re-throw the error if it's not related to the existence check
    }
}*/

const GITHUB_REPO = "alberti42/obsidian-bibtex-integration";

function getBookmarkResolverVersion(): Promise<string | null> {
    return new Promise((resolve) => {
        if (!bookmark_resolver_path) {
            resolve(null);
            return;
        }

        fileExists(bookmark_resolver_path).then((exists) => {
            if (!exists) {
                resolve(null);
                return;
            }

            try {
                const child = spawn(bookmark_resolver_path!, ['--version'], { stdio: ['pipe', 'pipe', 'pipe'] });
                let stdout = '';

                child.stdout.on('data', (data) => {
                    stdout += data.toString();
                });

                child.on('error', () => {
                    resolve(null);
                });

                child.on('close', (code) => {
                    if (code === 0 && stdout.trim()) {
                        resolve(stdout.trim());
                    } else {
                        resolve(null);
                    }
                });
            } catch {
                resolve(null);
            }
        }).catch(() => {
            resolve(null);
        });
    });
}

async function getBookmarkResolverScriptVersion(): Promise<string | null> {
    if (!bookmark_resolver_script_path) return null;
    const versionFile = bookmark_resolver_script_path + '.version';
    if (!(await fileExists(versionFile))) return null;
    try {
        return (await fs.readFile(versionFile, 'utf8')).trim() || null;
    } catch {
        return null;
    }
}

export async function ensureBookmarkResolver(expectedVersion: string, useNativeBinary: boolean): Promise<void> {
    // Always ensure the AppleScript resolver is present and up-to-date
    if (bookmark_resolver_script_path) {
        const scriptVersion = await getBookmarkResolverScriptVersion();
        if (scriptVersion !== expectedVersion) {
            const action = scriptVersion ? "Updating" : "Downloading";
            const notice = new Notice(`BibDesk Integration: ${action} bookmark resolver script...`, 0);
            try {
                const url = `https://github.com/${GITHUB_REPO}/releases/download/${expectedVersion}/bookmark_resolver.scpt`;
                const response = await requestUrl({ url });
                await fs.writeFile(bookmark_resolver_script_path, new Uint8Array(response.arrayBuffer));
                await fs.writeFile(bookmark_resolver_script_path + '.version', expectedVersion, 'utf8');
                notice.hide();
                new Notice(`BibDesk Integration: bookmark resolver script ${action.toLowerCase()} successfully.`);
            } catch (error) {
                notice.hide();
                new Notice("BibDesk Integration: failed to download bookmark resolver script. PDF bookmark features will be unavailable.");
                console.error("BibDesk Integration: failed to download bookmark resolver script:", error);
            }
        }
    }

    // Ensure the Swift binary only when opted in
    if (useNativeBinary) {
        if (!bookmark_resolver_path) return;

        const currentVersion = await getBookmarkResolverVersion();
        if (currentVersion === expectedVersion) return;

        const action = currentVersion ? "Updating" : "Downloading";
        const notice = new Notice(`BibDesk Integration: ${action} bookmark resolver binary...`, 0);
        try {
            const url = `https://github.com/${GITHUB_REPO}/releases/download/${expectedVersion}/bookmark_resolver`;
            const response = await requestUrl({ url });
            await fs.writeFile(bookmark_resolver_path, new Uint8Array(response.arrayBuffer));
            await fs.chmod(bookmark_resolver_path, 0o755);
            notice.hide();
            new Notice(`BibDesk Integration: bookmark resolver binary ${action.toLowerCase()} successfully.`);
        } catch (error) {
            notice.hide();
            new Notice("BibDesk Integration: failed to download bookmark resolver binary.");
            console.error("BibDesk Integration: failed to download bookmark resolver binary:", error);
        }
    }
}

// Resolve a bookmark using the AppleScript resolver (osascript)
function run_bookmark_resolver_script(base64Bookmark: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fileExists(bookmark_resolver_script_path).then((exists) => {
            if (!exists || bookmark_resolver_script_path === null) {
                reject(`could not find bookmark_resolver script at: ${bookmark_resolver_script_path}`);
                return;
            }

            try {
                const child = spawn('osascript', [bookmark_resolver_script_path, base64Bookmark], { stdio: ['pipe', 'pipe', 'pipe'] });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => { stdout += data.toString(); });
                child.stderr.on('data', (data) => { stderr += data.toString(); });

                child.on('error', (error) => {
                    console.error("Child process error:", error);
                    reject(`failed to spawn osascript: ${error.message}`);
                });

                child.on('close', (code) => {
                    if (code !== 0 || stderr) {
                        console.error(`Error: osascript exited with code ${code}, stderr: ${stderr}`);
                        reject(`could not resolve bookmark: ${stderr || 'Unknown error'}`);
                    } else {
                        resolve(stdout.trim());
                    }
                });
            } catch (error) {
                reject(`could not execute osascript: ${error}`);
            }
        }).catch(error => {
            reject(`failed to check if script exists: ${error}`);
        });
    });
}

// Resolve a bookmark using the Swift binary resolver
function run_bookmark_resolver_binary(base64Bookmark: string): Promise<string> {
    return new Promise((resolve, reject) => {
        fileExists(bookmark_resolver_path).then((exists) => {
            if (!exists || bookmark_resolver_path === null) {
                reject(`could not find bookmark_resolver utility at: ${bookmark_resolver_path}`);
                return;
            }

            try {
                // Spawn the child process with the -p option
                const child = spawn(bookmark_resolver_path, ['-p'], { stdio: ['pipe', 'pipe', 'pipe'] });

                let stdout = '';
                let stderr = '';

                child.stdout.on('data', (data) => { stdout += data.toString(); });
                child.stderr.on('data', (data) => { stderr += data.toString(); });

                child.on('error', (error) => {
                    console.error("Child process error:", error);
                    reject(`failed to spawn process: ${error.message}`);
                });

                child.on('close', (code) => {
                    if (code !== 0 || stderr) {
                        console.error(`Error: process exited with code ${code}, stderr: ${stderr}`);
                        reject(`could not resolve bookmark: ${stderr || 'Unknown error'}`);
                    } else {
                        resolve(stdout.trim());
                    }
                });

                // Write the Base64 bookmark to stdin
                if (child.stdin) {
                    child.stdin.write(base64Bookmark);
                    child.stdin.end();
                }
            } catch (error) {
                reject(`could not execute bookmark_resolver utility: ${error}`);
            }
        }).catch(error => {
            reject(`failed to check if file exists: ${error}`);
        });
    });
}

export function run_bookmark_resolver(base64Bookmark: string): Promise<string> {
    if (use_native_binary) {
        return run_bookmark_resolver_binary(base64Bookmark);
    } else {
        return run_bookmark_resolver_script(base64Bookmark);
    }
}

export async function resolveBookmark(bibEntry: BibTeXEntry, bdsk_file: string): Promise<string|null> {
    try {
        // Convert Base64 to binary data
        const binaryData = base64ToUint8Array(bibEntry.fields[bdsk_file]);

        const plistData = await processBinaryPlist(binaryData);
        
        if(plistData) {
            if(!isBookmark(plistData)) {
                console.error('Error:', 'not valid bookmark');
                return null;
            }
            return await run_bookmark_resolver(uint8ArrayToBase64(Uint8Array.from(plistData.bookmark)));
            // return await run_bookmark_resolver(bookmark_resolver_path, uint8ArrayToBase64(plistData.bookmark));
        } else {
            console.error('Error:', 'not valid plist in bibtex field bdsk-file');
            return null;
        }
        
        
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

/* watch file changes */
export async function watchFile(filepath: string, plugin:BibtexIntegration) {

    // watch the same file already watched
    if(watched_filepath && watched_filepath === filepath) return;

    if(watcher) {
        await watcher.close();
        watched_filepath = null;
    }

    // By default, the add event will fire when a file first appears on disk,
    // before the entire file has been written. Furthermore, in some cases some
    // change events will be emitted while the file is being written. In some cases,
    // especially when watching for large files there will be a need to wait for the
    // write operation to finish before responding to a file creation or modification.
    // Setting awaitWriteFinish to true (or a truthy value) will poll file size,
    // holding its add and change events until the size does not change for a configurable
    // amount of time. The appropriate duration setting is heavily dependent on the OS and
    // hardware. For accurate detection this parameter should be relatively high, making
    // file watching much less responsive. Use with caution. 
    const watchOptions = {
        awaitWriteFinish: {
            stabilityThreshold: 1000,
            pollInterval: 100,
        },
    };
    
    watcher = chokidar.watch(filepath,watchOptions)
        .on('change', () => {
            if(plugin.settings.debug_parser) console.log(`The BibTex file ${watched_filepath} has changed and will be parsed agained.`)
            plugin.parseBibtexFile();
        }
    );

    watched_filepath = filepath;
}

export async function unwatchFile() {
/*    if(watcher) {
        await watcher.close();        
    } */
}

export function isInstanceOfFolder(file: TAbstractFile): file is TFolder {
    return file instanceof TFolder;
}

export function isInstanceOfFile(file: TAbstractFile): file is TFile {
    return file instanceof TFile;
}

export function doesFolderExist(vault: Vault, path: string): boolean {
    const file: TAbstractFile | null = vault.getAbstractFileByPath(path);
    return !!file && isInstanceOfFolder(file);
}

export function doesFileExist(vault: Vault, relativePath: string): boolean {
    const file: TAbstractFile | null = vault.getAbstractFileByPath(relativePath);
    return !!file && isInstanceOfFile(file);
}

export async function createFolderIfNotExists(vault: Vault, folderPath: string) {
    if(doesFolderExist(vault,folderPath)) return;

    try {
        await vault.createFolder(folderPath);
    } catch (error) {
        throw new Error(`Failed to create folder at ${folderPath}: ${error}`);
    }
}
