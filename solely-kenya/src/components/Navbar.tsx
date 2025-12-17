import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { NavLinks } from "./navbar/NavLinks";
import { AuthButtons } from "./navbar/AuthButtons";
import { MobileNav } from "./navbar/MobileNav";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import logo from "@/assets/solely-logo.svg";

const Navbar = () => {
  const { user, isVendor } = useAuth();
  const location = useLocation();
  const isVendorPage = location.pathname.startsWith('/vendor');
  const { totalQuantity } = useCart();

  const handleLogout = async () => {
    try {
      // Clear all storage
      localStorage.removeItem("solely_cart_v1");
      sessionStorage.clear();

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error("Logout failed:", error.message);
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      // Try multiple redirect methods to bypass extension blocking
      try {
        window.location.replace("/auth");
      } catch (e) {
        // Fallback 1: Use href
        try {
          window.location.href = "/auth";
        } catch (e2) {
          // Fallback 2: Use assign
          window.location.assign("/auth");
        }
      }
    }
  };

  const navLinks = [
    { name: "Shop", path: "/shop" },
    { name: "Sell", path: "/vendor" },
    { name: "About", path: "/about" },
    { name: "Contact", path: "/contact" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between flex-nowrap">
          {/* Logo - Left */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src={logo}
              alt="Solely Marketplace"
              className="h-10 sm:h-12 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation - Center */}
          <div className="hidden md:flex items-center justify-center flex-1">
            <div className="flex items-center gap-8">
              <NavLinks links={navLinks} />
            </div>
          </div>

          {/* Right side - Cart & Auth */}
          <div className="hidden md:flex items-center gap-4 flex-shrink-0">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/cart" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {totalQuantity > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-[20px] rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center px-1">
                    {totalQuantity}
                  </span>
                )}
              </Link>
            </Button>
            <AuthButtons
              user={user}
              isVendor={isVendor}
              isVendorPage={isVendorPage}
              onLogout={handleLogout}
            />
          </div>

          {/* Mobile Navigation */}
          <MobileNav
            navLinks={navLinks}
            user={user}
            isVendor={isVendor}
            isVendorPage={isVendorPage}
            onLogout={handleLogout}
            cartCount={totalQuantity}
          />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
