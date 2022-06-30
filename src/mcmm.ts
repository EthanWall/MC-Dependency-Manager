import {Command, Option} from "commander";
import {install} from "./mcmm-install";
import {search} from "./mcmm-search";
import {update} from "./mcmm-update";

const program = new Command();

program
    .name('mcmm')
    .description('The package manager for modded Minecraft')
    .version('0.0.1');

// mcmm search
program
    .command('search')
    .description('search CurseForge for mods')
    .alias('s')
    .argument('<query...>', 'search text')
    .option('-i, --interactive', 'enable interactive user prompts?', false)
    .action(search);

// mcmm install
program
    .command('install')
    .description('install a mod')
    .alias('i')
    .argument('<slugs...>', 'shorthand name for the mod')
    .option('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft mod loader')
        .choices(['forge', 'fabric']))
    .action(install);

// mcmm update
program
    .command('update')
    .description('update any installed mods')
    .alias('u')
    .action(update);


program.parseAsync(process.argv);