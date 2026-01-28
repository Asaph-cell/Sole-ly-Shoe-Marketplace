
// This function intercepts requests to /product/[id]
// It fetches the product data and injects Open Graph tags into the HTML
// before serving it to the user.

export const onRequest: PagesFunction = async (context) => {
    const { request, params, env, next } = context;

    // Extract product ID from the path
    // The path format is captured by [[id]], so params.id will be an array
    // e.g. /product/123 -> params.id = ["123"]
    const productId = Array.isArray(params.id) ? params.id[0] : params.id;

    if (!productId) {
        return next();
    }

    // Fetch the original HTML response (the SPA shell)
    const response = await next();

    // If the request is not a GET or the response is not HTML, return as is
    if (request.method !== "GET" || !response.headers.get("content-type")?.includes("text/html")) {
        return response;
    }

    // We need the Supabase URL and Anon Key.
    // In Cloudflare Pages, these should be environment variables.
    // We'll fallback to hardcoded values (public safe) if env vars are missing, 
    // just to ensure it works out of the box for this specific project.
    const SUPABASE_URL = env.VITE_SUPABASE_URL || "https://cqcklvdblhcdowisjnsf.supabase.co";
    const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2tsdmRibGhjZG93aXNqbnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njc0MDMsImV4cCI6MjA3NzM0MzQwM30.XEDVTzEQIG2LyEVkVV88vNIJTqVHX6aHXut6BVSP6-g";

    try {
        // Determine the product API URL
        const apiUrl = `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=name,description,price_ksh,images`;

        // Fetch product data
        const apiResponse = await fetch(apiUrl, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!apiResponse.ok) {
            // If fetch fails (e.g. invalid ID), just return original response
            return response;
        }

        const products = await apiResponse.json();
        const product = products?.[0];

        if (!product) {
            return response;
        }

        // Construct metadata
        const title = `${product.name} | Sole-ly`;
        const description = (product.description || `Buy ${product.name} on Sole-ly for KES ${product.price_ksh.toLocaleString()}`).substring(0, 200) + "...";

        // Ensure image is absolute
        let imageUrl = product.images?.[0] || "https://solelyshoes.co.ke/og-image.png";
        if (imageUrl.startsWith("/")) {
            imageUrl = `https://solelyshoes.co.ke${imageUrl}`;
        }

        // Use HTMLRewriter to inject tags
        // We target the <head> tag and append our meta tags
        return new HTMLRewriter()
            .on("head", {
                element(element) {
                    // Remove existing generic tags if we can match them (harder with rewriter),
                    // or just append new ones which usually take precedence if placed after,
                    // OR typically we just append. Social bots usually read the last one or specific properties.
                    // Better approach: We append them at the end of head.

                    const tags = `
            <meta property="og:type" content="product">
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:image" content="${imageUrl}">
            <meta property="og:url" content="${request.url}">
            <meta property="og:site_name" content="Sole-ly Kenya">
            <meta property="product:price:amount" content="${product.price_ksh}">
            <meta property="product:price:currency" content="KES">
            
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${description}">
            <meta name="twitter:image" content="${imageUrl}">
          `;
                    element.append(tags, { html: true });

                    // Also try to replace title content
                    // element.append(`<title>${title}</title>`, { html: true });
                    // But title tag might already exist.
                }
            })
            .on("title", {
                element(element) {
                    element.setInnerContent(title);
                }
            })
            .on('meta[name="description"]', {
                element(element) {
                    element.setAttribute("content", description);
                }
            })
            .on('meta[property="og:title"]', {
                element(element) { element.setAttribute("content", title); }
            })
            .on('meta[property="og:description"]', {
                element(element) { element.setAttribute("content", description); }
            })
            .on('meta[property="og:image"]', {
                element(element) { element.setAttribute("content", imageUrl); }
            })
            .on('meta[name="twitter:title"]', {
                element(element) { element.setAttribute("content", title); }
            })
            .on('meta[name="twitter:description"]', {
                element(element) { element.setAttribute("content", description); }
            })
            .on('meta[name="twitter:image"]', {
                element(element) { element.setAttribute("content", imageUrl); }
            })
            .transform(response);

    } catch (error) {
        console.error("Error processing product metadata:", error);
        return response;
    }
};
