import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VendorNavbar } from "@/components/vendor/VendorNavbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Package, Users, ShoppingCart, DollarSign, AlertCircle, Eye,
  TrendingUp, Clock, CheckCircle, XCircle, Truck, ArrowUpRight,
  Activity, Calendar, BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalVendors: 0,
    totalCustomers: 0,
    totalOrdersCompleted: 0,
    pendingOrders: 0,
    processingOrders: 0,
    openDisputes: 0,
    totalCommission: 0,
    monthlyCommission: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalViews: 0,
    todayViews: 0,
  });

  const [openDisputes, setOpenDisputes] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<{ status: string, count: number }[]>([]);
  const [dailyRevenue, setDailyRevenue] = useState<{ date: string, revenue: number, orders: number }[]>([]);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .single();

      if (!data) {
        navigate("/");
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        return;
      }

      setIsAdmin(true);
      loadData();
    };

    if (!loading) {
      checkAdmin();
    }
  }, [user, loading, navigate]);

  const loadData = async () => {
    setLoadingData(true);

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    try {
      // Fetch all stats in parallel
      const [
        { count: productsCount },
        { count: activeProductsCount },
        { count: vendorsCount },
        { count: customersCount },
        { count: completedOrdersCount },
        { count: pendingOrdersCount },
        { count: processingOrdersCount },
        { count: draftsCount },
        { data: commissionsAll },
        { data: commissionsMonth },
        { data: ordersAll },
        { data: ordersMonth },
        { count: totalViewsCount },
        { count: todayViewsCount },
        { data: orderStatusData },
        { data: recentOrdersData },
        { data: dailyOrdersData },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "vendor"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending_vendor_confirmation"),
        supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["vendor_confirmed", "shipped"]),
        supabase.from("disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("commission_ledger").select("commission_amount"),
        supabase.from("commission_ledger").select("commission_amount").gte("recorded_at", monthStart),
        supabase.from("orders").select("total_ksh"),
        supabase.from("orders").select("total_ksh").gte("created_at", monthStart),
        supabase.from("product_views").select("*", { count: "exact", head: true }),
        supabase.from("product_views").select("*", { count: "exact", head: true }).gte("viewed_at", todayStart),
        // Order status breakdown
        supabase.from("orders").select("status"),
        // Recent orders with details
        supabase.from("orders")
          .select(`
            id,
            created_at,
            total_ksh,
            status,
            profiles:customer_id (full_name, email)
          `)
          .order("created_at", { ascending: false })
          .limit(10),
        // Daily orders for chart (last 30 days)
        supabase.from("orders")
          .select("created_at, total_ksh")
          .gte("created_at", thirtyDaysAgo)
          .order("created_at", { ascending: true }),
      ]);

      // Calculate totals
      const totalCommission = (commissionsAll || []).reduce((sum: number, row: any) => sum + (row.commission_amount || 0), 0);
      const monthlyCommission = (commissionsMonth || []).reduce((sum: number, row: any) => sum + (row.commission_amount || 0), 0);
      const totalRevenue = (ordersAll || []).reduce((sum: number, row: any) => sum + (row.total_ksh || 0), 0);
      const monthlyRevenue = (ordersMonth || []).reduce((sum: number, row: any) => sum + (row.total_ksh || 0), 0);

      // Process order status breakdown
      const statusCounts: Record<string, number> = {};
      (orderStatusData || []).forEach((order: any) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

      // Process daily revenue for chart
      const dailyData: Record<string, { revenue: number, orders: number }> = {};
      (dailyOrdersData || []).forEach((order: any) => {
        const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!dailyData[date]) {
          dailyData[date] = { revenue: 0, orders: 0 };
        }
        dailyData[date].revenue += order.total_ksh || 0;
        dailyData[date].orders += 1;
      });
      const dailyRevenueArray = Object.entries(dailyData).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders
      }));

      setStats({
        totalProducts: productsCount || 0,
        activeProducts: activeProductsCount || 0,
        totalVendors: vendorsCount || 0,
        totalCustomers: customersCount || 0,
        totalOrdersCompleted: completedOrdersCount || 0,
        pendingOrders: pendingOrdersCount || 0,
        processingOrders: processingOrdersCount || 0,
        openDisputes: draftsCount || 0,
        totalCommission,
        monthlyCommission,
        totalRevenue,
        monthlyRevenue,
        totalViews: totalViewsCount || 0,
        todayViews: todayViewsCount || 0,
      });

      setOrdersByStatus(statusBreakdown);
      setRecentOrders(recentOrdersData || []);
      setDailyRevenue(dailyRevenueArray);

      // Fetch open disputes with customer/vendor info
      const { data: disputes } = await supabase
        .from("disputes")
        .select(`
          *,
          customer:customer_id (full_name, email),
          vendor:vendor_id (full_name, store_name),
          order:order_id (total_ksh)
        `)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(10);

      setOpenDisputes(disputes || []);
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
    }
  };

  const publishProduct = async (productId: string) => {
    try {
      const { error } = await supabase.rpc("publish_product", {
        product_id_to_publish: productId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product published successfully",
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to publish product",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending_vendor_confirmation: "bg-yellow-500",
      vendor_confirmed: "bg-blue-500",
      shipped: "bg-purple-500",
      delivered: "bg-green-500",
      completed: "bg-green-600",
      cancelled: "bg-red-500",
      refunded: "bg-gray-500",
    };
    return colors[status] || "bg-gray-400";
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading || !isAdmin) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-background">
      <VendorNavbar />
      <main className="container mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Complete overview of your marketplace performance</p>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard data...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Key Metrics Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KES {stats.totalRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">All-time sales</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KES {stats.monthlyRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Revenue this month</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Commission</CardTitle>
                  <DollarSign className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">KES {stats.totalCommission.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Your earnings</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Product Views</CardTitle>
                  <Eye className="h-4 w-4 text-cyan-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">{stats.todayViews} today</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Vendors</CardTitle>
                  <Users className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalVendors}</div>
                  <p className="text-xs text-muted-foreground">Registered sellers</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-pink-500/10 to-pink-600/5 border-pink-500/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Customers</CardTitle>
                  <Users className="h-4 w-4 text-pink-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                  <p className="text-xs text-muted-foreground">Total users</p>
                </CardContent>
              </Card>
            </div>

            {/* Orders & Products Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalOrdersCompleted}</div>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
                  <p className="text-xs text-muted-foreground">Awaiting vendor</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Processing</CardTitle>
                  <Truck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.processingOrders}</div>
                  <p className="text-xs text-muted-foreground">Confirmed/Shipped</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                  <Package className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.activeProducts}</div>
                  <p className="text-xs text-muted-foreground">of {stats.totalProducts} total</p>
                </CardContent>
              </Card>

              <Link to="/admin/disputes">
                <Card className="border-red-500/50 hover:bg-accent transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Disputes</CardTitle>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.openDisputes}</div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      Need resolution <ArrowUpRight className="h-3 w-3" />
                    </p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Charts and Tables Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Revenue Chart */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Revenue & Orders (Last 30 Days)
                  </CardTitle>
                  <CardDescription>Daily revenue and order count trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {dailyRevenue.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-muted-foreground">
                      No order data available yet
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-end gap-1 h-48 overflow-x-auto pb-2">
                        {dailyRevenue.slice(-14).map((day, idx) => (
                          <div key={idx} className="flex flex-col items-center flex-1 min-w-[40px]">
                            <div
                              className="w-full bg-primary/80 rounded-t hover:bg-primary transition-colors cursor-pointer relative group"
                              style={{ height: `${Math.max((day.revenue / maxRevenue) * 150, 4)}px` }}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                KES {day.revenue.toLocaleString()} ({day.orders} orders)
                              </div>
                            </div>
                            <span className="text-[10px] text-muted-foreground mt-1 whitespace-nowrap">{day.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Status Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Order Status
                  </CardTitle>
                  <CardDescription>Breakdown by status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {ordersByStatus.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No orders yet</p>
                    ) : (
                      ordersByStatus.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                            <span className="text-sm">{formatStatus(item.status)}</span>
                          </div>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for Tables */}
            <Tabs defaultValue="orders" className="space-y-4">
              <TabsList>
                <TabsTrigger value="orders">Recent Orders</TabsTrigger>
                <TabsTrigger value="disputes" className={stats.openDisputes > 0 ? "text-red-600" : ""}>
                  Open Disputes ({stats.openDisputes})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                    <CardDescription>Latest 10 orders across all vendors</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentOrders.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No orders yet
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-sm">
                                #{order.id.slice(0, 8)}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{order.profiles?.full_name || "Guest"}</div>
                                  <div className="text-xs text-muted-foreground">{order.profiles?.email}</div>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">
                                KES {order.total_ksh?.toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`${getStatusColor(order.status)} text-white border-0`}
                                >
                                  {formatStatus(order.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="disputes">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Open Disputes</CardTitle>
                      <CardDescription>Customer complaints requiring resolution</CardDescription>
                    </div>
                    <Link to="/admin/disputes">
                      <Button variant="outline" size="sm">
                        View All <ArrowUpRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {openDisputes.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No open disputes 🎉
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Vendor</TableHead>
                            <TableHead>Order Value</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Opened</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openDisputes.map((dispute) => (
                            <TableRow key={dispute.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium">{dispute.customer?.full_name || "Unknown"}</div>
                                  <div className="text-xs text-muted-foreground">{dispute.customer?.email}</div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {dispute.vendor?.store_name || dispute.vendor?.full_name || "Unknown"}
                              </TableCell>
                              <TableCell className="font-semibold">
                                KES {dispute.order?.total_ksh?.toLocaleString() || "N/A"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {dispute.reason?.replace(/_/g, " ") || "Unknown"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {new Date(dispute.opened_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <Link to="/admin/disputes">
                                  <Button size="sm" variant="outline">
                                    Resolve
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
