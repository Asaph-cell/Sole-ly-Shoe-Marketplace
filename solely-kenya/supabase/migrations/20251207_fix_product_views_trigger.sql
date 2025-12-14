-- Function to increment product views
CREATE OR REPLACE FUNCTION public.increment_product_views()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.products
  SET views = views + 1
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

-- Trigger to call the function on new view insertion
DROP TRIGGER IF EXISTS on_product_view ON public.product_views;
CREATE TRIGGER on_product_view
AFTER INSERT ON public.product_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_product_views();

-- Backfill: Update products.views with current count from product_views
WITH view_counts AS (
    SELECT product_id, COUNT(*) as count
    FROM public.product_views
    GROUP BY product_id
)
UPDATE public.products
SET views = view_counts.count
FROM view_counts
WHERE products.id = view_counts.product_id;
