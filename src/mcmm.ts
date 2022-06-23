import {Command} from "commander";

const program = new Command();

program
    .name('mcmm')
    .description('The package manager for modded Minecraft')
    .version('0.0.1')
    .command('search <query...>', 'search CurseForge for mods').alias('s')
    .command('install <slug>', 'install a mod').alias('i');

program.parse(process.argv);