import { getPackages, Package } from "./files.js";
import { removeOrphanedPackages } from "./util.js";
import { cmdInstall } from "./mcmm-install.js";

export async function cmdUpdate() {
    const packages = await getPackages();

    // Find mods to install from the package file
    // Only try to update user-installed packages
    const slugs = Object.keys(packages)
      .filter(slug => (packages[slug] as Package).userMod);

    // Update the mods
    await cmdInstall(slugs);

    // Remove any orphaned mods (new versions of mods might not require the same deps as the old version)
    await removeOrphanedPackages();

    // TODO: Add logging to update cmd
}