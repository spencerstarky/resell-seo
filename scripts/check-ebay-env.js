const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

console.log('--- eBay Environment Check ---');

if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found');
} else {
    const content = fs.readFileSync(envPath, 'utf8');
    const keys = ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET', 'EBAY_RUNAME', 'NEXT_PUBLIC_BASE_URL'];

    keys.forEach(key => {
        const regex = new RegExp(`^${key}=(.*)`, 'm');
        const match = content.match(regex);
        if (match) {
            const val = match[1].trim();
            if (val.includes('PASTE_YOUR_') || val.length < 3) {
                console.log(`❌ ${key} still has placeholder value.`);
            } else {
                console.log(`✅ ${key} is set (starts with: ${val.substring(0, 4)}...)`);
            }
        } else {
            console.log(`❌ ${key} is missing from .env.local`);
        }
    });
}
