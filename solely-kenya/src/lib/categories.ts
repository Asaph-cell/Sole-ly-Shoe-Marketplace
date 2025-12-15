// Shared category definitions for consistent usage across the app

// Main categories shown on homepage
export const MAIN_CATEGORIES = [
    { name: "Men", key: "men" },
    { name: "Ladies", key: "ladies" },
    { name: "Casual", key: "casual" },
    { name: "Kids", key: "kids" },
    { name: "Formal", key: "formal" },
    { name: "Sports", key: "sports" },
] as const;

// Other/secondary categories (shown under "Other" on homepage)
export const OTHER_CATEGORIES = [
    { name: "School", key: "school" },
    { name: "Boots", key: "boots" },
    { name: "Open", key: "open" },
    { name: "Accessories", key: "accessories" },
] as const;

// All categories combined (used in filters)
export const CATEGORIES = [...MAIN_CATEGORIES, ...OTHER_CATEGORIES] as const;

// Get category name for display
export const getCategoryName = (key: string): string => {
    const category = CATEGORIES.find(c => c.key.toLowerCase() === key.toLowerCase());
    return category?.name || key.charAt(0).toUpperCase() + key.slice(1);
};

// Check if a category is in the predefined list
export const isKnownCategory = (key: string): boolean => {
    return CATEGORIES.some(c => c.key.toLowerCase() === key.toLowerCase());
};

// Check if category is a "main" category
export const isMainCategory = (key: string): boolean => {
    return MAIN_CATEGORIES.some(c => c.key.toLowerCase() === key.toLowerCase());
};
