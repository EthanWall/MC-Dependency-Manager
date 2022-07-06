import fs from "fs";
import {formatJSON} from "./util";
import {set, get, unset} from "lodash";
import path from "path";

export type Package = {
    userMod: boolean,
    dependencies?: string[]
}
export type PackageIndex = { [slug: string]: Package }
export type PackageFile = {
    version: string,
    modLoader: "forge" | "fabric",
    mods: PackageIndex
}

export const PKG_FILE_PATH = path.posix.join(process.cwd(), 'mcmm.json');

/**
 * Return an object from a JSON file
 * @param key A decimal-seperated path to the object
 */
async function getValue(key: string): Promise<any> {
    let file;
    try {
        // Open the file in read mode
        file = await fs.promises.open(PKG_FILE_PATH, 'r');

        // Read the file into a buffer
        const buffer = await fs.promises.readFile(file);

        // Parse the file and store the data as an object
        const data = JSON.parse(buffer.toString());

        // Get the value from the object
        return get(data, key);
    } catch (err: any) {
        if (err.code === 'ENOENT')
            throw new Error('file doesn\'t exist');
        else
            throw err;
    } finally {
        file?.close();
    }
}

/**
 * Write a value to a JSON file
 * @param key A decimal-seperated path to the object
 * @param value An object that will be parsed into JSON
 */
async function setValue(key: string, value: any) {
    let file;
    try {
        // Open the file in read mode
        file = await fs.promises.open(PKG_FILE_PATH, 'r');

        // Read the file into a buffer
        const buffer = await fs.promises.readFile(file);

        // Parse the file and store the data as an object
        let data = JSON.parse(buffer.toString());

        // Modify the object
        set(data, key, value);

        // Clear the file and open it in write mode
        file.close();
        file = await fs.promises.open(PKG_FILE_PATH, 'w');

        // Save the object to file
        await fs.promises.writeFile(file, formatJSON(data));
    } catch (err: any) {
        if (err.code === 'ENOENT')
            throw new Error('file doesn\'t exist');
        else
            throw err;
    } finally {
        file?.close();
    }
}

/**
 * Delete a value from a JSON file
 * @param key A decimal-seperated path to the object
 */
async function deleteValue(key: string) {
    let file;
    try {
        // Open the file in read mode
        file = await fs.promises.open(PKG_FILE_PATH, 'r');

        // Read the file into a buffer
        const buffer = await fs.promises.readFile(file);

        // Parse the file and store the data as an object
        let data = JSON.parse(buffer.toString());

        // Modify the object
        unset(data, key);

        // Clear the file and open it in write mode
        file.close();
        file = await fs.promises.open(PKG_FILE_PATH, 'w');

        // Save the object to file
        await fs.promises.writeFile(file, formatJSON(data));
    } catch (err: any) {
        if (err.code === 'ENOENT')
            throw new Error('file doesn\'t exist');
        else
            throw err;
    } finally {
        file?.close();
    }
}

/**
 * Creates a file in the correct format. Will not override an existing file
 */
export async function initFile(version: string, modLoader: "forge" | "fabric") {
    const data: PackageFile = {version, modLoader, mods: {}};
    let file;
    try {
        file = await fs.promises.open(PKG_FILE_PATH, 'wx');
        await fs.promises.writeFile(PKG_FILE_PATH, formatJSON(data));
    } catch (err: any) {
        if (err.code === 'EEXIST')
            throw new Error('file already exists');
        else
            throw err;
    } finally {
        file?.close();
    }
}

export async function getPackages(): Promise<PackageIndex> {
    return await getValue('mods');
}

export async function getGameVersion(): Promise<string> {
    return await getValue('version');
}

export async function getModLoader(): Promise<"forge" | "fabric"> {
    const value = await getValue('modLoader');
    if (!['forge', 'fabric'].includes(value))
        throw new Error('Malformed JSON');
    return value;
}

export async function addPackage(modSlug: string, isUserMod: boolean, dependencySlugs: string[]) {
    const obj: Package = {userMod: isUserMod, dependencies: dependencySlugs};
    await setValue(`mods.${modSlug}`, obj);
}

export async function removePackage(modSlug: string) {
    await deleteValue(`mods.${modSlug}`);
}

export async function setGameVersion(gameVersion: string) {
    await setValue('version', gameVersion);
}

export async function setModLoader(modLoader: "forge" | "fabric") {
    await setValue('modLoader', modLoader);
}