const {Command} = require('commander');
const inquirer = require('inquirer');
const Curseforge = require('node-curseforge');
const {sort_mods_search} = require('./util');

const CF_KEY = process.env.CURSEFORGE_KEY;

const program = new Command();

async function promptModChoice(mods) {
    function createChoices() {
        let choices = [];
        mods.forEach(mod => {
            const choice = {
                name: `${mod.slug} \\ ${mod.name} \\ ${mod.summary}`,
                value: mod,
                short: mod.slug
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

    const answers = await inquirer.prompt(questions);

    // Returns a Mod object with the chosen mod data
    return answers.mod;
}

async function promptConfirmInstall(mod) {
    const questions = [
        {
            type: 'confirm',
            name: 'shouldInstall',
            message: `Install ${mod.slug}?`
        }
    ];

    const answers = await inquirer.prompt(questions);
    return answers.shouldInstall;
}

program
    .argument('<query...>', 'search text')
    .option('-i, --interactive', 'enable interactive user prompts?', false)
    .action(async (query, options, _command) => {
        if (!CF_KEY) {
            console.error('missing env variable for CURSEFORGE_KEY');
            return;
        }

        const cf = new Curseforge.default(CF_KEY);
        const mc = await cf.get_game('minecraft');

        // Create a string out of an argument array
        const queryString = query.join(' ');

        const searchParams = {
            searchFilter: queryString,
            classId: 6,             // Class ID for the 'Mods' category
            sortOrder: "desc",
            sortField: 2,           // Popularity
            pageSize: 10
        };

        let mods = await mc.search_mods(searchParams);
        mods = sort_mods_search(mods, queryString);

        if (!options.interactive) {
            mods.forEach(mod => {
                console.log(`${mod.slug} \\ ${mod.name} \\ ${mod.summary}`);
            });
            return;
        }

        // Prompt the user to pick a mod they wish to install
        const chosenMod = await promptModChoice(mods);

        // Prompt the user to install the mod
        if (await promptConfirmInstall(chosenMod)) {
            console.log(`Will install ${chosenMod.slug}`);
        } else {
            console.log('operation cancelled');
        }
    });

program.parseAsync(process.argv);