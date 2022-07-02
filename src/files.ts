import fs from "fs";
import {exists, formatJSON} from "./util";
import {set, get, unset} from "lodash";

export type Package = {
    userMod: boolean,
    dependencies?: string[]
}
export type PackageIndex = { [slug: string]: Package }

// TODO: Better way then static path?
export const PKG_FILE_PATH = './mcmm.json';

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
    if (!await exists(PKG_FILE_PATH))
        await initFile();

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
    } finally {
        file?.close();
    }
}

/**
 * Delete a value from a JSON file
 * @param key A decimal-seperated path to the object
 */
async function deleteValue(key: string) {
    if (!await exists(PKG_FILE_PATH))
        await initFile();

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
    } finally {
        file?.close();
    }
}

/**
 * Creates a file in the correct format. Will not override an existing file
 */
async function initFile() {
    // TODO: impl
    throw Error('Not implemented');
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