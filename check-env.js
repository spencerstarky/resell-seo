const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

console.log('--- Environment Check ---');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found at: ' + envPath);
} else {
    console.log('✅ .env.local file exists');

    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    let geminiKeyFound = false;

    lines.forEach(line => {
        if (line.trim().startsWith('GEMINI_API_KEY=')) {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const val = parts.slice(1).join('=').trim();
                geminiKeyFound = true;

                if (val.length < 10) {
                    console.log('❌ GEMINI_API_KEY is too short (possible placeholder?)');
                } else if (val.startsWith('"') || val.startsWith("'")) {
                    console.log('⚠️ GEMINI_API_KEY is quoted. This is usually fine but ensure no extra spaces.');
                } else {
                    console.log(`✅ GEMINI_API_KEY found in file (Starts with: ${val.substring(0, 5)}...)`);
                }
            }
        }
    });

    if (!geminiKeyFound) {
        console.log('❌ GEMINI_API_KEY not found in .env.local');
    }
}
