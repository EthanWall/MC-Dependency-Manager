const {Command, Option} = require('commander');
const Curseforge = require('node-curseforge');
const {ModLoaderType} = require('node-curseforge/dist/objects/enums');

const CF_KEY = process.env.CURSEFORGE_KEY;

const program = new Command();

program
    .argument('<slugs...>', 'shorthand name for the mod')
    .requiredOption('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft mod loader')
        .choices(['forge', 'fabric'])
        .makeOptionMandatory())
    .action(async (slugs, options) => {
        // TODO: Install from package file

        if (!slugs) {
            console.error('error: missing required argument \'slugs\'');
            return;
        }

        if (!CF_KEY) {
            console.error('missing env variable for CURSEFORGE_KEY');
            return;
        }

        const cf = new Curseforge.default(CF_KEY);
        const mc = await cf.get_game('minecraft');

        const searchParams = {
            classId: 6,             // Class ID for the 'Mods' category
        };
        // TODO: Add error reporting for mods not compatible with version or mod loader
        const mods = await Promise.all(slugs.map(async slug => {
            searchParams.slug = slug;
            const result = await mc.search_mods(searchParams);
            return result[0];
        }));

        const getFilesParams = {
            gameVersion: options.version,
            modLoaderType: ModLoaderType[options.modloader.toUpperCase()],
            pageSize: 1
        };
        // Resolve size 1 array(s), each containing a ModFile? and some extra data
        // Add the ModFile to an array if the ModFile exists
        // Add that array to the returned array using .map()
        // Remove any empty arrays
        // Results in an array containing only valid ModFile's
        const deps = await Promise.all(mods.map(mod => mod.get_files(getFilesParams)))
            .then(result => result.flatMap(files => files[0] ? [files[0]] : [])) // mod files
            .then(files => files.flatMap(file => file.dependencies)) // mod dependencies in {modId, relationType} format
            .then(dependencies => Promise.all(dependencies.map(dep => cf.get_mod(dep.modId)))); // mod dependencies as Mod's

        // TODO: Refactor into util function
        let tempModIds = [];
        const modsToInstall = mods.concat(deps).filter(mod => {
            const key = mod.id;
            const isNew = !(key in tempModIds);
            if (isNew) tempModIds.push(key);
            return isNew;
        });

        console.log(modsToInstall);
    });

program.parseAsync(process.argv);