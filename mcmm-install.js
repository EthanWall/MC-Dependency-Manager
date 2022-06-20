const {Command} = require('commander');

const program = new Command();

program
    .argument('<slug>', 'shorthand name for the mod', '')
    .action((slug, _options, _command) => {

    });

program.parse(process.argv);