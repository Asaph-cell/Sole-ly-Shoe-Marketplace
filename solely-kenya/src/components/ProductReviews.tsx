import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ProductReviewsProps {
  productId: string;
}

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);
  const [displayCount, setDisplayCount] = useState(5);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-muted-foreground">Loading reviews...</p>
        </CardContent>
      </Card>
    );
  }

  const visibleReviews = reviews.slice(0, displayCount);
  const hasMore = reviews.length > displayCount;

  return (
    <div className="space-y-4">
      {/* Average Rating Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Reviews</CardTitle>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{averageRating.toFixed(1)}</div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-5 w-5 ${star <= Math.round(averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                        }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        {reviews.length === 0 && (
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              No reviews yet. Be the first to review this product!
            </p>
          </CardContent>
        )}
      </Card>

      {/* Reviews List */}
      {visibleReviews.length > 0 && (
        <div className="space-y-4">
          {visibleReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{review.reviewer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${star <= review.rating
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                          }`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground mt-2">{review.comment}</p>
                )}
              </CardContent>
            </Card>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setDisplayCount(prev => prev + 5)}
              >
                Load More Reviews ({reviews.length - displayCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

