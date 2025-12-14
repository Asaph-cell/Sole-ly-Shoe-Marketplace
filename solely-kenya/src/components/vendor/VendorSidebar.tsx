import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  Settings,
  ShoppingBag,
  Star,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/vendor/dashboard" },
  { icon: Package, label: "My Products", path: "/vendor/products" },
  { icon: PlusCircle, label: "Add Product", path: "/vendor/add-product" },
  { icon: ShoppingBag, label: "Orders", path: "/vendor/orders" },
  { icon: Star, label: "Ratings", path: "/vendor/ratings" },
  { icon: AlertTriangle, label: "Disputes", path: "/vendor/disputes" },
  { icon: Settings, label: "Settings", path: "/vendor/settings" },
];

export const VendorSidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 border-r border-border min-h-screen bg-card">
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
