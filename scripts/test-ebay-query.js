
const fs = require('fs');
const path = require('path');

// Manually load env
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
    const [key, ...parts] = line.split('=');
    if (key && parts.length > 0) {
        process.env[key.trim()] = parts.join('=').trim().replace(/^['"]|['"]$/g, '');
    }
});

async function getAppAccessToken() {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${auth}`
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            scope: 'https://api.ebay.com/oauth/api_scope'
        })
    });

    const data = await res.json();
    return data.access_token;
}

async function testQuery(name, queryString, token) {
    console.log(`\n--- Testing: ${name} ---`);
    console.log(`Query: ${queryString}`);
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?${queryString}`;

    try {
        const res = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
            }
        });

        if (!res.ok) {
            console.log(`❌ Status: ${res.status}`);
            console.log(`Error: ${await res.text()}`);
            return;
        }

        const data = await res.json();
        const items = data.itemSummaries || [];
        console.log(`✅ Status: ${res.status}`);
        console.log(`Items Found: ${items.length}`);

        if (items.length > 0) {
            console.log('First Item:', items[0].title);
            console.log('Seller:', items[0].seller?.username);
        }

    } catch (e) {
        console.log(`❌ Exception: ${e.message}`);
    }
}

async function run() {
    console.log('Getting Token...');
    const token = await getAppAccessToken();
    const seller = 'adidas_official';

    // 1. Current Method (Manual Brackets, q=space)
    await testQuery('Current (q=space, manual {})', `q=%20&filter=sellers:{${seller}}&limit=5`, token);

    // 2. No Q, Manual Brackets
    await testQuery('No Q, Manual {}', `filter=sellers:{${seller}}&limit=5`, token);

    // 3. No Q, Encoded Brackets
    await testQuery('No Q, Encoded %7B%7D', `filter=sellers:%7B${seller}%7D&limit=5`, token);

    // 4. Wildcard Q
    await testQuery('Wildcard q=*', `q=*&filter=sellers:{${seller}}&limit=5`, token);

    // 5. Encoded Brackets + q=space
    await testQuery('Encoded Brackets + q=space', `q=%20&filter=sellers:%7B${seller}%7D&limit=5`, token);

    // 6. Category 1 + Filter (No q)
    await testQuery('Category 1 + Filter (No q)', `category_ids=1&filter=sellers:{${seller}}&limit=5`, token);

    // 7. q=- (negative space?)
    await testQuery('q=-', `q=-&filter=sellers:{${seller}}&limit=5`, token);
}

run();
