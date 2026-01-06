import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VendorNavbar } from "@/components/vendor/VendorNavbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Package, Users, DollarSign, AlertCircle, Eye, TrendingUp, Clock,
  CheckCircle, Truck, ArrowUpRight, Mail, Send, Trash2, Pause, Play, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SneakerLoader } from "@/components/ui/SneakerLoader";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminDashboard = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  // Stats
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeProducts: 0,
    totalVendors: 0,
    totalCustomers: 0,
    completedOrders: 0,
    pendingOrders: 0,
    openDisputes: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    netCommission: 0,
    totalViews: 0,
  });

  // Data
  const [products, setProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [openDisputes, setOpenDisputes] = useState<any[]>([]);

  // Announcement state
  const [announcementSubject, setAnnouncementSubject] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementAudience, setAnnouncementAudience] = useState<"all" | "vendors" | "customers">("all");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Product actions
  const [productToDelete, setProductToDelete] = useState<string | null>(null);

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

    try {
      const [
        { count: productsCount },
        { count: activeProductsCount },
        { count: vendorsCount },
        { count: customersCount },
        { count: completedOrdersCount },
        { count: pendingOrdersCount },
        { count: disputesCount },
        { data: commissionsAll },
        { data: ordersAll },
        { data: ordersMonth },
        { count: viewsCount },
        { data: productsData },
        { data: recentOrdersData },
        { data: disputesData },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "vendor"),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending_vendor_confirmation"),
        supabase.from("disputes").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("commission_ledger").select("commission_amount"),
        supabase.from("orders").select("total_ksh"),
        supabase.from("orders").select("total_ksh").gte("created_at", monthStart),
        supabase.from("product_views").select("*", { count: "exact", head: true }),
        // Get all products with vendor info
        supabase.from("products")
          .select(`id, name, price, status, images, created_at, vendor:vendor_id (full_name, store_name)`)
          .order("created_at", { ascending: false })
          .limit(50),
        // Recent orders
        supabase.from("orders")
          .select(`id, created_at, total_ksh, status, profiles:customer_id (full_name)`)
          .order("created_at", { ascending: false })
          .limit(10),
        // Open disputes
        supabase.from("disputes")
          .select(`id, reason, opened_at, order_id, customer:customer_id (full_name)`)
          .eq("status", "open")
          .limit(5),
      ]);

      const totalCommission = (commissionsAll || []).reduce((sum: number, r: any) => sum + (r.commission_amount || 0), 0);
      const totalRevenue = (ordersAll || []).reduce((sum: number, r: any) => sum + (r.total_ksh || 0), 0);
      const monthlyRevenue = (ordersMonth || []).reduce((sum: number, r: any) => sum + (r.total_ksh || 0), 0);

      setStats({
        totalProducts: productsCount || 0,
        activeProducts: activeProductsCount || 0,
        totalVendors: vendorsCount || 0,
        totalCustomers: customersCount || 0,
        completedOrders: completedOrdersCount || 0,
        pendingOrders: pendingOrdersCount || 0,
        openDisputes: disputesCount || 0,
        totalRevenue,
        monthlyRevenue,
        netCommission: totalCommission,
        totalViews: viewsCount || 0,
      });

      setProducts(productsData || []);
      setRecentOrders(recentOrdersData || []);
      setOpenDisputes(disputesData || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoadingData(false);
    }
  };

  const toggleProductStatus = async (productId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: newStatus })
        .eq("id", productId);

      if (error) throw error;

      toast({ title: "Success", description: `Product ${newStatus === "active" ? "activated" : "paused"}` });
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const deleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Product removed permanently" });
      setProductToDelete(null);
      loadData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const sendAnnouncement = async () => {
    setShowConfirmDialog(false);
    setSendingAnnouncement(true);
    try {
      const response = await supabase.functions.invoke("send-announcement", {
        body: { subject: announcementSubject, htmlContent: announcementMessage, targetAudience: announcementAudience },
      });

      if (response.error) throw new Error(response.error.message);

      toast({ title: "Sent!", description: response.data.message });
      setAnnouncementSubject("");
      setAnnouncementMessage("");
    } catch (error: any) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const formatStatus = (status: string) => status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

  if (loading || !isAdmin) {
    return <SneakerLoader message="Loading admin dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-background">
      <VendorNavbar />
      <main className="container mx-auto p-4 md:p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage your marketplace</p>
        </div>

        {loadingData ? (
          <SneakerLoader message="Loading..." fullScreen={false} />
        ) : (
          <>
            {/* Key Stats - Compact Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Revenue</p>
                      <p className="text-lg font-bold">KES {stats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-5 w-5 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">This Month</p>
                      <p className="text-lg font-bold">KES {stats.monthlyRevenue.toLocaleString()}</p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Commission</p>
                      <p className="text-lg font-bold">KES {stats.netCommission.toLocaleString()}</p>
                    </div>
                    <DollarSign className="h-5 w-5 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Products</p>
                      <p className="text-lg font-bold">{stats.activeProducts}/{stats.totalProducts}</p>
                    </div>
                    <Package className="h-5 w-5 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Vendors</p>
                      <p className="text-lg font-bold">{stats.totalVendors}</p>
                    </div>
                    <Users className="h-5 w-5 text-cyan-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Views</p>
                      <p className="text-lg font-bold">{stats.totalViews.toLocaleString()}</p>
                    </div>
                    <Eye className="h-5 w-5 text-pink-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              <Card className={stats.pendingOrders > 0 ? "border-yellow-500/50" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">{stats.pendingOrders} Pending Orders</p>
                      <p className="text-xs text-muted-foreground">Awaiting vendor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={stats.completedOrders > 0 ? "border-green-500/50" : ""}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium">{stats.completedOrders} Completed</p>
                      <p className="text-xs text-muted-foreground">All time</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Link to="/admin/disputes">
                <Card className={stats.openDisputes > 0 ? "border-red-500/50 hover:bg-accent cursor-pointer" : "hover:bg-accent cursor-pointer"}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={`h-5 w-5 ${stats.openDisputes > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                      <div>
                        <p className="font-medium">{stats.openDisputes} Open Disputes</p>
                        <p className="text-xs text-muted-foreground">Need resolution</p>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4" />
                  </CardContent>
                </Card>
              </Link>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-1">
                  <Package className="h-4 w-4" /> Products
                </TabsTrigger>
                <TabsTrigger value="announcements" className="flex items-center gap-1">
                  <Mail className="h-4 w-4" /> Email
                </TabsTrigger>
                <TabsTrigger value="disputes" className={stats.openDisputes > 0 ? "text-red-600" : ""}>
                  Disputes
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentOrders.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No orders yet</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recentOrders.map((order) => (
                            <TableRow key={order.id}>
                              <TableCell className="font-mono text-sm">#{order.id.slice(0, 8)}</TableCell>
                              <TableCell>{order.profiles?.full_name || "Guest"}</TableCell>
                              <TableCell>KES {order.total_ksh?.toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{formatStatus(order.status)}</Badge>
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

              {/* Products Tab */}
              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      All Products
                    </CardTitle>
                    <CardDescription>
                      Manage product listings. Pause or delete products with issues.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {products.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No products yet</p>
                    ) : (
                      <div className="space-y-2">
                        {products.map((product) => (
                          <div key={product.id} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50">
                            {/* Image */}
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <Image className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                KES {product.price?.toLocaleString()} • {product.vendor?.store_name || product.vendor?.full_name || "Unknown"}
                              </p>
                            </div>

                            {/* Status */}
                            <Badge variant={product.status === "active" ? "default" : "secondary"}>
                              {product.status}
                            </Badge>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleProductStatus(product.id, product.status)}
                              >
                                {product.status === "active" ? (
                                  <><Pause className="h-3 w-3 mr-1" /> Pause</>
                                ) : (
                                  <><Play className="h-3 w-3 mr-1" /> Activate</>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setProductToDelete(product.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Announcements Tab */}
              <TabsContent value="announcements">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Send Announcement
                    </CardTitle>
                    <CardDescription>
                      Email users about updates, news, or promotions.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Audience</label>
                      <Select value={announcementAudience} onValueChange={(v: any) => setAnnouncementAudience(v)}>
                        <SelectTrigger className="w-full md:w-[250px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users ({stats.totalCustomers})</SelectItem>
                          <SelectItem value="vendors">Vendors Only ({stats.totalVendors})</SelectItem>
                          <SelectItem value="customers">Customers ({stats.totalCustomers - stats.totalVendors})</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Subject</label>
                      <Input
                        placeholder="Exciting news from Sole-ly!"
                        value={announcementSubject}
                        onChange={(e) => setAnnouncementSubject(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Message (HTML supported)</label>
                      <Textarea
                        placeholder="Write your announcement..."
                        value={announcementMessage}
                        onChange={(e) => setAnnouncementMessage(e.target.value)}
                        rows={6}
                      />
                    </div>

                    {announcementMessage && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Preview</label>
                        <div className="border rounded p-4 bg-muted/50" dangerouslySetInnerHTML={{ __html: announcementMessage }} />
                      </div>
                    )}

                    <Button
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={!announcementSubject.trim() || !announcementMessage.trim() || sendingAnnouncement}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {sendingAnnouncement ? "Sending..." : "Send Announcement"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Disputes Tab */}
              <TabsContent value="disputes">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Open Disputes</CardTitle>
                      <CardDescription>Customer complaints needing resolution</CardDescription>
                    </div>
                    <Link to="/admin/disputes">
                      <Button variant="outline" size="sm">View All <ArrowUpRight className="h-4 w-4 ml-1" /></Button>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {openDisputes.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">No open disputes 🎉</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Reason</TableHead>
                            <TableHead>Opened</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openDisputes.map((d) => (
                            <TableRow key={d.id}>
                              <TableCell>{d.customer?.full_name || "Unknown"}</TableCell>
                              <TableCell>
                                <Badge variant="destructive">{d.reason?.replace(/_/g, " ")}</Badge>
                              </TableCell>
                              <TableCell>{new Date(d.opened_at).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <Link to="/admin/disputes">
                                  <Button size="sm" variant="outline">Resolve</Button>
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

            {/* Confirm Send Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Send</DialogTitle>
                  <DialogDescription>
                    Send to {announcementAudience === "all" ? `all ${stats.totalCustomers} users` :
                      announcementAudience === "vendors" ? `${stats.totalVendors} vendors` :
                        `${stats.totalCustomers - stats.totalVendors} customers`}?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
                  <Button onClick={sendAnnouncement} disabled={sendingAnnouncement}>
                    {sendingAnnouncement ? "Sending..." : "Send"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Delete Product Confirmation */}
            <AlertDialog open={!!productToDelete} onOpenChange={() => setProductToDelete(null)}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove the product. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => productToDelete && deleteProduct(productToDelete)}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
