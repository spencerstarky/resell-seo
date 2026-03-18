import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ratelimit } from '@/lib/ratelimit'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    // --- RATE LIMITING (SECURITY) ---
    if (request.nextUrl.pathname.startsWith('/api')) {
        const ip = (request as any).ip ?? request.headers.get('x-forwarded-for') ?? '127.0.0.1';
        try {
            const { success } = await ratelimit.limit(ip);
            if (!success) {
                return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
            }
        } catch (e) {
            console.error('RateLimit Error:', e);
            // Fail open (allow request) if Redis is down
        }
    }
    // --------------------------------

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
        return response
    }

    // --- LEGACY BLOG REDIRECTS ---
    // Redirects old sourceandsold.com/[slug] links to resellseo.app/blog/[slug]
    const pathname = request.nextUrl.pathname;

    // List of known app routes that should NOT be redirected
    const isAppRoute =
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/admin') || // New Admin Dashboard
        pathname.startsWith('/top-selling-brands') || // Lead Magnet
        pathname.startsWith('/store-audit') || // Public Store Prospector
        pathname.startsWith('/unsubscribe') || // Unsubscribe Page
        pathname.startsWith('/account') ||
        pathname.startsWith('/blog') || // Already correct
        pathname.startsWith('/api') ||
        pathname.startsWith('/legal') ||
        pathname.startsWith('/about') ||
        pathname.startsWith('/contact') ||
        pathname.startsWith('/auth') ||
        pathname.startsWith('/resell-assistant') || // Extension Landing Page
        pathname.includes('.'); // Exclude files (robots.txt, etc)

    if (!isAppRoute) {
        // Assume it's a legacy blog post -> 301 Redirect to /blog/[slug]
        return NextResponse.redirect(new URL(`/blog${pathname}`, request.url), 301);
    }
    // -----------------------------

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value }) =>
                        response.cookies.set(name, value)
                    )
                },
            },
        }
    )

    await supabase.auth.getUser()
    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
