import {getPackages, Package, PackageIndex, removePackage} from "./files.js";
import fs from "fs";
import path from "path";
import {DOWNLOAD_PATH} from "./util.js";

export async function cmdRemove(userSlugs: Array<string>) {
    const packages = await getPackages();

    // Check if the argument exists in the package file
    for (const slug of userSlugs) {
        if (packages.hasOwnProperty(slug))
            continue;
        console.error(`${slug} is not declared in the package file`);
        return;
    }

    // Find a unique list of all packages in the removal chain
    let chainSlugs;
    try {
        // Find the dependencies for each arg slug
        chainSlugs = userSlugs.concat(...userSlugs.flatMap(slug => getPackageDependencies(slug, packages, {recursive: true})));
    } catch (err) {
        if (err instanceof TypeError)
            console.error('error: malformed JSON');
        else
            throw err;
        return;
    }
    chainSlugs = [...new Set(chainSlugs)];

    // Mark all mods in the command arguments as non-user mods
    // This is needed as user mods can't be removed
    userSlugs.forEach(slug => (packages[slug] as Package).userMod = false);

    // Remove all user mods from the list of packages to be removed
    for (let i = 0; i < chainSlugs.length; i++) {
        const slug = chainSlugs[i] as string;
        if ((packages[slug] as Package).userMod)
            chainSlugs.splice(i, 1);
    }

    // Find the number of times each package is referenced as a dependency
    const refCounts: { [slug: string]: number } = {};
    chainSlugs.forEach(slug => refCounts[slug] = getReferences(slug, packages).length);

    // Iterate over each package
    chainSlugs.forEach(slug => {
        // Find shallow dependencies
        const dependencies = getPackageDependencies(slug, packages, {recursive: false});

        // Decrement the reference count of each dependency
        dependencies.forEach(dep => {
            if (refCounts.hasOwnProperty(dep))
                refCounts[dep]--;
        });
    });

    // Remove all packages with a reference count of zero
    chainSlugs = chainSlugs.filter(slug => refCounts[slug] === 0);
    for (const slug of chainSlugs) {
        await removePackage(slug);
    }

    // Delete the files
    await Promise.all(chainSlugs.map(async (slug) => {
        let files = await fs.promises.readdir(DOWNLOAD_PATH);

        // Find files matching the mod we're removing
        files = files.filter(fn => fn.startsWith(`${slug}~`));
        return Promise.all(files.map(file => fs.promises.unlink(path.posix.join(DOWNLOAD_PATH, file))));
    }));

    console.log(`Removed ${chainSlugs.length ? chainSlugs.join(', ') : 'nothing'}`);
}

function getReferences(slug: string, packages: PackageIndex): string[] {
    const allDeps = Object.values(packages).flatMap(pkg => pkg.dependencies ?? []);
    return allDeps.filter(str => str === slug);
}

function getPackageDependencies(slug: string, packages: PackageIndex, options?: { recursive?: boolean }): string[] {
    const finalDependencies: string[] = [];

    function gatherDependencies(otherSlug: string) {
        if (finalDependencies.includes(otherSlug))
            return;

        const pkg = packages[otherSlug] as Package;
        const deps = pkg.dependencies ?? [];
        finalDependencies.push(...deps);

        if (options?.recursive)
            deps.forEach(dep => gatherDependencies(dep));
    }

    gatherDependencies(slug);
    return finalDependencies;
}