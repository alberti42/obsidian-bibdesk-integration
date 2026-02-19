import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

// update VERSION in bookmark_resolver.swift
const swiftPath = "bookmark_resolver/bookmark_resolver.swift";
let swiftSource = readFileSync(swiftPath, "utf8");
swiftSource = swiftSource.replace(/^let VERSION = ".*"/m, `let VERSION = "${targetVersion}"`);
writeFileSync(swiftPath, swiftSource);

// update scriptVersion in bookmark_resolver.applescript
const applescriptPath = "bookmark_resolver/bookmark_resolver.applescript";
let applescriptSource = readFileSync(applescriptPath, "utf8");
applescriptSource = applescriptSource.replace(/^property scriptVersion : ".*"/m, `property scriptVersion : "${targetVersion}"`);
writeFileSync(applescriptPath, applescriptSource);
