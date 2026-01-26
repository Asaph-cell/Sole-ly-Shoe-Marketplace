import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, ArrowLeft, Bell, BellOff, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VendorRating } from "@/components/VendorRating";
import { ProductReviews } from "@/components/ProductReviews";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { SneakerLoader } from "@/components/ui/SneakerLoader";
import { SEO } from "@/components/SEO";
import { ShoeSizeChart } from "@/components/ShoeSizeChart";

// Condition labels for display - with footwear and accessory-specific descriptions
const conditionLabels: Record<string, { label: string; color: string; footwearDesc: string; accessoryDesc: string }> = {
  new: { label: "", color: "bg-green-500", footwearDesc: "Brand new condition", accessoryDesc: "Brand new condition" },
  like_new: { label: "Like New", color: "bg-blue-500", footwearDesc: "Worn 1-2 times, no visible wear", accessoryDesc: "Used once, like new condition" },
  good: { label: "Good", color: "bg-yellow-500", footwearDesc: "Light wear, minor scuffs", accessoryDesc: "Good condition, minor signs of use" },
  fair: { label: "Fair", color: "bg-orange-500", footwearDesc: "Visible wear, still functional", accessoryDesc: "Visible wear, fully functional" },
};

// Helper to get condition description based on category
const getConditionDescription = (condition: string, category: string): string => {
  const isAccessory = category?.toLowerCase() === 'accessories';
  const conditionInfo = conditionLabels[condition] || conditionLabels.new;
  return isAccessory ? conditionInfo.accessoryDesc : conditionInfo.footwearDesc;
};

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<any>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [reviewStats, setReviewStats] = useState({ count: 0, average: 0 }); // Added review stats state
  const [loading, setLoading] = useState(true);
  const [priceAlertActive, setPriceAlertActive] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const [videoAspect, setVideoAspect] = useState<"portrait" | "landscape" | "square">("square");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { addItem, items } = useCart();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (id) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("status", "active")
        .single();

      if (productError) throw productError;

      if (!productData) {
        toast.error("Product not found");
        return;
      }

      setProduct(productData);

      // Fetch vendor profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", productData.vendor_id)
        .single();

      setVendorProfile(profileData);

      // Fetch reviews stats
      const { data: reviewsData } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", id);

      if (reviewsData) {
        const count = reviewsData.length;
        const average = count > 0
          ? reviewsData.reduce((acc, curr) => acc + curr.rating, 0) / count
          : 0;
        setReviewStats({ count, average });
      }

      // Increment product views
      await supabase
        .from("product_views")
        .insert({ product_id: id });

    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  // Check if user has active price alert
  useEffect(() => {
    const checkPriceAlert = async () => {
      if (!user || !id) return;
      try {
        const { data } = await supabase
          .from("price_alerts")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_id", id)
          .eq("is_active", true)
          .maybeSingle();

        setPriceAlertActive(!!data);
      } catch (error) {
        console.error("Error checking price alert:", error);
      }
    };
    checkPriceAlert();
  }, [user, id]);


  // Only require size if it's NOT an accessory and sizes exist
  const requireSizeSelection = product?.category !== 'accessories' && product?.sizes && product.sizes.length > 0 && product.sizes[0] !== "";

  // Only require color if colors exist
  const requireColorSelection = product?.colors && product.colors.length > 0 && product.colors[0] !== "";

  const ensureColorSelected = () => {
    if (requireColorSelection && !selectedColor) {
      toast.error("Please select a color");
      return false;
    }
    return true;
  };

  const ensureSizeSelected = () => {
    if (requireSizeSelection && !selectedSize) {
      toast.error("Please select a size first");
      return false;
    }
    return true;
  };

  const addProductToCart = (showToast = true) => {
    if (!user) {
      toast.error("Please login to add items to your cart");
      navigate("/auth");
      return false;
    }
    if (!product) return false;
    if (product.stock === 0) {
      toast.error("This product is currently out of stock");
      return false;
    }
    if (!ensureSizeSelected()) return false;
    if (!ensureColorSelected()) return false;

    addItem(
      {
        productId: product.id,
        vendorId: product.vendor_id,
        name: product.name,
        priceKsh: product.price_ksh,
        imageUrl: product.images?.[0] || null,
        size: selectedSize, // Pass the selected size from product page
        availableSizes: product.sizes || [], // Pass available sizes for validation
        color: selectedColor, // Pass selected color
        availableColors: product.colors || [], // Pass available colors
      },
      1
    );
    if (showToast) {
      toast.success("Added to cart");
    }
    return true;
  };

  const handleAddToCart = () => {
    addProductToCart(true);
  };

  const handleBuyNow = () => {
    if (!product) return;

    // Check if item is already in cart
    const existingItem = items.find(item => item.productId === product.id);

    if (existingItem) {
      navigate("/checkout");
    } else {
      const added = addProductToCart(false);
      if (added) {
        navigate("/checkout");
      }
    }
  };

  if (loading) {
    return <SneakerLoader message="Finding your perfect pair..." />;
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground">Product not found</p>
        <Button asChild>
          <Link to="/shop">Back to Shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 sm:py-8 pb-24 md:pb-8 overflow-x-hidden">
      {product && (
        <SEO
          title={product.name}
          description={product.description || `Buy ${product.name} at Solely Kenya. ${product.brand ? `Brand: ${product.brand}.` : ''} Price: KES ${product.price_ksh.toLocaleString()}.`}
          image={product.images?.[0]}
          type="product"
          canonical={`https://solelyshoes.co.ke/product/${product.id}`}
          product={{
            name: product.name,
            price: product.price_ksh,
            currency: "KES",
            condition: product.condition || "new",
            availability: product.stock > 0 ? "InStock" : "OutOfStock",
            images: product.images || [],
            brand: product.brand,
            sku: product.id,
            description: product.description,
            reviewCount: reviewStats.count,
            ratingValue: reviewStats.average
          }}
          breadcrumbs={[
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
            { name: product.category ? product.category.charAt(0).toUpperCase() + product.category.slice(1) : "Shoes", url: product.category ? `/shop?category=${product.category}` : "/shop" },
            { name: product.name, url: `/product/${product.id}` }
          ]}
        />
      )}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Minimalist Header/Breadcrumb */}
        <div className="mb-4 sm:mb-6">
          <Link to="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
          <div className="space-y-4">
            {/* Mobile Gallery - Card-based design with horizontal carousel */}
            <div className="md:hidden">
              {/* Main Image Card */}
              <div
                className="aspect-square overflow-hidden rounded-4xl shadow-sm bg-muted relative cursor-pointer"
                onClick={() => {
                  setLightboxIndex(selectedImage === -1 ? 0 : selectedImage);
                  setLightboxOpen(true);
                }}
              >
                {selectedImage === -1 && product.video_url ? (
                  <video
                    src={product.video_url}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    autoPlay
                    controls={false}
                  />
                ) : (
                  <img
                    src={product.images?.[selectedImage === -1 ? 0 : selectedImage] || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Horizontal Thumbnail Carousel */}
              <div className="flex justify-center overflow-x-auto gap-3 mt-4 pb-2 scrollbar-hide snap-x snap-mandatory">
                {/* Video thumbnail */}
                {product.video_url && (
                  <button
                    onClick={() => setSelectedImage(-1)}
                    className={`aspect-square w-20 shrink-0 overflow-hidden rounded-2xl shadow-sm transition-all snap-start ${selectedImage === -1 ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                  >
                    <div className="relative w-full h-full">
                      <img
                        src={product.images?.[0] || "/placeholder.svg"}
                        alt="Video preview"
                        className="w-full h-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="bg-purple-500 rounded-full p-1">
                          <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>
                )}
                {/* Image thumbnails */}
                {product.images?.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square w-20 shrink-0 overflow-hidden rounded-2xl shadow-sm transition-all snap-start ${selectedImage === index ? "ring-2 ring-primary ring-offset-2" : ""
                      }`}
                  >
                    <img
                      src={image}
                      alt={`Product view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop: Original clickable gallery */}
            <div className="hidden md:block">
              <div className={`overflow-hidden rounded-xl border-2 border-border bg-muted relative ${selectedImage === -1 && product.video_url
                ? videoAspect === "portrait"
                  ? "aspect-[9/16] max-h-[600px] mx-auto"
                  : videoAspect === "landscape"
                    ? "aspect-video"
                    : "aspect-square"
                : "aspect-square"
                }`}>
                {/* Show video if selected (index -1) and video exists */}
                {selectedImage === -1 && product.video_url ? (
                  <video
                    src={product.video_url}
                    className="w-full h-full object-contain bg-black"
                    muted
                    loop
                    playsInline
                    autoPlay
                    controls={false}
                    onLoadedMetadata={(e) => {
                      const video = e.currentTarget;
                      const ratio = video.videoWidth / video.videoHeight;
                      if (ratio < 0.8) setVideoAspect("portrait");
                      else if (ratio > 1.2) setVideoAspect("landscape");
                      else setVideoAspect("square");
                    }}
                  />
                ) : (
                  <img
                    src={product.images?.[selectedImage === -1 ? 0 : selectedImage] || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    fetchPriority="high"
                  />
                )}
              </div>
              {/* Thumbnails including video */}
              <div className="grid grid-cols-5 gap-2 mt-4">
                {/* Video thumbnail */}
                {product.video_url && (
                  <button
                    onClick={() => setSelectedImage(-1)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all relative ${selectedImage === -1 ? "border-primary shadow-hover" : "border-border hover:border-primary/50"
                      }`}
                  >
                    <img
                      src={product.images?.[0] || "/placeholder.svg"}
                      alt="Video preview"
                      className="w-full h-full object-cover opacity-80"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="bg-purple-500 rounded-full p-1.5">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </button>
                )}
                {/* Image thumbnails */}
                {product.images?.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${selectedImage === index ? "border-primary shadow-hover" : "border-border hover:border-primary/50"
                      }`}
                  >
                    <img
                      src={image}
                      alt={`Product view ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              {product.brand && <Badge className="mb-2">{product.brand}</Badge>}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">{product.name}</h1>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-4 sm:mb-6">KES {product.price_ksh.toLocaleString()}</p>
              {product.stock > 0 ? (
                <Badge variant="default">In Stock ({product.stock} available)</Badge>
              ) : (
                <Badge variant="secondary">Out of Stock</Badge>
              )}
            </div>

            {/* Condition Display */}
            {product.condition && (
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <span className={`w-3 h-3 rounded-full ${conditionLabels[product.condition]?.color || conditionLabels.new.color}`}></span>
                <div>
                  <span className="font-medium">
                    {conditionLabels[product.condition]?.label || "New"}
                  </span>
                  <span className="text-muted-foreground text-sm ml-2">
                    - {getConditionDescription(product.condition, product.category)}
                  </span>
                </div>
              </div>
            )}
            {product.condition_notes && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                Seller note: {product.condition_notes}
              </p>
            )}

            {product.description && (
              <div className="border-t border-border pt-6">
                <p className="text-muted-foreground leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Size Selection */}
            {requireSizeSelection && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Select Size (EU)</label>
                  <ShoeSizeChart selectedSize={selectedSize} availableSizes={product.sizes} />
                </div>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose your size" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.sizes.map((size: string) => (
                      <SelectItem key={size} value={size}>
                        EU {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedSize && (
                  <p className="text-xs text-muted-foreground">Please select a size to continue</p>
                )}
              </div>
            )}

            {/* Color Selection */}
            {requireColorSelection && (
              <div className="space-y-3 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold">Select Color</label>
                </div>
                <Select value={selectedColor} onValueChange={setSelectedColor}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a color" />
                  </SelectTrigger>
                  <SelectContent>
                    {product.colors.map((color: string) => (
                      <SelectItem key={color} value={color}>
                        {color}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!selectedColor && (
                  <p className="text-xs text-muted-foreground">Please select a color to continue</p>
                )}
              </div>
            )}

            {/* Features */}
            {product.key_features && product.key_features.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Key Features:</h3>
                <ul className="space-y-2">
                  {product.key_features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTA Buttons - Hidden on mobile (shown in sticky bar) */}
            <div className="hidden md:block space-y-3 pt-6">
              <Button
                size="lg"
                className="w-full min-h-[48px]"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full min-h-[48px]"
                onClick={handleBuyNow}
                disabled={product.stock === 0}
              >
                Buy Now
              </Button>

              {/* Price Alert Button */}
              <Button
                size="lg"
                variant="ghost"
                className={`w-full min-h-[48px] ${priceAlertActive ? 'text-primary' : 'text-muted-foreground'}`}
                onClick={async () => {
                  if (!user) {
                    toast.info("Please sign in to set price alerts");
                    navigate("/auth?redirect=/product/" + id);
                    return;
                  }
                  setAlertLoading(true);
                  try {
                    if (priceAlertActive) {
                      // Remove alert
                      await supabase
                        .from("price_alerts")
                        .delete()
                        .eq("user_id", user.id)
                        .eq("product_id", id);
                      setPriceAlertActive(false);
                      toast.success("Price alert removed");
                    } else {
                      // Add alert
                      await supabase
                        .from("price_alerts")
                        .upsert({
                          user_id: user.id,
                          product_id: id,
                          original_price: product.price_ksh,
                          is_active: true,
                        });
                      setPriceAlertActive(true);
                      toast.success("You'll be notified when the price drops!");
                    }
                  } catch (error: any) {
                    toast.error("Failed to set price alert");
                  } finally {
                    setAlertLoading(false);
                  }
                }}
                disabled={alertLoading}
              >
                {priceAlertActive ? (
                  <><BellOff className="h-4 w-4 mr-2" /> Remove Price Alert</>
                ) : (
                  <><Bell className="h-4 w-4 mr-2" /> Notify me on price drop</>
                )}
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Escrow Protected</p>
                  <p className="text-xs text-muted-foreground">Payment held until delivery</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Verified Seller</p>
                  <p className="text-xs text-muted-foreground">
                    {vendorProfile?.store_name || "Trusted seller"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Reviews Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <ProductReviews productId={product.id} />
      </div>

      {/* Vendor Rating Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-28 md:pb-12">
        <VendorRating vendorId={product.vendor_id} productId={product.id} />
      </div>

      {/* Floating Mobile Action Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm rounded-t-3xl shadow-card p-4 z-40 safe-bottom">
        <div className="flex gap-3">
          <Button
            size="lg"
            variant="outline"
            className="flex-1 min-h-[48px] tap-active rounded-2xl"
            onClick={handleAddToCart}
            disabled={product.stock === 0}
          >
            Add to Cart
          </Button>
          <Button
            size="lg"
            className="flex-[1.5] min-h-[48px] tap-active rounded-2xl"
            onClick={handleBuyNow}
            disabled={product.stock === 0}
          >
            Buy Now
          </Button>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {lightboxOpen && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Close button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/40 rounded-full p-2"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {product.images?.length || 1}
          </div>

          {/* Previous button */}
          {product.images?.length > 1 && (
            <button
              onClick={() => setLightboxIndex(prev => prev > 0 ? prev - 1 : (product.images?.length || 1) - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 z-10"
            >
              <ChevronLeft className="h-8 w-8 text-white" />
            </button>
          )}

          {/* Next button */}
          {product.images?.length > 1 && (
            <button
              onClick={() => setLightboxIndex(prev => prev < (product.images?.length || 1) - 1 ? prev + 1 : 0)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-2 z-10"
            >
              <ChevronRight className="h-8 w-8 text-white" />
            </button>
          )}

          {/* Zoomable image */}
          <img
            src={product.images?.[lightboxIndex] || "/placeholder.svg"}
            alt={`${product.name} - ${lightboxIndex + 1}`}
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: 'pinch-zoom' }}
          />
        </div>
      )}
    </div>
  );
};

export default Product;
