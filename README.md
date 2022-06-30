# MCMM

MCMM is a mod manager for Minecraft: Java Edition, similar to `apt`.
Integrated with CurseForge, MCMM aims to make installing, updating, and removing Minecraft mods easy.

## To-do

- [x] Search CurseForge for mods and filter by:
    - [x] Game version
    - [x] Modloader
- [x] Determine per-project file format
- [ ] Determine global conf file format
- [x] Add mods to a `package.json`-style file
    - [x] Keep track of mod dependencies
    - [x] Only add mods that align with version and mod loader requirements
- [x] Download mods and their dependencies
    - [ ] Allow user to specify mod version
    - [ ] Allow user to pick dependencies
- [ ] Update mods to the latest relevant version
- [ ] Remove mods, and if necessary, their dependencies

## `mcmm.json` File

`mcmm.json` should be in the `.minecraft` folder, along with the `mods` directory. MCMM uses this file to manage and
keep record of installed mods.

Below is an example `mcmm.json` file for Minecraft Version 1.16.5 with the Forge mod loader.
The `Ice and Fire: Dragons` mod is installed, along with its dependency, `Citadel`.
`Citadel` was installed automatically when the user installed `Ice and Fire: Dragons`
and will be removed should the user remove `Ice and Fire: Dragons`.

```json
{
  "version": "1.16.5",
  "modLoader": "forge",
  "mods": {
    "ice-and-fire-dragons": {
      "userMod": true,
      "dependencies": [
        "citadel"
      ]
    },
    "citadel": {
      "userMod": false
    }
  }
}
```

- `version`: The Minecraft version
- `modLoader`: Either `fabric` or `forge`
- `userMod`: `true` if the mod was installed by the user over the CLI.
  `false` if the mod was installed as a requirement of another mod
- `dependencies`: An array of mods that the primary mod depends on. Can be omitted if the mod has no dependencies

## Depends

MMCM depends on the following `Node.js` packages:

- `Commander.js` for the CLI interface
- `Inquirer.js` for the interactive mod selection prompt
- `node-curseforge` for interfacing with the CurseForge API
- `lodash` for utility functions

> :warning: `node-curseforge` must be built from source, as the pre-built binary on NPM isn't up-to-date!

## Installation

WIP

## Getting Started

WIP