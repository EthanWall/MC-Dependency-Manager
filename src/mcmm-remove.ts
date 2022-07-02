import {getPackages, PackageIndex, removePackage} from "./files";

export async function cmdRemove(slugs: Array<string>) {
    // TODO: Remove multiple mods at a time

    const success = await removeOne(slugs[0]).catch(err => {
        console.error(err);
        return false;
    });
    if (success)
        console.log(`Success!`);
    else
        console.log(`What happened?`);
}

async function removeOne(slug: string): Promise<boolean> {
    const packages = await getPackages();

    // Fail if the package doesn't exist
    if (!packages.hasOwnProperty(slug))
        return false;

    // Number of times a packages is referenced as a dependency
    const refCounts: { [key: string]: number } = {};
    refCounts[slug] = getRefCount(slug, packages);

    // Iterate over all dependencies
    let dependencies = getPackageDependencies(slug, packages, {recursive: true});

    // Filter user mods and their dependencies out
    for (const dep of dependencies) {
        if (!packages[dep].userMod)
            continue;

        // Remove all instances of the user mod and its dependencies
        dependencies = dependencies.filter(otherDep =>
            ![dep, ...getPackageDependencies(dep, packages, {recursive: true})].includes(otherDep));
    }

    for (const dep of dependencies) {
        // Skip this dependency if it was added by a user
        if (packages[dep].userMod)
            continue;

        // Find the number of times each dependency is referenced
        if (!refCounts.hasOwnProperty(dep))
            refCounts[dep] = getRefCount(slug, packages);

        // Subtract one from the ref count because the package will be removed
        refCounts[dep]--;
    }

    // Fail if any package is still depended on by another package that won't be removed
    if (Object.values(refCounts).filter(num => num > 0).length > 0)
        return false;

    // Iterate over each package to remove. Must be synchronous for file write operations
    for (const pkg of new Set(dependencies.concat(slug))) {
        await removePackage(pkg);
    }

    return true;
}

/**
 * The number of entries that list this slug as a dependency
 * @param slug The mod ID
 * @param packages Named index of packages
 */
function getRefCount(slug: string, packages: PackageIndex): number {
    const depSlugs = Object.values(packages).flatMap(pkg => pkg.dependencies ?? []);
    return depSlugs.filter(str => str === slug).length;
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