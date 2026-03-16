import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { Shield, Lock, TrendingUp, DollarSign, LayoutDashboard, Search, ShoppingBag, Tag, CheckCircle, Truck, RefreshCw, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DynamicHeroText } from "@/components/DynamicHeroText";
import FloatingShoes from "@/components/FloatingShoes";
import ParallaxHero from "@/components/ParallaxHero";
import { CATEGORIES, MAIN_CATEGORIES } from "@/lib/categories";
import { MoreHorizontal } from "lucide-react";
import { PendingOrdersBanner } from "@/components/vendor/PendingOrdersBanner";
import { SneakerLoader } from "@/components/ui/SneakerLoader";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { rankBySearchHistory, saveSearch } from "@/lib/searchHistory";
// Swiper
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, FreeMode } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/free-mode';


const Home = () => {
  const { isVendor } = useAuth();
  const navigate = useNavigate();
  const [popularProducts, setPopularProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heroSearch, setHeroSearch] = useState("");

  useEffect(() => {
    fetchPopularProducts();
  }, []);

  const fetchPopularProducts = async () => {
    try {
      const { data: productsData, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) throw error;

      if (!productsData || productsData.length === 0) {
        setPopularProducts([]);
        setLoading(false);
        return;
      }

      // Fetch reviews
      const productIds = productsData.map(p => p.id);
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("product_id, rating")
        .in("product_id", productIds);

      const reviewStats: Record<string, { sum: number; count: number }> = {};
      (reviewsData || []).forEach(review => {
        if (!reviewStats[review.product_id]) {
          reviewStats[review.product_id] = { sum: 0, count: 0 };
        }
        reviewStats[review.product_id].sum += review.rating;
        reviewStats[review.product_id].count += 1;
      });

      const productsWithStats = productsData.map(product => {
        const stats = reviewStats[product.id];
        return {
          ...product,
          averageRating: stats ? stats.sum / stats.count : null,
          reviewCount: stats ? stats.count : 0,
        };
      });

      // Sort: reviewed products first, then by review count, then by date
      const hasReviews = productsWithStats.some(p => p.reviewCount > 0);
      if (hasReviews) {
        productsWithStats.sort((a, b) => {
          if (b.reviewCount !== a.reviewCount) return b.reviewCount - a.reviewCount;
          return (b.averageRating || 0) - (a.averageRating || 0);
        });
      }

      // Apply personalised + shuffled ranking
      setPopularProducts(rankBySearchHistory(productsWithStats));
    } catch (error) {
      console.error("Error fetching products:", error);
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

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      saveSearch(heroSearch.trim());
      navigate(`/shop?search=${encodeURIComponent(heroSearch.trim())}`);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <SEO
        title="Buy & Sell Shoes Online Kenya"
        description="Kenya's trusted online shoe marketplace. Shop authentic Nike, Adidas, Jordan sneakers. Buy formal, casual & sports shoes in Nairobi. Sell with escrow protection. Free Kenya-wide delivery."
        canonical="https://solelyshoes.co.ke/"
        isHomepage={true}
      />

      <PendingOrdersBanner />

      {/* ─── HERO ─── */}
      <ParallaxHero>
        {/* Floating Shoes - Desktop Only */}
        <FloatingShoes />

        <div className="relative z-10 w-full px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 pt-16 sm:pt-24 pointer-events-none">
          <div className="container mx-auto pointer-events-auto">
            <div className="max-w-xl">
              {/* Verified Sellers Badge */}
              <div className="mb-4">
                <span className="inline-flex items-center gap-1.5 bg-primary/90 text-primary-foreground text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm">
                  <CheckCircle className="h-3.5 w-3.5" />
                  VERIFIED SELLERS
                </span>
              </div>

              {/* Dynamic Headline */}
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white mb-3 leading-tight">
                <DynamicHeroText
                  texts={[
                    "Find Your Perfect Sole",
                    "Shop Safely with Escrow",
                    "Sell with Zero Upfront Fees",
                    "Guaranteed Authenticity"
                  ]}
                  className="block"
                />
              </h1>
              <p className="text-sm sm:text-base text-white/80 mb-5 sm:mb-6 max-w-md">
                Authentic shoes from verified vendors with escrow protection.
              </p>

              {/* Search Bar */}
              <form onSubmit={handleHeroSearch} className="w-full max-w-md">
                <div className="flex items-center bg-white p-1.5 sm:p-2 rounded-full shadow-xl">
                  <Search className="h-5 w-5 text-muted-foreground ml-3 sm:ml-4 shrink-0" />
                  <Input
                    type="text"
                    placeholder="Search brands, styles..."
                    value={heroSearch}
                    onChange={(e) => setHeroSearch(e.target.value)}
                    className="flex-1 border-0 shadow-none bg-transparent h-10 sm:h-12 px-3 text-foreground text-sm sm:text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center transition-colors shrink-0"
                  >
                    <ArrowRight className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </form>
            </div>{/* end max-w-xl */}
          </div>
        </div>
      </ParallaxHero>

      {/* ─── CTA BUTTONS + TRUST STRIP ─── */}
      <section className="bg-background">
        <ScrollReveal mode="fade-up">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* CTA Buttons */}
            <div className="flex justify-center gap-3 sm:gap-4 py-5 sm:py-6">
              <Button size="lg" asChild className="flex-1 sm:flex-none rounded-full h-12 sm:h-14 gap-2 text-sm sm:text-base font-semibold shadow-sm tap-active sm:px-10">
                <Link to="/shop">
                  <ShoppingBag className="h-5 w-5" />
                  Shop Now
                </Link>
              </Button>
              {isVendor ? (
                <Button size="lg" variant="outline" asChild className="flex-1 sm:flex-none rounded-full h-12 sm:h-14 gap-2 text-sm sm:text-base font-semibold tap-active sm:px-10">
                  <Link to="/vendor/dashboard">
                    <LayoutDashboard className="h-5 w-5" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <Button size="lg" variant="outline" asChild className="flex-1 sm:flex-none rounded-full h-12 sm:h-14 gap-2 text-sm sm:text-base font-semibold tap-active sm:px-10">
                  <Link to="/vendor">
                    <Tag className="h-5 w-5" />
                    Sell Yours
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </ScrollReveal>
      </section>



      {/* ─── POPULAR PICKS ─── */}
      <section className="py-6 sm:py-10 bg-muted/30">
        <ScrollReveal mode="fade-up" delay={0.1}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                Popular Picks
              </h2>
              <Link to="/shop" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative group">
              {loading ? (
                <div className="flex justify-center p-8">
                  <SneakerLoader message="Loading..." size="sm" fullScreen={false} />
                </div>
              ) : popularProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No products available yet.
                </div>
              ) : (
                <Swiper
                  modules={[Navigation, Autoplay, FreeMode]}
                  spaceBetween={12}
                  slidesPerView={2}
                  navigation
                  autoplay={{ delay: 4000, disableOnInteraction: false }}
                  freeMode={true}
                  breakpoints={{
                    640: { slidesPerView: 2, spaceBetween: 16 },
                    768: { slidesPerView: 3, spaceBetween: 20 },
                    1024: { slidesPerView: 4, spaceBetween: 24 },
                  }}
                  className="pb-6 !px-1 select-none"
                >
                  {popularProducts.map((product) => (
                    <SwiperSlide key={product.id} className="h-auto py-1">
                      <ProductCard
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
                    </SwiperSlide>
                  ))}
                </Swiper>
              )}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── SHOP BY STYLE ─── */}
      <section className="py-6 sm:py-10">
        <ScrollReveal mode="fade-up" delay={0.1}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-5 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Shop by Style</h2>
              <Link to="/shop" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
                See All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {MAIN_CATEGORIES.map((category) => (
                <Link
                  key={category.name}
                  to={`/shop?category=${category.key}`}
                  className="group block"
                  onClick={() => window.scrollTo(0, 0)}
                >
                  <div className="bg-card border border-border rounded-xl p-4 sm:p-6 text-center hover:shadow-md hover:border-primary/50 transition-all duration-200 min-h-[80px] sm:min-h-[100px] flex flex-col justify-center">
                    <h3 className="text-sm sm:text-base font-semibold mb-0.5 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {categoryCounts[category.key] || 0} {categoryCounts[category.key] === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </Link>
              ))}
              <Link to="/shop" className="group block">
                <div className="bg-card border border-border rounded-xl p-4 sm:p-6 text-center hover:shadow-md hover:border-primary/50 transition-all duration-200 min-h-[80px] sm:min-h-[100px] flex flex-col justify-center">
                  <MoreHorizontal className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors mx-auto mb-1" />
                  <h3 className="text-sm sm:text-base font-semibold mb-0.5 group-hover:text-primary transition-colors">
                    Other
                  </h3>
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    School, Open, Boots & More
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── THE SOLE-LY GUARANTEE ─── */}
      <section className="py-8 sm:py-12 bg-muted/30">
        <ScrollReveal mode="fade-up" delay={0.1}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-2">The Sole-ly Guarantee</h2>
            <p className="text-center text-sm text-muted-foreground mb-6 sm:mb-8">Your money is protected at every step.</p>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-card border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="h-4 w-4 text-primary flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base">Secure Holding</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">Payments held in our safety vault, not sent to sellers directly.</p>
              </div>
              <div className="bg-card border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base">Check the Fit</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">See your shoes in person before funds are released.</p>
              </div>
              <div className="bg-card border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base">Your Final Say</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">We release funds only after you confirm you're happy.</p>
              </div>
              <div className="bg-card border rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="h-4 w-4 text-primary flex-shrink-0" />
                  <h3 className="font-semibold text-sm sm:text-base">Got Your Back</h3>
                </div>
                <p className="text-muted-foreground text-xs sm:text-sm">Our team resolves disputes quickly and fairly.</p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ─── FOR VENDORS ─── */}
      <section className="py-8 sm:py-12 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <ScrollReveal mode="fade-up" delay={0.2}>
            <h2 className="text-xl sm:text-2xl font-bold text-center mb-2">Grow Your Shoe Business</h2>
            <p className="text-center text-sm text-muted-foreground mb-6 sm:mb-8">Zero upfront costs. 10% commission only on sales.</p>
          </ScrollReveal>
          <ScrollReveal mode="fade-up" delay={0.3}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 py-4 sm:py-6">
              {/* Escrow Protection */}
              <div className="flex items-center justify-start md:justify-center gap-3 sm:gap-4">
                <div className="bg-primary/10 rounded-full p-2.5 sm:p-3 shrink-0">
                  <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-semibold text-foreground">Escrow Protection</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">Your payment is held safely until delivery</span>
                </div>
              </div>

              {/* Trusted Vendors */}
              <div className="flex items-center justify-start md:justify-center gap-3 sm:gap-4">
                <div className="bg-primary/10 rounded-full p-2.5 sm:p-3 shrink-0">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm sm:text-base font-semibold text-foreground">Trusted Vendors</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">Verified sellers with ratings</span>
                </div>
              </div>

              {/* Fair Commission */}
              <div className="flex items-center justify-start md:justify-center gap-3 sm:gap-4">
                <div className="bg-primary/10 rounded-full p-2.5 sm:p-3 shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm sm:text-base font-semibold text-foreground">Fair Commission</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">10% commission, no hidden fees</span>
                </div>
              </div>
            </div>
            <div className="text-center mt-6">
              {isVendor ? (
                <Button asChild className="rounded-full h-11 px-6 gap-2">
                  <Link to="/vendor/dashboard">
                    <LayoutDashboard className="h-4 w-4" />
                    Vendor Dashboard
                  </Link>
                </Button>
              ) : (
                <Button asChild className="rounded-full h-11 px-6 gap-2">
                  <Link to="/vendor">
                    <Tag className="h-4 w-4" />
                    Start Selling
                  </Link>
                </Button>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-12 sm:py-16 bg-gradient-hero text-primary-foreground">
        <ScrollReveal mode="fade-up" delay={0.2}>
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Ready to Get Started?</h2>
            <p className="text-sm sm:text-lg mb-5 sm:mb-6 opacity-90 max-w-xl mx-auto">
              Join buyers and sellers making shoe shopping easy in Kenya
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button size="lg" variant="secondary" asChild className="rounded-full">
                <Link to="/shop">Start Shopping</Link>
              </Button>
              {isVendor ? (
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  asChild
                >
                  <Link to="/vendor/dashboard">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                  asChild
                >
                  <Link to="/vendor">Become a Vendor</Link>
                </Button>
              )}
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
};

export default Home;
