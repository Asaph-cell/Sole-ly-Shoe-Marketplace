import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { Shield, Lock, TrendingUp, DollarSign, LayoutDashboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DynamicHeroText } from "@/components/DynamicHeroText";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import FloatingShoes from "@/components/FloatingShoes";
import ParallaxHero from "@/components/ParallaxHero";
import { CATEGORIES, MAIN_CATEGORIES, OTHER_CATEGORIES } from "@/lib/categories";
import { MoreHorizontal } from "lucide-react";
import { PendingOrdersBanner } from "@/components/vendor/PendingOrdersBanner";
import { SneakerLoader } from "@/components/ui/SneakerLoader";


const Home = () => {
  const { isVendor } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      // Fetch products
      const { data: productsData, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;

      // Fetch reviews for these products
      if (productsData && productsData.length > 0) {
        const productIds = productsData.map(p => p.id);
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("product_id, rating")
          .in("product_id", productIds);

        // Group reviews by product_id and calculate stats
        const reviewStats: Record<string, { sum: number; count: number }> = {};
        (reviewsData || []).forEach(review => {
          if (!reviewStats[review.product_id]) {
            reviewStats[review.product_id] = { sum: 0, count: 0 };
          }
          reviewStats[review.product_id].sum += review.rating;
          reviewStats[review.product_id].count += 1;
        });

        // Map products with their review stats
        const productsWithStats = productsData.map(product => {
          const stats = reviewStats[product.id];
          return {
            ...product,
            averageRating: stats ? stats.sum / stats.count : null,
            reviewCount: stats ? stats.count : 0,
          };
        });

        setFeaturedProducts(productsWithStats);
      } else {
        setFeaturedProducts([]);
      }
    } catch (error) {
      console.error("Error fetching featured products:", error);
    } finally {
      setLoading(false);
    }
  };

  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchCategoryCounts();
  }, []);

  const fetchCategoryCounts = async () => {
    try {
      const counts: Record<string, number> = {};

      for (const category of CATEGORIES) {
        const { count, error } = await supabase
          .from("products")
          .select("*", { count: 'exact', head: true })
          .eq("status", "active")
          .or(`category.ilike.${category.key},category.ilike.${category.name}`);

        if (error) throw error;
        counts[category.key] = count || 0;
      }

      setCategoryCounts(counts);
    } catch (error) {
      console.error("Error fetching category counts:", error);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Pending Orders Banner */}
      <PendingOrdersBanner />

      {/* Christmas Animation */}


      {/* Hero Section with Parallax and Interactive Effects */}
      <ParallaxHero>
        {/* Floating Shoes Animation */}
        <FloatingShoes />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-30 pointer-events-none">
          <ScrollReveal mode="aggressive" delay={0.2}>
            <div className="max-w-2xl pointer-events-auto">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6 leading-tight">
                <DynamicHeroText
                  texts={[
                    "Discover Your Perfect Pair!",
                    "Shop Safely with Escrow Protection",
                    "Start Selling with Zero Upfront Fees",
                    "Guaranteed Authenticity"
                  ]}
                  className="block mt-2"
                  style={{
                    color: '#8f6700',
                  }}
                />
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-bold mb-6 sm:mb-8">
                Step into style with zero stress. Your money's protected until you're in love with your shoes!
              </p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4">
                <Button size="lg" asChild className="hover:scale-105 transition-transform min-h-[48px] w-full sm:w-auto tap-active">
                  <Link to="/shop">Shop Now</Link>
                </Button>
                {isVendor ? (
                  <Button size="lg" variant="outline" asChild className="hover:scale-105 transition-transform min-h-[48px] w-full sm:w-auto tap-active">
                    <Link to="/vendor/dashboard">
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Vendor Dashboard
                    </Link>
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" asChild className="hover:scale-105 transition-transform min-h-[48px] w-full sm:w-auto tap-active">
                    <Link to="/vendor">Sell Your Shoes</Link>
                  </Button>
                )}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </ParallaxHero>

      {/* Trust Indicators */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollReveal mode="aggressive" delay={0.3} className="w-full" enableHover>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Escrow Protection</h3>
                  <p className="text-sm text-muted-foreground">Your payment is held safely until delivery</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal mode="aggressive" delay={0.4} className="w-full" enableHover>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Shield className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Trusted Vendors</h3>
                  <p className="text-sm text-muted-foreground">Verified sellers with ratings</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal mode="aggressive" delay={0.5} className="w-full" enableHover>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-4 rounded-full">
                  <DollarSign className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Fair Commission</h3>
                  <p className="text-sm text-muted-foreground">10% commission, no hidden fees</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* About Sole-ly */}
      <section className="py-12 sm:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <ScrollReveal mode="fade-up" delay={0.2}>
              <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
                <strong className="text-foreground">Sole-ly</strong> is Kenya's dedicated marketplace built for shoe lovers and verified local vendors.
                We've removed the "what-if" from online shopping by creating a space where buying and selling footwear is simple, secure, and, above all, built on trust.
              </p>
            </ScrollReveal>
          </div>

          {/* The Sole-ly Guarantee */}
          <div className="max-w-4xl mx-auto mb-16">
            <ScrollReveal mode="fade-up" delay={0.3}>
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">The Sole-ly Guarantee</h2>
              <p className="text-center text-muted-foreground mb-8">We believe you should only pay for what you love. Our escrow system ensures your money is always protected.</p>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <ScrollReveal mode="zoom-in" delay={0.4}>
                <div className="bg-muted/30 border rounded-xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Secure Holding</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">When you buy a pair, your payment is held in our secure "safety vault," not sent directly to the seller.</p>
                </div>
              </ScrollReveal>
              <ScrollReveal mode="zoom-in" delay={0.5}>
                <div className="bg-muted/30 border rounded-xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Check the Fit</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">The vendor ships your order, and you get to see them in person before we release any funds.</p>
                </div>
              </ScrollReveal>
              <ScrollReveal mode="zoom-in" delay={0.6}>
                <div className="bg-muted/30 border rounded-xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">Your Final Say</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">We only release the funds to the seller once you've confirmed you're 100% happy with your new shoes.</p>
                </div>
              </ScrollReveal>
              <ScrollReveal mode="zoom-in" delay={0.7}>
                <div className="bg-muted/30 border rounded-xl p-6 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg">We've Got Your Back</h3>
                  </div>
                  <p className="text-muted-foreground text-sm">If something isn't right, our support team is ready to step in and resolve any disputes immediately.</p>
                </div>
              </ScrollReveal>
            </div>
          </div>

          {/* For Vendors */}
          <div className="max-w-4xl mx-auto">
            <ScrollReveal mode="fade-up" delay={0.4}>
              <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">For Our Vendors: Grow Your Business, Risk-Free</h2>
              <p className="text-center text-muted-foreground mb-8">We succeed only when you do. Whether you're an established shop or a rising local brand, Sole-ly helps you reach more customers without the overhead.</p>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <ScrollReveal mode="zoom-in" delay={0.5}>
                <div className="bg-muted/30 border rounded-xl p-6 text-center h-full">
                  <DollarSign className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">List for Free</h3>
                  <p className="text-muted-foreground text-sm">Post your inventory with zero upfront costs or listing fees.</p>
                </div>
              </ScrollReveal>
              <ScrollReveal mode="zoom-in" delay={0.6}>
                <div className="bg-muted/30 border rounded-xl p-6 text-center h-full">
                  <TrendingUp className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Simple Commission</h3>
                  <p className="text-muted-foreground text-sm">We only take a flat 10% commission when you make a successful sale.</p>
                </div>
              </ScrollReveal>
              <ScrollReveal mode="zoom-in" delay={0.7}>
                <div className="bg-muted/30 border rounded-xl p-6 text-center h-full">
                  <Lock className="h-10 w-10 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">Built-in Trust</h3>
                  <p className="text-muted-foreground text-sm">We handle the payment security so you can focus on selling great shoes!</p>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      <section className="py-10 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">Shop by Style</h2>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">Find the perfect shoes for every occasion</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
            {MAIN_CATEGORIES.map((category, index) => (
              <ScrollReveal key={category.name} mode="zoom-in" delay={index * 0.1} className="w-full">
                <Link
                  to={`/shop?category=${category.key}`}
                  className="group block"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <div className="bg-gradient-card border-2 border-border rounded-xl p-6 sm:p-8 text-center hover:shadow-hover hover:border-primary transition-all duration-300 min-h-[120px] sm:min-h-[140px] flex flex-col justify-center">
                    <h3 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-sm sm:text-base text-foreground font-medium">
                      {categoryCounts[category.key] || 0} {categoryCounts[category.key] === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
            {/* Other Categories Card */}
            <ScrollReveal mode="zoom-in" delay={MAIN_CATEGORIES.length * 0.1} className="w-full">
              <Link
                to="/shop"
                className="group block"
              >
                <div className="bg-gradient-card border-2 border-border rounded-xl p-6 sm:p-8 text-center hover:shadow-hover hover:border-primary transition-all duration-300 min-h-[120px] sm:min-h-[140px] flex flex-col justify-center">
                  <div className="mx-auto mb-2">
                    <MoreHorizontal className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    Other
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    School, Open, Boots & More
                  </p>
                </div>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-10 sm:py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 sm:mb-12">
            <div>
              <h2 className="text-4xl font-bold mb-2">New Arrivals</h2>
              <p className="text-muted-foreground">Check out the latest additions to our collection</p>
            </div>
            <Button variant="outline" asChild>
              <Link to="/shop">View All</Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {loading ? (
              <div className="col-span-full">
                <SneakerLoader message="Loading new arrivals..." size="sm" fullScreen={false} />
              </div>
            ) : featuredProducts.length === 0 ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No products available yet.
              </div>
            ) : (
              featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price_ksh}
                  image={product.images?.[0] || "/placeholder.svg"}
                  brand={product.brand}
                  averageRating={product.averageRating}
                  reviewCount={product.reviewCount}
                  createdAt={product.created_at}
                  condition={product.condition}
                  videoUrl={product.video_url}
                />
              ))
            )}
          </div>
        </div>
      </section>


      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of happy buyers and sellers making shoe shopping easy in Kenya
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/shop">Start Shopping</Link>
            </Button>
            {isVendor ? (
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                asChild
              >
                <Link to="/vendor/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Vendor Dashboard
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                asChild
              >
                <Link to="/vendor">Become a Vendor</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
