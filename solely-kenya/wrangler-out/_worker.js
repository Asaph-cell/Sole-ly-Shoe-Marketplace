var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// public/_worker.js
var worker_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/debug-worker") {
      return new Response(JSON.stringify({
        status: "Worker is active",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        url: url.href
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
    if (url.pathname === "/sitemap.xml") {
      try {
        const SUPABASE_URL = "https://cqcklvdblhcdowisjnsf.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2tsdmRibGhjZG93aXNqbnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njc0MDMsImV4cCI6MjA3NzM0MzQwM30.XEDVTzEQIG2LyEVkVV88vNIJTqVHX6aHXut6BVSP6-g";
        const sitemapResponse = await fetch(SUPABASE_URL + "/functions/v1/generate-sitemap", {
          headers: {
            "Authorization": "Bearer " + SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          }
        });
        if (sitemapResponse.ok) {
          var xml = await sitemapResponse.text();
          return new Response(xml, {
            headers: {
              "Content-Type": "application/xml",
              "Cache-Control": "public, max-age=3600"
            }
          });
        }
      } catch (e) {
      }
      return env.ASSETS.fetch(request);
    }
    if (url.pathname.startsWith("/product/")) {
      try {
        const response = await env.ASSETS.fetch(request);
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          return response;
        }
        const pathParts = url.pathname.split("/");
        const productId = pathParts[2];
        if (!productId) return response;
        const SUPABASE_URL = "https://cqcklvdblhcdowisjnsf.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxY2tsdmRibGhjZG93aXNqbnNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njc0MDMsImV4cCI6MjA3NzM0MzQwM30.XEDVTzEQIG2LyEVkVV88vNIJTqVHX6aHXut6BVSP6-g";
        const apiUrl = SUPABASE_URL + "/rest/v1/products?id=eq." + productId + "&select=name,description,price_ksh,images";
        const apiResponse = await fetch(apiUrl, {
          headers: {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + SUPABASE_ANON_KEY,
            "Content-Type": "application/json"
          }
        });
        if (!apiResponse.ok) {
          const newResponse = new Response(response.body, response);
          newResponse.headers.set("X-OG-Debug", "api-error-" + apiResponse.status);
          return newResponse;
        }
        const products = await apiResponse.json();
        const product = products && products[0];
        if (!product) {
          const newResponse = new Response(response.body, response);
          newResponse.headers.set("X-OG-Debug", "no-product-found");
          return newResponse;
        }
        var title = "Buy " + product.name + " Online in Kenya | Sole-ly";
        var desc = product.description || "Buy " + product.name + " online in Kenya for KES " + product.price_ksh + ". Escrow-protected payment. Verified seller.";
        if (desc.length > 197) {
          desc = desc.substring(0, 197) + "...";
        }
        var ogImageUrl = SUPABASE_URL + "/functions/v1/generate-og-image?id=" + productId;
        var safeTitle = title.replace(/"/g, "&quot;").replace(/</g, "&lt;");
        var safeDesc = desc.replace(/"/g, "&quot;").replace(/</g, "&lt;");
        var ogTags = '<meta property="og:type" content="product"><meta property="og:title" content="' + safeTitle + '"><meta property="og:description" content="' + safeDesc + '"><meta property="og:url" content="' + url.href + '"><meta property="og:site_name" content="Sole-ly Kenya"><meta property="og:image" content="' + ogImageUrl + '"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="product:price:amount" content="' + product.price_ksh + '"><meta property="product:price:currency" content="KES"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:site" content="@solely_kenya"><meta name="twitter:title" content="' + safeTitle + '"><meta name="twitter:description" content="' + safeDesc + '"><meta name="twitter:image" content="' + ogImageUrl + '">';
        var transformed = new HTMLRewriter().on('meta[property^="og:"]', {
          element: /* @__PURE__ */ __name(function(el) {
            el.remove();
          }, "element")
        }).on('meta[name^="twitter:"]', {
          element: /* @__PURE__ */ __name(function(el) {
            el.remove();
          }, "element")
        }).on("title", {
          element: /* @__PURE__ */ __name(function(el) {
            el.setInnerContent(safeTitle);
          }, "element")
        }).on("head", {
          element: /* @__PURE__ */ __name(function(el) {
            el.append(ogTags, { html: true });
          }, "element")
        }).transform(response);
        var newHeaders = new Headers(transformed.headers);
        newHeaders.set("X-OG-Debug", "success-" + product.name.substring(0, 20));
        return new Response(transformed.body, {
          status: transformed.status,
          headers: newHeaders
        });
      } catch (e) {
        var fallback = await env.ASSETS.fetch(request);
        var errorResponse = new Response(fallback.body, fallback);
        errorResponse.headers.set("X-OG-Debug", "error-" + String(e).substring(0, 100));
        return errorResponse;
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=_worker.js.map
