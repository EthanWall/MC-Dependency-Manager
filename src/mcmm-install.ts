import {Command, Option} from "commander";
import {Curseforge, Mod} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";
import {getDependencies, getLatestModFile, getModFromSlug} from "./util";

const CF_KEY = process.env.CURSEFORGE_KEY;

const program = new Command();

program
    .argument('<slugs...>', 'shorthand name for the mod')
    .requiredOption('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft mod loader')
        .choices(['forge', 'fabric'])
        .makeOptionMandatory())
    .action((slugs: Array<string>, options: { version: string, modloader: "forge" | "fabric" }) => {
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

        // Make a copy of the original slugs array
        let slugsToSave = [...slugs];

        // Get an instance of minecraft as a Game
        cf.get_game('minecraft')
            // Find a mod for each slug in the slugs array
            .then(mc => Promise.all(slugs.map(slug => getModFromSlug(slug, mc))))
            // TODO: Add error reporting for mods not compatible with version or mod loader
            // Get an array containing the latest relevant ModFile for each Mod
            .then(mods => Promise.all(mods.map(mod => getLatestModFile(mod, options.version, ModLoaderType[options.modloader.toUpperCase()]))))
            // Get the mod dependencies
            .then(modFiles => Promise.all(modFiles.map(file => getDependencies(file, cf))))
            .then(deps => deps.flat(1))
            // Add any mod slugs that aren't already in the final array
            .then((mods: Mod[]) => mods.forEach(mod => {
                const key = mod.slug;
                if (!slugsToSave.includes(key)) {
                    slugsToSave.push(key);
                }
            }))
            .then(() => {
                console.log(`Installing ${slugsToSave.join(', ')}`);
            });
    });

program.parse(process.argv);