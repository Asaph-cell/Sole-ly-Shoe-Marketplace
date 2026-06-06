/**
 * Cloudflare Worker — Solely Kenya Domain Redirect
 *
 * Redirects ALL routes on the old domain to solelymarketplace.com.
 * - Static assets (favicon, images) are served normally so the redirect page renders.
 * - HTML page requests get the redirect page (served from static assets).
 * - Bot/crawler requests get a 301 for maximum SEO transfer.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const ua = (request.headers.get('user-agent') || '').toLowerCase();
    const NEW_DOMAIN = 'https://solelymarketplace.com';

    // ── Detect bots / crawlers ──
    const isBot = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedinbot|googlebot|bingbot|yandex|baidu|duckduck/i.test(ua);

    // ── Static assets: serve normally so redirect page renders ──
    const isStaticAsset = /\.(png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot|json|xml|txt|webmanifest)$/i.test(url.pathname);

    if (isStaticAsset) {
      // For robots.txt and sitemap.xml, serve from assets
      return env.ASSETS.fetch(request);
    }

    // ── Bots get a hard 301 redirect for SEO ──
    if (isBot) {
      return new Response(null, {
        status: 301,
        headers: {
          'Location': NEW_DOMAIN + '/',
          'Cache-Control': 'public, max-age=86400',
        },
      });
    }

    // ── Humans: serve the redirect landing page for all routes ──
    // The index.html has the animated "we've moved" page with auto-redirect
    try {
      // Rewrite the request to always serve index.html (the redirect page)
      const indexUrl = new URL('/', url.origin);
      const indexRequest = new Request(indexUrl.href, request);
      return env.ASSETS.fetch(indexRequest);
    } catch (e) {
      // Fallback: hard redirect if assets fail
      return new Response(null, {
        status: 302,
        headers: { 'Location': NEW_DOMAIN },
      });
    }
  },
};
