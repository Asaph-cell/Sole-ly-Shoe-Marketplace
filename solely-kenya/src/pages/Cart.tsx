import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { ShoeSizeSelector } from "@/components/ShoeSizeSelector";
import { AlertTriangle, ExternalLink } from "lucide-react";

const Cart = () => {
  const { items, subtotal, totalQuantity, updateQuantity, updateSize, removeItem, clearCart, hasAllSizes, hasAllValidSizes, getInvalidSizeItems } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const deliveryEstimate = useMemo(() => {
    if (items.length === 0) return null;
    return `Estimated delivery 2-5 business days once vendor ships`;
  }, [items.length]);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    // Check if all items have sizes selected
    // Check if any item needs a size but doesn't have one
    const missingSizes = items.some(
      (item) => item.availableSizes && item.availableSizes.length > 0 && !item.size
    );

    if (missingSizes) {
      toast.error("Please select a shoe size for all items before checkout");
      return;
    }

    // Check if all selected sizes are available
    const invalidItems = getInvalidSizeItems();
    if (invalidItems.length > 0) {
      toast.error(`Size ${invalidItems[0].size} is not available for ${invalidItems[0].name}. Please select an available size or check other shops.`);
      return;
    }

    // Check if user is authenticated
    if (!authLoading && !user) {
      toast.info("Please sign in to proceed to checkout");
      navigate("/auth?redirect=/checkout");
      return;
    }

    navigate("/checkout");
  };

  // Helper to check if item's selected size is available
  const isSizeAvailable = (item: typeof items[0]) => {
    if (!item.availableSizes || item.availableSizes.length === 0) return true;
    if (!item.size) return true; // No size selected yet
    return item.availableSizes.includes(item.size);
  };

  return (
    <div className="min-h-screen bg-muted/20 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Shopping Cart</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Secure payments, escrow protection, trusted vendors.</p>
          </div>
          {items.length > 0 && (
            <Button variant="ghost" onClick={clearCart} className="text-sm min-h-[44px]">Clear Cart</Button>
          )}
        </div>

        {items.length === 0 ? (
          <Card className="p-6 sm:p-10 text-center">
            <CardTitle className="mb-3 sm:mb-4 text-lg sm:text-xl">Your cart is empty</CardTitle>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">Browse the marketplace and add your next pair of kicks.</p>
            <Button asChild className="min-h-[48px] tap-active">
              <Link to="/shop">Continue shopping</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-3 sm:space-y-4">
              {items.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4">
                    <div className="w-24 h-24 rounded-lg border overflow-hidden flex-shrink-0">
                      <img
                        src={item.imageUrl || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h2 className="text-lg font-semibold">{item.name}</h2>
                          <p className="text-sm text-muted-foreground">Sold by vendor #{item.vendorId.slice(0, 6)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">KES {(item.priceKsh * item.quantity).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">KES {item.priceKsh.toLocaleString()} each</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">Quantity</span>
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={item.quantity}
                            onChange={(event) => updateQuantity(item.productId, Number(event.target.value))}
                            className="w-20"
                          />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(item.productId)}>
                          Remove
                        </Button>
                      </div>
                      <div className="pt-2 border-t space-y-2">
                        {/* Show available sizes from this product */}
                        {item.availableSizes && item.availableSizes.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            <span className="font-medium">Available sizes: </span>
                            {item.availableSizes.join(", ")}
                          </div>
                        )}

                        <ShoeSizeSelector
                          selectedSize={item.size}
                          onSizeChange={(size) => updateSize(item.productId, size)}
                        />

                        {!item.size && item.availableSizes && item.availableSizes.length > 0 && (
                          <p className="text-xs text-destructive">⚠️ Size required for shoes before checkout</p>
                        )}

                        {/* Warning if selected size is not in available sizes */}
                        {item.size && item.availableSizes && item.availableSizes.length > 0 && !item.availableSizes.includes(item.size) && (
                          <Alert variant="destructive" className="py-2 px-3">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle className="text-sm font-medium">Size {item.size} not available</AlertTitle>
                            <AlertDescription className="text-xs space-y-2">
                              <p>This shoe is not available in size {item.size}.</p>
                              <p><strong>Available sizes:</strong> {item.availableSizes.join(", ")}</p>
                              <Link
                                to={`/shop?size=${item.size}`}
                                className="inline-flex items-center gap-1 text-primary-foreground underline hover:no-underline font-medium"
                              >
                                Find size {item.size} in other shops <ExternalLink className="h-3 w-3" />
                              </Link>
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>Items ({totalQuantity})</span>
                    <span>KES {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Platform fee</span>
                    <span>KES 0</span>
                  </div>
                  <div className="pt-4 border-t flex items-center justify-between">
                    <span className="text-base font-semibold">Subtotal</span>
                    <span className="text-xl font-bold">KES {subtotal.toLocaleString()}</span>
                  </div>
                  {deliveryEstimate && (
                    <Badge variant="outline" className="w-full justify-center py-2">
                      {deliveryEstimate}
                    </Badge>
                  )}
                  <Button className="w-full min-h-[48px] tap-active" onClick={handleCheckout}>
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Buyer Protection</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>Every payment is held securely by Solely until you confirm delivery.</p>
                  <p>Full refunds on fraud, wrong or damaged deliveries.</p>
                  <p>Need help? Email <a href="mailto:contact@solelyshoes.co.ke" className="text-primary underline">contact@solelyshoes.co.ke</a></p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;


