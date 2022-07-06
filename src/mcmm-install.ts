import {Curseforge, Mod, ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {downloadMod, getDeepDependencies, getDirectDependencies, getLatestModFile, getModFromSlug} from "./util";
import {addPackage, getGameVersion, getModLoader} from "./files";
import {ModFileNotFoundError, ModNotFoundError} from "./errors";

const CF_KEY = process.env.CURSEFORGE_KEY;

export async function cmdInstall(slugs: Array<string>, options?: { version?: string, modloader?: "forge" | "fabric" }) {
    // TODO: Install from package file

    let version, modLoader;

    if (!slugs) {
        console.error('error: missing required argument \'slugs\'');
        return;
    }

    if (!CF_KEY) {
        console.error('missing env variable for CURSEFORGE_KEY');
        return;
    }

    // Use arguments if given
    if (options) {
        if (options.version) version = options.version;
        if (options.modloader) modLoader = options.modloader;
    }

    // If args weren't given, load values from the file
    version ??= await getGameVersion();
    modLoader ??= await getModLoader();

    const cf = new Curseforge(CF_KEY);
    // @ts-ignore
    const modLoaderType = ModLoaderType[modLoader.toUpperCase()];

    // Remove duplicate slugs
    slugs = [...new Set(slugs)];

    // Get an instance of minecraft as a Game
    const mc = await cf.get_game('minecraft');

    // Find a mod for each slug in the slugs array
    const userMods = (await Promise.all(slugs.map(slug => getModFromSlug(slug, mc).catch(err => {
        if (err instanceof ModNotFoundError)
            console.error(`The mod "${err.modSlug}" does not exist. Did you spell it right?`);
        else
            throw err;
    })))).filter(obj => obj instanceof Mod) as Mod[];

    const modsToDownload: { mod: Mod, modFile: ModFile, dependencies: Mod[], isUserMod: boolean }[] = [];

    for (const userMod of userMods) {
        console.log(`Getting ${userMod.slug}...`);

        // Get the latest file for the mod
        const userModFile = await getLatestModFile(userMod, version, modLoaderType).catch(err => {
            if (err instanceof ModFileNotFoundError)
                console.error(`The mod "${userMod.slug}" exists but isn't compatible with this version or mod loader`);
            else
                throw err;
        });

        // If the mod file doesn't exist, kill the program
        if (!(userModFile instanceof ModFile))
            return;

        // Add user mod to package file
        const directDeps = await getDirectDependencies(userModFile, cf);
        modsToDownload.push({mod: userMod, modFile: userModFile, dependencies: directDeps, isUserMod: true});

        // This probably shouldn't throw any errors if the mod authors published their mods right?
        // Find all the dependencies that the user mod relies on
        const deps = await getDeepDependencies(userModFile, version, modLoaderType, cf);

        // Download each dependency as a mod
        // TODO: Make file DOWNLOADS asynchronous. DO NOT make writes to the mcmm.json file async
        deps
            .filter(dep => !modsToDownload.map(obj => obj.mod.slug).includes(dep.mod.slug))
            .forEach(dep => modsToDownload.push({
                mod: dep.mod,
                modFile: dep.modFile,
                dependencies: dep.dependencies,
                isUserMod: false
            }));
    }

    // Write the mods to a file synchronously to avoid overriding
    console.log(`Installing ${modsToDownload.map(item => item.mod.slug).join(', ')}...`);
    for (const item of modsToDownload) {
        const depSlugs = item.dependencies.map(mod => mod.slug);
        await addPackage(item.mod.slug, item.isUserMod, depSlugs);
    }

    // Download all files asynchronously
    await Promise.all(modsToDownload.map(item => downloadMod(item.mod, item.modFile)));

    console.log('Done!');
}