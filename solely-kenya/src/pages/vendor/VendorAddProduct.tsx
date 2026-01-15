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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { ShoeSizeChart } from "@/components/ShoeSizeChart";
import { VideoUploader } from "@/components/VideoUploader";
import { AlertTriangle } from "lucide-react";
import { CATEGORIES, getCategoryName } from "@/lib/categories";

const VendorAddProduct = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price_ksh: "",
    stock: "",
    brand: "",
    category: "",
    key_features: "",
    sizes: "",
    condition: "new",
    condition_notes: "",
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 4) {
      toast.error("Maximum 4 images allowed");
      return;
    }

    setImageFiles([...imageFiles, ...files]);

    // Create preview URLs
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setImagePreview([...imagePreview, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newFiles = imageFiles.filter((_, i) => i !== index);
    const newPreviews = imagePreview.filter((_, i) => i !== index);
    setImageFiles(newFiles);
    setImagePreview(newPreviews);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (imageFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of imageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }
      return uploadedUrls;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const sizesArray = formData.sizes.split(",").map((s) => s.trim()).filter(Boolean);
      const keyFeaturesArray = formData.key_features.split(",").map((s) => s.trim()).filter(Boolean);

      // Upload images
      const imageUrls = await uploadImages();

      const { error } = await supabase.from("products").insert({
        vendor_id: user?.id,
        name: formData.name,
        description: formData.description,
        price_ksh: parseInt(formData.price_ksh),
        stock: parseInt(formData.stock),
        brand: formData.brand,
        category: formData.category,
        key_features: keyFeaturesArray,
        status: "active",
        sizes: sizesArray,
        images: imageUrls,
        video_url: videoUrl,
        condition: formData.condition,
        condition_notes: formData.condition_notes || null,
      });

      if (error) throw error;

      toast.success("Product is now live on the marketplace!");
      navigate("/vendor/products");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
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
          <h1 className="text-3xl font-bold mb-8">Add New Product</h1>

          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="price">Price (Ksh)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={formData.price_ksh}
                      onChange={(e) => setFormData({ ...formData, price_ksh: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="stock">Stock</Label>
                    <Input
                      id="stock"
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category / Type of Shoe</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.key} value={cat.key}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Condition Selector */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <div>
                    <Label htmlFor="condition" className="text-base font-medium">Shoe Condition *</Label>
                    <p className="text-sm text-muted-foreground mb-2">Is this new or pre-owned?</p>
                    <Select
                      value={formData.condition}
                      onValueChange={(value) => setFormData({ ...formData, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Mint - Brand new
                          </div>
                        </SelectItem>
                        <SelectItem value="like_new">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Like New - Worn 1-2 times, no visible wear
                          </div>
                        </SelectItem>
                        <SelectItem value="good">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            Good - Light wear, minor scuffs
                          </div>
                        </SelectItem>
                        <SelectItem value="fair">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Fair - Visible wear, still functional
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.condition !== "new" && (
                    <div>
                      <Label htmlFor="condition_notes">Condition Details (Optional)</Label>
                      <Textarea
                        id="condition_notes"
                        placeholder="Describe any wear, scuffs, or defects. Be honest - this builds trust with buyers!"
                        value={formData.condition_notes}
                        onChange={(e) => setFormData({ ...formData, condition_notes: e.target.value })}
                        rows={2}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sizes">Available Sizes (EU - comma-separated)</Label>
                    <ShoeSizeChart />
                  </div>
                  <Input
                    id="sizes"
                    placeholder="36, 37, 38, 39, 40, 41, 42, 43"
                    value={formData.sizes}
                    onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                  />
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800 text-sm">
                      <strong>Important:</strong> Enter exact EU sizes from the size chart (e.g., 36, 37, 38).
                      Using correct sizes ensures customers can find their perfect fit.
                      Click "Size Guide" above to view the conversion chart.
                    </AlertDescription>
                  </Alert>
                </div>

                <div>
                  <Label htmlFor="key_features">Key Features (comma-separated)</Label>
                  <Textarea
                    id="key_features"
                    placeholder="Breathable mesh, Cushioned sole, Water resistant"
                    value={formData.key_features}
                    onChange={(e) => setFormData({ ...formData, key_features: e.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="images">Product Images (Max 4)</Label>
                  <Input
                    id="images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    disabled={imageFiles.length >= 4}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    📸 <strong>Tip:</strong> High-quality, well-lit photos attract more customers! Upload up to 4 clear images showing different angles.
                  </p>

                  {imagePreview.length > 0 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {imagePreview.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Video Upload */}
                {user && (
                  <VideoUploader
                    vendorId={user.id}
                    videoUrl={videoUrl}
                    onVideoChange={setVideoUrl}
                  />
                )}

                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✅ Your product will go <strong>live immediately</strong> after submission! Make sure your details and images are accurate to attract more buyers.
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || uploading}>
                  {uploading ? "Uploading Images..." : submitting ? "Adding Product..." : "Add Product"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default VendorAddProduct;
