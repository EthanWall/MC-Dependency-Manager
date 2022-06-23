import {Mod} from "node-curseforge";

export function sortModsSearch(index: Mod[], query: string): Mod[] {
    const formattedQuery = query.toLowerCase();

    return index.map(entry => {
        // Create a new field in each Mod for search ranking
        // @ts-ignore
        entry.points = 0;

        // Rank the mods based on relevancy
        if (entry.name.toLowerCase().includes(formattedQuery))
            // @ts-ignore
            entry.points += 1;

        return entry;
        // @ts-ignore
    }).sort((a, b) => b.points - a.points);
}