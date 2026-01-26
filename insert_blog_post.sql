-- INSTRUCTIONS:
-- 1. Fill in the values below corresponding to your new blog post.
-- 2. Copy the entire script.
-- 3. Go to your Supabase Dashboard -> SQL Editor.
-- 4. Paste and Run.

INSERT INTO posts (
    slug, 
    title, 
    excerpt, 
    content, 
    image_url, 
    category
) VALUES (
    'your-url-slug-here',  -- e.g., 'how-to-optimize-ebay-titles'
    'Your Post Title Here', -- e.g., '5 Ways to Boost eBay Sales'
    'A short summary of the post that appears on the blog home page.', 
    '<p>Your full HTML content goes here.</p><p>You can paste your blog post body here.</p>', 
    'https://images.unsplash.com/photo-example', -- Optional: URL to a cover image
    'eBay Tips' -- Optional: Category (e.g., eBay Tips, SEO Strategy)
);

-- Note: 'published_at' defaults to NOW() automatically.
-- To schedule for the future, add 'published_at' to the list and use a timestamp like '2023-12-25 10:00:00+00'.
