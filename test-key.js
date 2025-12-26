const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

async function testKey() {
    console.log('--- Testing Gemini API Key ---');

    // Manually load .env.local since we are running with just 'node'
    const envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('❌ .env.local not found');
        return;
    }

    const content = fs.readFileSync(envPath, 'utf8');
    let apiKey = '';
    content.split('\n').forEach(line => {
        if (line.startsWith('GEMINI_API_KEY=')) {
            apiKey = line.split('=')[1].trim();
            // Remove quotes if present
            apiKey = apiKey.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        }
    });

    if (!apiKey) {
        console.error('❌ GEMINI_API_KEY not found in .env.local');
        return;
    }

    console.log(`Found Key: ${apiKey.substring(0, 8)}... (Length: ${apiKey.length})`);

    if (!apiKey.startsWith('AIza')) {
        console.warn('⚠️ WARNING: Google API Keys typically start with "AIza". Yours starts with "' + apiKey.substring(0, 4) + '". This might be the issue!');
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        console.log('Attempting to generate content...');
        const result = await model.generateContent("Say 'Hello' if this works.");
        const response = await result.response;
        console.log('✅ SUCCESS! API Response:', response.text());

    } catch (error) {
        console.error('❌ API CALL FAILED:', error.message);
    }
}

testKey();
