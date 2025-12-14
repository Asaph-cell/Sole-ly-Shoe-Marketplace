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
import { toast } from "sonner";
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
  shipped: "default",
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
  const [saving, setSaving] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderToDecline, setOrderToDecline] = useState<OrderRecord | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const shippingFormRef = useRef<HTMLDivElement>(null);

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

      // IMPORTANT: Filter to only show orders that have been fully paid
      // Vendors should NOT see orders with failed/pending payments
      const paidOrders = ordersWithPayments.filter((order) => {
        const totalPaid = (order.payments || [])
          .filter((p: any) => p.status === "captured")
          .reduce((sum: number, p: any) => sum + Number(p.amount_ksh || 0), 0);

        // Order must have at least one captured payment and payment >= total
        // Also include orders that are already processed (shipped, delivered, completed)
        const isFullyPaid = totalPaid >= order.total_ksh;
        const isProcessedOrder = ["shipped", "delivered", "completed", "disputed", "refunded"].includes(order.status);

        return isFullyPaid || isProcessedOrder;
      });

      setOrders(paidOrders as unknown as OrderRecord[]);
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
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const pendingOrders = useMemo(() => orders.filter((order) => order.status === "pending_vendor_confirmation"), [orders]);

  const updateOrderStatus = async (orderId: string, patch: Partial<Tables<"orders">>) => {
    const { error } = await supabase.from("orders").update(patch).eq("id", orderId);
    if (error) throw error;
    await loadOrders();
  };

  const handleAccept = async (order: OrderRecord) => {
    // Validate order status
    if (order.status !== "pending_vendor_confirmation") {
      toast.error("This order cannot be accepted. It may have already been processed.");
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
    if (!shipping.courier || !shipping.tracking) {
      toast.error("Provide courier name and tracking number");
      return;
    }

    // Check if delivery fee is required and if it's been paid
    const isPickup = order.order_shipping_details?.delivery_type === "pickup";
    if (!isPickup && order.shipping_fee_ksh > 0) {
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
        toast.error("Cannot ship order. Delivery fee payment is still pending. Customer must complete the additional payment first.");
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
    const autoRelease = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    try {
      const { error: shippingError } = await supabase
        .from("order_shipping_details")
        .update({
          courier_name: shipping.courier,
          tracking_number: shipping.tracking,
          delivery_notes: shipping.notes || order.order_shipping_details?.delivery_notes || null,
        })
        .eq("order_id", order.id);

      if (shippingError) throw shippingError;

      await updateOrderStatus(order.id, {
        status: "shipped",
        vendor_confirmed: true,
        shipped_at: now.toISOString(),
        auto_release_at: autoRelease.toISOString(),
      });

      // Notify buyer about shipment (non-blocking)
      supabase.functions.invoke("notify-buyer-order-shipped", {
        body: { orderId: order.id },
      }).catch(err => console.log("Buyer shipment notification failed (non-critical):", err));

      toast.success("Order marked as shipped. Buyer has been notified via email.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update shipment");
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

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Orders</h1>
            <p className="text-muted-foreground">Manage escrowed orders, shipping, and payouts.</p>
            <p className="text-sm text-muted-foreground mt-1 italic">
              Note: Delivery fees (Nairobi: KES 200, Outside: KES 300) are pre-paid at checkout.
            </p>
          </div>
          <Button variant="ghost" onClick={loadOrders}>Refresh</Button>
        </div>

        {pendingOrders.length > 0 && (
          <Card className="border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-primary">Orders awaiting confirmation</CardTitle>
              <p className="text-sm text-muted-foreground">Review customer location and accept/decline orders. Delivery fee is already included.</p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {pendingOrders.map((order) => {
                const hoursSinceOrder = differenceInHours(new Date(), new Date(order.created_at));
                const hoursUntilAutoCancel = Math.max(0, 48 - hoursSinceOrder);
                return (
                  <div key={order.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        Order #{order.id.slice(0, 8)} • {order.order_items?.map((item: any) =>
                          `${item.quantity}× ${item.product_name}${item.size ? ` (Size ${item.size})` : ''}`
                        ).join(", ")}
                      </span>
                      {hoursSinceOrder >= 24 && (
                        <Badge variant="destructive" className="text-xs">
                          ⏰ {hoursUntilAutoCancel}h left to respond
                        </Badge>
                      )}
                    </div>
                    {order.order_shipping_details && (
                      <div className="bg-muted/50 rounded p-3 text-xs">
                        {order.order_shipping_details.delivery_type === "pickup" ? (
                          <>
                            <p className="font-medium mb-1">Pickup Order: {order.order_shipping_details.recipient_name} ({order.order_shipping_details.phone})</p>
                            <p className="text-muted-foreground">
                              Customer will collect from your location. No delivery charges apply.
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium mb-1">Ship to: {order.order_shipping_details.recipient_name} ({order.order_shipping_details.phone})</p>
                            <p className="text-muted-foreground">
                              {order.order_shipping_details.address_line1}, {order.order_shipping_details.city}
                              {order.order_shipping_details.delivery_notes && ` • ${order.order_shipping_details.delivery_notes}`}
                            </p>
                          </>
                        )}
                      </div>
                    )}
                    {/* Delivery fee info - fees are now pre-paid at checkout */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                      <p className="text-xs text-blue-900 dark:text-blue-100">
                        <strong>💰 Delivery Fee:</strong> {order.shipping_fee_ksh > 0
                          ? `KES ${order.shipping_fee_ksh.toLocaleString()} (pre-paid at checkout)`
                          : 'No delivery fee (pickup order)'}
                      </p>
                      {order.shipping_fee_ksh > 0 && (
                        <p className="text-xs text-blue-800 dark:text-blue-200 mt-1">
                          Zone-based pricing: Nairobi = KES 200, Outside = KES 300
                        </p>
                      )}
                    </div>
                    <div className="flex items-end gap-3">
                      <div className="space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => setOrderToDecline(order)}
                          disabled={saving || order.status !== "pending_vendor_confirmation"}
                        >
                          Decline & Refund
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(order)}
                          disabled={saving || order.status !== "pending_vendor_confirmation"}
                        >
                          {saving ? "Accepting..." : order.status === "accepted" ? "Already Accepted" : "Accept Order"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

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
            {orders.map((order) => {
              const badgeVariant = statusColors[order.status] ?? "secondary";
              return (
                <Card key={order.id}>
                  <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <CardTitle>Order #{order.id.slice(0, 8)}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge variant={badgeVariant}>{order.status.replace(/_/g, " ")}</Badge>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.quantity} × {item.product_name}</span>
                          <span>KES {(item.quantity * item.unit_price_ksh).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="bg-muted rounded-lg p-4">
                        <p className="font-semibold mb-3">
                          {order.order_shipping_details?.delivery_type === "pickup" ? "Customer Pickup Information" : "Customer Delivery Location"}
                        </p>
                        {order.order_shipping_details && (
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
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  Use these details to estimate delivery charges. Delivery is your responsibility, not Solely's.
                                </p>
                              </>
                            )}
                          </>
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
                          <p className="font-semibold">Ship the order</p>
                          <p className="text-sm text-muted-foreground">
                            Final price: KES {order.total_ksh.toLocaleString()} (Product: KES {order.subtotal_ksh.toLocaleString()} + Delivery: KES {order.shipping_fee_ksh.toLocaleString()})
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 italic">
                          Remember: Delivery is handled by you, not Solely. Ensure you ship to the customer's provided address.
                        </p>
                        <p className="text-xs text-muted-foreground mb-3">
                          <strong>Note:</strong> Commission ({order.commission_rate}%) is calculated from product price only (KES {order.subtotal_ksh.toLocaleString()}), not including delivery fees.
                        </p>
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
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`notes-${order.id}`}>Seller notes (optional)</Label>
                            <Textarea
                              id={`notes-${order.id}`}
                              placeholder="Add details the buyer should know"
                              value={shippingNotes[order.id]?.notes ?? ""}
                              onChange={(event) => handleFieldChange(order.id, "notes", event.target.value)}
                            />
                          </div>
                        </div>
                        <Button
                          onClick={() => handleMarkShipped(order)}
                          disabled={saving || hasPendingDeliveryFee(order)}
                          title={hasPendingDeliveryFee(order) ? "Delivery fee payment must be completed before shipping" : ""}
                        >
                          {saving ? "Updating..." : "Mark as shipped"}
                        </Button>
                        {hasPendingDeliveryFee(order) && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Shipping is blocked until delivery fee payment is completed.
                          </p>
                        )}
                      </div>
                    )}

                    {order.status === "shipped" && (
                      <div className="bg-muted rounded-lg p-4 text-sm">
                        <p className="font-semibold mb-2">Shipped {order.shipped_at ? formatDistanceToNow(new Date(order.shipped_at), { addSuffix: true }) : "recently"}</p>
                        {order.order_shipping_details?.courier_name && (
                          <p>Courier: {order.order_shipping_details.courier_name}</p>
                        )}
                        {order.order_shipping_details?.tracking_number && (
                          <p>Tracking: {order.order_shipping_details.tracking_number}</p>
                        )}
                        <p className="text-muted-foreground mt-2">
                          Escrow auto-release scheduled for {order.auto_release_at ? new Date(order.auto_release_at).toLocaleString() : "3 days after shipment"}.
                        </p>
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
      <AlertDialog open={!!orderToDecline} onOpenChange={(open) => !open && setOrderToDecline(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order & Refund Customer?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to cancel order <strong>#{orderToDecline?.id.slice(0, 8)}</strong>.
              </p>
              <p className="font-medium text-foreground">
                A full refund of KES {orderToDecline?.total_ksh.toLocaleString()} will be processed to the customer.
              </p>
              <p className="text-sm text-muted-foreground">
                This action cannot be undone. The customer will be notified and the payment will be returned.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep Order</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => orderToDecline && handleDecline(orderToDecline)}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Processing..." : "Cancel & Refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VendorOrders;


