const {Command, Option} = require('commander');
const Curseforge = require('node-curseforge');
const {ModLoaderType} = require("node-curseforge/dist/objects/enums");

const CF_KEY = process.env.CURSEFORGE_KEY;

const program = new Command();

program
    .argument('<slugs...>', 'shorthand name for the mod')
    .requiredOption('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft modloader')
        .choices(['forge', 'fabric'])
        .makeOptionMandatory())
    .action(async (slugs, options, _command) => {
        // TODO: Install from package file

        if (!slugs) {
            console.error('error: missing required argument \'slug\'');
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
        const mods = await Promise.all(slugs.map(async slug => {
            searchParams.slug = slug;
            const result = await mc.search_mods(searchParams);
            return result[0];
        }));

        // TODO: node-curseforge does not support the `gameVersion` and `modLoaderType` args, even though the CurseForge API does
        const getFilesParams = {
            gameVersion: options.version,
            modLoaderType: ModLoaderType[options.modloader.toUpperCase()]
        };
        const modFiles = await Promise.all(mods.map(mod => mod.get_files(getFilesParams)));

        console.log(modFiles);
    });

program.parseAsync(process.argv);