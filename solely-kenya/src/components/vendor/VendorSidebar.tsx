import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Settings,
  ShoppingBag,
  Star,
  AlertTriangle,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface AlertCounts {
  pendingOrders: number;
  openDisputes: number;
}

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/vendor/dashboard", alertKey: null },
  { icon: Package, label: "My Products", path: "/vendor/products", alertKey: null },
  { icon: PlusCircle, label: "Add Product", path: "/vendor/add-product", alertKey: null },
  { icon: ShoppingBag, label: "Add Accessory", path: "/vendor/add-accessory", alertKey: null },
  { icon: ShoppingBag, label: "Orders", path: "/vendor/orders", alertKey: "pendingOrders" as const },
  { icon: Star, label: "Ratings", path: "/vendor/ratings", alertKey: null },
  { icon: AlertTriangle, label: "Disputes", path: "/vendor/disputes", alertKey: "openDisputes" as const },
  { icon: Settings, label: "Settings", path: "/vendor/settings", alertKey: null },
];

const SidebarContent = ({
  onItemClick,
  alertCounts
}: {
  onItemClick?: () => void;
  alertCounts: AlertCounts;
}) => {
  const location = useLocation();

  return (
    <nav className="p-4 space-y-2">
      {menuItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        const alertCount = item.alertKey ? alertCounts[item.alertKey] : 0;

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] relative",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            )}
          >
            <div className="relative">
              <Icon className="h-5 w-5 flex-shrink-0" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="flex-1">{item.label}</span>
            {alertCount > 0 && (
              <Badge
                variant="destructive"
                className="h-5 min-w-[20px] px-1.5 text-xs font-bold"
              >
                {alertCount}
              </Badge>
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export const VendorSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [alertCounts, setAlertCounts] = useState<AlertCounts>({
    pendingOrders: 0,
    openDisputes: 0,
  });

  useEffect(() => {
    if (!user) return;

    const fetchAlertCounts = async () => {
      // Fetch pending orders count (orders awaiting vendor action)
      const { count: pendingOrdersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", user.id)
        .eq("status", "pending_vendor_confirmation");

      // Fetch open disputes count
      const { count: openDisputesCount } = await supabase
        .from("disputes")
        .select("*", { count: "exact", head: true })
        .eq("vendor_id", user.id)
        .in("status", ["open", "under_review"]);

      setAlertCounts({
        pendingOrders: pendingOrdersCount || 0,
        openDisputes: openDisputesCount || 0,
      });
    };

    fetchAlertCounts();

    // Subscribe to real-time updates for orders
    const ordersChannel = supabase
      .channel("vendor-orders-alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `vendor_id=eq.${user.id}`,
        },
        () => fetchAlertCounts()
      )
      .subscribe();

    // Subscribe to real-time updates for disputes
    const disputesChannel = supabase
      .channel("vendor-disputes-alerts")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "disputes",
          filter: `vendor_id=eq.${user.id}`,
        },
        () => fetchAlertCounts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(disputesChannel);
    };
  }, [user]);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed bottom-4 left-4 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button size="lg" className="rounded-full shadow-lg h-14 w-14 p-0 relative">
              <Menu className="h-6 w-6" />
              {(alertCounts.pendingOrders > 0 || alertCounts.openDisputes > 0) && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold animate-pulse">
                  !
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle>Vendor Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent onItemClick={() => setIsOpen(false)} alertCounts={alertCounts} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 border-r border-border min-h-screen bg-card flex-shrink-0">
        <SidebarContent alertCounts={alertCounts} />
      </aside>
    </>
  );
};
