-- LAUNCH DAY BLOG POST
-- Announces the new AI Capabilities: Style Engine, Hardgoods Mode, and Safety

INSERT INTO posts (
    slug, 
    title, 
    excerpt, 
    content, 
    image_url, 
    category,
    published_at
) VALUES (
    'update-style-trends-hardgoods-mode',
    'Major Update: Style Trends, Hardgoods Mode & Safer Optimization',
    'We just upgraded our AI Brain! Introducing automatic Trend Detection (Gorpcore, Y2K), a dedicated Hardgoods Mode for tools/electronics, and stricter Condition Safeguards.',
    '
    <h2>🚀 The AI Just Got Smarter</h2>
    <p>We’ve rolled out a massive update to the optimization engine. Here is what is new:</p>

    <h3>1. 🎨 Automatic Style Trend Detection</h3>
    <p>The AI now understands aesthetic trends and will automatically inject high-value keywords when it detects specific brands or attributes.</p>
    <ul>
        <li><strong>Gorpcore:</strong> Detects Arc''teryx, Salomon, North Face and adds keywords like "Gorpcore", "Utility", "Tech".</li>
        <li><strong>Y2K:</strong> Detects Juicy Couture, Baby Phat, Low Rise jeans and adds "Y2K", "McBling".</li>
        <li><strong>Office Core / Quiet Luxury:</strong> Detects Brunello Cucinelli, Theory, Ralph Lauren and adds "Old Money", "Career", "Minimalist".</li>
        <li><strong>Western:</strong> Detects Pearl Snaps, Cowboy boots, Tecovas.</li>
    </ul>

    <h3>2. 🛠️ Hardgoods Mode (Non-Clothing Support)</h3>
    <p>Selling tools, electronics, or golf clubs? The AI now switches to <strong>Safe Mode</strong>.</p>
    <ul>
        <li>It stops adding fashion words like "Casual" or "Trendy" to your power drills.</li>
        <li>It prioritizes <strong>Model Numbers</strong>, <strong>Voltage</strong>, and <strong>Specs</strong>.</li>
        <li>It cleans up the title structure without hallucinating features.</li>
    </ul>

    <h3>3. 🛡️ Condition Safeguards</h3>
    <p>We know how annoying it used to be when the AI removed "For Parts". Not anymore.</p>
    <p>Phrases like <strong>"For Parts"</strong>, <strong>"Read Description"</strong>, and <strong>"As Is"</strong> are now <strong>PROTECTED</strong>. The AI is forbidden from removing them or adding conflicting words like "Great Condition".</p>

    <h3>4. 📏 Fit & Fabric Intelligence</h3>
    <ul>
        <li><strong>Fit Stacking:</strong> If you accept "Baggy", we now intelligently stack "Relaxed" and "Wide Leg" to maximize reach.</li>
        <li><strong>Material Safety:</strong> We only add "Wool" or "Silk" if we are 100% sure from the image tags. No more guessing.</li>
    </ul>

    <p>Try it out on your next listing! 🚀</p>
    ', 
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=2070', 
    'Product Updates',
    NOW()
);
