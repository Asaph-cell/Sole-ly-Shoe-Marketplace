import { Helmet } from "react-helmet-async";

interface ProductSchema {
    name: string;
    price: number;
    currency?: string;
    condition: 'new' | 'like_new' | 'good' | 'fair';
    availability: 'InStock' | 'OutOfStock';
    images: string[];
    brand?: string;
    sku: string;
    description?: string;
    reviewCount?: number;
    ratingValue?: number;
}

interface BreadcrumbItem {
    name: string;
    url: string;
}

interface SEOProps {
    title: string;
    description: string;
    image?: string;
    url?: string;
    type?: string;
    // Structured data props
    product?: ProductSchema;
    breadcrumbs?: BreadcrumbItem[];
    isHomepage?: boolean;
    canonical?: string;
}

const SITE_NAME = "Solely Kenya";
const SITE_URL = "https://solelyshoes.co.ke";

// Map product conditions to Schema.org ItemCondition
const conditionToSchema: Record<string, string> = {
    new: "https://schema.org/NewCondition",
    like_new: "https://schema.org/UsedCondition",
    good: "https://schema.org/UsedCondition",
    fair: "https://schema.org/UsedCondition",
};

export const SEO = ({
    title,
    description,
    image = "/og-image.png",
    url,
    type = "website",
    product,
    breadcrumbs,
    isHomepage = false,
    canonical,
}: SEOProps) => {
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);
    const fullTitle = isHomepage ? `${SITE_NAME} - Buy & Sell Shoes in Kenya` : `${title} | ${SITE_NAME}`;
    const fullImageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;
    const canonicalUrl = canonical || currentUrl;

    // Organization schema (shown on homepage)
    const organizationSchema = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": SITE_NAME,
        "alternateName": "Solely Shoes Kenya",
        "url": SITE_URL,
        "logo": `${SITE_URL}/favicon.ico`,
        "description": "Kenya's friendly shoe marketplace. Buy quality shoes from trusted vendors or start selling your shoes today.",
        "areaServed": {
            "@type": "Country",
            "name": "Kenya"
        },
        "sameAs": [
            "https://twitter.com/solely_kenya"
        ]
    };

    // WebSite schema with search action (shown on homepage)
    const websiteSchema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": SITE_NAME,
        "url": SITE_URL,
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${SITE_URL}/shop?search={search_term_string}`
            },
            "query-input": "required name=search_term_string"
        }
    };

    // Calculate price validity (1 year from now)
    const priceValidUntil = new Date();
    priceValidUntil.setFullYear(priceValidUntil.getFullYear() + 1);

    // Product schema
    const productSchema = product ? {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description || description,
        "image": product.images,
        "brand": product.brand ? {
            "@type": "Brand",
            "name": product.brand
        } : undefined,
        "sku": product.sku,
        "aggregateRating": product.reviewCount && product.reviewCount > 0 ? {
            "@type": "AggregateRating",
            "ratingValue": product.ratingValue,
            "reviewCount": product.reviewCount
        } : undefined,
        "offers": {
            "@type": "Offer",
            "price": product.price,
            "priceCurrency": product.currency || "KES",
            "priceValidUntil": priceValidUntil.toISOString().split('T')[0],
            "availability": product.availability === 'InStock'
                ? "https://schema.org/InStock"
                : "https://schema.org/OutOfStock",
            "itemCondition": conditionToSchema[product.condition] || conditionToSchema.new,
            "shippingDetails": {
                "@type": "OfferShippingDetails",
                "shippingDestination": {
                    "@type": "DefinedRegion",
                    "addressCountry": "KE"
                },
                "shippingRate": {
                    "@type": "MonetaryAmount",
                    "value": 0,
                    "currency": "KES"
                }
            },
            "hasMerchantReturnPolicy": {
                "@type": "MerchantReturnPolicy",
                "returnPolicyCategory": "https://schema.org/MerchantReturnNotPermitted",
                "description": "Returns only accepted if the buyer has an issue with the product (e.g. defects)."
            },
            "seller": {
                "@type": "Organization",
                "name": SITE_NAME
            }
        }
    } : null;

    // Breadcrumb schema
    const breadcrumbSchema = breadcrumbs && breadcrumbs.length > 0 ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`
        }))
    } : null;

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={description} />
            <link rel="canonical" href={canonicalUrl} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={product ? "product" : type} />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={fullImageUrl} />
            <meta property="og:site_name" content={SITE_NAME} />

            {/* Product-specific OG tags */}
            {product && (
                <>
                    <meta property="product:price:amount" content={String(product.price)} />
                    <meta property="product:price:currency" content={product.currency || "KES"} />
                    <meta property="product:availability" content={product.availability === 'InStock' ? 'in stock' : 'out of stock'} />
                    <meta property="product:condition" content={product.condition === 'new' ? 'new' : 'used'} />
                </>
            )}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@solely_kenya" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={fullImageUrl} />

            {/* JSON-LD Structured Data */}
            {isHomepage && (
                <>
                    <script type="application/ld+json">
                        {JSON.stringify(organizationSchema)}
                    </script>
                    <script type="application/ld+json">
                        {JSON.stringify(websiteSchema)}
                    </script>
                </>
            )}

            {productSchema && (
                <script type="application/ld+json">
                    {JSON.stringify(productSchema)}
                </script>
            )}

            {breadcrumbSchema && (
                <script type="application/ld+json">
                    {JSON.stringify(breadcrumbSchema)}
                </script>
            )}
        </Helmet>
    );
};
