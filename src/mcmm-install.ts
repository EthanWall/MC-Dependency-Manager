import type {ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums.js";
import { downloadMod, getShallowDependencies, getLatestModFile, getModFromSlug } from "./util.js";
import { addPackage, getGameVersion, getModLoader, parseRequirementsFile } from "./files.js";
import {cloneDeep} from "lodash";
import { DoesNotExistError } from "./errors.js";

export async function cmdInstall(slugs?: Array<string>, options?: { version?: string, modloader?: "forge" | "fabric", requirements?: string }) {
    // TODO: Add option to install optional deps

    if (!(slugs || options?.requirements)) {
        console.error('error: slugs or a requirements file must be passed as an argument')
        return;
    }

    let installIndex: { [slug: string]: { modFile: ModFile, isUserMod: boolean, directDependencies: string[] } } = {};

    // If args are supplied, use those; if not, find values from the package file
    const version = options?.version ?? await getGameVersion();
    const modLoader = options?.modloader ?? await getModLoader();

    const modLoaderType = ModLoaderType[modLoader.toUpperCase() as keyof typeof ModLoaderType];

    slugs ??= [];
    // Find slugs from a requirements file
    if (options?.requirements) {
        try {
            const requirements = await parseRequirementsFile(options?.requirements)
            slugs.push(...requirements);
        } catch (err) {
            if (err instanceof DoesNotExistError)
                console.error(`error: ${err.message}`);
            else
                console.error(err);
            return;
        }
    }

    if (!slugs) {
        console.error("error: requirements file is empty");
        return;
    }

    // Function to add info to the list
    async function gatherModInfo(
        slug: string,
        isUserMod: boolean,
        indexIn: { [slug: string]: { modFile: ModFile, isUserMod: boolean, directDependencies: string[] } } = {},
    ) {
        // Skip gathering info if the mod has already been processed. Prevents infinite recursion
        if (slug in indexIn)
            return indexIn;

        // Make a deep copy of the index that we can freely mutate
        let index = cloneDeep(indexIn);

        const parentMod = await getModFromSlug(slug);
        const parentModFile = await getLatestModFile(parentMod, version, modLoaderType);

        // Find the mod's direct dependencies
        const parentDeps = await getShallowDependencies(parentModFile, false);

        // Add the parent mod to the list before iterating over dependencies
        index[slug] = {modFile: parentModFile, isUserMod, directDependencies: parentDeps.map(mod => mod.slug)};

        // Recursively add dependencies to the list
        for (const mod of parentDeps) {
            index = await gatherModInfo(mod.slug, false, index);
        }

        // Return an update index with the mod and its deps
        return index;
    }

    // Add info to a list of mods to install
    for (const slug of slugs) {
        console.log(`Gathering ${slug}...`);
        installIndex = await gatherModInfo(slug, true, installIndex);
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