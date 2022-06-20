exports.sort_mods_search = function (index, query) {
    const formattedQuery = query.toLowerCase();

    return index.map(entry => {
        // Create a new field in each Mod for search ranking
        entry.points = 0;

        // Rank the mods based on relevancy
        if (entry.name.toLowerCase().includes(formattedQuery))
            entry.points += 1;

        return entry;
    }).sort((a, b) => b.points - a.points);
};