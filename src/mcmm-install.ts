import {Curseforge, ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {downloadMod, getShallowDependencies, getLatestModFile, getModFromSlug} from "./util";
import {addPackage, getGameVersion, getModLoader} from "./files";

const CF_KEY = process.env.CURSEFORGE_KEY;

let installIndex: { [slug: string]: { modFile: ModFile, isUserMod: boolean, directDependencies: string[] } };

export async function cmdInstall(slugs: Array<string>, options?: { version?: string, modloader?: "forge" | "fabric" }) {
    // TODO: Install from package file
    // TODO: Add option to install optional deps

    installIndex = {};

    if (!CF_KEY) {
        console.error('missing env variable for CURSEFORGE_KEY');
        return;
    }

    const cf = new Curseforge(CF_KEY);
    const mc = await cf.get_game('minecraft');

    // If args are supplied, use those; if not, find values from the package file
    const version = options?.version ?? await getGameVersion();
    const modLoader = options?.modloader ?? await getModLoader();

    const modLoaderType = ModLoaderType[modLoader.toUpperCase() as keyof typeof ModLoaderType];

    // Function to add info to the list
    async function gatherModInfo(slug: string, isUserMod: boolean) {
        // Skip gathering info if the mod has already been processed. Prevents infinite recursion
        if (installIndex.hasOwnProperty(slug))
            return;

        const parentMod = await getModFromSlug(slug, mc);
        const parentModFile = await getLatestModFile(parentMod, version, modLoaderType);

        // Find the mod's direct dependencies
        const parentDeps = await getShallowDependencies(parentModFile, cf, false);

        // Add the parent mod to the list before iterating over dependencies
        installIndex[slug] = {modFile: parentModFile, isUserMod, directDependencies: parentDeps.map(mod => mod.slug)};

        // Recursively add dependencies to the list
        await Promise.all(parentDeps.map(mod => gatherModInfo(mod.slug, false)));
    }

    // Add info to a list of mods to install
    console.log("Gathering packages... ");
    for (const slug of slugs) {
        await gatherModInfo(slug, true);
    }

    // Add mods to package file
    for (const [slug, value] of Object.entries(installIndex)) {
        await addPackage(slug, value.isUserMod, value.directDependencies);
    }

    // Download each mod
    await Promise.all(Object.entries(installIndex).map(async ([slug, value]) => {
        console.log(`Downloading ${slug}...`);
        await downloadMod(slug, value.modFile);
    }));

    console.log('Done!');
}