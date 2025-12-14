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

const paymentOptions = [
  { value: "pesapal", label: "Pay with Pesapal", icon: "💳", description: "M-Pesa, Cards, Airtel Money" },
];

const Checkout = () => {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [processing, setProcessing] = useState(false);
  const [paymentGateway, setPaymentGateway] = useState<string>("pesapal");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [vendorProfile, setVendorProfile] = useState<any>(null);;
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

  // Fetch vendor profile when pickup is selected
  useEffect(() => {
    const fetchVendorProfile = async () => {
      if (deliveryType === "pickup" && items.length > 0) {
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
              .select("*")
              .eq("id", product.vendor_id)
              .single();

            setVendorProfile(profile);
          }
        } catch (error) {
          console.error("Error fetching vendor profile:", error);
        }
      }
    };

    fetchVendorProfile();
  }, [deliveryType, items]);

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please login to checkout");
      navigate("/auth?redirect=/checkout");
    }
  }, [authLoading, user, navigate]);

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
    setDeliveryZone(address.zone);
    setDeliveryFee(address.deliveryFee);
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
            size: cartItem.size, // Include size in snapshot for reference
          },
          quantity: cartItem.quantity,
          unit_price_ksh: unitPrice,
          line_total_ksh: lineTotal,
          size: cartItem.size, // Selected shoe size
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
          gateway: paymentGateway as "mpesa" | "card" | "paypal" | "flutterwave",
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

      // Process Pesapal payment - redirect to Pesapal checkout page
      const { data: pesapalResponse, error: pesapalError } = await supabase.functions.invoke("pesapal-initiate-payment", {
        body: {
          orderId: order.id,
        },
      });

      if (pesapalError) {
        // Rollback everything
        await supabase.from("payments").delete().eq("id", payment.id);
        await supabase.from("order_shipping_details").delete().eq("order_id", order.id);
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);

        // Check if function is not deployed
        if (pesapalError.message?.includes("Failed to send a request") || pesapalError.message?.includes("Function not found")) {
          throw new Error("Pesapal payment function is not deployed. Please deploy the 'pesapal-initiate-payment' Edge Function.");
        }

        console.error("Pesapal payment error:", pesapalError);
        throw new Error(pesapalError.message || "Failed to initiate payment. Please try again.");
      }

      if (!pesapalResponse?.success || !pesapalResponse?.redirectUrl) {
        // Rollback everything
        await supabase.from("payments").delete().eq("id", payment.id);
        await supabase.from("order_shipping_details").delete().eq("order_id", order.id);
        await supabase.from("order_items").delete().eq("order_id", order.id);
        await supabase.from("orders").delete().eq("id", order.id);

        const errorMsg = pesapalResponse?.error || "Failed to initiate payment";
        console.error("Pesapal payment error:", pesapalResponse);
        throw new Error(errorMsg);
      }

      // Notify buyer about successful order placement (non-blocking)
      supabase.functions.invoke("notify-buyer-order-placed", {
        body: { orderId: order.id },
      }).catch(err => console.log("Buyer order confirmation failed (non-critical):", err));

      // Clear cart before redirecting
      clearCart();
      toast.success("Opening secure payment page in new tab...");

      // Open Pesapal payment page in a new tab
      // This allows the user to go back and retry if payment fails (insufficient funds, etc.)
      window.open(pesapalResponse.redirectUrl, '_blank');

      // Navigate to orders page so user can track their order
      toast.info("Complete your payment in the new tab. If payment fails, you can retry from your Orders page.");
      navigate('/orders');
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

              {deliveryType === "pickup" && vendorProfile && (
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Store className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Vendor Shop Details</h3>
                      </div>
                      {vendorProfile.store_name && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Store Name</p>
                          <p className="text-base font-semibold">{vendorProfile.store_name}</p>
                        </div>
                      )}
                      {vendorProfile.store_description && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Description</p>
                          <p className="text-sm">{vendorProfile.store_description}</p>
                        </div>
                      )}
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                        <p className="text-xs text-yellow-900 dark:text-yellow-100">
                          <strong>Important:</strong> You can contact the seller to arrange pickup time and location after placing your order. This ensures all transactions are completed through Solely's secure platform.
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Delivery charges will not apply for pickup orders. You'll be able to contact the seller once your order is placed.
                      </p>
                    </div>
                  </CardContent>
                </Card>
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

              {paymentGateway === "pesapal" && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    You'll be redirected to Pesapal's secure checkout page to complete payment using M-Pesa, Visa, Mastercard, or Airtel Money.
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


