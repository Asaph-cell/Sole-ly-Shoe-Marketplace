import { Users, TrendingUp, Heart, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/solely-logo.svg";
import { SEO } from "@/components/SEO";

const About = () => {
  const { isVendor } = useAuth();
  return (
    <div className="min-h-screen py-12">
      <SEO
        title="About Us"
        description="Kenya's friendly shoe marketplace. Learn about Sole-ly Marketplace's mission to connect shoe lovers with trusted vendors across Kenya through secure escrow-protected transactions."
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" }
        ]}
      />
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <img
            src={logo}
            alt="Solely Marketplace"
            className="h-20 w-auto mx-auto mb-6"
          />
          <h1 className="text-5xl font-bold mb-6">About Sole-ly Marketplace</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Kenya's friendly shoe marketplace where buying and selling shoes is simple, safe, and exciting. We're on a mission to connect shoe lovers with amazing vendors across Kenya.
          </p>
        </div>

        {/* Our Story */}
        <div className="max-w-4xl mx-auto mb-20">
          <div className="bg-gradient-card border-2 border-border rounded-2xl p-8 md:p-12 shadow-card">
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Sole-ly Marketplace started with a simple idea: make buying and selling shoes in Kenya as easy as chatting with a friend, and as safe as a handshake. We noticed that finding quality shoes or reaching customers was often complicated, and honestly, sometimes risky.
              </p>
              <p>
                That is why we built a platform with a single obsession: security. We wanted to create a space where trust isn't a luxury, but a guarantee. By focusing on a safe, secure environment, we protect both the buyer's money and the seller's product.
              </p>
              <p>
                Whether you're a buyer looking for your dream sneakers or a seller wanting to grow your business, you can trade with total peace of mind here. Today, we're proud to connect buyers and sellers across Kenya, making shoe shopping transparent, secure, and accessible to everyone.
              </p>
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Community First</h3>
              <p className="text-muted-foreground">
                We're building a community of shoe lovers, not just a marketplace. Every buyer and seller matters to us.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Growth Together</h3>
              <p className="text-muted-foreground">
                When sellers succeed, buyers get better choices. When buyers are happy, sellers thrive. We all win together.
              </p>
            </div>
            <div className="text-center">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Made with Love</h3>
              <p className="text-muted-foreground">
                Every feature, every design choice is crafted with care to make your experience enjoyable and hassle-free.
              </p>
            </div>
          </div>
        </div>

        {/* Mission Section */}
        <div className="bg-gradient-hero text-primary-foreground rounded-2xl p-8 md:p-12 mb-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
            <p className="text-xl leading-relaxed opacity-90">
              To make Sole-ly Marketplace the easiest and most trusted place to buy and sell shoes in Kenya. We believe everyone deserves access to quality shoes at fair prices, and every seller deserves a platform where they can grow their business without barriers.
            </p>
          </div>
        </div>

        {/* Why Choose Us */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose Sole-ly?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-card p-6 rounded-xl border-2 border-border shadow-soft">
              <h3 className="text-xl font-semibold mb-3">For Buyers</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Wide selection from verified vendors
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Transparent pricing in KES
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Escrow-protected payments
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Dispute resolution support
                </li>
              </ul>
            </div>
            <div className="bg-card p-6 rounded-xl border-2 border-border shadow-soft">
              <h3 className="text-xl font-semibold mb-3">For Sellers</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Easy product listing
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Reach customers across Kenya
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Simple dashboard management
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">✓</span>
                  Commission-based (10% per sale, no upfront fees)
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-6">Join Our Community</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Whether you're here to shop or sell, we're excited to have you as part of the Sole-ly family.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/shop">Start Shopping</Link>
            </Button>
            {isVendor ? (
              <Button size="lg" variant="outline" asChild>
                <Link to="/vendor/dashboard">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Vendor Dashboard
                </Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" asChild>
                <Link to="/vendor">Become a Vendor</Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
