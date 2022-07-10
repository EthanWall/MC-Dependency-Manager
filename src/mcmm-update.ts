import {getGameVersion, getModLoader, getPackages} from "./files.js";
import {downloadMod, getLatestModFile, getModFromSlug} from "./util.js";
import {ModLoaderType} from "node-curseforge/dist/objects/enums.js";
import type {Mod, ModFile} from "node-curseforge";

// TODO: Make update fetch new deps from CurseForge
export async function cmdUpdate() {
    // Get options
    const version = await getGameVersion();
    const modLoaderType = ModLoaderType[(await getModLoader()).toUpperCase() as keyof typeof ModLoaderType];

    // Find mods to install from the package file
    const slugs = Object.keys(await getPackages());
    const mods = await Promise.all(slugs.map(slug => getModFromSlug(slug)));

    // Find mod files
    const modFiles = await Promise.all(mods.map(mod => getLatestModFile(mod, version, modLoaderType)));

    // Download the mod files
    for (let i = 0; i < mods.length; i++) {
        const mod = mods[i] as Mod;
        const modFile = modFiles[i] as ModFile;
        const updated = await downloadMod(mod.slug, modFile);
        if (updated) console.log(`Updated ${mod.slug}.`);
    }
}