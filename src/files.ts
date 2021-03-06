import fs from "fs";
import { formatJSON, splitNewlines } from "./util.js";
import {set, get, unset} from "lodash";
import path from "path";
import { DoesNotExistError, ExistsError } from "./errors.js";

export interface Package {
    userMod: boolean,
    dependencies?: string[]
}

export interface PackageIndex {
    [slug: string]: Package;
}

export interface PackageFile {
    version: string,
    modLoader: "forge" | "fabric",
    mods: PackageIndex
}

export const PKG_FILE_PATH = path.posix.resolve('mcmm.json');

/**
 * Return an object from a JSON file
 * @param key A decimal-seperated path to the object
 * @throws {DoesNotExistError} PKG_FILE_PATH must be a valid file path
 */
async function getValue<T>(key: string): Promise<T> {
  // TODO: Add error handling for wrongly typed return value
    let file;
    try {
        // Open the file in read mode
        file = await fs.promises.open(PKG_FILE_PATH, 'r');

        // Read the file into a buffer
        const buffer = await fs.promises.readFile(file);

        // Parse the file and store the data as an object
        const data = JSON.parse(buffer.toString()) as object;

        // Get the value from the object
        return get(data, key) as T;
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code === 'ENOENT')
            throw new DoesNotExistError('file does not exist');
        throw err;
    } finally {
        await file?.close();
    }
}

/**
 * Write a value to a JSON file
 * @param key A decimal-seperated path to the object
 * @param value An object that will be parsed into JSON
 * @throws {DoesNotExistError} PKG_FILE_PATH must be a valid file path
 */
async function setValue(key: string, value: unknown) {
    let file;
    try {
        // Open the file in read mode
        file = await fs.promises.open(PKG_FILE_PATH, 'r');

        // Read the file into a buffer
        const buffer = await fs.promises.readFile(file);

        // Parse the file and store the data as an object
        const data = JSON.parse(buffer.toString()) as object;

        // Modify the object
        set(data, key, value);

        // Clear the file and open it in write mode
        await file.close();
        file = await fs.promises.open(PKG_FILE_PATH, 'w');

        // Save the object to file
        await fs.promises.writeFile(file, formatJSON(data));
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code === 'ENOENT')
            throw new DoesNotExistError('file does not exist');
        throw err;
    } finally {
        await file?.close();
    }
}

/**
 * Delete a value from a JSON file
 * @param key A decimal-seperated path to the object
 * @throws {DoesNotExistError} PKG_FILE_PATH must be a valid file path
 */
async function deleteValue(key: string) {
    let file;
    try {
        // Open the file in read mode
        file = await fs.promises.open(PKG_FILE_PATH, 'r');

        // Read the file into a buffer
        const buffer = await fs.promises.readFile(file);

        // Parse the file and store the data as an object
        const data = JSON.parse(buffer.toString()) as object;

        // Modify the object
        unset(data, key);

        // Clear the file and open it in write mode
        await file.close();
        file = await fs.promises.open(PKG_FILE_PATH, 'w');

        // Save the object to file
        await fs.promises.writeFile(file, formatJSON(data));
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code === 'ENOENT')
            throw new DoesNotExistError('file does not exist');
        throw err;
    } finally {
        await file?.close();
    }
}

/**
 * Creates a file in the correct format. Will not override an existing file
 * @throws {ExistsError} PKG_FILE_PATH can't already exist
 */
export async function initFile(version: string, modLoader: "forge" | "fabric") {
    const data: PackageFile = {version, modLoader, mods: {}};
    let file;
    try {
        file = await fs.promises.open(PKG_FILE_PATH, 'wx');
        await fs.promises.writeFile(PKG_FILE_PATH, formatJSON(data));
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code === 'EEXIST')
            throw new ExistsError("file already exists")
        throw err;
    } finally {
        await file?.close();
    }
}

export async function getPackages(): Promise<PackageIndex> {
    return await getValue('mods');
}

export async function getGameVersion(): Promise<string> {
    return await getValue('version');
}

export async function getModLoader(): Promise<"forge" | "fabric"> {
    const value = await getValue<string>('modLoader');
    if (!['forge', 'fabric'].includes(value))
        throw new Error('malformed JSON');
    return value as "forge" | "fabric";
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

/**
 * Parse a newline-seperated file of slugs into an array
 * @param filePath Relative or absolute path to the file
 * @throws {DoesNotExistError} filePath must be a valid file path
 */
export async function parseRequirementsFile(filePath: fs.PathLike): Promise<string[]> {
    let file;
    try {
        file = await fs.promises.open(path.posix.resolve(filePath.toString()), 'r');
        return await file.readFile().then(buffer => splitNewlines(buffer.toString()));
    } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (err.code === 'ENOENT')
            throw new DoesNotExistError("requirements file does not exist");
        throw err;
    } finally {
        await file?.close()
    }
}