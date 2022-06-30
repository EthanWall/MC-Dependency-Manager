import {Curseforge, Game, Mod, ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {ModFileNotFoundError, ModNotFoundError} from "./errors";

const MODS_CLASS_ID = 6;

/**
 * Stringify and format an object into JSON
 * @param obj The object to stringify
 */
export function formatJSON(obj: object): string {
    return JSON.stringify(obj, null, '\t');
}

/**
 * Sort a list of mods by relevance (whether the full query is included in the mod name)
 * @param index A list of mods to sort
 * @param query A string search query
 */
export function sortModsSearch(index: Mod[], query: string): Mod[] {
    const formattedQuery = query.toLowerCase();

    return index.map(entry => {
        // Create a new field in each Mod for search ranking
        // @ts-ignore
        entry.points = 0;

        // Rank the mods based on relevancy
        if (entry.name.toLowerCase().includes(formattedQuery))
            // @ts-ignore
            entry.points += 1;

        return entry;
        // @ts-ignore
    }).sort((a, b) => b.points - a.points);
}

/**
 * Get a Mod from Curseforge using a slug
 * @param slug A Curseforge slug. Human-readable mod ID
 * @param mc A Minecraft instance
 * @throws {ModNotFoundError} Throws if the mod isn't found on Curseforge
 */
export async function getModFromSlug(slug: string, mc: Game): Promise<Mod> {
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
 * @param cf A Curseforge instance
 */
export async function getDirectDependencies(modFile: ModFile, cf: Curseforge): Promise<Mod[]> {
    // Get the mod ID's of the dependencies
    const ids = modFile.dependencies.map(dep => dep.modId);

    // Get a Mod for each mod ID
    return await Promise.all(ids.map(id => cf.get_mod(id)));
}

/**
 * Return every package that modFile depends on (including those dependencies deps, etc.)
 * @param modFile The mod file associated with the mod to check dependencies for
 * @param gameVersion The Minecraft version string
 * @param modLoader The Minecraft mod loader
 * @param cf A Curseforge instance
 */
export async function getDeepDependencies(modFile: ModFile, gameVersion: string, modLoader: ModLoaderType, cf: Curseforge):
    Promise<{ mod: Mod; modFile: ModFile; dependencies: Mod[] }[]> {

    const primaryDeps = await getDirectDependencies(modFile, cf);

    const allDeps: { mod: Mod, modFile: ModFile, dependencies: Mod[] }[] = [];
    for (const dep of primaryDeps) {
        const depFile = await getLatestModFile(dep, gameVersion, modLoader);
        const subDeps = await getDeepDependencies(depFile, gameVersion, modLoader, cf);
        allDeps.push({mod: dep, modFile: depFile, dependencies: subDeps.map(obj => obj.mod)}, ...subDeps);
    }

    return allDeps;
}