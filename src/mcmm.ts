import {Argument, Command, Option} from "commander";
import {cmdInstall} from "./mcmm-install";
import {cmdSearch} from "./mcmm-search";
import {cmdUpdate} from "./mcmm-update";
import {cmdRemove} from "./mcmm-remove";
import {cmdInit} from "./mcmm-init";

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
    .action(cmdSearch);

// mcmm install
program
    .command('install')
    .description('install a mod')
    .alias('i')
    .argument('<slugs...>', 'shorthand name for the mod')
    .option('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft mod loader')
        .choices(['forge', 'fabric']))
    .action(cmdInstall);

// mcmm update
program
    .command('update')
    .description('update any installed mods')
    .alias('u')
    .action(cmdUpdate);

// mcmm remove
program
    .command('remove')
    .description('remove mods')
    .alias('rm')
    .argument('<slugs...>', 'shorthand name for the mods to remove')
    .action(cmdRemove);

// mcmm init
program
    .command('init')
    .description('create a config file')
    .argument('[version]', 'Minecraft version string')
    .addArgument(new Argument('[modloader]', 'Minecraft mod loader')
        .choices(['forge', 'fabric']))
    .action(cmdInit);

program.parseAsync(process.argv);