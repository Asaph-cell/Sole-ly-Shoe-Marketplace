import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X } from "lucide-react";

const Shop = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 20000]);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedCondition, setSelectedCondition] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Extract unique values from products
  const uniqueBrands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));
  const uniqueCategories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const uniqueSizes = Array.from(new Set(products.flatMap((p) => p.sizes || []).filter(Boolean))).sort((a, b) => Number(a) - Number(b));

  useEffect(() => {
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
  }, [products, priceRange, selectedBrand, selectedCategory, selectedSize, selectedCondition, sortBy]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...products];

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

    // Size filter
    if (selectedSize !== "all") {
      filtered = filtered.filter((p) => p.sizes?.includes(selectedSize));
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
    setPriceRange([0, 20000]);
    setSelectedBrand("all");
    setSelectedCategory("all");
    setSelectedSize("all");
    setSortBy("newest");
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-4 sm:py-8 overflow-x-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Shop All Shoes</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Browse our collection of {filteredProducts.length} amazing shoes from trusted vendors across Kenya
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
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat.toLowerCase()}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Size Filter */}
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
                        New
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
                        {uniqueCategories.map((cat) => (
                          <SelectItem key={cat} value={cat.toLowerCase()}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Size Filter */}
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
                            New
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
            {/* Sort Options */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
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

            {/* Products */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No products found matching your filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price_ksh}
                    image={product.images?.[0] || "/placeholder.svg"}
                    brand={product.brand}
                    condition={product.condition || "new"}
                  />
                ))}
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
