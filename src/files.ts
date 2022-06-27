import fs from "fs";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {formatJSON} from "./util";

type Package = {
    userMod: boolean,
    dependencies?: string[]
}
type PackageIndex = { [slug: string]: Package }
type PackageFile = {
    version: string,
    modLoader: "forge" | "fabric",
    mods: PackageIndex
}

export const PKG_FILE_PATH = '../resources/project.json';

function validatePackageFile(obj: object): obj is PackageFile {
    const pkgFile = (obj as PackageFile);
    return "version" in pkgFile &&
        "modLoader" in pkgFile &&
        "mods" in pkgFile;
}

// TODO: Make sure functions close the file
export async function getPackages(file?: fs.promises.FileHandle): Promise<PackageIndex> {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'r');
    const obj: PackageFile = await fs.promises.readFile(file).then(result => JSON.parse(result.toString()));
    return obj.mods;
}

async function setPackages(packages: PackageIndex, file?: fs.promises.FileHandle) {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'w+');
    const obj: PackageFile = await fs.promises.readFile(file).then(result => JSON.parse(result.toString()));
    obj.mods = packages;
    await fs.promises.writeFile(file, formatJSON(obj));
}

export async function addPackage(modSlug: string, isUserMod: boolean, dependencySlugs: string[], file?: fs.promises.FileHandle) {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'w+');
    const packages = await getPackages(file);

    packages[modSlug] = {userMod: isUserMod, dependencies: dependencySlugs};
    await setPackages(packages, file);
}

export async function removePackage(modSlug: string, file?: fs.promises.FileHandle) {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'w+');
    const packages = await getPackages(file);

    delete packages[modSlug];
    await setPackages(packages, file);
}

export async function getGameVersion(file?: fs.promises.FileHandle): Promise<string> {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'r');
    const obj: PackageFile = await fs.promises.readFile(file).then(result => JSON.parse(result.toString()));
    return obj.version;
}

export async function setGameVersion(gameVersion: string, file?: fs.promises.FileHandle) {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'w+');
    const obj: PackageFile = await fs.promises.readFile(file).then(result => JSON.parse(result.toString()));

    obj.version = gameVersion;
    await fs.promises.writeFile(file, formatJSON(obj));
}

export async function getModLoader(file?: fs.promises.FileHandle) {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'r');
    const obj: PackageFile = await fs.promises.readFile(file).then(result => JSON.parse(result.toString()));
    return ModLoaderType[obj.modLoader.toUpperCase()];
}

export async function setModLoader(modLoader: "forge" | "fabric", file?: fs.promises.FileHandle) {
    file ??= await fs.promises.open(PKG_FILE_PATH, 'w+');
    const obj: PackageFile = await fs.promises.readFile(file).then(result => JSON.parse(result.toString()));

    obj.modLoader = modLoader;
    await fs.promises.writeFile(file, formatJSON(obj));
}

/*
async function createConfig(minecraftVersion: string, modLoader: "forge" | "fabric") {
    const obj = {
        version: minecraftVersion,
        modLoader: modLoader,
        mods: {}
    };

    let config;
    try {
        // Open the file, but fail if it already exists
        config = await fs.promises.open(PKG_FILE_PATH, 'wx');
    } catch (err) {
        if (err.code === 'EEXIST') {
            console.error('config file already exists');
            return;
        } else {
            throw err;
        }
    }

    await fs.promises.writeFile(config, JSON.stringify(obj, null, 4));
}
 */