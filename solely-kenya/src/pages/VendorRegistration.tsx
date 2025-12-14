import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import logo from "@/assets/solely-logo.svg";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const VendorRegistration = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [formData, setFormData] = useState({
    phone: "",
    storeName: "",
    storeDescription: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    county: "",
    postalCode: "",
  });

  useEffect(() => {
    const checkVendorStatus = async () => {
      if (!authLoading && !user) {
        toast.error("Please log in first to register as a vendor");
        navigate("/auth");
        return;
      }

      if (user) {
        // Check if user is already a vendor
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "vendor");

        if (roles && roles.length > 0) {
          toast.info("You are already registered as a vendor");
          navigate("/vendor/dashboard");
        }
      }
    };

    checkVendorStatus();
  }, [user, authLoading, navigate]);

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast.error("You must accept the Terms and Conditions to proceed");
      return;
    }

    if (!formData.phone || !formData.storeName || !formData.addressLine1 || !formData.city) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!user) {
      toast.error("Please log in first");
      navigate("/auth");
      return;
    }

    setSubmitting(true);
    try {
      // Update profile with vendor information
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          whatsapp_number: formData.phone,
          store_name: formData.storeName,
          store_description: formData.storeDescription || null,
          // Store location in store_description for now
          // In a real app, you might want to add dedicated location fields to the profiles table
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Add vendor role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: user.id, role: "vendor" });

      if (roleError && !roleError.message.includes("duplicate")) {
        throw roleError;
      }

      toast.success("Vendor registration successful! You can now start selling.");
      navigate("/vendor/dashboard");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to complete vendor registration");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 bg-muted/20">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <img src={logo} alt="Solely Marketplace" className="h-16 w-auto mx-auto mb-4" />
          <CardTitle className="text-2xl">Become a Vendor</CardTitle>
          <CardDescription>
            Register to start selling on Solely. Complete the form below to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Delivery is handled by you, not Solely. You will set delivery charges when accepting orders.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Phone Number (WhatsApp) *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="254700000000"
                  value={formData.phone}
                  onChange={handleInputChange("phone")}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be used for customer communication and order notifications
                </p>
              </div>

              <div>
                <Label htmlFor="storeName">Store Name *</Label>
                <Input
                  id="storeName"
                  type="text"
                  placeholder="e.g., My Shoe Store"
                  value={formData.storeName}
                  onChange={handleInputChange("storeName")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="storeDescription">Store Description</Label>
                <Textarea
                  id="storeDescription"
                  placeholder="Tell customers about your store..."
                  value={formData.storeDescription}
                  onChange={handleInputChange("storeDescription")}
                  rows={4}
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-4">Store Location *</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="addressLine1">Address Line 1 *</Label>
                    <Input
                      id="addressLine1"
                      type="text"
                      placeholder="Street address, building name"
                      value={formData.addressLine1}
                      onChange={handleInputChange("addressLine1")}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="addressLine2">Address Line 2</Label>
                    <Input
                      id="addressLine2"
                      type="text"
                      placeholder="Apartment, suite, unit, etc."
                      value={formData.addressLine2}
                      onChange={handleInputChange("addressLine2")}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City / Town *</Label>
                      <Input
                        id="city"
                        type="text"
                        placeholder="Nairobi"
                        value={formData.city}
                        onChange={handleInputChange("city")}
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="county">County</Label>
                      <Input
                        id="county"
                        type="text"
                        placeholder="Nairobi County"
                        value={formData.county}
                        onChange={handleInputChange("county")}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      type="text"
                      placeholder="00100"
                      value={formData.postalCode}
                      onChange={handleInputChange("postalCode")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-1"
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    I accept the{" "}
                    <Link to="/terms" target="_blank" className="text-primary underline hover:no-underline">
                      Terms and Conditions
                    </Link>{" "}
                    *
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    By checking this box, you agree to Solely's Terms and Conditions, including:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>You are responsible for all product deliveries</li>
                      <li>You will set appropriate delivery charges when accepting orders</li>
                      <li>Solely takes a 10% commission on each sale</li>
                      <li>Payments are held in escrow until delivery is confirmed</li>
                      <li>You must provide accurate product information</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={submitting || !termsAccepted}
              >
                {submitting ? "Registering..." : "Complete Registration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorRegistration;

