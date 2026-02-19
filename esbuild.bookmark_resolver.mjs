import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";

const swiftSource = "bookmark_resolver/bookmark_resolver.swift";
const applescriptSource = "bookmark_resolver/bookmark_resolver.applescript";
const outDir = "dist";
const signingIdentity = "Developer ID Application: Andrea Alberti (9V3X7C8VCK)";

// Read version from package.json and inject into both sources
const version = JSON.parse(readFileSync("package.json", "utf8")).version;

let swift = readFileSync(swiftSource, "utf8");
swift = swift.replace(/^let VERSION = ".*"/m, `let VERSION = "${version}"`);
writeFileSync(swiftSource, swift);

let applescript = readFileSync(applescriptSource, "utf8");
applescript = applescript.replace(/^property scriptVersion : ".*"/m, `property scriptVersion : "${version}"`);
writeFileSync(applescriptSource, applescript);

console.log(`Building bookmark_resolver ${version}...`);

// Compile AppleScript
execSync(`osacompile -o ${outDir}/bookmark_resolver.scpt ${applescriptSource}`, { stdio: "inherit" });

// Compile for both architectures
execSync(`swiftc -O -target arm64-apple-macosx11.0 -o ${outDir}/bookmark_resolver-arm64 ${swiftSource}`, { stdio: "inherit" });
execSync(`swiftc -O -target x86_64-apple-macosx11.0 -o ${outDir}/bookmark_resolver-x86_64 ${swiftSource}`, { stdio: "inherit" });

// Create universal binary
execSync(`lipo -create ${outDir}/bookmark_resolver-arm64 ${outDir}/bookmark_resolver-x86_64 -output ${outDir}/bookmark_resolver`, { stdio: "inherit" });
execSync(`rm ${outDir}/bookmark_resolver-arm64 ${outDir}/bookmark_resolver-x86_64`);

// Code sign
execSync(`codesign --sign '${signingIdentity}' --options runtime ${outDir}/bookmark_resolver`, { stdio: "inherit" });

console.log(`bookmark_resolver ${version} built and signed successfully.`);
