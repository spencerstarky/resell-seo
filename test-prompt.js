require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testPrompt() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("No API key");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const processingTitle = "J Crew Cashmere Sweater Mens Large Gray V Neck Pullover Long Sleeve LS Casual";
  const cleanInfo = "Brand: J.Crew, Pattern: Solid, Size Type: Regular, Type: Sweater, Department: Men, Character: Blue, Size: L, Color: Gray, Style: Pullover, Theme: Preppy, Material: Cashmere";
  const matrixContext = "Identified End-Use: Office, Casual, Identified Style Signals: Preppy";
  const detectedBrand = "J.Crew";

  const prompt = `
You are an elite eBay SEO Specialist. 

**TASK:** Based on the RULES below, rewrite the CURRENT TITLE using the ITEM INFO to create a highly optimized, 80-character maximum eBay listing title. YOU MUST ONLY OUTPUT THE NEW TITLE.

### RULES: SYSTEM FAIL-SAFES (ZERO TOLERANCE)
1. **THE SIZE FIREWALL:**
   - You MUST extract the size ONLY from the \`cleanInfo\` (Item Specifics) or the Original Title.
   - If the size is "S", "M", or "L", you MUST expand it and spell it out completely: "Small", "Medium", "Large".
   - NEVER use the word "Size" or "Sz" in the output title.

2. **Never Invent:** Do not guess brand, materials, era, origin, or gender. If it is not explicitly in the input, omit it.

3. **Product Model Protection:** Preserve specific model names (e.g., "Basic Tee", "Synchilla") exactly as written in the original title.

### RULES: ASSEMBLY ALGORITHM
Construct the title using this exact priority hierarchy. You **MUST** maximize the 80-character limit safely. 

**[Tier 1: Mandatory SYNTAX LOCK]**
Combine Gender, Size, and Item Type into a single fluent phrase.
FORMAT: [Brand] + [Product Model (if exists)] + [Gender] + [Exact Size (Spelled Out)] + [Item Type]
*(Example: "Patagonia Womens Small Pullover Jacket" NOT "Patagonia Womens Jacket Size S")*

**(If under 80 chars, append Tier 2)**
**[Tier 2: Structural & Visual Facts]**
[Color] + [Anatomy/Fastenings (e.g., Full Zip, Thumb Holes)] + [Subtype/Material]

**(If under 80 chars, append Tier 3 - AGGRESSIVE ENRICHMENT)**
**[Tier 3: Style Signals & High-Intent Synonyms]**
If you have unused characters (especially if under 75), you MUST inject the following until you hit 80 characters:
1. **Style Signals:** Prioritize injecting style trends from \`matrixContext\` (e.g., "Gorpcore", "Y2K").
2. **End-Use/Synonyms:** Add universally accurate, high-intent synonyms (e.g., "Workout", "Gym", "Activewear", "Running").

### RULES: CONDITION OVERRIDE
If "New", "NWT", "NWOT", or "Brand New" appears anywhere in the input: append exactly "New" as the final word of the title. Do not duplicate if already present. Do not use "New With Tags".

### RULES: OUTPUT FORMAT
- Return ONLY the optimized title text.
- Maximum 80 characters.
- If a keyword pushes the title to 81+ characters, drop it entirely to stay under 80.
- ABSOLUTELY NO use of the word "Size" or "Sz".
- NO single-letter abbreviations for S/M/L. Spell them out (Small, Medium, Large).
- DO NOT return JSON. DO NOT echo instructions.

==== INPUTS ====
Current Title: ${processingTitle}
Item Info: ${cleanInfo}
${matrixContext}
${detectedBrand ? `Detected Brand: ${detectedBrand}` : ''}

Provide your optimized title below this line:
[FINAL TITLE]:`;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2, // low temp for rule following
      }
    });
    console.log("RAW LLM OUTPUT:\n" + result.response.text());
  } catch (error) {
    console.error(error);
  }
}

testPrompt();
