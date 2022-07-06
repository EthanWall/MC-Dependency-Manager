import inquirer from "inquirer";
import {initFile} from "./files";

export async function cmdInit(version?: string, modLoader?: 'forge' | 'fabric') {
    version ??= await promptVersionChoice();
    modLoader ??= await promptModLoaderChoice();

    await initFile(version, modLoader);
}

function promptVersionChoice(): Promise<string> {
    const questions = [
        {
            type: 'input',
            name: '0',
            message: 'Enter the Minecraft version',
            validate: (input: string) => /1\.\d+(\.\d+)?/.test(input) ?
                true :
                'Invalid Minecraft version'
        }
    ];

    return inquirer.prompt(questions).then(answers => answers[0]);
}

function promptModLoaderChoice(): Promise<"forge" | "fabric"> {
    const questions = [
        {
            type: 'rawlist',
            name: '0',
            message: 'Choose the mod loader',
            choices: ['forge', 'fabric']
        }
    ];

    return inquirer.prompt(questions).then(answers => answers[0]);
}
