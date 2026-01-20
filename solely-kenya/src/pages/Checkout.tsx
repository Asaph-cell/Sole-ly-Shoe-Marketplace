import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Phone, MapPin, Store, Mail } from "lucide-react";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { LocationPinMap } from "@/components/LocationPinMap";
import { calculateDeliveryFee } from "@/utils/deliveryPricing";

const paymentOptions = [
  { value: "intasend", label: "Pay with M-Pesa / Card (Online)", icon: "💳", description: "Secure payment via IntaSend" },
];

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  // CHECKOUT ENABLED
  const CHECKOUT_DISABLED = false;

  const [processing, setProcessing] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<string>("intasend");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [vendorProfile, setVendorProfile] = useState<any>(null);
  const [vendorCounty, setVendorCounty] = useState<string | null>(null);
  const [shipping, setShipping] = useState({
    recipientName: user?.user_metadata?.full_name || "",
    phone: "",
    email: user?.email ?? "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postalCode: "",
    deliveryNotes: "",
  });

  // Delivery zone and fee state
  const [deliveryZone, setDeliveryZone] = useState<1 | 2 | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState("");

  // GPS location state
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
    googleMapsLink: string;
  } | null>(null);

  // Calculate shipping fee based on delivery type and zone
  const shippingFee = useMemo(() => {
    if (deliveryType === "pickup") return 0;
    return deliveryFee;
  }, [deliveryType, deliveryFee]);

  const total = useMemo(() => subtotal + shippingFee, [subtotal, shippingFee]);

  // Fetch vendor profile and location
  useEffect(() => {
    const fetchVendorProfile = async () => {
      if (items.length > 0) {
        try {
          // Get vendor ID from first item
          const productId = items[0].productId;
          const { data: product } = await supabase
            .from("products")
            .select("vendor_id")
            .eq("id", productId)
            .single();

          if (product?.vendor_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("*, vendor_county, vendor_city")
              .eq("id", product.vendor_id)
              .single();

            if (profile) {
              setVendorProfile(profile);
              setVendorCounty(profile.vendor_county || null);
            }
          }
        } catch (error) {
          console.error("Error fetching vendor profile:", error);
        }
      }
    };

    fetchVendorProfile();
  }, [items]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please login to checkout");
      navigate("/auth?redirect=/checkout");
    }
  }, [authLoading, user, navigate]);

  if (CHECKOUT_DISABLED) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-4 bg-muted/20">
        <div className="p-6 bg-background rounded-full shadow-sm">
          <Store className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Checkout Unavailable</h1>
          <p className="max-w-md text-muted-foreground">
            We are currently upgrading our payment system to ensure a seamless experience.
            Checkout is temporarily disabled.
          </p>
          <p className="text-sm text-muted-foreground">
            Please check back soon.
          </p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline" size="lg">
            <Link to="/shop">Continue Browsing</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-semibold">No items to checkout</h1>
        <Button asChild>
          <Link to="/shop">Browse the marketplace</Link>
        </Button>
      </div>
    );
  }

  const handleInputChange = (field: keyof typeof shipping) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setShipping((prev) => ({ ...prev, [field]: event.target.value }));
    };

  // Handle address selection from autocomplete
  const handleAddressSelect = (address: {
    displayName: string;
    zone: 1 | 2;
    deliveryFee: number;
    city: string;
    county: string;
    addressLine1: string;
  }) => {
    setSelectedAddress(address.displayName);

    const smartFee = calculateDeliveryFee({
      vendorCounty,
      buyerCounty: address.county,
      isPickup: false,
    });

    const zone: 1 | 2 = smartFee === 200 ? 1 : 2;

    setDeliveryZone(zone);
    setDeliveryFee(smartFee);
    setShipping((prev) => ({
      ...prev,
      addressLine1: address.addressLine1,
      city: address.city,
      county: address.county,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) {
      toast.error("Please log in to place an order");
      navigate("/auth?redirect=/checkout");
      return;
    }

    if (!paymentGateway) {
      toast.error("Select a payment method");
      return;
    }

    // Validate required fields based on delivery type
    if (!shipping.recipientName || !shipping.phone) {
      toast.error("Please provide your name and phone number");
      return;
    }

    if (deliveryType === "delivery" && (!selectedAddress || !deliveryZone)) {
      toast.error("Please select a delivery address from the suggestions");
      return;
    }

    setProcessing(true);
    try {
      // Validate cart items
      if (!items || items.length === 0) {
        toast.error("Your cart is empty");
        setProcessing(false);
        return;
      }

      // Fetch product details to validate and get vendor info
      const productIds = items.map((item) => item.productId);
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, vendor_id, name, price_ksh, stock, images, brand")
        .in("id", productIds);

      if (productsError || !products || products.length !== productIds.length) {
        throw new Error("Failed to load products. Please refresh and try again.");
      }

      // Validate single vendor
      const vendorIds = new Set(products.map((p) => p.vendor_id));
      if (vendorIds.size > 1) {
        throw new Error("You can only checkout items from one vendor at a time.");
      }
      const vendorId = products[0].vendor_id;

      // Calculate totals
      const commissionRate = 10;
      let calculatedSubtotal = 0;
      const orderItems = items.map((cartItem) => {
        const product = products.find((p) => p.id === cartItem.productId);
        if (!product) {
          throw new Error(`Product ${cartItem.name} not found`);
        }

        // Validate stock
        if (product.stock !== null && typeof product.stock === "number" && product.stock < cartItem.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Only ${product.stock} available.`);
        }

        const unitPrice = typeof product.price_ksh === "number" ? product.price_ksh : Number(product.price_ksh);
        const lineTotal = unitPrice * cartItem.quantity;
        calculatedSubtotal += lineTotal;

        return {
          product_id: product.id,
          product_name: product.name,
          product_snapshot: {
            brand: product.brand,
            images: product.images,
            price_ksh: unitPrice,
            size: cartItem.size || null, // Allow null size for accessories
          },
          quantity: cartItem.quantity,
          unit_price_ksh: unitPrice,
          line_total_ksh: lineTotal,
          size: cartItem.size || null, // Allow null size for accessories
        };
      });

      const subtotalRounded = Number(calculatedSubtotal.toFixed(2));
      const total = Number((subtotalRounded + shippingFee).toFixed(2));
      const commissionAmount = Number((subtotalRounded * (commissionRate / 100)).toFixed(2));
      const payoutAmount = Number((total - commissionAmount).toFixed(2));

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          customer_id: user.id,
          vendor_id: vendorId,
          subtotal_ksh: subtotalRounded,
          shipping_fee_ksh: shippingFee,
          total_ksh: total,
          commission_rate: commissionRate,
          commission_amount: commissionAmount,
          payout_amount: payoutAmount,
          status: "pending_payment", // Order awaits payment confirmation
        })
        .select()
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message || "Failed to create order");
      }

      // Create order items
      const itemsToInsert = orderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(itemsToInsert);
      if (itemsError) {
        // Rollback order
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(itemsError.message || "Failed to save order items");
      }

      // Create shipping details with GPS coordinates
      const { error: shippingError } = await supabase.from("order_shipping_details").insert({
        order_id: order.id,
        recipient_name: shipping.recipientName,
        phone: shipping.phone,
        email: shipping.email || null,
        address_line1: deliveryType === "delivery" ? shipping.addressLine1 : null,
        address_line2: deliveryType === "delivery" ? shipping.addressLine2 || null : null,
        city: deliveryType === "delivery" ? shipping.city : null,
        county: shipping.county || null,
        postal_code: shipping.postalCode || null,
        country: "Kenya",
        delivery_notes: shipping.deliveryNotes || null,
        delivery_type: deliveryType,
        // GPS coordinates for accurate delivery
        gps_latitude: gpsLocation?.latitude || null,
        gps_longitude: gpsLocation?.longitude || null,
      });

      if (shippingError) {
        // Rollback order and items
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(shippingError.message || "Failed to save shipping details");
      }

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          gateway: paymentGateway === "intasend" ? "intasend" : "mpesa",
          status: "pending",
          amount_ksh: total,
          currency: "KES",
        })
        .select()
        .single();

      if (paymentError || !payment) {
        // Rollback order, items, and shipping
        await supabase.from("order_shipping_details").delete().eq("order_id", order.id);
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);
        throw new Error(paymentError?.message || "Failed to create payment record");
      }

      // Handle Manual Paybill (M-Pesa)
      if (paymentGateway === "mpesa") {
        // NOTE: Email notifications will be sent after payment confirmation
        // Manual M-Pesa payments require admin verification before notifications

        clearCart();
        toast.success("Order placed! Redirecting to payment...");
        navigate(`/orders/${order.id}?payment=manual_pending`);
        return;
      }

      // Process IntaSend payment
      const { data: intasendResponse, error: intasendError } = await supabase.functions.invoke("intasend-initiate-payment", {
        body: {
          orderId: order.id,
          successUrl: `${window.location.origin}/orders/${order.id}?payment_success=true`,
          cancelUrl: `${window.location.origin}/orders/${order.id}?cancelled=true`,
        },
      });

      if (intasendError) {
        // Rollback everything
        await supabase.from("payments").delete().eq("id", payment.id);
        await supabase.from("order_shipping_details").delete().eq("order_id", order.id);
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);

        console.error("IntaSend payment error:", intasendError);
        throw new Error(intasendError.message || "Failed to initiate payment. Please try again.");
      }

      if (!intasendResponse?.success || !intasendResponse?.url) {
        // Rollback everything
        await supabase.from("payments").delete().eq("id", payment.id);
        await supabase.from("order_shipping_details").delete().eq("order_id", order.id);
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);

        const errorMsg = intasendResponse?.error || "Failed to initiate payment";
        console.error("IntaSend payment error:", intasendResponse);
        throw new Error(errorMsg);
      }

      // NOTE: Email notifications will be sent by the webhook after payment confirmation
      // This ensures buyer and vendor are only notified once payment is successful

      // Clear cart before redirecting
      clearCart();
      toast.success("Opening secure payment page...");

      // Redirect to IntaSend payment page
      window.location.href = intasendResponse.url;

    } catch (error) {
      console.error("Checkout error", error);
      const errorMessage = error instanceof Error
        ? error.message
        : "Failed to place order. Please check your connection and try again.";
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Vendor Shop Location - Show prominently at top */}
          {vendorProfile && (vendorProfile.store_name || vendorProfile.vendor_city || vendorProfile.vendor_address_line1) && (
            <Card className="border-primary/40">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Store className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Shop Location</h3>
                  </div>
                  {vendorProfile.store_name && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Store Name</p>
                      <p className="text-base font-semibold">{vendorProfile.store_name}</p>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-sm">
                        {vendorProfile.vendor_address_line1 && (
                          <>{vendorProfile.vendor_address_line1}<br /></>
                        )}
                        {vendorProfile.vendor_address_line2 && (
                          <>{vendorProfile.vendor_address_line2}<br /></>
                        )}
                        {vendorProfile.vendor_city && (
                          <>{vendorProfile.vendor_city}{vendorProfile.vendor_county ? `, ${vendorProfile.vendor_county}` : ""}</>
                        )}
                        {!vendorProfile.vendor_address_line1 && !vendorProfile.vendor_city && (
                          <span className="text-muted-foreground italic">Location details will be provided after order placement</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800 mt-3">
                    <p className="text-xs text-blue-900 dark:text-blue-100">
                      💡 <strong>Tip:</strong> Choose "Pickup" below to collect from this location and save on delivery fees!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Delivery or Pickup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={deliveryType} onValueChange={(value) => setDeliveryType(value as "delivery" | "pickup")} className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <div>
                    <span className="font-medium">Delivery</span>
                    <p className="text-xs text-muted-foreground">Product will be delivered to your address</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer hover:bg-muted">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <div>
                    <span className="font-medium">Pickup</span>
                    <p className="text-xs text-muted-foreground">Collect from vendor's location</p>
                  </div>
                </label>
              </RadioGroup>

              {deliveryType === "pickup" && (
                <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800 mt-3">
                  <p className="text-sm text-green-900 dark:text-green-100">
                    ✓ <strong>Pickup selected:</strong> No delivery fees. You'll contact the seller after placing your order to arrange pickup time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{deliveryType === "pickup" ? "Contact Information" : "Shipping Details"}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientName">Recipient name</Label>
                <Input id="recipientName" value={shipping.recipientName} onChange={handleInputChange("recipientName")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" value={shipping.phone} onChange={handleInputChange("phone")} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" value={shipping.email} onChange={handleInputChange("email")} />
              </div>
              {deliveryType === "delivery" && (
                <>
                  <div className="md:col-span-2">
                    <AddressAutocomplete
                      value={selectedAddress}
                      onAddressSelect={handleAddressSelect}
                      required={deliveryType === "delivery"}
                    />
                    {deliveryZone && (
                      <div className={`mt-3 p-3 rounded-lg border ${deliveryZone === 1 ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'}`}>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">
                            {deliveryZone === 1 ? '🏙️ Nairobi Zone' : '🌍 Outside Nairobi'}
                          </span>
                          <span className="font-bold text-lg">KES {deliveryFee.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* GPS Location Pin */}
                  <div className="md:col-span-2">
                    <div className="mb-2">
                      <Label className="text-sm font-medium">📍 Pin Exact Location (Optional)</Label>
                      <p className="text-xs text-muted-foreground">
                        For accurate delivery, especially in estates where addresses are hard to find
                      </p>
                    </div>
                    <LocationPinMap
                      onLocationSelect={(location) => {
                        setGpsLocation(location);
                        // Auto-fill address fields from GPS location
                        setShipping(prev => ({
                          ...prev,
                          addressLine1: location.addressLine1 || prev.addressLine1,
                          city: location.city || prev.city,
                          county: location.county || prev.county,
                        }));
                        // Also update the address autocomplete display
                        if (location.address) {
                          setSelectedAddress(location.address);
                        }
                        // Auto-detect zone from the city/county
                        const isNairobi = [location.city, location.county, location.address]
                          .some(field => field?.toLowerCase().includes('nairobi'));
                        if (isNairobi) {
                          setDeliveryZone(1);
                          setDeliveryFee(200);
                        } else {
                          setDeliveryZone(2);
                          setDeliveryFee(300);
                        }
                      }}
                    />
                    {gpsLocation && (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-700 dark:text-green-300">
                          ✓ GPS saved: Rider will get a <a href={gpsLocation.googleMapsLink} target="_blank" rel="noopener noreferrer" className="underline">Google Maps link</a>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address2">Apartment / Building</Label>
                    <Input id="address2" value={shipping.addressLine2} onChange={handleInputChange("addressLine2")} placeholder="Apt 4B, Jamii Tower" />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label htmlFor="county">County</Label>
                <Input id="county" value={shipping.county} onChange={handleInputChange("county")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal">Postal code</Label>
                <Input id="postal" value={shipping.postalCode} onChange={handleInputChange("postalCode")} />
              </div>
              {deliveryType === "delivery" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="notes">Delivery notes</Label>
                  <Input id="notes" value={shipping.deliveryNotes} onChange={handleInputChange("deliveryNotes")} placeholder="Gate code, landmark, preferred time, etc." />
                </div>
              )}
              {deliveryType === "pickup" && (
                <div className="md:col-span-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-900 dark:text-green-100">
                    <strong>Pickup Order:</strong> No delivery charges will apply. You can contact the seller after placing your order to arrange pickup time and location.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Choose Payment Method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={paymentGateway} onValueChange={setPaymentGateway} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paymentOptions.map((option) => (
                  <label key={option.value} className="flex items-center gap-3 border rounded-lg px-4 py-3 cursor-pointer hover:bg-muted">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <span className="text-xl">{option.icon}</span>
                    <span>{option.label}</span>
                  </label>
                ))}
              </RadioGroup>

              {paymentGateway === "intasend" && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to IntaSend's secure checkout page to pay via M-Pesa or Card.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button type="button" variant="ghost" onClick={() => navigate("/cart")}>Back to cart</Button>
            <Button type="submit" disabled={processing}>{processing ? "Processing..." : "Place order"}</Button>
          </div>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {items.map((item) => (
              <div key={item.productId} className="flex justify-between">
                <span>{item.quantity} × {item.name}</span>
                <span>KES {(item.quantity * item.priceKsh).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between pt-2 border-t">
              <span>Subtotal</span>
              <span>KES {subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Delivery</span>
              <span>
                {deliveryType === "pickup"
                  ? "Free (Pickup)"
                  : deliveryZone
                    ? `KES ${shippingFee.toLocaleString()}`
                    : "Select address"
                }
              </span>
            </div>
            {deliveryType === "delivery" && deliveryZone && (
              <p className="text-xs text-muted-foreground italic">
                {deliveryZone === 1 ? "🏙️ Nairobi zone - standard rate" : "🌍 Outside Nairobi zone"}
              </p>
            )}
            {deliveryType === "pickup" && (
              <p className="text-xs text-muted-foreground italic">
                No delivery charges for pickup orders.
              </p>
            )}
            <div className="flex justify-between font-semibold text-base">
              <span>Total due</span>
              <span>KES {total.toLocaleString()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your payment is held in Solely escrow until you and the vendor confirm delivery. If something goes wrong, file a dispute within 3 days of delivery.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;


