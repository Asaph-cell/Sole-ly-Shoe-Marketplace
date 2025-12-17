import { LogOut, User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/solely-logo.svg";
import { Link } from "react-router-dom";
import { NotificationDropdown } from "@/components/messaging/NotificationDropdown";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PendingOrdersBanner } from "./PendingOrdersBanner";

export const VendorNavbar = () => {
  const { signOut, user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error checking admin status:", error);
          setIsAdmin(false);
          return;
        }

        setIsAdmin(data?.some(r => r.role === "admin") || false);
      } catch (error) {
        console.error("Error checking admin status:", error);
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [user]);

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 flex-nowrap">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Solely Marketplace" className="h-8 sm:h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0 flex-nowrap ml-auto">
            {isAdmin && (
              <Link to="/admin/dashboard">
                <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-secondary/80 transition-colors text-xs sm:text-sm">
                  <Shield className="h-3 w-3" />
                  Admin
                </Badge>
              </Link>
            )}

            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
                  <User className="h-5 w-5 text-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/vendor/settings">Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    signOut();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Pending Orders Notification Banner */}
      <PendingOrdersBanner />
    </>
  );
};
