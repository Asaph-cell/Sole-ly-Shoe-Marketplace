import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, ShoppingBag, Store, AlertTriangle, CreditCard, Star, Scale } from "lucide-react";

const Terms = () => {
    return (
        <div className="min-h-screen bg-muted/30 py-12">
            <div className="container mx-auto px-4 max-w-4xl">
                <Link to="/">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Home
                    </Button>
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
                    <p className="text-muted-foreground">
                        Last updated: December 2024
                    </p>
                </div>

                <Tabs defaultValue="buyers" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="buyers">
                            <ShoppingBag className="h-4 w-4 mr-2" />
                            For Buyers
                        </TabsTrigger>
                        <TabsTrigger value="vendors">
                            <Store className="h-4 w-4 mr-2" />
                            For Vendors
                        </TabsTrigger>
                    </TabsList>

                    {/* BUYER TERMS */}
                    <TabsContent value="buyers">
                        <Card className="p-6 md:p-8 space-y-8">
                            <section>
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Shield className="h-6 w-6 text-primary" />
                                    Welcome to Solely Marketplace
                                </h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    Solely is Kenya's trusted online shoe marketplace connecting buyers with verified vendors.
                                    By using our platform, you agree to the following terms and conditions.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">1. Account Registration</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>You must provide accurate personal information when creating an account</li>
                                    <li>You are responsible for maintaining the security of your account credentials</li>
                                    <li>You must be at least 18 years old to make purchases</li>
                                    <li>One person may only operate one buyer account</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    2. Escrow Payment Protection
                                </h3>
                                <p className="text-muted-foreground mb-3">
                                    All payments on Solely are protected by our escrow system:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong>Your payment is held securely</strong> until you confirm receipt of your order</li>
                                    <li>Funds are only released to the vendor after you confirm satisfaction</li>
                                    <li>If there's an issue, funds remain protected while we investigate</li>
                                    <li>Payment methods include M-Pesa, credit/debit cards, and bank transfers</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">3. Ordering Process</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Orders are subject to vendor confirmation and stock availability</li>
                                    <li>Vendors must confirm orders within <strong>24 hours</strong> or they will be auto-cancelled with full refund</li>
                                    <li>After confirmation, vendors must ship within <strong>3 days</strong> or the order will be cancelled with full refund</li>
                                    <li>Delivery is capped at a maximum of <strong>3 days</strong> after shipment</li>
                                    <li>You will receive updates on your order status via the platform</li>
                                </ul>
                            </section>

                            <section>
                                
                            <section>
                                <h3 className="text-xl font-semibold mb-3">3.5. Delivery Fees</h3>
                                <p className="text-muted-foreground mb-3">
                                    Delivery fees are calculated automatically based on metro-area zones:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong>Same Metro Area (KES 200):</strong> Deliveries within the same metropolitan area (e.g., Nairobi Metro includes Nairobi, Kiambu, Machakos, Kajiado)</li>
                                    <li><strong>Inter-City (KES 400):</strong> Deliveries between different major cities (e.g., Nairobi to Mombasa, Nakuru to Kisumu)</li>
                                    <li><strong>Distant Delivery (KES 500):</strong> Deliveries to/from smaller towns or remote locations</li>
                                    <li><strong>Pickup (KES 0):</strong> No delivery fee when you collect directly from the vendor</li>
                                </ul>
                                <p className="text-muted-foreground mt-3">
                                    <strong>Note:</strong> The delivery fee is paid by you   (the buyer) but the vendor is responsible for arranging and paying for actual delivery services using this amount.
                                </p>
                            </section>

<h3 className="text-xl font-semibold mb-3">4. Delivery Confirmation</h3>
                                <p className="text-muted-foreground mb-3">
                                    When your order arrives, you must:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Inspect the item(s) for quality and accuracy</li>
                                    <li>Confirm delivery through the platform if satisfied</li>
                                    <li>Report any issues within <strong>72 hours</strong> of receiving the item</li>
                                    <li><strong>Important:</strong> If you do not confirm delivery or file a dispute within <strong>72 hours</strong> after shipment, funds will be automatically released to the vendor</li>
                                </ul>
                                <p className="text-muted-foreground mt-3 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                    ⚠️ <strong>Auto-Release Policy:</strong> 72 hours after the vendor marks your order as shipped, if you haven't confirmed or disputed, the escrow will be released to the vendor automatically.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                                    5. Disputes and Refunds
                                </h3>
                                <p className="text-muted-foreground mb-3">
                                    You may file a dispute if:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>You did not receive your item</li>
                                    <li>You received a wrong or different item</li>
                                    <li>The item arrived damaged</li>
                                    <li>The item significantly differs from the description</li>
                                </ul>
                                <p className="text-muted-foreground mt-3">
                                    Our admin team will review disputes within <strong>3-5 business days</strong>.
                                    Refunds are processed to your original payment method when approved.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <Star className="h-5 w-5 text-yellow-500" />
                                    6. Ratings and Reviews
                                </h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>You may rate vendors after confirming order delivery</li>
                                    <li>Reviews should be honest, factual, and respectful</li>
                                    <li>False or malicious reviews may be removed</li>
                                    <li>Your identity remains anonymous to vendors in reviews</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">7. Prohibited Activities</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Filing false disputes or fraudulent claims</li>
                                    <li>Attempting to bypass the escrow system</li>
                                    <li>Harassing or threatening vendors</li>
                                    <li>Using the platform for illegal activities</li>
                                    <li>Creating multiple accounts to abuse promotions</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">8. Limitation of Liability</h3>
                                <p className="text-muted-foreground">
                                    Solely acts as a marketplace connecting buyers and vendors. While we verify vendors
                                    and protect payments, we are not responsible for the quality of products sold by
                                    independent vendors. Our liability is limited to facilitating dispute resolution
                                    and refunds through our escrow system.
                                </p>
                            </section>
                        </Card>
                    </TabsContent>

                    {/* VENDOR TERMS */}
                    <TabsContent value="vendors">
                        <Card className="p-6 md:p-8 space-y-8">
                            <section>
                                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                                    <Store className="h-6 w-6 text-primary" />
                                    Vendor Agreement
                                </h2>
                                <p className="text-muted-foreground leading-relaxed">
                                    By registering as a vendor on Solely, you agree to provide excellent products
                                    and customer service. These terms govern your relationship with Solely and our buyers.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">1. Vendor Registration</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>You must provide accurate business information and valid contact details</li>
                                    <li>You must have legal authorization to sell the products you list</li>
                                    <li>Solely reserves the right to verify vendor information</li>
                                    <li>You are responsible for all taxes applicable to your sales</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <CreditCard className="h-5 w-5 text-green-600" />
                                    2. Commission and Payments
                                </h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Solely charges a <strong>10% commission</strong> on each completed sale</li>
                                    <li>Payments are held in escrow until the buyer confirms delivery</li>
                                    <li>Funds are released within <strong>24-48 hours</strong> after buyer confirmation</li>
                                    <li><strong>Required:</strong> You must provide a valid M-Pesa number to receive payouts</li>
                                    <li>Payouts are sent via M-Pesa B2C to your registered number (bank account option coming soon)</li>
                                    <li>Commission is deducted before payout</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">3. Product Listings</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Products go live immediately after submission (no admin approval required)</li>
                                    <li>You must provide accurate descriptions, prices, and images</li>
                                    <li>Use high-quality images to attract more buyers</li>
                                    <li>Stock levels must be kept accurate to avoid order cancellations</li>
                                    <li>Only genuine footwear products are allowed</li>
                                    <li>Counterfeit or fake branded items are strictly prohibited</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">4. Order Fulfillment</h3>
                                <p className="text-muted-foreground mb-3">
                                    As a vendor, you agree to:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Confirm or reject orders within <strong>24 hours</strong></li>
                                    <li>Ship orders within <strong>3 days</strong> of confirmation</li>
                                    <li>Ensure delivery within <strong>3 days</strong> of shipment</li>
                                    <li>Provide tracking information when available</li>
                                    <li>Package items securely to prevent damage during shipping</li>
                                    <li>Contact buyers promptly if there are any issues with their order</li>
                                </ul>
                                <div className="mt-4 space-y-3">
                                    <p className="text-muted-foreground bg-red-50 border border-red-200 p-3 rounded-lg">
                                        ❌ <strong>Auto-Cancel (24 hours):</strong> Orders not confirmed within 24 hours will be automatically cancelled and the buyer refunded.
                                    </p>
                                    <p className="text-muted-foreground bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                        ⚠️ <strong>No-Ship Refund (3 days):</strong> If you confirm an order but do not mark it as shipped within 3 days, the order will be cancelled and the buyer refunded.
                                    </p>
                                    <p className="text-muted-foreground bg-green-50 border border-green-200 p-3 rounded-lg">
                                        ✅ <strong>Auto-Release (72 hours):</strong> 72 hours after you mark an order as shipped, if the buyer hasn't disputed, the funds will be released to you automatically.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    5. Disputes and Returns
                                </h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Buyers may file disputes for non-delivery, wrong items, or damaged goods</li>
                                    <li>You will be notified immediately of any dispute</li>
                                    <li>You have the opportunity to respond with evidence within <strong>48 hours</strong></li>
                                    <li>Funds remain held during dispute investigation</li>
                                    <li>If found in favor of buyer, a full refund will be issued from escrow</li>
                                    <li>Excessive disputes may result in account review or suspension</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <Star className="h-5 w-5 text-yellow-500" />
                                    6. Ratings and Reputation
                                </h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Buyers rate you after receiving their orders (ratings are visible publicly)</li>
                                    <li>High ratings increase your visibility and attract more buyers</li>
                                    <li>Vendor reviews are anonymous - you cannot see who rated you</li>
                                    <li>Focus on product quality, fast shipping, and good communication for better ratings</li>
                                </ul>
                                <p className="text-muted-foreground mt-3 bg-blue-50 border border-blue-200 p-3 rounded-lg">
                                    <strong>💡 Tip:</strong> Vendors with 4+ star ratings are featured more prominently
                                    in search results and suggestions.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">7. Prohibited Conduct</h3>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Selling counterfeit, fake, or replica branded products</li>
                                    <li>Misrepresenting product condition or authenticity</li>
                                    <li>Attempting to conduct transactions outside the platform</li>
                                    <li>Inflating prices to bypass commission fees</li>
                                    <li>Harassing buyers or responding aggressively to reviews</li>
                                    <li>Using deceptive images or descriptions</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <Scale className="h-5 w-5" />
                                    8. Account Suspension and Termination
                                </h3>
                                <p className="text-muted-foreground mb-3">
                                    Solely may suspend or terminate your vendor account if you:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Violate these terms and conditions</li>
                                    <li>Receive excessive disputes or negative ratings</li>
                                    <li>Fail to fulfill orders consistently</li>
                                    <li>Engage in fraudulent activity</li>
                                </ul>
                                <p className="text-muted-foreground mt-3">
                                    Upon termination, any pending payouts will be held for <strong>30 days</strong>
                                    to resolve any outstanding disputes before release.
                                </p>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3">9. Indemnification</h3>
                                <p className="text-muted-foreground">
                                    You agree to indemnify and hold Solely harmless from any claims, damages, or
                                    expenses arising from your products, your violation of these terms, or any
                                    dispute with buyers resulting from your actions.
                                </p>
                            </section>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* GENERAL TERMS */}
                <Card className="p-6 md:p-8 mt-6 space-y-6">
                    <h2 className="text-2xl font-bold">General Terms</h2>

                    <section>
                        <h3 className="text-lg font-semibold mb-2">Changes to Terms</h3>
                        <p className="text-muted-foreground">
                            Solely reserves the right to modify these terms at any time. Continued use of
                            the platform after changes constitutes acceptance of the new terms.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold mb-2">Governing Law</h3>
                        <p className="text-muted-foreground">
                            These terms are governed by the laws of Kenya. Any disputes shall be resolved
                            in Kenyan courts.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold mb-2">Contact Us</h3>
                        <p className="text-muted-foreground">
                            For questions about these terms, contact us at{" "}
                            <a href="mailto:Solely.kenya@gmail.com" className="text-primary underline">
                                Solely.kenya@gmail.com
                            </a>
                        </p>
                    </section>
                </Card>
            </div>
        </div>
    );
};

export default Terms;
