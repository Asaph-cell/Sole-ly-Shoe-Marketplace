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
import { ChristmasAnimation } from "@/components/ChristmasAnimation";

const Home = () => {
  const { isVendor } = useAuth();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(4);

      if (error) throw error;
      setFeaturedProducts(data || []);
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
          .ilike("category", category.key);

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
      {/* Christmas Animation */}
      <ChristmasAnimation />

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
                Kenya's secure commission-based marketplace. Shop with escrow protection or start selling with zero upfront fees. Your payment is safe until you confirm delivery.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {loading ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Loading products...
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
                  isNew={true}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Why Solely */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <TrendingUp className="h-16 w-16 text-primary mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-6">Why Solely Marketplace?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Solely Marketplace is Kenya's secure commission-based shoe marketplace. We protect buyers with escrow payments and help vendors grow with zero upfront costs. Your payment stays safe until you confirm delivery.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left mt-12">
              <div className="bg-card p-6 rounded-xl border-2 border-border shadow-soft">
                <h3 className="text-xl font-semibold mb-3">For Buyers</h3>
                <p className="text-muted-foreground">
                  Shop with confidence. Your payment is held in escrow until you confirm delivery. If something goes wrong, file a dispute within 3 days for a full refund. Browse verified vendors and compare prices in KES.
                </p>
              </div>
              <div className="bg-card p-6 rounded-xl border-2 border-border shadow-soft">
                <h3 className="text-xl font-semibold mb-3">For Vendors</h3>
                <p className="text-muted-foreground">
                  Start selling with zero upfront fees. We only take a 10% commission when you make a sale. List your shoes, manage orders, and receive payouts directly to your M-Pesa or bank account after delivery confirmation.
                </p>
              </div>
            </div>
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
