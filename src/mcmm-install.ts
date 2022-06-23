import {Command, Option} from "commander";
import Curseforge, {ModFile} from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";

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

        let searchParams = {
            classId: 6,             // Class ID for the 'Mods' category
            slug: ''
        };
        const getFilesParams = {
            gameVersion: options.version,
            // @ts-ignore
            modLoaderType: ModLoaderType[options.modloader.toUpperCase()],
            pageSize: 1
        };

        const cf = new Curseforge(CF_KEY);

        // Make a copy of the original slugs array
        let slugsToSave = [...slugs];

        // Get an instance of minecraft as a Game
        cf.get_game('minecraft')
            // Search for the mods specified by the slugs array
            .then(mc => Promise.all(slugs.map(slug => {
                searchParams.slug = slug;
                return mc.search_mods(searchParams);
            })))
            // Array of Mod's from search
            .then(result => result.map(item => item[0]))
            // Get a single-item array of ModFile's from each Mod
            // TODO: Add error reporting for mods not compatible with version or mod loader
            .then(mods => Promise.all(mods.map(mod => mod.get_files(getFilesParams))))
            // Add the ModFile to an array if the former exists
            .then((result: ModFile[][]) => result.flatMap(files => files[0] ? [files[0]] : []))
            // Get mod dependencies in the {modId, relationType} format
            .then((files) => files.flatMap(file => file.dependencies))
            // Get a Mod from each FileDependency
            .then(dependencies => Promise.all(dependencies.map(dep => cf.get_mod(dep.modId))))
            // Add any mod slugs that aren't already in the final array
            .then(mods => mods.forEach(mod => {
                const key = mod.slug;
                if (!(key in slugsToSave))
                    slugsToSave.push(key);
            }))
            .then(() => {
                console.log(`Installing ${slugsToSave.join(', ')}`);
            });
    });

program.parse(process.argv);