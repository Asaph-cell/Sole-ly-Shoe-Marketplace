
export const onRequest: PagesFunction = async (context) => {
    const { request, params, next } = context;

    // 1. Extract ID safely
    const productId = Array.isArray(params.id) ? params.id[0] : params.id;

    if (!productId) {
        return next();
    }

    // Fetch original response (SPA shell)
    const response = await next();

    // If not HTML, return as is
    if (!response.headers.get("content-type")?.includes("text/html")) {
        return response;
    }

    // Hardcoded keys (verified working)
    const SUPABASE_URL = "https://cqcklvdblhcdowisjnsf.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2tsdmRibGhjZG93aXNqbnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njc0MDMsImV4cCI6MjA3NzM0MzQwM30.XEDVTzEQIG2LyEVkVV88vNIJTqVHX6aHXut6BVSP6-g";

    try {
        const apiUrl = `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=name,description,price_ksh,images`;

        const apiResponse = await fetch(apiUrl, {
            headers: {
                "apikey": SUPABASE_ANON_KEY,
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
            }
        });

        if (!apiResponse.ok) {
            // Pass through on API error
            return response;
        }

        const products = await apiResponse.json();
        const product = products?.[0];

        // SAFETY CHECK: If no product, return original page immediately
        if (!product) return response;

        // 3. Prepare Data
        const title = `${product.name} | Sole-ly`;
        const description = (product.description || `Buy ${product.name} on Sole-ly for KES ${product.price_ksh.toLocaleString()}`).substring(0, 197) + "...";

        // FIX: Ensure this is a FULL URL.
        // The bucket is 'product-images' based on previous context.
        // user's snippet suggested: https://YOUR_SUPABASE_ID.supabase.co/storage/v1/object/public/product-images/
        // My previous code used: https://solelyshoes.co.ke + image path if it started with /
        // Let's use the explicit Supabase Storage URL for maximum safety if it's a relative path in DB.
        // But usually in this app images are stored as full relative paths "/uploads/..." or filenames?
        // Looking at previous valid code: `let imageUrl = product.images?.[0] || ...`
        // Let's stick to the logic that served us well but use the FULL supabase URL if needed.
        // Actually, looking at the user's snippet, they want to handle the specific case.

        let imageValue = product.images?.[0];
        let imageUrl = "https://solelyshoes.co.ke/og-image.png";

        if (imageValue) {
            if (imageValue.startsWith("http")) {
                imageUrl = imageValue;
            } else {
                // If it starts with a slash, append to domain (as per my previous working code) -> this is likely correct for this app
                // User suggestion was: https://YOUR_SUPABASE_ID.supabase.co/storage/v1/object/public/product-images/${product.images}
                // I will support BOTH: if it looks like a filename, use storage. If it looks like a path, use domain.
                if (imageValue.startsWith("/")) {
                    imageUrl = `https://solelyshoes.co.ke${imageValue}`;
                } else {
                    // Assume it's a filename in the product-images bucket
                    imageUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${imageValue}`;
                }
            }
        }

        // 4. Inject
        return new HTMLRewriter()
            .on("head", {
                element(element) {
                    const tags = `
            <meta property="og:title" content="${title}">
            <meta property="og:description" content="${description}">
            <meta property="og:url" content="${request.url}">
            <meta property="og:site_name" content="Sole-ly Kenya">
            <meta property="product:price:amount" content="${product.price_ksh}">
            <meta property="product:price:currency" content="KES">
            
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${title}">
            <meta name="twitter:description" content="${description}">
            
            <meta name="x-debug-worker" content="active"> 
          `;
                    element.append(tags, { html: true });
                }
            })
            // Overwrite the existing default logo or previous tags
            .on('meta[property="og:image"]', {
                element(el) {
                    el.setAttribute("content", imageUrl);
                }
            })
            .on('meta[name="twitter:image"]', {
                element(el) {
                    el.setAttribute("content", imageUrl);
                }
            })
            .transform(response);

    } catch (e) {
        // If ANY error happens, return original response + Error Header
        const newResponse = new Response(response.body, response);
        newResponse.headers.set("X-Worker-Error", String(e));
        return newResponse;
    }
};
