import {getPackages, PackageIndex, removePackage} from "./files";

export async function cmdRemove(slugs: Array<string>) {
    // TODO: Remove multiple mods at a time

    const packages = await getPackages();
    await removeOne(slugs[0], packages);
}

async function removeOne(slug: string, packages: PackageIndex): Promise<boolean> {
    let dependencies;
    try {
        // Get the mod's dependencies
        // There may be duplicates, due to recursion
        // i.e. A depends on W and X. X also depends on W. ['W', 'X', 'W'] is returned
        dependencies = getPackageDependencies(slug, packages, {recursive: true});
    } catch (err) {
        if (err instanceof RangeError) {
            console.error(`${slug} has a cyclical dependency (i.e. A depends on B and B depends on A)! Please fix this`);
            return false;
        }
        throw err;
    }

    // A unique set of dependencies that will be removed in the final step
    const dependenciesToRemove = new Set(dependencies);

    // Check if we're trying to remove a dependency of another mod
    if (getRefCount(slug, packages) !== 0) {
        console.error(`Another mod relies on ${slug}`);
        return false;
    }

    for (const primaryDep of dependenciesToRemove) {
        // Check if the dependency is a user-installed mod
        if (packages[primaryDep].userMod) {
            // If so, gather a list of its dependencies, as they mustn't be removed
            const subDeps = getPackageDependencies(primaryDep, packages, {recursive: true});

            // Remove the user-install dependency and its dependencies
            subDeps.concat(primaryDep).forEach(userMod => dependenciesToRemove.delete(userMod));
            continue;
        }

        // Ensure no other mods are dependent on those dependencies
        // Get number of mods that declare each primary dependencies as a dependency of their own
        const totalReferences = getRefCount(primaryDep, packages);

        // Get number of times the primary mod depends on the dependency
        const ourReferences = dependencies.filter(name => name === primaryDep).length;

        // Check if the number of references to each dep from this mod isn't equal to the total number of references to the dep
        if (ourReferences !== totalReferences)
            // If there are dependents, don't remove them
            dependenciesToRemove.delete(primaryDep);
    }

    // Remove the package and its eligible dependencies
    for (const dep of [...dependenciesToRemove].concat(slug)) {
        await removePackage(dep);
    }
    console.log(`Removed ${[slug].concat(...dependenciesToRemove).join(', ')}`);

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