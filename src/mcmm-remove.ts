import {getPackages, PackageIndex, removePackage} from "./files";

export async function cmdRemove(userSlugs: Array<string>) {
    const packages = await getPackages();

    // Find a unique list of all packages in the removal chain
    let chainSlugs;
    try {
        chainSlugs = userSlugs.concat(...userSlugs.flatMap(slug => getPackageDependencies(slug, packages, {recursive: true})));
    } catch (err) {
        if (err instanceof TypeError) {
            console.error('malformed JSON');
        } else if (err instanceof RangeError) {
            console.error('circular dependencies are not supported');
        } else {
            throw err;
        }
        return;
    }
    chainSlugs = [...new Set(chainSlugs)];

    // Mark all mods in the command arguments as non-user mods
    // This is needed as user mods can't be removed
    userSlugs.forEach(slug => packages[slug].userMod = false);

    // Remove all user mods from the list of packages to be removed
    for (let i = 0; i < chainSlugs.length; i++) {
        const slug = chainSlugs[i];
        if (packages[slug].userMod)
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

    console.log(`Removed ${chainSlugs.length ? chainSlugs.join(', ') : 'nothing'}`);
}

function getReferences(slug: string, packages: PackageIndex): string[] {
    const allDeps = Object.values(packages).flatMap(pkg => pkg.dependencies ?? []);
    return allDeps.filter(str => str === slug);
}

function getPackageDependencies(slug: string, packages: PackageIndex, options?: { recursive?: boolean }): string[] {
    const pkgObj = packages[slug];
    const dependencies = pkgObj.dependencies ?? [];

    if (options?.recursive) {
        for (const depSlug of dependencies) {
            dependencies.push(...getPackageDependencies(depSlug, packages, {recursive: true}));
        }
    }

    return dependencies;
}

function getPackageDependents(slug: string, packages: PackageIndex, options?: { recursive?: boolean }): string[] {
    const dependents = [];

    for (const [key, pkg] of Object.entries(packages)) {
        if (!pkg.dependencies?.includes(slug))
            continue;

        let sub: string[] = [];
        if (options?.recursive)
            sub = getPackageDependents(key, packages, {recursive: true});

        dependents.push(key, ...sub);
    }

    return dependents;
}