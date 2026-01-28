
// This function intercepts requests to /product/[id]
// It fetches the product data and injects Open Graph tags into the HTML

export const onRequest: PagesFunction = async (context) => {
    const { request, params, env, next } = context;

    const productId = Array.isArray(params.id) ? params.id[0] : params.id;

    if (!productId) {
        return next();
    }

    // Fetch the original HTML response
    const response = await next();

    // If not HTML, return as is
    if (!response.headers.get("content-type")?.includes("text/html")) {
        return response;
    }

    // Hardcoded keys to solve the missing env var issue definitively
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
            return response;
        }

        const products = await apiResponse.json();
        const product = products?.[0];

        if (!product) {
            return response;
        }

        const title = `${product.name} | Sole-ly`;
        const description = (product.description || `Buy ${product.name} on Sole-ly for KES ${product.price_ksh.toLocaleString()}`).substring(0, 197) + "...";

        let imageUrl = product.images?.[0] || "https://solelyshoes.co.ke/og-image.png";
        if (imageUrl.startsWith("/")) {
            imageUrl = `https://solelyshoes.co.ke${imageUrl}`;
        }

        // Inject tags
        return new HTMLRewriter()
            .on("head", {
                element(element) {
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
            .on('meta[property="og:title"]', { element(el) { el.setAttribute("content", title); } })
            .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", description); } })
            .on('meta[property="og:image"]', { element(el) { el.setAttribute("content", imageUrl); } })
            .transform(response);

    } catch (error) {
        // Silent fail - return original page
        return response;
    }
};
