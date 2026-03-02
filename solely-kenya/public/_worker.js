/**
 * Cloudflare Pages Advanced Mode Worker
 * Injects dynamic OG meta tags for product pages so social media crawlers
 * (WhatsApp, Facebook, Twitter) show rich product previews.
 */
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Only intercept /product/* routes for OG tag injection
        if (url.pathname.startsWith('/product/')) {
            try {
                // Get the SPA HTML response from static assets
                const response = await env.ASSETS.fetch(request);

                // Only process HTML responses
                if (!response.headers.get('content-type')?.includes('text/html')) {
                    return response;
                }

                // Extract product ID from path: /product/{id}
                const pathParts = url.pathname.split('/');
                const productId = pathParts[2];
                if (!productId) return response;

                // Fetch product data from Supabase
                const SUPABASE_URL = 'https://cqcklvdblhcdowisjnsf.supabase.co';
                const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2tsdmRibGhjZG93aXNqbnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njc0MDMsImV4cCI6MjA3NzM0MzQwM30.XEDVTzEQIG2LyEVkVV88vNIJTqVHX6aHXut6BVSP6-g';

                const apiResponse = await fetch(
                    `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=name,description,price_ksh,images`,
                    {
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!apiResponse.ok) return response;

                const products = await apiResponse.json();
                const product = products?.[0];
                if (!product) return response;

                // Prepare OG data
                const title = product.name + ' | Sole-ly';
                const desc = (
                    product.description ||
                    'Buy ' + product.name + ' on Sole-ly for KES ' + product.price_ksh.toLocaleString()
                ).substring(0, 197) + '...';

                // Dynamic OG image from Supabase Edge Function
                const ogImageUrl = SUPABASE_URL + '/functions/v1/generate-og-image?id=' + productId;

                // Escape special characters for HTML attribute safety
                const safeTitle = title.replace(/"/g, '&quot;').replace(/</g, '&lt;');
                const safeDesc = desc.replace(/"/g, '&quot;').replace(/</g, '&lt;');

                // Build the replacement OG tags
                const ogTags = `
          <meta property="og:type" content="product">
          <meta property="og:title" content="${safeTitle}">
          <meta property="og:description" content="${safeDesc}">
          <meta property="og:url" content="${url.href}">
          <meta property="og:site_name" content="Sole-ly Kenya">
          <meta property="og:image" content="${ogImageUrl}">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
          <meta property="product:price:amount" content="${product.price_ksh}">
          <meta property="product:price:currency" content="KES">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:site" content="@solely_kenya">
          <meta name="twitter:title" content="${safeTitle}">
          <meta name="twitter:description" content="${safeDesc}">
          <meta name="twitter:image" content="${ogImageUrl}">
        `;

                // Use HTMLRewriter to strip default OG tags and inject product-specific ones
                return new HTMLRewriter()
                    .on('meta[property^="og:"]', {
                        element(el) { el.remove(); },
                    })
                    .on('meta[name^="twitter:"]', {
                        element(el) { el.remove(); },
                    })
                    .on('title', {
                        element(el) { el.setInnerContent(safeTitle); },
                    })
                    .on('head', {
                        element(el) { el.append(ogTags, { html: true }); },
                    })
                    .transform(response);

            } catch (e) {
                // On any error, serve the default SPA page
                return env.ASSETS.fetch(request);
            }
        }

        // All other routes: serve static assets normally
        return env.ASSETS.fetch(request);
    },
};
