import {Curseforge, Game, Mod, ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {ModFileNotFoundError, ModNotFoundError} from "./errors";

const MODS_CLASS_ID = 6;

export function formatJSON(obj: object): string {
    return JSON.stringify(obj, null, '\t');
}

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

export async function getDirectDependencies(modFile: ModFile, cf: Curseforge): Promise<Mod[]> {
    // Get the mod ID's of the dependencies
    const ids = modFile.dependencies.map(dep => dep.modId);

    // Get a Mod for each mod ID
    return await Promise.all(ids.map(id => cf.get_mod(id)));
}

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