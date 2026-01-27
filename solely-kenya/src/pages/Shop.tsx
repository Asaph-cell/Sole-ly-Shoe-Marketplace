import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X, Search } from "lucide-react";
import { CATEGORIES, getCategoryName } from "@/lib/categories";
import { ACCESSORY_TYPES, getAccessoryTypeName } from "@/lib/accessoryTypes";
import { SneakerLoader } from "@/components/ui/SneakerLoader";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";

const Shop = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [selectedAccessoryType, setSelectedAccessoryType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Extract unique values from products
  const uniqueBrands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));

  // Use only predefined categories (not database categories)
  const allCategoryKeys = CATEGORIES.map(c => c.key);

  const uniqueSizes = Array.from(new Set(products.flatMap((p) => p.sizes || []).filter(Boolean))).sort((a, b) => Number(a) - Number(b));

  useEffect(() => {
    // Scroll to top when page loads
    window.scrollTo(0, 0);

    fetchProducts();

    // Set category from URL params if present
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }

    // Set size from URL params if present (for links from cart)
    const sizeParam = searchParams.get('size');
    if (sizeParam) {
      setSelectedSize(sizeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilters();
  }, [products, searchQuery, priceRange, selectedBrand, selectedCategory, selectedSize, selectedCondition, selectedAccessoryType, sortBy]);

  const fetchProducts = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active");

      if (productsError) throw productsError;

      // Fetch all reviews to calculate ratings per product
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("product_id, rating");

      if (reviewsError) {
        console.error("Error fetching reviews:", reviewsError);
      }

      // Group reviews by product_id and calculate stats
      const reviewStats: Record<string, { sum: number; count: number }> = {};
      (reviewsData || []).forEach(review => {
        if (!reviewStats[review.product_id]) {
          reviewStats[review.product_id] = { sum: 0, count: 0 };
        }
        reviewStats[review.product_id].sum += review.rating;
        reviewStats[review.product_id].count += 1;
      });

      // Map products with their actual rating stats
      const productsWithStats = (productsData || []).map(product => {
        const stats = reviewStats[product.id];
        return {
          ...product,
          averageRating: stats ? stats.sum / stats.count : null,
          reviewCount: stats ? stats.count : 0,
        };
      });

      setProducts(productsWithStats);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Price filter
    filtered = filtered.filter(
      (p) => p.price_ksh >= priceRange[0] && p.price_ksh <= priceRange[1]
    );

    // Brand filter
    if (selectedBrand !== "all") {
      filtered = filtered.filter((p) => p.brand?.toLowerCase() === selectedBrand);
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Size filter (only for non-accessories)
    if (selectedSize !== "all" && selectedCategory !== "accessories") {
      filtered = filtered.filter((p) => p.sizes?.includes(selectedSize));
    }

    // Accessory type filter (only for accessories)
    if (selectedAccessoryType !== "all" && selectedCategory === "accessories") {
      filtered = filtered.filter((p) => (p as any).accessory_type === selectedAccessoryType);
    }

    // Condition filter
    if (selectedCondition !== "all") {
      filtered = filtered.filter((p) => p.condition === selectedCondition);
    }

    // Sort
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => a.price_ksh - b.price_ksh);
        break;
      case "price-high":
        filtered.sort((a, b) => b.price_ksh - a.price_ksh);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setPriceRange([0, 20000]);
    setSelectedBrand("all");
    setSelectedCategory("all");
    setSelectedSize("all");
    setSelectedAccessoryType("all");
    setSortBy("newest");
  };

  // Determine if we're showing accessories
  const isAccessoriesView = selectedCategory === "accessories";


  if (loading) {
    return <SneakerLoader message="Loading products..." />;
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 overflow-x-hidden">
      <SEO
        title={isAccessoriesView ? "Shoe Care Accessories Kenya" : selectedCategory !== "all" ? `${getCategoryName(selectedCategory)} Shoes for Sale Kenya` : "Shop Shoes Online Kenya"}
        description={isAccessoriesView
          ? `Shop ${filteredProducts.length} shoe care products & accessories in Kenya. Cleaners, protectors, laces & more from trusted vendors.`
          : `Browse ${filteredProducts.length} ${selectedCategory !== "all" ? getCategoryName(selectedCategory).toLowerCase() : ""} shoes for sale in Nairobi & Kenya. Nike, Adidas, Jordan & more. Filter by brand, size, condition. Escrow-protected payments.`
        }
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop" },
          ...(selectedCategory !== "all" ? [{ name: getCategoryName(selectedCategory), url: `/shop?category=${selectedCategory}` }] : [])
        ]}
      />
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            {isAccessoriesView ? "Shop Accessories" : "Shop All Shoes"}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse our collection of {filteredProducts.length} {isAccessoriesView ? "shoe care products and accessories" : "amazing shoes"} from trusted vendors across Kenya
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="bg-card border-2 border-border rounded-xl p-6 shadow-soft sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold">Filters</h2>
              </div>

              {/* Brand Filter */}
              <div className="mb-6">
                <label className="text-sm font-semibold mb-3 block">Brand</label>
                <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {uniqueBrands.map((brand) => (
                      <SelectItem key={brand} value={brand.toLowerCase()}>
                        {brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="text-sm font-semibold mb-3 block">Category</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategoryKeys.map((catKey) => (
                      <SelectItem key={catKey} value={catKey}>
                        {getCategoryName(catKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size Filter - Hidden for accessories */}
              {!isAccessoriesView && (
                <div className="mb-6">
                  <label className="text-sm font-semibold mb-3 block">Size</label>
                  <Select value={selectedSize} onValueChange={setSelectedSize}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sizes</SelectItem>
                      {uniqueSizes.map((size) => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Accessory Type Filter - Only for accessories */}
              {isAccessoriesView && (
                <div className="mb-6">
                  <label className="text-sm font-semibold mb-3 block">Accessory Type</label>
                  <Select value={selectedAccessoryType} onValueChange={setSelectedAccessoryType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {ACCESSORY_TYPES.map((type) => (
                        <SelectItem key={type.key} value={type.key}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Condition Filter */}
              <div className="mb-6">
                <label className="text-sm font-semibold mb-3 block">Condition</label>
                <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="new">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Mint
                      </div>
                    </SelectItem>
                    <SelectItem value="like_new">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        Like New
                      </div>
                    </SelectItem>
                    <SelectItem value="good">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                        Good
                      </div>
                    </SelectItem>
                    <SelectItem value="fair">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                        Fair
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="text-sm font-semibold mb-3 block">
                  Price Range: KES {priceRange[0].toLocaleString()} - KES {priceRange[1].toLocaleString()}
                </label>
                <Slider
                  defaultValue={[0, 20000]}
                  max={20000}
                  step={500}
                  value={priceRange}
                  onValueChange={setPriceRange}
                  className="mt-4"
                />
              </div>

              <Button className="w-full" variant="outline" onClick={resetFilters}>
                Reset Filters
              </Button>
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden fixed bottom-20 right-4 z-40">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="lg" className="rounded-full shadow-lg h-14 px-6 min-h-[48px] tap-active">
                  <Filter className="h-5 w-5 mr-2" />
                  Filters
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Filter Shoes
                  </SheetTitle>
                </SheetHeader>

                <div className="space-y-6 pb-6">
                  {/* Brand Filter */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block">Brand</label>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Brands</SelectItem>
                        {uniqueBrands.map((brand) => (
                          <SelectItem key={brand} value={brand.toLowerCase()}>
                            {brand}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block">Category</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {allCategoryKeys.map((catKey) => (
                          <SelectItem key={catKey} value={catKey}>
                            {getCategoryName(catKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size Filter - Hidden for accessories */}
                  {!isAccessoriesView && (
                    <div>
                      <label className="text-sm font-semibold mb-3 block">Size</label>
                      <Select value={selectedSize} onValueChange={setSelectedSize}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sizes</SelectItem>
                          {uniqueSizes.map((size) => (
                            <SelectItem key={size} value={size}>
                              {size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Accessory Type Filter - Only for accessories */}
                  {isAccessoriesView && (
                    <div>
                      <label className="text-sm font-semibold mb-3 block">Accessory Type</label>
                      <Select value={selectedAccessoryType} onValueChange={setSelectedAccessoryType}>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Types</SelectItem>
                          {ACCESSORY_TYPES.map((type) => (
                            <SelectItem key={type.key} value={type.key}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Condition Filter */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block">Condition</label>
                    <Select value={selectedCondition} onValueChange={setSelectedCondition}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Conditions</SelectItem>
                        <SelectItem value="new">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Mint
                          </div>
                        </SelectItem>
                        <SelectItem value="like_new">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            Like New
                          </div>
                        </SelectItem>
                        <SelectItem value="good">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                            Good
                          </div>
                        </SelectItem>
                        <SelectItem value="fair">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                            Fair
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="text-sm font-semibold mb-3 block">
                      Price Range: KES {priceRange[0].toLocaleString()} - KES {priceRange[1].toLocaleString()}
                    </label>
                    <Slider
                      defaultValue={[0, 20000]}
                      max={20000}
                      step={500}
                      value={priceRange}
                      onValueChange={setPriceRange}
                      className="mt-4"
                    />
                  </div>

                  <Button className="w-full h-12" variant="outline" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Products Grid */}
          <main className="lg:col-span-3">
            {/* Search and Sort Options */}
            <div className="flex flex-col gap-4 mb-6">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, brand, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-11 w-full"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
                <p className="text-sm sm:text-base text-foreground font-medium">Showing {filteredProducts.length} of {products.length} results</p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found matching your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {filteredProducts.slice(0, page * itemsPerPage).map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price_ksh}
                    image={product.images?.[0] || "/placeholder.svg"}
                    brand={product.brand}
                    averageRating={product.averageRating}
                    reviewCount={product.reviewCount}
                    createdAt={product.created_at}
                    condition={product.condition || "new"}
                    videoUrl={product.video_url}
                  />
                ))}
              </div>
            )}

            {/* Load More Button */}
            {filteredProducts.length > page * itemsPerPage && (
              <div className="flex justify-center mt-8">
                <Button onClick={() => setPage(prev => prev + 1)} variant="outline" size="lg">
                  Load More ({filteredProducts.length - (page * itemsPerPage)} remaining)
                </Button>
              </div>
            )}

            {/* Pagination would go here */}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Shop;
