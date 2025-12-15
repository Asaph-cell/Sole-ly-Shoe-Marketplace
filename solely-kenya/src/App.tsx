import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const ErrorBoundary = React.lazy(() => import("./components/ErrorBoundary").then(module => ({ default: module.ErrorBoundary })));
const Navbar = React.lazy(() => import("./components/Navbar"));
const Footer = React.lazy(() => import("./components/Footer"));
const Home = React.lazy(() => import("./pages/Home"));
const Shop = React.lazy(() => import("./pages/Shop"));
const Product = React.lazy(() => import("./pages/Product"));
const About = React.lazy(() => import("./pages/About"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Vendor = React.lazy(() => import("./pages/Vendor"));
const Auth = React.lazy(() => import("./pages/Auth"));
const VendorRegistration = React.lazy(() => import("./pages/VendorRegistration"));
const Cart = React.lazy(() => import("./pages/Cart"));
const Checkout = React.lazy(() => import("./pages/Checkout"));
const Orders = React.lazy(() => import("./pages/Orders"));
const Terms = React.lazy(() => import("./pages/Terms"));
const VendorDashboard = React.lazy(() => import("./pages/vendor/VendorDashboard"));
const VendorProducts = React.lazy(() => import("./pages/vendor/VendorProducts"));
const VendorAddProduct = React.lazy(() => import("./pages/vendor/VendorAddProduct"));
const VendorEditProduct = React.lazy(() => import("./pages/vendor/VendorEditProduct"));
// Subscription flow removed in commission model
const VendorSettings = React.lazy(() => import("./pages/vendor/VendorSettings"));
const VendorOrders = React.lazy(() => import("./pages/vendor/VendorOrders"));
const VendorRatings = React.lazy(() => import("./pages/vendor/VendorRatings"));
const VendorDisputes = React.lazy(() => import("./pages/vendor/VendorDisputes"));
const AdminDashboard = React.lazy(() => import("./pages/admin/AdminDashboard"));
const AdminDisputes = React.lazy(() => import("./pages/admin/AdminDisputes"));
const NotFound = React.lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    style={{ willChange: "opacity, transform" }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/shop" element={<PageWrapper><Shop /></PageWrapper>} />
        <Route path="/product/:id" element={<PageWrapper><Product /></PageWrapper>} />
        <Route path="/about" element={<PageWrapper><About /></PageWrapper>} />
        <Route path="/contact" element={<PageWrapper><Contact /></PageWrapper>} />
        <Route path="/vendor" element={<PageWrapper><Vendor /></PageWrapper>} />
        <Route path="/vendor/register" element={<PageWrapper><VendorRegistration /></PageWrapper>} />
        <Route path="/auth" element={<PageWrapper><Auth /></PageWrapper>} />
        <Route path="/cart" element={<PageWrapper><Cart /></PageWrapper>} />
        <Route path="/checkout" element={<PageWrapper><Checkout /></PageWrapper>} />
        <Route path="/orders" element={<PageWrapper><Orders /></PageWrapper>} />
        <Route path="/orders/:orderId" element={<PageWrapper><Orders /></PageWrapper>} />
        <Route path="/terms" element={<PageWrapper><Terms /></PageWrapper>} />
        <Route path="/vendor/dashboard" element={<PageWrapper><VendorDashboard /></PageWrapper>} />
        <Route path="/vendor/products" element={<PageWrapper><VendorProducts /></PageWrapper>} />
        <Route path="/vendor/add-product" element={<PageWrapper><VendorAddProduct /></PageWrapper>} />
        <Route path="/vendor/edit-product/:id" element={<PageWrapper><VendorEditProduct /></PageWrapper>} />
        {null}
        <Route path="/vendor/orders" element={<PageWrapper><VendorOrders /></PageWrapper>} />
        <Route path="/vendor/ratings" element={<PageWrapper><VendorRatings /></PageWrapper>} />
        <Route path="/vendor/disputes" element={<PageWrapper><VendorDisputes /></PageWrapper>} />
        <Route path="/vendor/settings" element={<PageWrapper><VendorSettings /></PageWrapper>} />
        <Route path="/admin" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        <Route path="/admin/dashboard" element={<PageWrapper><AdminDashboard /></PageWrapper>} />
        <Route path="/admin/disputes" element={<PageWrapper><AdminDisputes /></PageWrapper>} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<PageWrapper><NotFound /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const AppLayout = () => {
  const location = useLocation();

  // Hide main navbar/footer on vendor and admin pages (they have their own)
  const isVendorOrAdminPage = location.pathname.startsWith('/vendor/') || location.pathname.startsWith('/admin');

  return (
    <div className="flex flex-col min-h-screen">
      <React.Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        {!isVendorOrAdminPage && <Navbar />}
        <main className="flex-grow">
          <AnimatedRoutes />
        </main>
        {!isVendorOrAdminPage && <Footer />}
      </React.Suspense>
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
