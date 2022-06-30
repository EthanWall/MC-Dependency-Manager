import {Command} from "commander";
import {getGameVersion, getModLoader, getPackages} from "./files";
import {downloadMod, getLatestModFile, getModFromSlug} from "./util";
import Curseforge from "node-curseforge";
import {ModLoaderType} from "node-curseforge/dist/objects/enums";

const CF_KEY = process.env.CURSEFORGE_KEY;
const DOWNLOAD_PATH = './mods/';

const program = new Command();

program
    .action(async () => {
        if (!CF_KEY) {
            console.error('missing env variable for CURSEFORGE_KEY');
            return;
        }

        const cf = new Curseforge(CF_KEY);
        const mc = await cf.get_game('minecraft');

        // Get options
        const version = await getGameVersion();
        // @ts-ignore
        const modLoaderType = ModLoaderType[(await getModLoader()).toUpperCase()];

        // Find mods to install from the package file
        const slugs = Object.keys(await getPackages());
        const mods = await Promise.all(slugs.map(slug => getModFromSlug(slug, mc)));

        // Find mod files
        const modFiles = await Promise.all(mods.map(mod => getLatestModFile(mod, version, modLoaderType)));

        // Download the mod files
        for (let i = 0; i < mods.length; i++) {
            const updated = await downloadMod(mods[i], modFiles[i], DOWNLOAD_PATH);
            if (updated) console.log(`Updated ${mods[i].slug}.`);
        }
    });

program.parseAsync(process.argv);