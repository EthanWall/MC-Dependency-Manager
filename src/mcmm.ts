#! /usr/bin/env node

import {Argument, Command, Option} from "commander";
import {cmdInstall} from "./mcmm-install.js";
import {cmdSearch} from "./mcmm-search.js";
import {cmdUpdate} from "./mcmm-update.js";
import {cmdRemove} from "./mcmm-remove.js";
import {cmdInit} from "./mcmm-init.js";
import {Curseforge} from "node-curseforge";
import { removeOrphanedPackages } from "./util.js";

declare global {
    // eslint-disable-next-line no-var
    var cf: Curseforge;
}

const CF_KEY = process.env["CURSEFORGE_KEY"];
if (!CF_KEY) {
    console.error('missing env variable for CURSEFORGE_KEY');
    process.exit(1);
}

global.cf = new Curseforge(CF_KEY);

const program = new Command();

program
    .name('mcmm')
    .description('The package manager for modded Minecraft')
    .version('0.1.4');

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
    .argument('[slugs...]', 'shorthand name for the mod')
    .option('-v, --version <version>', 'Minecraft version string')
    .addOption(new Option('-l, --modloader <name>', 'Minecraft mod loader')
        .choices(['forge', 'fabric']))
    .option('-r, --requirements <file>', 'relative or absolute path to a requirements file')
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
    .argument('[slugs...]', 'shorthand name for the mods to remove')
    .option('-r, --requirements <file>', 'relative or absolute path to a requirements file')
    .action(cmdRemove);

// mcmm init
program
    .command('init')
    .description('create a config file')
    .argument('[version]', 'Minecraft version string')
    .addArgument(new Argument('[modloader]', 'Minecraft mod loader')
        .choices(['forge', 'fabric']))
    .action(cmdInit);

// mcmm autoremove
program
  .command('autoremove')
  .description('removes orphaned mods')
  .alias('prune')
  .action(() => removeOrphanedPackages().then(slugs => console.log(`Removed ${slugs.join(", ")}.`)))

void program.parseAsync(process.argv);