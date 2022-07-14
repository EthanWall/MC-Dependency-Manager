import type {Mod} from "node-curseforge";

export class ModFileNotFoundError extends Error {
    readonly modSlug: string;
    readonly gameVersion: string;
    readonly modLoader: string;

    constructor(mod: Mod, gameVersion: string, modLoader: string) {
        super(`Could not find file for ${mod.slug} on game version ${gameVersion}-${modLoader}`);

        Object.setPrototypeOf(this, ModFileNotFoundError.prototype);

        this.modSlug = mod.slug;
        this.gameVersion = gameVersion;
        this.modLoader = modLoader;
    }
}

export class ModNotFoundError extends Error {
    readonly modSlug: string;

    constructor(slug: string) {
        super(`Could not find a mod with the slug ${slug}`);

        Object.setPrototypeOf(this, ModNotFoundError.prototype);

        this.modSlug = slug;
    }
}

export class DoesNotExistError extends Error {
    constructor(message?: string) {
        super(message);

        Object.setPrototypeOf(this, DoesNotExistError.prototype);
    }
}