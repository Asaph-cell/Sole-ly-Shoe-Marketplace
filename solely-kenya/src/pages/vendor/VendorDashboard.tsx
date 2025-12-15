import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VendorNavbar } from "@/components/vendor/VendorNavbar";
import { VendorSidebar } from "@/components/vendor/VendorSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Star, TrendingUp, Eye, ShoppingCart, DollarSign } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const VendorDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    averageRating: 0,
    totalViews: 0,
    ordersReceived: 0,
    totalIncome: 0,
    pendingBalance: 0,
    pendingOrders: 0,
  });
  const [viewsData, setViewsData] = useState<Array<{ date: string; views: number }>>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // All plans see analytics now (commission model)

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      await Promise.all([
        fetchProfile(),
        fetchStats(),
        fetchViewsData(),
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .single();

    setProfile(data);
  };

  const fetchStats = async () => {
    // Products stats
    const { data: products } = await supabase
      .from("products")
      .select("id, name, stock, views")
      .eq("vendor_id", user?.id);

    const totalViews = products?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;

    // Low stock alerts (stock < 5)
    const lowStock = products?.filter(p => p.stock < 5 && p.stock > 0).slice(0, 5) || [];
    setLowStockProducts(lowStock);

    // Fetch vendor ratings
    const { data: ratings } = await supabase
      .from("vendor_ratings")
      .select("rating")
      .eq("vendor_id", user?.id);

    const averageRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;

    // Orders stats
    const { data: orders } = await supabase
      .from("orders")
      .select("*")
      .eq("vendor_id", user?.id)
      .order('created_at', { ascending: false });

    const ordersCount = orders?.length || 0;
    const pendingOrdersCount = orders?.filter(o => o.status === 'pending_vendor_confirmation').length || 0;
    setRecentOrders(orders?.slice(0, 5) || []);

    // Financials
    const { data: payouts } = await supabase
      .from("payouts")
      .select("amount_ksh, status")
      .eq("vendor_id", user?.id);

    const totalIncome = (payouts || [])
      .filter((p: any) => p.status === 'paid')
      .reduce((sum: number, p: any) => sum + (p.amount_ksh || 0), 0);

    const pendingBalance = (payouts || [])
      .filter((p: any) => p.status === 'pending' || p.status === 'processing')
      .reduce((sum: number, p: any) => sum + (p.amount_ksh || 0), 0);

    setStats({
      totalProducts: products?.length || 0,
      averageRating: Number(averageRating.toFixed(1)),
      totalViews,
      ordersReceived: ordersCount,
      totalIncome,
      pendingBalance,
      pendingOrders: pendingOrdersCount
    });
  };

  const fetchViewsData = async () => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: views } = await supabase
      .from("product_views")
      .select("viewed_at, product_id")
      .gte("viewed_at", startOfMonth.toISOString())
      .order("viewed_at", { ascending: true });

    if (!views) {
      setViewsData([]);
      return;
    }

    // Filter views for this vendor's products
    const { data: vendorProducts } = await supabase
      .from("products")
      .select("id")
      .eq("vendor_id", user?.id);

    const vendorProductIds = new Set(vendorProducts?.map(p => p.id) || []);
    const vendorViews = views.filter(v => vendorProductIds.has(v.product_id));

    // Group by date
    const viewsByDate: Record<string, number> = {};
    vendorViews.forEach(view => {
      const date = new Date(view.viewed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      viewsByDate[date] = (viewsByDate[date] || 0) + 1;
    });

    const chartData = Object.entries(viewsByDate).map(([date, views]) => ({
      date,
      views,
    }));

    setViewsData(chartData);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      <VendorNavbar />
      <div className="flex">
        <VendorSidebar />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Dashboard Overview</h1>

          {null}

          {dataLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading dashboard data...
            </div>
          ) : (
            <>
              {/* Rating Notice Alert */}
              <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-800">Your Ratings Matter!</h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Buyers rate you after receiving their orders. Higher ratings = better visibility and more sales.
                      Provide excellent service, fast shipping, and quality products to improve your ratings.
                    </p>
                    {stats.averageRating > 0 && (
                      <p className="text-sm font-medium text-amber-800 mt-2">
                        Current rating: <span className="text-lg">{stats.averageRating} ★</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalProducts}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
                    <Star className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.averageRating > 0 ? `${stats.averageRating} ★` : "No ratings yet"}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalViews}</div>
                  </CardContent>
                </Card>

                <Card className={stats.pendingOrders > 0 ? "border-primary" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Action Items</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.pendingOrders}</div>
                    <p className="text-xs text-muted-foreground">Orders awaiting confirmation</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Orders Received</CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.ordersReceived}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">KES {stats.totalIncome.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Paid out</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Pending Balance</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">KES {stats.pendingBalance.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Processing / In Escrow</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Product Views This Month</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    {viewsData.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Eye className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">No views recorded this month yet</p>
                      </div>
                    ) : (
                      <ChartContainer
                        config={{
                          views: {
                            label: "Views",
                            color: "hsl(var(--primary))",
                          },
                        }}
                        className="h-[300px]"
                      >
                        <AreaChart data={viewsData}>
                          <defs>
                            <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-xs"
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            className="text-xs"
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area
                            type="monotone"
                            dataKey="views"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#fillViews)"
                          />
                        </AreaChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  {/* Low Stock Alert */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                        Alert: Low Stock
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {lowStockProducts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">All products are well stocked.</p>
                      ) : (
                        <div className="space-y-4">
                          {lowStockProducts.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                              <span className="truncate max-w-[70%] font-medium">{p.name}</span>
                              <span className="text-destructive font-bold">{p.stock} left</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Orders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {recentOrders.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No orders yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {recentOrders.map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                              <div>
                                <p className="font-medium">#{order.id.slice(0, 6)}</p>
                                <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                              </div>
                              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                                {order.status.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          ))}
                          <Button variant="link" className="w-full h-auto p-0 text-xs" onClick={() => navigate('/vendor/orders')}>
                            View All Orders
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default VendorDashboard;
