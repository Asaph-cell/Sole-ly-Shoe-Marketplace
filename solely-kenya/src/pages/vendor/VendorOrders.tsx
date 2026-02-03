import { useEffect, useMemo, useState, useRef } from "react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { LocationViewMap } from "@/components/LocationViewMap";
import { DeliveryTrackingControl } from "@/components/DeliveryTrackingControl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type OrderRecord = Tables<"orders"> & {
  order_items: Tables<"order_items">[];
  order_shipping_details: Tables<"order_shipping_details"> | null;
  payments?: Array<{
    id: string;
    status: string;
    amount_ksh: number;
    metadata?: { is_delivery_fee?: boolean };
  }>;
};

const statusColors: Record<string, "secondary" | "default" | "destructive" | "outline"> = {
  pending_vendor_confirmation: "secondary",
  accepted: "default",
  arrived: "default",
  delivered: "default",
  completed: "default",
  disputed: "destructive",
  refunded: "destructive",
  cancelled_by_vendor: "outline",
  cancelled_by_customer: "outline",
};

const VendorOrders = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [shippingNotes, setShippingNotes] = useState<Record<string, { courier: string; tracking: string; notes: string }>>({});
  const [personalDelivery, setPersonalDelivery] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderToDecline, setOrderToDecline] = useState<OrderRecord | null>(null);
  const [declineReason, setDeclineReason] = useState<string>("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const shippingFormRef = useRef<HTMLDivElement>(null);

  // OTP-related state
  const [otpDialogOrder, setOtpDialogOrder] = useState<OrderRecord | null>(null);
  const [otpInput, setOtpInput] = useState<string>("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [showGeneratedOtp, setShowGeneratedOtp] = useState(false);
  const [sortBy, setSortBy] = useState<string>("newest");

  const loadOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      // First, fetch orders without payments to avoid potential RLS issues
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(
          `*,
          order_items(*),
          order_shipping_details(*)`
        )
        .eq("vendor_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Failed to fetch vendor orders", ordersError);
        toast.error("Unable to load orders");
        setLoadingOrders(false);
        return;
      }

      // Then fetch payments separately for each order (non-blocking)
      // Fetch payments in parallel but don't block if they fail
      const ordersWithPayments = await Promise.all(
        (ordersData || []).map(async (order) => {
          try {
            const { data: paymentsData, error: paymentsError } = await supabase
              .from("payments")
              .select("id, status, amount_ksh, metadata")
              .eq("order_id", order.id)
              .order("created_at", { ascending: true });

            if (paymentsError) {
              console.warn(`Payment fetch warning for order ${order.id}:`, paymentsError);
              // Continue with empty payments array
              return {
                ...order,
                payments: [],
              };
            }

            return {
              ...order,
              payments: paymentsData || [],
            };
          } catch (error) {
            // If payment fetch fails, continue with empty payments array
            console.warn(`Error fetching payments for order ${order.id}:`, error);
            return {
              ...order,
              payments: [],
            };
          }
        })
      );

      // Show ALL orders except cancelled ones - payment status will be shown as badge
      // This ensures vendors always see orders even if payment webhook was delayed
      const visibleOrders = ordersWithPayments.filter((order) => {
        // Hide cancelled orders
        const isCancelled = [
          "cancelled_by_vendor",
          "cancelled_by_customer"
        ].includes(order.status);

        return !isCancelled;
      });

      setOrders(visibleOrders as unknown as OrderRecord[]);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error("Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  };

  // Helper function to check if delivery fee payment is pending
  // With zone-based pricing, delivery is pre-paid, so this checks if order total is paid
  const hasPendingDeliveryFee = (order: OrderRecord): boolean => {
    if (!order.payments || order.payments.length === 0) return false;
    const isPickup = order.order_shipping_details?.delivery_type === "pickup";
    if (isPickup) return false;

    // Check if total has been paid
    const totalPaid = getTotalPaid(order);
    return totalPaid < order.total_ksh;
  };

  // Helper function to calculate total paid
  const getTotalPaid = (order: OrderRecord): number => {
    if (!order.payments) return 0;
    return order.payments
      .filter((p) => p.status === "captured")
      .reduce((sum, p) => sum + Number(p.amount_ksh), 0);
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      loadOrders();

      const channel = supabase
        .channel('vendor-orders-updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `vendor_id=eq.${user.id}`,
          },
          () => {
            loadOrders();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payments',
            // Listen to all payment changes - loadOrders will filter to this vendor's orders
          },
          () => {
            loadOrders();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "pending_vendor_confirmation"), [orders]);

  // Sort orders based on user selection
  const sortedOrders = useMemo(() => {
    const statusPriority: Record<string, number> = {
      pending_vendor_confirmation: 1,
      accepted: 2,
      shipped: 3,
      arrived: 4,
      completed: 5,
      disputed: 6,
      refunded: 7,
      cancelled_by_vendor: 8,
      cancelled_by_customer: 9,
    };

    return [...orders].sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "pending":
          // Pending first, then by date newest
          if (a.status === "pending_vendor_confirmation" && b.status !== "pending_vendor_confirmation") return -1;
          if (b.status === "pending_vendor_confirmation" && a.status !== "pending_vendor_confirmation") return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "shipped":
          // Shipped/Arrived first (need action)
          const aIsShipped = ["shipped", "arrived"].includes(a.status);
          const bIsShipped = ["shipped", "arrived"].includes(b.status);
          if (aIsShipped && !bIsShipped) return -1;
          if (bIsShipped && !aIsShipped) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "completed":
          if (a.status === "completed" && b.status !== "completed") return -1;
          if (b.status === "completed" && a.status !== "completed") return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [orders, sortBy]);

  const updateOrderStatus = async (orderId: string, patch: Partial<Tables<"orders">>) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) throw error;
    await loadOrders();
  };

  // Helper to check if order is expired (48 hours passed)
  const isOrderExpired = (order: OrderRecord): boolean => {
    const hoursSinceOrder = differenceInHours(new Date(), new Date(order.created_at));
    return hoursSinceOrder >= 48;
  };

  const handleAccept = async (order: OrderRecord) => {
    // Validate order status
    if (order.status !== "pending_vendor_confirmation") {
      toast.error("This order cannot be accepted. It may have already been processed.");
      return;
    }

    // Check if order has expired (48 hours passed)
    if (isOrderExpired(order)) {
      toast.error("This order has expired. It will be automatically cancelled and refunded to the buyer.");
      return;
    }

    // With zone-based pricing, delivery fee is already included in total
    // No need for vendor to set delivery charges

    setSaving(true);
    try {
      // Get existing payment to check if it's already captured
      const { data: existingPayment, error: paymentQueryError } = await supabase
        .from("payments")
        .select("id, gateway, status, amount_ksh")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (paymentQueryError) {
        console.error("Error fetching payment:", paymentQueryError);
        toast.error("Failed to verify payment status. Please try again.");
        return;
      }

      if (!existingPayment) {
        toast.error("No payment found for this order. Cannot accept order.");
        return;
      }

      // With zone-based pricing, totals are already calculated at checkout
      // No need to recalculate - just verify payment and accept
      const currentTotal = order.total_ksh;
      const currentShippingFee = order.shipping_fee_ksh;
      const currentCommission = order.commission_amount;
      const currentPayout = order.payout_amount;

      // Verify order status hasn't changed (race condition check)
      const { data: currentOrder, error: orderCheckError } = await supabase
        .from("orders")
        .select("status")
        .eq("id", order.id)
        .single();

      if (orderCheckError || !currentOrder) {
        toast.error("Failed to verify order status. Please refresh and try again.");
        return;
      }

      if (currentOrder.status !== "pending_vendor_confirmation") {
        toast.error("Order status has changed. Please refresh the page.");
        await loadOrders();
        return;
      }

      // Update order status to accepted (totals already set at checkout)
      await updateOrderStatus(order.id, {
        status: "accepted",
        accepted_at: new Date().toISOString(),
      });

      // Notify buyer about order acceptance (non-blocking)
      supabase.functions.invoke("notify-buyer-order-accepted", {
        body: { orderId: order.id },
      }).catch(err => console.log("Buyer acceptance notification failed (non-critical):", err));

      // Update or create escrow transaction
      const { data: existingEscrow, error: escrowCheckError } = await supabase
        .from("escrow_transactions")
        .select("id")
        .eq("order_id", order.id)
        .maybeSingle();

      if (escrowCheckError) {
        console.error("Error checking escrow:", escrowCheckError);
      } else if (existingEscrow) {
        // Escrow already exists, no update needed
        console.log("Escrow already exists for order:", order.id);
      } else {
        // Create escrow if it doesn't exist
        const { error: escrowCreateError } = await supabase
          .from("escrow_transactions")
          .insert({
            order_id: order.id,
            payment_id: existingPayment.id,
            status: "held",
            held_amount: currentTotal,
            commission_amount: currentCommission,
            release_amount: currentPayout,
          });

        if (escrowCreateError) {
          console.error("Failed to create escrow:", escrowCreateError);
          toast.warning("Order accepted, but escrow creation failed. Please contact support.");
        }
      }

      // Show success message and expand shipping section
      const isPickup = order.order_shipping_details?.delivery_type === "pickup";
      if (isPickup) {
        toast.success("Pickup order accepted. Customer will collect from your location.");
      } else {
        toast.success(`Order accepted! Now fill in shipping details below.`);
      }

      // Auto-expand and scroll to shipping form
      setExpandedOrderId(order.id);
      setTimeout(() => {
        shippingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error("Failed to accept order. Please try again or contact support.");
    } finally {
      setSaving(false);
    }
  };

  // Confirm and process decline with refund
  const handleDecline = async (order: OrderRecord) => {
    setSaving(true);
    try {
      // Update order status
      await updateOrderStatus(order.id, {
        status: "cancelled_by_vendor",
        cancelled_at: new Date().toISOString(),
      });

      // Update escrow to released/refunded status
      const { error: escrowError } = await supabase
        .from("escrow_transactions")
        .update({
          status: "released",
          released_at: new Date().toISOString(),
        })
        .eq("order_id", order.id);

      if (escrowError) {
        console.warn("Escrow update warning:", escrowError);
      }

      // Notify buyer about the decline and refund (non-blocking)
      supabase.functions.invoke("notify-buyer-order-declined", {
        body: {
          orderId: order.id,
          reason: declineReason,
          isAutoDeclined: false,
        },
      }).catch(err => console.log("Buyer notification failed (non-critical):", err));

      toast.success("Order cancelled. Customer will be refunded and notified via email.");
      setOrderToDecline(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to cancel order");
    } finally {
      setSaving(false);
    }
  };

  const handleMarkShipped = async (order: OrderRecord) => {
    const shipping = shippingNotes[order.id] ?? { courier: "", tracking: "", notes: "" };
    const isPickup = order.order_shipping_details?.delivery_type === "pickup";
    const isPersonal = personalDelivery[order.id] ?? false;
    const isMarkingAsArrived = order.status === "shipped";

    // Validate courier details only if it's NOT a pickup and NOT a personal delivery
    // And only when initially marking as shipped (not when confirming arrival)
    if (!isPickup && !isPersonal && !isMarkingAsArrived) {
      if (!shipping.courier || !shipping.tracking) {
        toast.error("Provide courier name and tracking number");
        return;
      }
    }

    // Check payment if attempting to ship
    if (!isPickup && order.shipping_fee_ksh > 0 && !isMarkingAsArrived) {
      // Check for pending delivery fee payments
      const { data: payments, error: paymentsError } = await supabase
        .from("payments")
        .select("id, status, amount_ksh, metadata")
        .eq("order_id", order.id)
        .order("created_at", { ascending: true });

      if (paymentsError) {
        toast.error("Failed to verify payment status");
        return;
      }

      // Calculate total paid amount
      const totalPaid = payments
        ?.filter((p) => p.status === "captured")
        .reduce((sum, p) => sum + Number(p.amount_ksh), 0) || 0;

      // Check if delivery fee payment is pending
      const hasPendingDeliveryFee = payments?.some(
        (p) => p.metadata?.is_delivery_fee === true && p.status !== "captured"
      );

      if (hasPendingDeliveryFee) {
        toast.error("Cannot ship order. Delivery fee payment is still pending.");
        return;
      }

      // Verify total paid matches order total
      if (totalPaid < order.total_ksh) {
        const remaining = order.total_ksh - totalPaid;
        toast.error(`Cannot ship order. Payment incomplete. Remaining amount: KES ${remaining.toLocaleString()}`);
        return;
      }
    }

    setSaving(true);
    const now = new Date();

    // Determine next status and fields to update
    let updates: Partial<Tables<"orders">> = {};
    let shippingUpdates: Partial<Tables<"order_shipping_details">> = {};
    let notificationType = "";
    let successMsg = "";

    if (isPickup) {
      // Pickup Logic: Accepted -> Arrived (Ready for Pickup)
      updates = {
        status: "arrived",
        vendor_confirmed: true,
        shipped_at: now.toISOString(), // reuse shipped_at for "ready at" time
        // No auto-release timer for pickup
      };
      // Courier details for pickup
      shippingUpdates = {
        courier_name: "Customer Pickup",
        tracking_number: "N/A",
        delivery_notes: shipping.notes || order.order_shipping_details?.delivery_notes || null,
      }
      notificationType = "notify-buyer-pickup-ready"; // Use specific pickup ready notification
      successMsg = "Order ready for pickup! Notification sent to buyer.";
    } else {
      // Delivery Logic
      if (order.status === "accepted") {
        // Step 1: Accepted -> Shipped (In Transit)
        let courierName = shipping.courier;
        let trackingNumber = shipping.tracking;

        if (isPersonal) {
          courierName = "Personal Delivery (Vendor)";
          trackingNumber = "Self-Delivered";
        }

        updates = {
          status: "shipped", // NEW STATUS
          shipped_at: now.toISOString(),
        };

        shippingUpdates = {
          courier_name: courierName,
          tracking_number: trackingNumber,
          delivery_notes: shipping.notes || order.order_shipping_details?.delivery_notes || null,
        };

        notificationType = "notify-buyer-order-shipped";
        successMsg = "Order marked as Shipped! Buyer notified it's on the way.";
      } else if (order.status === "shipped") {
        // Step 2: Shipped -> Arrived (Delivered)
        // 24 hours after marked arrived
        const autoRelease = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        updates = {
          status: "arrived",
          vendor_confirmed: true,
          auto_release_at: autoRelease.toISOString(),
          // delivered_at could be set here effectively
        };
        // No need to update shipping details again unless changed, but assume previous details hold
        notificationType = "notify-buyer-order-arrived"; // Need to ensure this exists or use generic
        successMsg = "Order marked as Arrived/Delivered. Buyer has 24 hours to verify.";
      }
    }

    try {
      if (Object.keys(shippingUpdates).length > 0) {
        const { error: shippingError } = await supabase
          .from("order_shipping_details")
          .update(shippingUpdates)
          .eq("order_id", order.id);

        if (shippingError) throw shippingError;
      }

      await updateOrderStatus(order.id, updates);

      // IMPORTANT: Generate OTP FIRST (before sending notification email)
      // This way the email will include the OTP code
      if (updates.status === "shipped" || (isPickup && updates.status === "arrived")) {
        await handleGenerateOtp(order.id, false);
      }

      // Notify buyer about shipment (non-blocking) - AFTER OTP is generated
      // The notification function will fetch the OTP from the database
      if (notificationType) {
        supabase.functions.invoke(notificationType, {
          body: { orderId: order.id },
        }).catch(err => console.log(`Notification ${notificationType} failed (non-critical):`, err));
      }

      toast.success(successMsg);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update shipment status");
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (orderId: string, field: "courier" | "tracking" | "notes", value: string) => {
    setShippingNotes((prev) => ({
      ...prev,
      [orderId]: {
        courier: prev[orderId]?.courier ?? "",
        tracking: prev[orderId]?.tracking ?? "",
        notes: prev[orderId]?.notes ?? "",
        [field]: value,
      },
    }));
  };

  // Generate OTP when marking as shipped/ready for pickup
  const handleGenerateOtp = async (orderId: string, isResend: boolean = false) => {
    try {
      setSaving(true);
      const { data, error } = await supabase.functions.invoke('generate-delivery-otp', {
        body: { orderId, isResend }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to generate OTP');

      // Show confirmation to vendor (OTP is NOT shown - only buyer sees it)
      setShowGeneratedOtp(true);

      // If resending, also trigger the email notification
      if (isResend) {
        // Fetch order to determine notification type
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const isPickup = (order.order_shipping_details as any)?.delivery_type === "pickup";
          const notificationType = isPickup ? "notify-buyer-pickup-ready" : "notify-buyer-order-shipped";

          // Send the notification email with the new OTP
          supabase.functions.invoke(notificationType, {
            body: { orderId }
          }).catch(err => console.log(`Resend notification failed (non-critical):`, err));
        }
        toast.success("New code sent to buyer! Previous code is now invalid.");
      } else {
        toast.success("Delivery code generated and sent to buyer!");
      }

      await loadOrders();
    } catch (error) {
      console.error("Error generating OTP:", error);
      toast.error("Failed to generate delivery code. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Verify OTP entered by vendor (collected from buyer)
  const handleVerifyOtp = async () => {
    if (!otpDialogOrder || !otpInput) return;

    // Validate 6 digits
    if (!/^\d{6}$/.test(otpInput)) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }

    try {
      setOtpVerifying(true);
      const { data, error } = await supabase.functions.invoke('verify-delivery-otp', {
        body: { orderId: otpDialogOrder.id, otp: otpInput }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Delivery confirmed! KES ${data.payoutAmount?.toLocaleString() || ''} released to your account.`);
        setOtpDialogOrder(null);
        setOtpInput("");
        await loadOrders();
      } else {
        toast.error(data?.error || "Invalid code. Please check and try again.");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Failed to verify code. Please try again.");
    } finally {
      setOtpVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Manage escrowed orders, shipping, and payouts.</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="pending">Pending First</SelectItem>
                <SelectItem value="shipped">Shipped First</SelectItem>
                <SelectItem value="completed">Completed First</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" onClick={loadOrders}>Refresh</Button>
          </div>
        </div>

        {/* All orders are now shown in the sorted list below */}

        {loadingOrders ? (
          <Card className="p-10 text-center">
            <CardTitle className="mb-4">Loading orders...</CardTitle>
            <p className="text-muted-foreground">Please wait while we fetch your orders.</p>
          </Card>
        ) : orders.length === 0 ? (
          <Card className="p-10 text-center">
            <CardTitle className="mb-4">No orders yet</CardTitle>
            <p className="text-muted-foreground">You will see orders as soon as buyers checkout with your products.</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => {
              const badgeVariant = statusColors[order.status] ?? "secondary";
              const isPickup = (order.order_shipping_details as any)?.delivery_type === "pickup";
              return (
                <Card key={order.id}>
                  <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={badgeVariant}>
                      {isPickup && order.status === "arrived" ? "Ready for Pickup" : order.status.replace(/_/g, " ")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            {item.quantity} × {item.product_name}
                            {item.size && <span className="text-muted-foreground ml-1"> (Size {item.size})</span>}
                            {item.color && <span className="text-muted-foreground ml-1"> ({item.color})</span>}
                          </span>
                          <span>KES {(item.quantity * item.unit_price_ksh).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-muted rounded-lg p-4">
                        <p className="font-semibold mb-3">
                          {order.order_shipping_details?.delivery_type === "pickup" ? "Customer Pickup Information" : "Customer Delivery Location"}
                        </p>
                        {order.status === "completed" ? (
                          <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                            <p className="text-sm text-green-800 dark:text-green-200">
                              ✅ <strong>Order Completed</strong> - Customer details hidden for privacy
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Delivery was successfully completed. Customer information is no longer accessible.
                            </p>
                          </div>
                        ) : (
                          order.order_shipping_details && (
                            <>
                              <p className="font-medium mb-1">Recipient: {order.order_shipping_details.recipient_name}</p>
                              <p className="mb-1">Phone: {order.order_shipping_details.phone}</p>
                              {order.order_shipping_details.email && (
                                <p className="mb-2 text-muted-foreground">Email: {order.order_shipping_details.email}</p>
                              )}
                              {order.order_shipping_details.delivery_type === "pickup" ? (
                                <div className="mt-3 p-2 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                                  <p className="font-medium mb-1 text-green-900 dark:text-green-100">Pickup Order</p>
                                  <p className="text-xs text-green-800 dark:text-green-200">
                                    Customer will collect from your location. No delivery charges apply.
                                  </p>
                                </div>
                              ) : (
                                <>
                                  <div className="mt-3 p-2 bg-background rounded border">
                                    <p className="font-medium mb-1">Delivery Address:</p>
                                    <p>{order.order_shipping_details.address_line1}</p>
                                    {order.order_shipping_details.address_line2 && <p>{order.order_shipping_details.address_line2}</p>}
                                    <p>{order.order_shipping_details.city}{order.order_shipping_details.county ? `, ${order.order_shipping_details.county}` : ""}</p>
                                    {order.order_shipping_details.postal_code && (
                                      <p className="text-muted-foreground">Postal: {order.order_shipping_details.postal_code}</p>
                                    )}
                                  </div>
                                  {order.order_shipping_details.delivery_notes && (
                                    <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">Customer Delivery Notes:</p>
                                      <p className="text-xs text-blue-800 dark:text-blue-200">{order.order_shipping_details.delivery_notes}</p>
                                    </div>
                                  )}
                                  {/* GPS Map Location */}
                                  {order.order_shipping_details.gps_latitude && order.order_shipping_details.gps_longitude && (
                                    <div className="mt-3">
                                      <LocationViewMap
                                        latitude={order.order_shipping_details.gps_latitude}
                                        longitude={order.order_shipping_details.gps_longitude}
                                        address={order.order_shipping_details.address_line1 || undefined}
                                        recipientName={order.order_shipping_details.recipient_name}
                                        compact={true}
                                      />
                                    </div>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-2">
                                    💰 <strong>Delivery Fee Included:</strong> The buyer has paid KES {order.shipping_fee_ksh.toLocaleString()} for delivery (included in your total payout). You are responsible for arranging and paying for delivery to the customer using this amount. Solely does not handle delivery logistics.
                                  </p>
                                </>
                              )}
                            </>
                          )
                        )}
                      </div>
                      <div className="bg-muted rounded-lg p-4 space-y-2">
                        <p className="font-semibold">Order Summary</p>
                        <div className="space-y-1 text-sm">
                          <p>Subtotal: <span className="font-medium">KES {order.subtotal_ksh.toLocaleString()}</span></p>
                          {order.status === "pending_vendor_confirmation" ? (
                            <p className="text-muted-foreground">Delivery fee: To be set</p>
                          ) : (
                            <p>Delivery fee: <span className="font-medium">KES {order.shipping_fee_ksh.toLocaleString()}</span></p>
                          )}
                          <p className="pt-2 border-t">Total: <span className="font-medium text-base">KES {order.total_ksh.toLocaleString()}</span></p>
                          <p className="text-xs text-muted-foreground">Commission ({order.commission_rate}%): KES {order.commission_amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground italic">
                            <strong>Note:</strong> Commission ({order.commission_rate}%) is calculated from product price only (KES {order.subtotal_ksh.toLocaleString()}), not including delivery fees.
                          </p>
                          <p className="text-xs font-medium">Your payout: <span className="text-base">KES {order.payout_amount.toLocaleString()}</span></p>
                        </div>
                      </div>
                    </div>


                    {order.status === "pending_vendor_confirmation" && (
                      <div className="space-y-4 border rounded-lg p-4 bg-primary/5">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-primary">New Order Request</p>
                          {(() => {
                            const hoursSinceOrder = differenceInHours(new Date(), new Date(order.created_at));
                            const hoursUntilAutoCancel = Math.max(0, 48 - hoursSinceOrder);
                            return hoursSinceOrder >= 24 && (
                              <Badge variant="destructive" className="text-xs">
                                ⏰ {hoursUntilAutoCancel}h left to respond
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Please review the order details above. The delivery fee is already included in the total.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                          <Button
                            className="w-full sm:flex-1 h-11"
                            onClick={() => handleAccept(order)}
                            disabled={saving}
                          >
                            {saving ? "Accepting..." : "Accept Order"}
                          </Button>
                          <Button
                            variant="ghost"
                            className="w-full sm:flex-1 h-11 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeclineReason("");
                              setOrderToDecline(order);
                            }}
                            disabled={saving}
                          >
                            Can't Fulfill
                          </Button>
                        </div>
                      </div>
                    )}

                    {order.status === "accepted" && (
                      <div className="space-y-4 border rounded-lg p-4">
                        {hasPendingDeliveryFee(order) && (
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800 mb-4">
                            <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                              ⚠️ Delivery Fee Payment Pending
                            </p>
                            <p className="text-xs text-yellow-800 dark:text-yellow-200">
                              The customer must complete the delivery fee payment before you can ship this order.
                              Current paid: KES {getTotalPaid(order).toLocaleString()} / Required: KES {order.total_ksh.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">
                            {order.order_shipping_details?.delivery_type === "pickup" ? "Ready for Pickup" : "Ship the order"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Final price: KES {order.total_ksh.toLocaleString()} (Product: KES {order.subtotal_ksh.toLocaleString()} + Delivery: KES {order.shipping_fee_ksh.toLocaleString()})
                          </p>
                        </div>
                        {order.order_shipping_details?.delivery_type !== "pickup" && (
                          <div className="mb-4">
                            <p className="text-xs text-muted-foreground mb-3">
                              💰 <strong>Delivery Fee Included:</strong> The buyer has paid KES {order.shipping_fee_ksh.toLocaleString()} for delivery (included in your payout). Use this amount to arrange delivery.
                            </p>

                            <div className="flex items-center space-x-2 mb-4">
                              <input
                                type="checkbox"
                                id={`personal-delivery-${order.id}`}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                checked={personalDelivery[order.id] ?? false}
                                onChange={(e) => setPersonalDelivery(prev => ({ ...prev, [order.id]: e.target.checked }))}
                              />
                              <Label htmlFor={`personal-delivery-${order.id}`} className="cursor-pointer">
                                I will deliver this myself (Personal Delivery)
                              </Label>
                            </div>
                          </div>
                        )}

                        {order.order_shipping_details?.delivery_type === "pickup" ? (
                          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                              Pickup Order
                            </p>
                            <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                              You don't need to enter courier details. Just click the button below when the item is ready for the customer to collect.
                            </p>
                          </div>
                        ) : null}

                        {!(personalDelivery[order.id] ?? false) && order.order_shipping_details?.delivery_type !== "pickup" && (
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`courier-${order.id}`}>Courier service</Label>
                              <Input
                                id={`courier-${order.id}`}
                                placeholder="e.g. Wells Fargo, G4S, DHL"
                                value={shippingNotes[order.id]?.courier ?? ""}
                                onChange={(event) => handleFieldChange(order.id, "courier", event.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`tracking-${order.id}`}>Tracking number</Label>
                              <Input
                                id={`tracking-${order.id}`}
                                placeholder="Courier tracking number"
                                value={shippingNotes[order.id]?.tracking ?? ""}
                                onChange={(event) => handleFieldChange(order.id, "tracking", event.target.value)}
                              />
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 mt-4">
                          <Label htmlFor={`notes-${order.id}`}>Seller notes (optional)</Label>
                          <Textarea
                            id={`notes-${order.id}`}
                            placeholder={order.order_shipping_details?.delivery_type === "pickup" ? "e.g. 'Ready at front desk', 'Call when near'" : "Add details the buyer should know"}
                            value={shippingNotes[order.id]?.notes ?? ""}
                            onChange={(event) => handleFieldChange(order.id, "notes", event.target.value)}
                          />
                        </div>

                        {/* Live Delivery Tracking Toggle */}
                        {order.order_shipping_details?.delivery_type !== "pickup" && (personalDelivery[order.id] ?? false) && (
                          <div className="mt-4">
                            <DeliveryTrackingControl
                              orderId={order.id}
                              isCurrentlyTracking={order.order_shipping_details?.delivery_tracking_enabled || false}
                            />
                          </div>
                        )}

                        <div className="mt-4">
                          <Button
                            onClick={() => handleMarkShipped(order)}
                            disabled={saving || hasPendingDeliveryFee(order)}
                            className="w-full md:w-auto"
                            title={hasPendingDeliveryFee(order) ? "Delivery fee payment must be completed before shipping" : ""}
                          >
                            {saving ? "Updating..." :
                              isPickup
                                ? "Ready for Pickup"
                                : order.status === "shipped"
                                  ? "Mark Delivered"
                                  : "Start Delivery"
                            }
                          </Button>
                        </div>
                        {hasPendingDeliveryFee(order) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Shipping is blocked until delivery fee payment is completed.
                          </p>
                        )}
                      </div>
                    )}

                    {/* Shipped status - waiting for delivery confirmation via OTP */}
                    {order.status === "shipped" && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 text-sm border border-yellow-200 dark:border-yellow-800">
                        <p className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">
                          📦 In Transit - Shipped {order.shipped_at ? formatDistanceToNow(new Date(order.shipped_at), { addSuffix: true }) : "recently"}
                        </p>
                        {order.order_shipping_details?.courier_name && (
                          <p>Courier: {order.order_shipping_details.courier_name}</p>
                        )}
                        {order.order_shipping_details?.tracking_number && (
                          <p>Tracking: {order.order_shipping_details.tracking_number}</p>
                        )}
                        <div className="mt-4 p-3 bg-white dark:bg-background rounded border">
                          <p className="font-medium mb-2">🔐 Delivery Confirmation Required</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            When you deliver the item, ask the buyer for their 6-digit delivery code and enter it below to confirm delivery and release funds.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={() => {
                                setOtpDialogOrder(order);
                                setOtpInput("");
                              }}
                              className="flex-1"
                            >
                              Enter Buyer's Code
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleGenerateOtp(order.id, true)}
                              disabled={saving}
                              title="Resend a new code to the buyer (invalidates previous code)"
                            >
                              Resend Code to Buyer
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {order.status === "arrived" && (
                      <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 text-sm border border-green-200 dark:border-green-800">
                        <p className="font-semibold mb-2 text-green-900 dark:text-green-100">
                          {isPickup
                            ? `📍 Ready for Pickup (Marked ${order.shipped_at ? formatDistanceToNow(new Date(order.shipped_at), { addSuffix: true }) : "recently"})`
                            : `✅ Delivered ${order.shipped_at ? formatDistanceToNow(new Date(order.shipped_at), { addSuffix: true }) : "recently"}`
                          }
                        </p>
                        {order.order_shipping_details?.courier_name && (
                          <p>Courier: {order.order_shipping_details.courier_name}</p>
                        )}
                        {order.order_shipping_details?.tracking_number && (
                          <p>Tracking: {order.order_shipping_details.tracking_number}</p>
                        )}

                        {/* OTP Confirmation for arrived/pickup orders */}
                        <div className="mt-4 p-3 bg-white dark:bg-background rounded border">
                          <p className="font-medium mb-2">🔐 Confirm Delivery with Buyer's Code</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            {isPickup
                              ? "When the buyer comes to pick up, ask for their 6-digit code and enter it below."
                              : "Enter the 6-digit code the buyer shared with you to confirm delivery."}
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={() => {
                                setOtpDialogOrder(order);
                                setOtpInput("");
                              }}
                              className="flex-1"
                            >
                              Enter Buyer's Code
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleGenerateOtp(order.id, true)}
                              disabled={saving}
                              title="Resend a new code to the buyer (invalidates previous code)"
                            >
                              Resend Code
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Decline Confirmation Dialog */}
      <AlertDialog open={!!orderToDecline} onOpenChange={(open) => { if (!open) { setOrderToDecline(null); setDeclineReason(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Can't Fulfill This Order?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to cancel order <strong>#{orderToDecline?.id.slice(0, 8)}</strong>.
                </p>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Reason for declining:</label>
                  <select
                    className="w-full p-2 border rounded-md bg-background text-foreground"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                  >
                    <option value="">Select a reason...</option>
                    <option value="out_of_stock">Out of stock</option>
                    <option value="wrong_size">Size not available</option>
                    <option value="pricing_error">Pricing error</option>
                    <option value="cannot_deliver">Cannot deliver to location</option>
                    <option value="damaged_item">Item damaged</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <p className="font-medium text-foreground">
                  A full refund of KES {orderToDecline?.total_ksh.toLocaleString()} will be processed to the customer.
                </p>
                <p className="text-sm text-muted-foreground">
                  The customer will be notified immediately.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:gap-3 mt-6 w-full md:flex-row md:justify-end">
            <AlertDialogCancel disabled={saving} className="w-full mt-0 md:w-auto text-sm px-4 py-2">Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => orderToDecline && handleDecline(orderToDecline)}
              disabled={saving || !declineReason}
              className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 md:w-auto text-sm px-4 py-2"
            >
              {saving ? "Processing..." : "Can't Fulfill"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* OTP Entry Dialog - Vendor enters buyer's code */}
      <AlertDialog open={!!otpDialogOrder} onOpenChange={(open) => { if (!open) { setOtpDialogOrder(null); setOtpInput(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🔐 Enter Buyer's Delivery Code</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Enter the 6-digit code the buyer shared with you to confirm delivery of order <strong>#{otpDialogOrder?.id.slice(0, 8)}</strong>.
                </p>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Delivery Code:</label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest font-mono"
                    autoFocus
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Once verified, funds will be released to your account immediately.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col-reverse gap-2 sm:gap-3 mt-6 w-full md:flex-row md:justify-end">
            <AlertDialogCancel disabled={otpVerifying} className="w-full mt-0 md:w-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleVerifyOtp();
              }}
              disabled={otpVerifying || otpInput.length !== 6}
              className="w-full md:w-auto"
            >
              {otpVerifying ? "Verifying..." : "Confirm Delivery"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generated OTP Confirmation Dialog */}
      <AlertDialog open={showGeneratedOtp} onOpenChange={setShowGeneratedOtp}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>✅ Delivery Code Sent to Buyer</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  A 6-digit delivery code has been sent to the buyer via email and is visible on their Orders page.
                </p>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    <strong>🔐 How it works:</strong> When you deliver the item, ask the buyer to share their code with you. Enter it to confirm delivery and release your payment.
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> Only the buyer knows the code. This protects both of you by ensuring funds are only released after confirmed delivery.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end mt-6">
            <AlertDialogAction onClick={() => setShowGeneratedOtp(false)}>
              Got it!
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorOrders;


