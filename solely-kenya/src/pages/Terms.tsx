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
                                    Solely Vendor Agreement
                                </h2>
                                <p className="text-sm text-muted-foreground mb-4">Last Updated: December 2025</p>
                                <p className="text-muted-foreground leading-relaxed">
                                    By registering as a vendor on Solely, you agree to provide high-quality products
                                    and excellent customer service. These terms govern your relationship with Solely and buyers on the platform.
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
                                    <li>Solely charges a <strong>10% commission</strong> on the product price of each completed sale</li>
                                    <li>Payments are held in escrow until the buyer confirms delivery or the auto-release period expires</li>
                                    <li><strong>Payout Timing:</strong> Funds are released within 24–48 hours after the funds are cleared from escrow</li>
                                    <li><strong>Payout Method:</strong> Payouts are sent via M-Pesa B2C to your registered number</li>
                                    <li><strong>Transaction Fees:</strong> Standard M-Pesa B2C transaction charges may be deducted from the final payout amount</li>
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
                                <h3 className="text-xl font-semibold mb-3">4. Order Fulfillment & Timelines</h3>
                                <p className="text-muted-foreground mb-3">
                                    As a vendor, you agree to adhere to the following strict timelines:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li><strong>Confirmation:</strong> Accept or reject new orders within 24 hours</li>
                                    <li><strong>Shipping:</strong> Ship confirmed orders within 3 days</li>
                                    <li><strong>Delivery:</strong> Ensure delivery occurs within 3 days of shipment</li>
                                    <li><strong>Tracking:</strong> Provide accurate courier names and tracking numbers/contact details</li>
                                </ul>
                                <div className="mt-4 space-y-3">
                                    <h4 className="font-semibold text-foreground">Order Automation Rules</h4>
                                    <p className="text-muted-foreground bg-red-50 border border-red-200 p-3 rounded-lg">
                                        ❌ <strong>Auto-Cancel (24 hours):</strong> Orders not confirmed by the vendor within 24 hours will be automatically cancelled and the buyer refunded.
                                    </p>
                                    <p className="text-muted-foreground bg-amber-50 border border-amber-200 p-3 rounded-lg">
                                        ⚠️ <strong>No-Ship Refund (3 days):</strong> If an order is confirmed but not marked as "Shipped" within 3 days, it will be cancelled and the buyer refunded.
                                    </p>
                                    <p className="text-muted-foreground bg-green-50 border border-green-200 p-3 rounded-lg">
                                        ✅ <strong>Auto-Release (Escrow):</strong> Funds are released to the vendor 72 hours after the buyer confirms delivery.
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        <strong>Note:</strong> If the buyer receives the item but fails to click "Confirm," the system will automatically release funds <strong>5 days after the shipment date</strong>, provided no dispute has been raised.
                                    </p>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                    5. Disputes and Returns
                                </h3>
                                <h4 className="font-semibold text-foreground mb-2">Grounds for Dispute</h4>
                                <p className="text-muted-foreground mb-3">
                                    Buyers may file a dispute within 72 hours of delivery for the following reasons:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                                    <li><strong>Item Not Received:</strong> The package never arrived</li>
                                    <li><strong>Wrong Item:</strong> The vendor sent the wrong size, color, or model</li>
                                    <li><strong>Damaged/Defective:</strong> The item arrived damaged or significantly different from the description</li>
                                    <li><strong>Counterfeit:</strong> The item is proven to be fake</li>
                                </ul>

                                <h4 className="font-semibold text-foreground mb-2">Resolution Process</h4>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground mb-4">
                                    <li>Vendors will be notified immediately when a dispute is raised</li>
                                    <li>You must respond with supporting evidence (e.g., photos of the packed item, courier receipts) within 48 hours</li>
                                    <li>Funds remain frozen in escrow during the investigation</li>
                                    <li><strong>Solely Admin Decision:</strong> If the dispute is resolved in favor of the buyer, a full refund is issued. If resolved in favor of the vendor, funds are released</li>
                                </ul>

                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                    <h4 className="font-semibold text-foreground mb-2">"Fit" and "Change of Mind"</h4>
                                    <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
                                        <li><strong>Vendor Responsibility:</strong> You are liable for returns if you sent the wrong size (e.g., Buyer ordered 42, you sent 43)</li>
                                        <li><strong>Buyer Responsibility:</strong> If the item matches the description/size ordered but does not fit the buyer's foot comfortably, Solely does not mandate a refund. Vendors may choose to accept such returns at their own discretion, but the buyer is responsible for all shipping costs</li>
                                    </ul>
                                </div>
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
                                <p className="text-muted-foreground mb-3">Vendors must not:</p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Sell counterfeit, fake, or replica branded products</li>
                                    <li>Misrepresent product condition (e.g., selling "used" shoes as "new")</li>
                                    <li>Conduct or attempt to conduct transactions outside the Solely platform (e.g., asking buyers to "pay via M-Pesa directly")</li>
                                    <li>Inflate prices to cover commission fees dishonestly</li>
                                    <li>Harass buyers or respond aggressively to reviews</li>
                                </ul>
                                <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-lg">
                                    <h4 className="font-semibold text-red-700 mb-2">Counterfeit Policy</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Solely has a <strong>zero-tolerance policy</strong> for fakes. If you are found to be knowingly selling counterfeit goods:
                                    </p>
                                    <ul className="list-disc pl-6 space-y-1 text-sm text-muted-foreground mt-2">
                                        <li>Your account will be immediately suspended</li>
                                        <li>Solely reserves the right to withhold any funds currently in your escrow balance to refund defrauded buyers</li>
                                    </ul>
                                </div>
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
