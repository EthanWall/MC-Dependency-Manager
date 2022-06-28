import {Curseforge, Game, Mod, ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {ModFileNotFoundError, ModNotFoundError} from "./errors";

const MODS_CLASS_ID = 6;

export function formatJSON(obj: object): string {
    return JSON.stringify(obj, null, '\t');
}

/**
 * Get a value from an object using a string path
 * @param path A decimal-seperated path pointing to the object
 * @param source The object
 */
/*
export function getFromString(path: string, source: object): any {
    // Return the original object if no path is given
    if (!path) {
        return source;
    }

    const arr = path.split('.');

    let result: any = source;
    for (const key of arr) {
        result = result[key];
    }

    return result;
}
 */

/**
 * Return a modified object with the value inserted into it
 * @param path A decimal-seperated path pointing to the object
 * @param source The object. Won't be modified
 * @param value The value to insert into the returned object
 */

/*
export function setFromString(path: string, source: object, value: any): object {
    const arr = path.split('.');
    let obj: any = source;

    let i;
    for (i = 0; i < arr.length - 1; i++) {
        obj = obj[arr[i]];
    }
    obj[arr[i]] = value;
    return obj;
}

export function deleteFromString(path: string, source: object) {
    const arr = path.split('.');
    let obj: any = source;

    let i;
    for (i = 0; i < arr.length - 1; i++) {
        obj = obj[arr[i]];
    }
    delete obj[arr[i]];
    return obj;
}
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

export async function getAllDependencies(mod: Mod, gameVersion: string, modLoader: ModLoaderType, cf: Curseforge):
    Promise<{ mod: Mod, dependencies: Mod[] }[]> {

    const primaryDeps = await getLatestModFile(mod, gameVersion, modLoader).then(file => getDirectDependencies(file, cf));

    const allDeps: { mod: Mod, dependencies: Mod[] }[] = [];
    for (const dep of primaryDeps) {
        const subDeps = await getAllDependencies(dep, gameVersion, modLoader, cf);
        allDeps.push({mod: dep, dependencies: subDeps.map(obj => obj.mod)}, ...subDeps);
    }

    return allDeps;
}