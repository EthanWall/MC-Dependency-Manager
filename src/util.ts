import {Mod, ModFile} from "node-curseforge";
import {FileRelationType, ModLoaderType} from "node-curseforge/dist/objects/enums.js";
import {ModFileNotFoundError, ModNotFoundError} from "./errors.js";
import path from "path";
import fs from "fs";

const MODS_CLASS_ID = 6;
export const DOWNLOAD_PATH = path.posix.join(process.cwd(), 'mods/');

/**
 * Stringify and format an object into JSON
 * @param obj The object to stringify
 */
export function formatJSON(obj: object): string {
    return JSON.stringify(obj, null, 2);
}

/**
 * Check if a file or directory exists
 * @param path Path to the file
 */
export async function exists(path: fs.PathLike): Promise<boolean> {
    try {
        await fs.promises.stat(path);
    } catch (err: any) {
        if (err.code === 'ENOENT') {
            return false;
        } else {
            throw err;
        }
    }
    return true;
}

/**
 * Sort a list of mods by relevance (whether the full query is included in the mod name)
 * @param mods A list of mods to sort
 * @param query A string search query
 */
export function sortModsByQuery(mods: Mod[], query: string): Mod[] {
    const formattedQuery = query.toLowerCase();

    // Stores a relevance score along with each mod
    const index: [Mod, number][] = mods.map(mod => {
        let score = 0;

        // Increment the relevance score if the mod name matches the full query
        if (mod.name.toLowerCase().includes(formattedQuery))
            score++;

        return [mod, score];
    });

    return index.sort((a, b) => b[1] - a[1]).map(entry => entry[0]);
}

/**
 * Get a Mod from Curseforge using a slug
 * @param slug A Curseforge slug. Human-readable mod ID
 * @throws {ModNotFoundError} Throws if the mod isn't found on Curseforge
 */
export async function getModFromSlug(slug: string): Promise<Mod> {
    let options = {
        classId: MODS_CLASS_ID,
        slug
    };

    const mods = await mc.search_mods(options);

    if (!mods[0]) {
        throw new ModNotFoundError(slug);
    }

    return mods[0];
}

/**
 * Find the latest mod file for the specified game version and mod loader
 * @param mod The mod to get the file for
 * @param gameVersion The Minecraft game version string
 * @param modLoader The Minecraft mod loader
 * @throws {ModFileNotFoundError} Throws if a matching file isn't found for the game version and mod loader
 */
export async function getLatestModFile(mod: Mod, gameVersion: string, modLoader: ModLoaderType): Promise<ModFile> {
    const options = {
        gameVersion,
        modLoaderType: modLoader,
        pageSize: 1
    };

    const files = await mod.get_files(options);

    // Throw an error if a file doesn't exist
    if (!files[0]) {
        throw new ModFileNotFoundError(mod, gameVersion, ModLoaderType[modLoader]);
    }

    return files[0];
}

/**
 * Get an array of dependencies that the mod declares directly (won't find dependencies of dependencies)
 * @param modFile The mod file to find dependencies for
 * @param optionalDependencies Should optional dependencies be included in the returned array?
 */
export function getShallowDependencies(modFile: ModFile, optionalDependencies = false): Promise<Mod[]> {
    const ids = modFile.dependencies
        // Filter for only required (or optional) dependencies
        .filter(dep =>
            dep.relationType === FileRelationType.REQUIRED_DEPENDENCY ||
            (optionalDependencies && dep.relationType === FileRelationType.OPTIONAL_DEPENDENCY))
        // Get dependency mod ID's
        .map(dep => dep.modId);

    // Get a Mod for each mod ID
    return Promise.all(ids.map(id => cf.get_mod(id)));
}

/**
 * Return every package that modFile depends on (including those dependencies deps, etc.)
 * @param modFile The mod file associated with the mod to check dependencies for
 * @param gameVersion The Minecraft version string
 * @param modLoader The Minecraft mod loader
 * @param cf A Curseforge instance
 */
/*
export async function getDeepDependencies(modFile: ModFile, gameVersion: string, modLoader: ModLoaderType, cf: Curseforge):
    Promise<{ mod: Mod; modFile: ModFile; dependencies: Mod[] }[]> {

    const primaryDeps = await getShallowDependencies(modFile, cf);

    const allDeps: { mod: Mod, modFile: ModFile, dependencies: Mod[] }[] = [];
    for (const dep of primaryDeps) {
        const depFile = await getLatestModFile(dep, gameVersion, modLoader);
        const subDeps = await getDeepDependencies(depFile, gameVersion, modLoader, cf);
        allDeps.push({mod: dep, modFile: depFile, dependencies: subDeps.map(obj => obj.mod)}, ...subDeps);
    }

    return allDeps;
}


 */

/*
export async function getDeepDependencies(modFile: ModFile, gameVersion: string, modLoader: ModLoaderType, cf: Curseforge, optionalDependencies = false) {
    const result: { [slug: string]: { mod: Mod, modFile: ModFile, shallowDependencies: string[] } } = {};

    const primaryDeps = await getShallowDependencies(modFile, cf, optionalDependencies);
    await Promise.all(primaryDeps.map(async (primDep) => {
        if (result.hasOwnProperty(primDep.slug))
            return;

        const primDepFile = await getLatestModFile(primDep, gameVersion, modLoader);
        // Recursively find mod dependencies
        Object.entries(await getDeepDependencies(primDepFile, gameVersion, modLoader, cf, optionalDependencies))
            .forEach(([key, value]) => result[key] = value);

        result[primDep.slug] = {
            mod: primDep,
            modFile: primDepFile,
            shallowDependencies: await getShallowDependencies(primDepFile, cf, optionalDependencies)
                .then(deps => deps.map(dep => dep.slug))
        };
    }));

    return result;
}

 */

/**
 * Downloads a mod given that it has not already been downloaded
 * @param modSlug The human-readable ID of the mod
 * @param modFile The mod file to download
 * @param downloadDir Path to the mods directory (i.e. "./mods")
 * @return Was a new file downloaded?
 */
export async function downloadMod(modSlug: string, modFile: ModFile, downloadDir: fs.PathLike = DOWNLOAD_PATH): Promise<boolean> {
    const fileName = `${modSlug}~${modFile.fileFingerprint}.jar`;
    const filePath = path.posix.join(downloadDir.toString(), fileName);

    // Create the download directory if it doesn't exist
    await fs.promises.mkdir(downloadDir, {recursive: true});

    if (await exists(filePath)) {
        console.log(`The latest version of ${modSlug} already exists`);
        return false;
    }

    // Remove old versions of mods
    const oldFiles = (await fs.promises.readdir(downloadDir)).filter(fn => fn.startsWith(`${modSlug}~`));
    for (const oldFile of oldFiles) {
        await fs.promises.unlink(path.posix.join(downloadDir.toString(), oldFile));
    }

    // Download the mod and store whether the download was a success
    const wasSuccessful = await modFile.download(filePath, true);

    if (!wasSuccessful) {
        console.error(`${modSlug} failed to download`);
        return false;
    }

    return true;
}