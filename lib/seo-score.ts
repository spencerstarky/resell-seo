
/**
 * Analyze a title to calculate an "SEO Score" (0-100) based on best practices.
 */
export function calculateSeoScore(title: string): { score: number; issues: string[] } {
    let score = 100;
    const issues: string[] = [];

    // 1. Length Check
    const length = title.length;
    if (length < 30) {
        score -= 30;
        issues.push('Title is too short (< 30 chars). Aim for 75-80.');
    } else if (length < 60) {
        score -= 15;
        issues.push('Title could be longer. Use more keywords.');
    } else if (length > 80) {
        score -= 10;
        issues.push('Title exceeds 80 characters.');
    }

    // 2. Character Utilization
    if (length >= 30 && length <= 70) {
        // Punish for unused space if it's not a very specific long tail item
        score -= 5;
        issues.push('Unused character space available.');
    }

    // 3. Spam/Junk Check
    const junkWords = ['L@@K', 'WOW', 'EUC', 'NICE', 'CUTE', 'MUST SEE', '!!!', '***'];
    const foundJunk = junkWords.filter(word => title.toUpperCase().includes(word));
    if (foundJunk.length > 0) {
        score -= (foundJunk.length * 10);
        issues.push(`Avoid spam words: ${foundJunk.join(', ')}`);
    }

    // 4. Punctuation Check
    const punctuation = title.match(/[!@#$%^&*(),?":{}|<>;]/g);
    if (punctuation && punctuation.length > 3) {
        score -= 10;
        issues.push('Excessive punctuation.');
    }

    // 5. Repeated Separators (New)
    // Checks for patterns like ::, --, //, ,, ..
    if (/([:\-\|\/,._])\1+/.test(title)) {
        score -= 15;
        issues.push('Avoid repeated separators like "::" or "--".');
    }

    // 6. Weird Capitalization (New)
    const words = title.split(/\s+/);
    let capitalizationErrors = 0;

    for (const word of words) {
        // Strip punctuation for analysis (e.g. "Jeans," -> "Jeans")
        const cleanWord = word.replace(/[^a-zA-Z0-9]/g, '');

        // Skip short words/measurements like 30x30 or VTG
        if (cleanWord.length < 3) continue;
        if (/^\d/.test(cleanWord)) continue; // Skip starting with number

        // Check for [Upper][Upper][Lower][Lower]... pattern (e.g. RALph)
        // We require at least 2 lowercase chars to avoid flagging acronym plurals like "LEDs" or units like "MHz"
        if (/^[A-Z]{2,}[a-z]{2,}/.test(cleanWord)) {
            capitalizationErrors++;
        }

        // Check for all lowercase words longer than 3 chars (e.g. "lauren" instead of "Lauren")
        // eBay titles usually capitalize most words
        if (/^[a-z]+$/.test(cleanWord) && !['with', 'for', 'and', 'the'].includes(cleanWord.toLowerCase())) {
            capitalizationErrors++;
        }
    }

    if (capitalizationErrors > 0) {
        score -= Math.min(20, capitalizationErrors * 5); // Cap penalty at 20
        issues.push('Fix capitalization errors (e.g. "RALph" or all lowercase).');
    }

    // 7. Structure (Heuristic)
    // Good titles usually start with Brand
    // This is hard to check without a brand list, but we can check if it looks like a sentence.
    if (title.includes(' and ') || title.includes(' with ')) {
        score -= 5;
        issues.push('Avoid conjunctions like "and" or "with". List keywords instead.');
    }

    // Clamp score
    return {
        score: Math.max(0, Math.min(100, score)),
        issues
    };
}

