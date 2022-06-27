import {Command, Option} from "commander";
import {Curseforge} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {getAllDependencies, getModFromSlug} from "./util";

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

        // Get an instance of minecraft as a Game
        const mc = await cf.get_game('minecraft');

        // Find a mod for each slug in the slugs array
        const userMods = await Promise.all(slugs.map(slug => getModFromSlug(slug, mc)));

        // TODO: Add error reporting for mods not compatible with version or mod loader

        console.log('Installing packages:');
        userMods.forEach(userMod => console.log('\t' + userMod.slug));

        for (const userMod of userMods) {
            const deps = await getAllDependencies(userMod, options.version, modLoaderType, cf);
            deps.forEach(dep => console.log('\t' + dep.mod.slug));
        }
    });

program.parseAsync(process.argv);