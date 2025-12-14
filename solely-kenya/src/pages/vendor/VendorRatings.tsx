import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VendorNavbar } from "@/components/vendor/VendorNavbar";
import { VendorSidebar } from "@/components/vendor/VendorSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Rating {
    id: string;
    rating: number;
    review: string | null;
    created_at: string;
    order_id: string;
}

const VendorRatings = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [stats, setStats] = useState({
        average: 0,
        total: 0,
        breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    });

    useEffect(() => {
        if (!loading && !user) {
            navigate("/auth");
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (user) {
            loadRatings();
        }
    }, [user]);

    const loadRatings = async () => {
        setLoadingData(true);
        try {
            // Fetch ratings WITHOUT buyer details (anonymous)
            const { data, error } = await supabase
                .from("vendor_ratings")
                .select("id, rating, review, created_at, order_id")
                .eq("vendor_id", user?.id)
                .order("created_at", { ascending: false });

            if (error) throw error;

            setRatings(data || []);

            // Calculate stats
            if (data && data.length > 0) {
                const total = data.length;
                const sum = data.reduce((acc, r) => acc + r.rating, 0);
                const average = sum / total;

                const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                data.forEach((r) => {
                    if (r.rating >= 1 && r.rating <= 5) {
                        breakdown[r.rating as keyof typeof breakdown]++;
                    }
                });

                setStats({ average: Number(average.toFixed(1)), total, breakdown });
            }
        } catch (error) {
            console.error("Error loading ratings:", error);
        } finally {
            setLoadingData(false);
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`h-4 w-4 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                            }`}
                    />
                ))}
            </div>
        );
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
                    <h1 className="text-3xl font-bold mb-8">My Ratings & Reviews</h1>

                    {loadingData ? (
                        <div className="text-center py-12 text-muted-foreground">Loading ratings...</div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Stats Summary */}
                            <div className="lg:col-span-1 space-y-6">
                                {/* Average Rating */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Overall Rating</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-center">
                                            <div className="text-5xl font-bold text-primary mb-2">
                                                {stats.average > 0 ? stats.average : "—"}
                                            </div>
                                            <div className="flex justify-center mb-2">
                                                {renderStars(Math.round(stats.average))}
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Based on {stats.total} {stats.total === 1 ? "review" : "reviews"}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Rating Breakdown */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Rating Breakdown</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[5, 4, 3, 2, 1].map((star) => {
                                            const count = stats.breakdown[star as keyof typeof stats.breakdown];
                                            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0;
                                            return (
                                                <div key={star} className="flex items-center gap-3">
                                                    <span className="text-sm w-8">{star} ★</span>
                                                    <Progress value={percentage} className="flex-1 h-2" />
                                                    <span className="text-sm text-muted-foreground w-8">{count}</span>
                                                </div>
                                            );
                                        })}
                                    </CardContent>
                                </Card>

                                {/* Tips Card */}
                                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                                    <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                                            <TrendingUp className="h-5 w-5" />
                                            Tips for Better Ratings
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-blue-800 space-y-2">
                                        <p>✓ Respond to orders quickly</p>
                                        <p>✓ Ship items on time</p>
                                        <p>✓ Use accurate product descriptions</p>
                                        <p>✓ Package items carefully</p>
                                        <p>✓ Communicate with buyers</p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Reviews List */}
                            <div className="lg:col-span-2">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-lg">Customer Reviews</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {ratings.length === 0 ? (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <Star className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                <p>No reviews yet</p>
                                                <p className="text-sm mt-2">
                                                    Reviews will appear here when customers rate their orders
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {ratings.map((rating) => (
                                                    <div
                                                        key={rating.id}
                                                        className="border-b pb-4 last:border-0 last:pb-0"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {renderStars(rating.rating)}
                                                                <Badge variant="outline" className="text-xs">
                                                                    Order #{rating.order_id.slice(0, 8)}
                                                                </Badge>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(rating.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        {rating.review ? (
                                                            <p className="text-sm text-muted-foreground">
                                                                "{rating.review}"
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground italic">
                                                                No written review
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default VendorRatings;
