
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "./ui/card";
import { Badge } from "./ui/badge";
import { Star } from "lucide-react";
import { motion } from "framer-motion";

interface ProductCardProps {
  id: number;
  name: string;
  price: number;
  image: string;
  brand?: string;
  rating?: number;
  isNew?: boolean;
  condition?: "new" | "like_new" | "good" | "fair";
}

const conditionLabels: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-green-500" },
  like_new: { label: "Like New", color: "bg-blue-500" },
  good: { label: "Good", color: "bg-yellow-500" },
  fair: { label: "Fair", color: "bg-orange-500" },
};

const ProductCard = ({
  id,
  name,
  price,
  image,
  brand,
  rating = 4.5,
  isNew = false,
  condition = "new"
}: ProductCardProps) => {
  const conditionInfo = conditionLabels[condition] || conditionLabels.new;

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Link to={`/product/${id}`} className="group">
        <Card className="overflow-hidden border-2 hover:shadow-hover transition-shadow duration-300 bg-card">
          <CardContent className="p-0 relative">
            <div className="aspect-square overflow-hidden bg-muted">
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            </div>
            {/* Condition Badge - Top Left */}
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 flex items-center gap-1.5 shadow-md"
            >
              <span className={`w-2 h-2 rounded-full ${conditionInfo.color}`}></span>
              {conditionInfo.label}
            </Badge>
            {isNew && (
              <Badge className="absolute top-3 right-3 bg-accent text-accent-foreground">New Arrival</Badge>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-2 p-4">
            {brand && <span className="text-xs text-muted-foreground uppercase tracking-wide">{brand}</span>}
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
              {name}
            </h3>
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{rating}</span>
            </div>
            <p className="text-2xl font-bold text-primary">KES {price.toLocaleString()}</p>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
