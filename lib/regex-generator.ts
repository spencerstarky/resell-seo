/**
 * Simple utility to generate a safe Regex pattern from an example style code.
 */
export function generateRegexFromExample(example: string): string {
    const clean = example.trim();
    if (!clean) return '';

    let regexParts = '';
    let i = 0;

    while (i < clean.length) {
        const char = clean[i];

        if (/[0-9]/.test(char)) {
            // Count consecutive digits
            let count = 0;
            while (i < clean.length && /[0-9]/.test(clean[i])) {
                count++;
                i++;
            }
            // Strict length? Or range? 
            // For safety, let's use exact length for now, or maybe {N, N+1} if explicitly asked.
            // But from a single example, we assume exact structure.
            regexParts += `\\d{${count}}`;
        }
        else if (/[A-Z]/.test(char)) {
            // Count consecutive Uppercase
            let count = 0;
            while (i < clean.length && /[A-Z]/.test(clean[i])) {
                count++;
                i++;
            }
            regexParts += `[A-Z]{${count}}`;
        }
        else if (/[a-z]/.test(char)) {
            // Count consecutive Lowercase (rare for style codes but possible)
            let count = 0;
            while (i < clean.length && /[a-z]/.test(clean[i])) {
                count++;
                i++;
            }
            regexParts += `[a-z]{${count}}`;
        }
        else {
            // Special char (hyphen, dash) - escape it
            if (['-', ' ', '/'].includes(char)) {
                regexParts += char; // These are usually safe inside regex if strictly placed, but safer to escape?
                // Hyphen should be escaped if in brackets, but here we are just building a sequence.
            } else {
                // Fallback for weird chars
                regexParts += `\\${char}`;
            }
            i++;
        }
    }

    // Anchor it
    return `^${regexParts}$`;
}
