// esbuild.config.mjs

import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import copy from 'esbuild-plugin-copy';
import inline_web_worker from './esbuild-plugin-inline-worker.mjs'; // Import the plugin

// Banner message for the generated/bundled files
const banner = `
/*
THIS IS A GENERATED/BUNDLED FILE BY ESBUILD
if you want to view the source, please visit the github repository of this plugin
*/
`;

// Determine whether to build for production or development
const prod = process.argv[2] === "production";

// Get the output directory
const outdir = 'dist';

const buildMain = async () => {
    // Start the main build process
    const context = await esbuild.context({
        banner: {
            js: banner,
        },
        entryPoints: ["src/main.ts"],
        bundle: true,
        external: [
            "obsidian",
            "electron",
            "@codemirror/autocomplete",
            "@codemirror/collab",
            "@codemirror/commands",
            "@codemirror/language",
            "@codemirror/lint",
            "@codemirror/search",
            "@codemirror/state",
            "@codemirror/view",
            "@lezer/common",
            "@lezer/highlight",
            "@lezer/lr",
            ...builtins
        ],
        format: "cjs", // Maintain cjs format for Obsidian compatibility
        target: "es2018",
        logLevel: "info",
        sourcemap: prod ? false : "inline",
        treeShaking: true,
        outdir,
        plugins: [
            inline_web_worker({
                production: prod,
                srcDir: './src',
            }),
            copy({
                assets: {
                    from: ['./manifest.json'],
                    to: ['./manifest.json']
                }
            }),
            copy({
                assets: {
                    from: ['./styles/styles.css'],
                    to: ['./styles.css']
                }
            })
        ],
    });

    // Watch or build based on the environment
    if (prod) {
        await context.rebuild();
        process.exit(0);
    } else {
        await context.watch();
    }
};

// Run the build process
buildMain().catch(() => process.exit(1));
