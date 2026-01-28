import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(req.url);
    const productId = url.searchParams.get("id");

    if (!productId) {
        return new Response("Missing product ID", { status: 400 });
    }

    try {
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: product } = await supabase
            .from("products")
            .select("name, description, price_ksh, images, brand")
            .eq("id", productId)
            .single();

        if (!product) {
            // Redirect to shop if product not found
            return new Response(null, {
                status: 302,
                headers: { Location: "https://solelyshoes.co.ke/shop" },
            });
        }

        const title = `${product.name} | Sole-ly`;
        const description = (product.description || `Buy ${product.name} on Sole-ly for KES ${product.price_ksh.toLocaleString()}`).substring(0, 200);
        const image = product.images?.[0] || "https://solelyshoes.co.ke/og-image.png";
        const targetUrl = `https://solelyshoes.co.ke/product/${productId}`;

        // Ensure image is absolute URL
        const fullImageUrl = image.startsWith("http") ? image : `https://solelyshoes.co.ke${image}`;

        const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="${description}">
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="product">
        <meta property="og:url" content="${targetUrl}">
        <meta property="og:title" content="${title}">
        <meta property="og:description" content="${description}">
        <meta property="og:image" content="${fullImageUrl}">
        <meta property="og:site_name" content="Sole-ly Kenya">
        <meta property="product:price:amount" content="${product.price_ksh}">
        <meta property="product:price:currency" content="KES">
        
        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:site" content="@solely_kenya">
        <meta name="twitter:title" content="${title}">
        <meta name="twitter:description" content="${description}">
        <meta name="twitter:image" content="${fullImageUrl}">
        
        <!-- Redirect to actual page -->
        <script>
          setTimeout(function() {
            window.location.href = "${targetUrl}";
          }, 100);
        </script>
         <noscript>
            <meta http-equiv="refresh" content="0;url=${targetUrl}">
         </noscript>
      </head>
      <body>
        <div style="font-family: system-ui, sans-serif; text-align: center; padding: 2rem;">
          <h1>${title}</h1>
          <img src="${fullImageUrl}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0;" alt="${product.name}" />
          <p>${description}</p>
          <p>Redirecting to store...</p>
          <a href="${targetUrl}">Click here if you are not redirected</a>
        </div>
      </body>
      </html>
    `;

        return new Response(html, {
            headers: {
                ...corsHeaders,
                "Content-Type": "text/html; charset=utf-8",
                "Cache-Control": "public, max-age=3600", // Cache for 1 hour
            },
        });

    } catch (error) {
        console.error("Error generating share page:", error);
        // Fallback redirect
        return new Response(null, {
            status: 302,
            headers: { Location: `https://solelyshoes.co.ke/shop` },
        });
    }
});
