import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Mail, LogOut, LayoutDashboard, Menu, ShoppingBag, ShoppingCart, Download } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { usePWAInstall } from "@/hooks/usePWAInstall";

interface NavLink {
  name: string;
  path: string;
}

interface MobileNavProps {
  navLinks: NavLink[];
  user: any;
  isVendor: boolean;
  isVendorPage: boolean;
  onLogout: () => void | Promise<void>;
  cartCount?: number;
}

export const MobileNav = ({ navLinks, user, isVendor, isVendorPage, onLogout, cartCount = 0 }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const supportEmail = "contact@solelyshoes.co.ke";
  const { canInstall, promptInstall } = usePWAInstall();

  const handleInstallClick = async () => {
    const installed = await promptInstall();
    if (installed) {
      setIsOpen(false);
    }
  };

  // Close menu when navigating
  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const handleLogoutClick = async () => {
    setIsOpen(false);
    await onLogout();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px]">
        <div className="flex flex-col gap-6 mt-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className="text-lg font-medium hover:text-primary transition-colors"
              onClick={handleLinkClick}
            >
              {link.name}
            </Link>
          ))}
          <div className="flex flex-col gap-3 mt-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cart" className="flex items-center justify-between" onClick={handleLinkClick}>
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Cart
                </span>
                {cartCount > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                    {cartCount}
                  </span>
                )}
              </Link>
            </Button>
            {canInstall && (
              <Button
                size="sm"
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-600"
                onClick={handleInstallClick}
              >
                <Download className="h-4 w-4" />
                Install App
              </Button>
            )}
            <Button variant="outline" size="sm" asChild>
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email Support
              </a>
            </Button>
            {!user ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/auth" onClick={handleLinkClick}>Login</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to="/vendor" onClick={handleLinkClick}>Become a Vendor</Link>
                </Button>
              </>
            ) : isVendor ? (
              isVendorPage ? (
                <>
                  <Button size="sm" asChild>
                    <Link to="/orders" onClick={handleLinkClick}>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      My Purchases
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogoutClick}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" asChild>
                    <Link to="/vendor/dashboard" onClick={handleLinkClick}>
                      <LayoutDashboard className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/vendor/orders" onClick={handleLinkClick}>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Vendor Orders
                    </Link>
                  </Button>
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/orders" onClick={handleLinkClick}>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      My Purchases
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogoutClick}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              )
            ) : (
              <>
                <Button size="sm" asChild>
                  <Link to="/orders" onClick={handleLinkClick}>
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    My Orders
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/vendor/register" onClick={handleLinkClick}>Become a Vendor</Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogoutClick}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
