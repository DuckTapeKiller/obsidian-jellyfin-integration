
const settings = {
    keyRating: "Community Rating",
    includeRating: true,
    keyParentalRating: "Parental Rating"
};

const movies = [
    { Name: "Test 1", CommunityRating: 7.5, OfficialRating: "PG" },
    { Name: "Test 2", CommunityRating: "8.4", OfficialRating: "R" },
    { Name: "Test 3", CommunityRating: "6", OfficialRating: "G" },
    { Name: "Test 4", CommunityRating: "9.2/10", OfficialRating: "PG-13" },
    { Name: "Test 5", CommunityRating: "Invalid", OfficialRating: "NR" }
];

movies.forEach(movie => {
    const fmLines = [];
    if (settings.includeRating) {
        const commRating = parseFloat(movie.CommunityRating);
        // Strict check logic from main.ts
        if (typeof commRating === 'number' && !isNaN(commRating)) {
            fmLines.push(`${settings.keyRating}: ${commRating}`);
        }
    }
    if (movie.OfficialRating) {
        fmLines.push(`${settings.keyParentalRating}: ${movie.OfficialRating}`);
    }
    console.log(`--- Movie: ${movie.Name} ---`);
    console.log(fmLines.join("\n"));
});
