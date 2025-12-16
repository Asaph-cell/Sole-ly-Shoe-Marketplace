import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VendorNavbar } from "@/components/vendor/VendorNavbar";
import { VendorSidebar } from "@/components/vendor/VendorSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Check } from "lucide-react";

const VendorSettings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    whatsapp_number: "",
    mpesa_number: "",
    store_name: "",
    store_description: "",
    vendor_city: "",
    vendor_county: "",
    vendor_address_line1: "",
    vendor_address_line2: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    if (data) {
      setFormData({
        full_name: data.full_name || "",
        whatsapp_number: data.whatsapp_number || "",
        mpesa_number: data.mpesa_number || "",
        store_name: data.store_name || "",
        store_description: data.store_description || "",
        vendor_city: data.vendor_city || "",
        vendor_county: data.vendor_county || "",
        vendor_address_line1: data.vendor_address_line1 || "",
        vendor_address_line2: data.vendor_address_line2 || "",
      });

      // Set display address if location exists
      if (data.vendor_address_line1 && data.vendor_city) {
        setSelectedAddress(`${data.vendor_address_line1}, ${data.vendor_city}`);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Validate WhatsApp number format (should be in international format without +)
      if (formData.whatsapp_number) {
        const cleanNumber = formData.whatsapp_number.replace(/\D/g, "");
        if (cleanNumber.length < 10 || cleanNumber.length > 15) {
          toast.error("Please enter a valid WhatsApp number (10-15 digits)");
          setSaving(false);
          return;
        }
        // Store cleaned number
        formData.whatsapp_number = cleanNumber;
      }

      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("id", user?.id);

      if (error) throw error;

      toast.success("Settings saved successfully!");
      setSaveSuccess(true);

      // Auto-clear success state after 2 seconds
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <VendorNavbar />
      <div className="flex">
        <VendorSidebar />
        <main className="flex-1 p-8">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="whatsapp_number">WhatsApp Number (with country code)</Label>
                  <Input
                    id="whatsapp_number"
                    type="tel"
                    placeholder="254712345678"
                    value={formData.whatsapp_number}
                    onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Enter in international format without + (e.g., 254712345678 for Kenya)
                  </p>
                </div>
                <div>
                  <Label htmlFor="mpesa_number">M-Pesa Number (for Payouts) *</Label>
                  <Input
                    id="mpesa_number"
                    type="tel"
                    placeholder="254712345678"
                    value={formData.mpesa_number}
                    onChange={(e) => setFormData({ ...formData, mpesa_number: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your sales payouts (90% of order value) will be sent to this M-Pesa number
                  </p>
                </div>

                <div>
                  <Label htmlFor="store_name">Store Name</Label>
                  <Input
                    id="store_name"
                    value={formData.store_name}
                    onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="store_description">Store Description</Label>
                  <Textarea
                    id="store_description"
                    value={formData.store_description}
                    onChange={(e) => setFormData({ ...formData, store_description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-4">Store Location</h3>
                  <div className="space-y-4">
                    <AddressAutocomplete
                      value={selectedAddress}
                      onAddressSelect={(address) => {
                        setSelectedAddress(address.displayName);
                        setFormData((prev) => ({
                          ...prev,
                          vendor_address_line1: address.addressLine1,
                          vendor_city: address.city,
                          vendor_county: address.county,
                        }));
                      }}
                      placeholder="Start typing your store location..."
                      label="📍 Store Address (for delivery calculation)"
                      required={false}
                    />

                    <div>
                      <Label htmlFor="vendor_address_line2">Address Line 2</Label>
                      <Input
                        id="vendor_address_line2"
                        placeholder="Apartment, suite, unit, etc."
                        value={formData.vendor_address_line2}
                        onChange={(e) => setFormData({ ...formData, vendor_address_line2: e.target.value })}
                      />
                    </div>

                    <p className="text-xs text-muted-foreground">
                      💡 Your location is used to calculate delivery fees automatically. Keep it updated for accurate pricing.
                    </p>
                  </div>
                </div>


                <Button
                  type="submit"
                  className={`w-full transition-all ${saveSuccess ? 'bg-green-600 hover:bg-green-600' : ''}`}
                  disabled={saving}
                >
                  {saveSuccess ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : saving ? (
                    "Saving..."
                  ) : (
                    "Save Settings"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default VendorSettings;
