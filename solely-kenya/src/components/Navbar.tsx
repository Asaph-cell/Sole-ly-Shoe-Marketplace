import { Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import { AuthButtons } from "./navbar/AuthButtons";
import { MobileNav } from "./navbar/MobileNav";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ShoppingBag, Store, Info, Mail } from "lucide-react";
import { AnimeNavBar } from "@/components/ui/anime-navbar";
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

  // Anime navbar items with icons
  const animeNavItems = [
    { name: "Shop", url: "/shop", icon: ShoppingBag },
    { name: "Sell", url: "/vendor", icon: Store },
    { name: "About", url: "/about", icon: Info },
    { name: "Contact", url: "/contact", icon: Mail },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
      <div className="container mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between flex-nowrap">
          {/* Logo - Left */}
          <Link to="/" className="flex flex-col items-start group shrink-0">
            <img
              src={logo}
              alt="Solely Marketplace"
              className="h-12 sm:h-14 w-auto transition-transform group-hover:scale-105"
            />
            <span className="text-[9px] sm:text-[10px] text-muted-foreground tracking-wide uppercase -mt-3 pl-1">the shoe marketplace</span>
          </Link>

          {/* Desktop Navigation - Center: Anime NavBar */}
          <div className="hidden md:flex items-center justify-center flex-1 pt-2">
            <AnimeNavBar items={animeNavItems} defaultActive="Shop" />
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

          {/* Mobile Navigation - pushed to right */}
          <div className="md:hidden ml-auto">
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
      </div>
    </nav>
  );
};

export default Navbar;
