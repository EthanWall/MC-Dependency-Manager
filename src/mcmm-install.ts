import {Command, Option} from "commander";
import {Curseforge, Mod, ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {downloadMod, getDeepDependencies, getDirectDependencies, getLatestModFile, getModFromSlug} from "./util";
import {addPackage, getGameVersion, getModLoader} from "./files";
import {ModFileNotFoundError, ModNotFoundError} from "./errors";

const CF_KEY = process.env.CURSEFORGE_KEY;
const DOWNLOAD_PATH = './mods/';

const program = new Command();

program
    .argument('<slugs...>', 'shorthand name for the mod')
    .option('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft mod loader')
        .choices(['forge', 'fabric']))
    .action(async (slugs: Array<string>, options: { version?: string, modloader?: "forge" | "fabric" }) => {
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
        const allSlugs = userMods.map(userMod => userMod.slug);

        // TODO: Add error reporting for mods not compatible with version or mod loader

        for (const userMod of userMods) {
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
            console.log(`Installing ${userMod.slug}.`);
            await addPackage(userMod.slug, true, directDeps.map(dep => dep.slug));
            await downloadMod(userMod, userModFile, DOWNLOAD_PATH);

            // This probably shouldn't throw any errors if the mod authors published their mods right?
            // Find all the dependencies that the user mod relies on
            const deps = await getDeepDependencies(userModFile, version, modLoaderType, cf);

            // Download each dependency as a mod
            await Promise.all(deps.map(dep => {
                if (!allSlugs.includes(dep.mod.slug)) {
                    console.log(`Installing ${dep.mod.slug}.`);
                    allSlugs.push(dep.mod.slug);
                    return addPackage(dep.mod.slug, false, dep.dependencies.map(sub => sub.slug))
                        .then(() => downloadMod(dep.mod, dep.modFile, DOWNLOAD_PATH));
                }
            }));
        }

    });

program.parseAsync(process.argv);