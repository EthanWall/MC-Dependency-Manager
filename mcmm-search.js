const {Command} = require('commander');
const inquirer = require('inquirer');
const {Curseforge} = require('node-curseforge');
const {sort_mods_search} = require('./util');

const CF_KEY = process.env.CURSEFORGE_KEY;

const program = new Command();
const cf = new Curseforge(CF_KEY);

function promptModChoice(mods) {
    function createChoices() {
        return mods.map(mod => ({
            name: `${mod.slug} \\ ${mod.name} \\ ${mod.summary}`,
            value: mod,
            short: mod.slug
        }));
    }

    const questions = [
        {
            type: 'rawlist',
            name: 'mod',
            message: 'Pick a mod',
            choices: createChoices()
        }
    ];

    // Returns a Promise<Mod> object with the chosen mod data
    return inquirer.prompt(questions).then(answers => answers.mod);
}

function promptConfirmInstall(mod) {
    const questions = [
        {
            type: 'confirm',
            name: 'shouldInstall',
            message: `Install ${mod.slug}?`
        }
    ];

    return inquirer.prompt(questions).then(answers => answers.shouldInstall);
}

program
    .argument('<query...>', 'search text')
    .option('-i, --interactive', 'enable interactive user prompts?', false)
    .action((query, options) => {
        if (!CF_KEY) {
            console.error('missing env variable for CURSEFORGE_KEY');
            return;
        }


        // Create a string out of an argument array
        const queryString = query.join(' ');

        // Mod search parameters
        const searchParams = {
            searchFilter: queryString,
            classId: 6,             // Class ID for the 'Mods' category
            sortOrder: "desc",
            sortField: 2,           // Popularity
            pageSize: 10
        };

        // Mods sorted by relevance
        const sortModsPromise = cf.get_game('minecraft')
            .then(mc => mc.search_mods(searchParams))
            .then(mods => sort_mods_search(mods, queryString));

        if (!options.interactive) {
            sortModsPromise.then(mods => mods.forEach(mod => console.log(`${mod.slug} \\ ${mod.name} \\ ${mod.summary}`)));
            return;
        }

        // Prompt the user to pick a mod they wish to install
        const chooseModPromise = sortModsPromise.then(mods => promptModChoice(mods));

        // Prompt the user to install the mod
        const confirmChoicePromise = chooseModPromise.then(choice => promptConfirmInstall(choice));

        Promise.all([chooseModPromise, confirmChoicePromise])
            .then((choice, confirmation) => {
                if (confirmation) {
                    console.log(`Will install ${chooseModPromise.slug}`);
                } else {
                    console.log('operation cancelled');
                }
            });
    });

program.parse(process.argv);