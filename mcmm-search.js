import inquirer from 'inquirer';
import {Command} from 'commander';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

const Curseforge = require('node-curseforge');

const CF_KEY = process.env.CURSEFORGE_KEY;
if (!CF_KEY)
    throw 'missing env variable for CURSEFORGE_KEY';

const program = new Command();

const cf = new Curseforge.default(CF_KEY);

function promptModChoice(mods) {
    function createChoices() {
        let choices = [];
        mods.forEach(mod => {
            const choice = {
                name: `${mod.name} \\ ${mod.summary}`,
                value: mod,
                short: mod.name
            };
            choices.push(choice);
        });
        return choices;
    }

    const questions = [
        {
            type: 'rawlist',
            name: 'mod',
            message: 'Pick a mod',
            choices: createChoices()
        }
    ];
    inquirer.prompt(questions).then((answers) => {
        console.log(answers);
    });
}

program
    .argument('<query...>', 'search text')
    .action(async (query, _options, _command) => {
        const mc = await cf.get_game('minecraft');
        const searchParams = {
            searchFilter: query,
            classId: 6,             // Class ID for the 'Mods' category
            sortOrder: "desc",
            pageSize: 10
        };
        const mods = await mc.search_mods(searchParams);
        promptModChoice(mods);
    });

program.parseAsync(process.argv);