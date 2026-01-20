INSERT INTO posts (slug, title, excerpt, category, content, image_url, published_at)
VALUES (
    'meet-the-founder',
    'Meet the Founder: Why Experience Makes the Product',
    'Learn about Spencer Starkey, his background in Digital Marketing, and how ResellSEO was born from real reselling needs.',
    'Company',
    '<p>Welcome to the ResellSEO blog! I wanted to take a moment to introduce myself and share the story behind the software.</p>
    <h2>Who is Spencer Starkey?</h2>
    <p>I am a reseller at heart. I started selling on eBay years ago, experiencing the thrill of finding hidden gems and flipping them for a profit. But as I scaled my business, I ran into the same problems you probably face: <strong>visibility</strong>.</p>
    <p>It wasn''t enough to find great items; I had to make sure buyers could <em>find</em> them.</p>
    <h2>The Academic Edge</h2>
    <p>I decided to pursue a <strong>Bachelor''s Degree in Digital Marketing</strong>. I wanted to understand the science behind search engines, keywords, and consumer behavior. While many of my peers went on to work for ad agencies, I took my degree back to my eBay store.</p>
    <p>I started applying professional SEO strategies to my listings. The results were undeniable—my sales increased, and my sell-through rate improved.</p>
    <h2>Building ResellSEO</h2>
    <p>However, doing this manually for every single item was exhausting. I needed a tool that could automate this high-level optimization. I looked around and found nothing that satisfied my needs. So, I built it.</p>
    <p><strong>ResellSEO</strong> is the product of my dual background: the technical knowledge of a digital marketer and the practical experience of a reseller.</p>
    <h2>Why This Matters</h2>
    <p>Because I use this tool every day. I don''t just ship code; I ship packages. Every feature—from our <em>Title Optimization</em> to the new <em>Visual Analysis</em>—is vetted on my own inventory. If it doesn''t work for me, it doesn''t make it to you.</p>
    <p>Thanks for being part of this journey. Let''s get selling!</p>',
    null, -- You can update this with an image URL later if you have one
    NOW()
)
ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    excerpt = EXCLUDED.excerpt;
