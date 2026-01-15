import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(120, '1 m'), // 120 requests per minute (2 per second)
    analytics: true,
    prefix: '@upstash/ratelimit',
});
