// bibtex_parser.ts

import * as fs from 'fs';
import {parse} from "./peggy.mjs"
import { BibTeXDict, BibTeXEntry, MaxMatchesReachedError } from 'types';

const parserDebug = true;

export class BibtexParser {
    bibEntries: BibTeXDict | null = null;
    
    constructor(public bibtex_filePath:string, private maxMatches = 100) {

    }

    async parseBibtex() {
        let bibtexData: string;
        try {
            const t0 = Date.now();
            bibtexData = await this.readBibFile();
            const t1 = Date.now();
            if(parserDebug) console.log("Bibtex file loaded in " + (t1 - t0) + " milliseconds.");
        } catch {
            return;
        }
        
        const parsedData = {};
        let offset = 0;
        let isParsingComplete = false;
        
        const t2 = Date.now();

        const processNextChunk = (deadline: IdleDeadline) => {
            try {
                while (deadline.timeRemaining() > 0 && !isParsingComplete) {
                    // Slice the data to start parsing from the last known offset
                    parse(bibtexData?.slice(offset), {
                        MaxMatchesReachedError,
                        parsedData,
                        maxMatches: this.maxMatches
                    });

                    // If no error is thrown, parsing is complete
                    isParsingComplete = true;
                }

                if (!isParsingComplete) {
                    // If the parsing is not complete, request the next idle callback
                    requestIdleCallback(processNextChunk);
                } else {
                    // Parsing finished
                    const t3 = Date.now();
                    if(parserDebug) console.log("Bibtex file parsed in " + (t3 - t2) + " milliseconds");
                    if(parserDebug) console.log(`Imported ${Object.keys(parsedData).length} entries`);
                    this.bibEntries = parsedData;
                }
            } catch (error) {
                if (error instanceof MaxMatchesReachedError) {
                    // Update the offset based on the location returned by the error
                    offset += error.location.end.offset;

                    // Request the next idle callback
                    requestIdleCallback(processNextChunk);
                } else {
                    console.error("Parsing error:", error);
                }
            }
        };

        // Start processing the first chunk
        requestIdleCallback(processNextChunk);
    }

    setBibtexFilepath(bibtex_filePath:string) {
        this.bibEntries = null;
        this.bibtex_filePath = bibtex_filePath;
    }

    async getBibEntry(citekey:string): Promise<BibTeXEntry | null> {
        if(!this.bibEntries) {
            await this.parseBibtex();
        }
        if(this.bibEntries) {
            return this.bibEntries[citekey];
        } else {
            return null;
        }
    }

    // Function to read the .bib file and return its contents
    async readBibFile(): Promise<string> {
      try {
        const data = await fs.promises.readFile(this.bibtex_filePath, 'utf8');
        return data;
      } catch (err) {
        console.error("Error reading file:", err);
        throw err;  // Rethrow the error so the caller knows something went wrong
      }
    }

}