import { buildRss } from '@/lib/feed';

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(await buildRss(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
    },
  });
}
