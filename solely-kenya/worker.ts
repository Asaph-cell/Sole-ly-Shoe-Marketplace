
interface Env {
    ASSETS: { fetch: (request: Request) => Promise<Response> };
    VITE_SUPABASE_URL?: string;
    VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Only intercept product pages
        // Match /product/:id but avoid assets like /product/style.css if that existed (unlikely)
        if (url.pathname.startsWith("/product/")) {
            const parts = url.pathname.split("/");
            // pathname: /product/123 -> ["", "product", "123"]
            const productId = parts[2];

            if (productId && productId.length > 10) { // Simple check to avoid noise
                return handleProductRequest(request, env, productId);
            }
        }

        // Default: serve static assets directly
        return env.ASSETS.fetch(request);
    },
};

async function handleProductRequest(request: Request, env: Env, productId: string) {
    // 1. Fetch the static HTML (SPA shell) first
    // We want to verify it exists and get the base to modify
    const response = await env.ASSETS.fetch(request);

    // If not success or not HTML, return as is
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
        return response;
    }

    // 2. Fetch data from Supabase
    const SUPABASE_URL = env.VITE_SUPABASE_URL || "https://cqcklvdblhcdowisjnsf.supabase.co";
    const SUPABASE_ANON_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2tsdmRibGhjZG93aXNqbnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njc0MDMsImV4cCI6MjA3NzM0MzQwM30.XEDVTzEQIG2LyEVkVV88vNIJTqVHX6aHXut6BVSP6-g";

    if (!SUPABASE_ANON_KEY) {
        return response;
    }

    try {
        const apiUrl = `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=name,description,price_ksh,images`;

        // Use standard fetch
        const apiResponse = await fetch(apiUrl, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (!apiResponse.ok) {
            return response;
        }

        const products = await apiResponse.json();
        const product = products?.[0];

        if (!product) {
            return response;
        }

        // 3. Prepare Metadata
        const title = `${product.name} | Sole-ly`;
        const description = (product.description || `Buy ${product.name} on Sole-ly for KES ${product.price_ksh.toLocaleString()}`).substring(0, 197) + "...";

        // Ensure image is absolute
        let imageUrl = product.images?.[0] || "https://solelyshoes.co.ke/og-image.png";
        if (imageUrl.startsWith("/")) {
            imageUrl = `https://solelyshoes.co.ke${imageUrl}`;
        }

        // 4. Inject into HTML using HTMLRewriter
        return new HTMLRewriter()
            .on("head", {
                element(element) {
                    // Append new tags
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
                }
            })
            // Optional: Replace existing placeholder tags if they exist to avoid duplicates
            .on('meta[property="og:title"]', { element(el) { el.setAttribute("content", title); } })
            .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", description); } })
            .on('meta[property="og:image"]', { element(el) { el.setAttribute("content", imageUrl); } })
            .transform(response);

    } catch (error) {
        console.error("Worker Error:", error);
        return response;
    }
}
