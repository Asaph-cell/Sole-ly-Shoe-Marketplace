import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Shield, ArrowLeft, Bell, BellOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VendorRating } from "@/components/VendorRating";
import { ProductReviews } from "@/components/ProductReviews";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { SEO } from "@/components/SEO";
import { ShoeSizeChart } from "@/components/ShoeSizeChart";

// Condition labels for display
const conditionLabels: Record<string, { label: string; color: string; description: string }> = {
  new: { label: "New", color: "bg-green-500", description: "Brand new, never worn" },
  like_new: { label: "Like New", color: "bg-blue-500", description: "Worn 1-2 times, no visible wear" },
  good: { label: "Good", color: "bg-yellow-500", description: "Light wear, minor scuffs" },
  fair: { label: "Fair", color: "bg-orange-500", description: "Visible wear, still functional" },
};

const Product = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [product, setProduct] = useState<any>(null);
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [priceAlertActive, setPriceAlertActive] = useState(false);
  const [alertLoading, setAlertLoading] = useState(false);
  const { addItem, items } = useCart();

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


  const requireSizeSelection = product?.sizes && product.sizes.length > 0 && product.sizes[0] !== "";

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

    addItem(
      {
        productId: product.id,
        vendorId: product.vendor_id,
        name: product.name,
        priceKsh: product.price_ksh,
        imageUrl: product.images?.[0] || null,
        size: selectedSize, // Pass the selected size from product page
        availableSizes: product.sizes || [], // Pass available sizes for validation
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading product...</p>
      </div>
    );
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
    <div className="min-h-screen py-8">
      {product && (
        <SEO
          title={product.name}
          description={product.description || `Buy ${product.name} at Solely Marketplace`}
          image={product.images?.[0]}
        />
      )}
      <div className="container mx-auto px-4">
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link to="/shop" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Shop
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden rounded-xl border-2 border-border bg-muted">
              <img
                src={product.images?.[selectedImage] || "/placeholder.svg"}
                alt={product.name}
                className="w-full h-full object-cover"
                fetchPriority="high"
              />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image: string, index: number) => (
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
            )}
          </div>

          <div className="space-y-6">
            <div>
              {product.brand && <Badge className="mb-2">{product.brand}</Badge>}
              <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              <p className="text-4xl font-bold text-primary mb-6">KES {product.price_ksh.toLocaleString()}</p>
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
                    - {conditionLabels[product.condition]?.description || "Brand new, never worn"}
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

            {/* CTA Buttons */}
            <div className="space-y-3 pt-6">
              <Button
                size="lg"
                className="w-full"
                onClick={handleAddToCart}
                disabled={product.stock === 0}
              >
                Add to Cart
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full"
                onClick={handleBuyNow}
                disabled={product.stock === 0}
              >
                Buy Now
              </Button>

              {/* Price Alert Button */}
              <Button
                size="lg"
                variant="ghost"
                className={`w-full ${priceAlertActive ? 'text-primary' : 'text-muted-foreground'}`}
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
      <div className="container mx-auto px-4 py-12">
        <ProductReviews productId={product.id} />
      </div>

      {/* Vendor Rating Section */}
      <div className="container mx-auto px-4 pb-12">
        <VendorRating vendorId={product.vendor_id} productId={product.id} />
      </div>
    </div>
  );
};

export default Product;
