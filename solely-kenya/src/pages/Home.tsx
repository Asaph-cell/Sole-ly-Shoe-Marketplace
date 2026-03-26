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
import { Badge } from "@/components/ui/badge";


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
        .limit(24);

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

      {/* ─── VENDOR TICKER BANNER ─── */}
      {!isVendor && (
        <Link to="/vendor" className="block bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity">
          <div className="overflow-hidden whitespace-nowrap py-1.5">
            <div className="inline-block animate-[scroll_25s_linear_infinite]">
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                👟 Got shoes to sell? List them here — zero upfront fees!
              </span>
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                🔥 Are you a shoe vendor? Start selling with escrow protection today!
              </span>
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                💰 Turn your shoe closet into cash - join Sole-ly as a vendor!
              </span>
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                🚀 Sell shoes online in Kenya — 10% commission, no hidden fees!
              </span>
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                👟 Got shoes to sell? List them here — zero upfront fees!
              </span>
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                🔥 Are you a shoe vendor? Start selling with escrow protection today!
              </span>
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                💰 Turn your shoe closet into cash -join Sole-ly as a vendor!
              </span>
              <span className="inline-block px-8 text-xs sm:text-sm font-medium">
                🚀 Sell shoes online in Kenya — 10% commission, no hidden fees!
              </span>
            </div>
          </div>
        </Link>
      )}

      {/* ─── COMPACT HERO STRIP ─── */}
      <section className="bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
            {/* Left: Tagline */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-lg sm:text-xl font-bold leading-snug">
                <DynamicHeroText
                  texts={[
                    "Find Your Perfect Sole",
                    "Shop Safely with Escrow",
                    "Sell with Zero Upfront Fees",
                    "Guaranteed Authenticity"
                  ]}
                  className="inline"
                />
              </h1>
              <div className="flex items-center justify-center sm:justify-start gap-3 mt-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-foreground/70">
                  <CheckCircle className="h-3 w-3" /> Verified Sellers
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary-foreground/70">
                  <Lock className="h-3 w-3" /> Escrow Protected
                </span>
              </div>
            </div>
            {/* Right: Search */}
            <form onSubmit={handleHeroSearch} className="w-full sm:w-auto sm:min-w-[320px]">
              <div className="flex items-center bg-white/95 p-1 rounded-full shadow-lg">
                <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
                <Input
                  type="text"
                  placeholder="Search brands, styles..."
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  className="flex-1 border-0 shadow-none bg-transparent h-9 px-2.5 text-foreground text-sm placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full h-8 w-8 flex items-center justify-center transition-colors shrink-0"
                >
                  <ArrowRight className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ─── QUICK ACTIONS ─── */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3 py-2.5 overflow-x-auto scrollbar-hide flex-nowrap">
            <Button size="sm" asChild className="rounded-full gap-1.5 text-xs font-semibold shrink-0 h-8">
              <Link to="/shop">
                <ShoppingBag className="h-3.5 w-3.5" />
                All Shoes
              </Link>
            </Button>
            {isVendor ? (
              <Button size="sm" variant="outline" asChild className="rounded-full gap-1.5 text-xs font-semibold shrink-0 h-8">
                <Link to="/vendor/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild className="rounded-full gap-1.5 text-xs font-semibold shrink-0 h-8">
                <Link to="/vendor">
                  <Tag className="h-3.5 w-3.5" />
                  Sell Yours
                </Link>
              </Button>
            )}
            {CATEGORIES.map((cat) => (
              <Button key={cat.key} size="sm" variant="ghost" asChild className="rounded-full text-xs font-medium shrink-0 h-8 text-muted-foreground hover:text-foreground">
                <Link to={`/shop?category=${cat.key}`}>
                  {cat.name}
                </Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── PRODUCT GRID ─── */}
      <section className="py-6 sm:py-10 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              Popular Picks
            </h2>
            <Link to="/shop" className="text-sm font-semibold text-primary hover:underline flex items-center gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="flex justify-center p-8">
              <SneakerLoader message="Loading..." size="sm" fullScreen={false} />
            </div>
          ) : popularProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products available yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {popularProducts.map((product) => (
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
              ))}
            </div>
          )}
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
              <Button
                size="lg"
                variant="outline"
                className="rounded-full bg-transparent border-2 border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary"
                asChild
              >
                <Link to="/blog">Read our Blog</Link>
              </Button>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
};

export default Home;
