import {Command, Option} from "commander";
import {Curseforge} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {getDeepDependencies, getDirectDependencies, getLatestModFile, getModFromSlug} from "./util";
import {addPackage} from "./files";

const CF_KEY = process.env.CURSEFORGE_KEY;

const program = new Command();

program
    .argument('<slugs...>', 'shorthand name for the mod')
    .requiredOption('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft mod loader')
        .choices(['forge', 'fabric'])
        .makeOptionMandatory())
    .action(async (slugs: Array<string>, options: { version: string, modloader: "forge" | "fabric" }) => {
        // TODO: Install from package file

        if (!slugs) {
            console.error('error: missing required argument \'slugs\'');
            return;
        }

        if (!CF_KEY) {
            console.error('missing env variable for CURSEFORGE_KEY');
            return;
        }

        const cf = new Curseforge(CF_KEY);
        const modLoaderType = ModLoaderType[options.modloader.toUpperCase()];

        // Remove duplicate slugs
        slugs = [...new Set(slugs)];

        // Get an instance of minecraft as a Game
        const mc = await cf.get_game('minecraft');

        // Find a mod for each slug in the slugs array
        const userMods = await Promise.all(slugs.map(slug => getModFromSlug(slug, mc)));
        const allSlugs = userMods.map(userMod => userMod.slug);

        // TODO: Add error reporting for mods not compatible with version or mod loader

        for (const userMod of userMods) {
            // Get the latest file for the mod
            const userModFile = await getLatestModFile(userMod, options.version, modLoaderType);

            // Add user mod to package file
            const directDeps = await getDirectDependencies(userModFile, cf);
            console.log(`Installing ${userMod.slug}.`);
            await addPackage(userMod.slug, true, directDeps.map(dep => dep.slug));

            const deps = await getDeepDependencies(userModFile, options.version, modLoaderType, cf);
            await Promise.all(deps.map(dep => {
                if (!allSlugs.includes(dep.mod.slug)) {
                    console.log(`Installing ${dep.mod.slug}.`);
                    allSlugs.push(dep.mod.slug);
                    return addPackage(dep.mod.slug, false, dep.dependencies.map(sub => sub.slug));
                }
            }));
        }

    });

program.parseAsync(process.argv);