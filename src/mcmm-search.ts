import inquirer from "inquirer";
import Curseforge, {Mod} from "node-curseforge";
import {sortModsByQuery} from "./util";
import {PagingOptions, SearchOptions} from "node-curseforge/dist/objects/types";
import {cmdInstall} from "./mcmm-install";

const CF_KEY = process.env.CURSEFORGE_KEY;

export async function cmdSearch(query: Array<string>, options: { interactive: boolean } = {interactive: false}) {
    if (!CF_KEY) {
        console.error('missing env variable for CURSEFORGE_KEY');
        return;
    }

    const cf = new Curseforge(CF_KEY);

    // Create a string out of an argument array
    const queryString = query.join(' ');

    // Mod search parameters
    const searchParams: SearchOptions & PagingOptions = {
        searchFilter: queryString,
        classId: 6,             // Class ID for the 'Mods' category
        sortOrder: "desc",
        sortField: 2,           // Popularity
        pageSize: 10
    };

    // Mods sorted by relevance
    const sortedMods = await cf.get_game('minecraft')
        .then(mc => mc.search_mods(searchParams))
        .then(mods => sortModsByQuery(mods, queryString));

    if (!options.interactive) {
        sortedMods.forEach((mod: Mod) => console.log(`${mod.slug} \\ ${mod.name} \\ ${mod.summary}`));
        return;
    }

    // Prompt the user to pick a mod they wish to install
    const modChoice = await promptModChoice(sortedMods);

    // Prompt the user to install the mod
    const confirmChoice = await promptConfirmInstall(modChoice);

    if (confirmChoice) {
        await cmdInstall([modChoice.slug]);
    } else {
        console.error('operation cancelled');
    }
}

function promptModChoice(mods: Mod[]): Promise<Mod> {
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
            name: '0',
            message: 'Pick a mod',
            choices: createChoices()
        }
    ];

    // Returns a Promise<Mod> object with the chosen mod data
    return inquirer.prompt(questions).then(answers => answers[0]);
}

function promptConfirmInstall(mod: Mod): Promise<boolean> {
    const questions = [
        {
            type: 'confirm',
            name: '0',
            message: `Install ${mod.slug}?`
        }
    ];

    return inquirer.prompt(questions).then(answers => answers[0]);
}