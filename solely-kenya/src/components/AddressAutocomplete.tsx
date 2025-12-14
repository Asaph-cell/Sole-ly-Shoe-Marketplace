/**
 * AddressAutocomplete Component
 * 
 * Uses LocationIQ Autocomplete API to provide address suggestions
 * and automatically detects if the address is in Nairobi (Zone 1) or outside (Zone 2).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";

const LOCATIONIQ_API_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY;
const LOCATIONIQ_AUTOCOMPLETE_URL = "https://api.locationiq.com/v1/autocomplete";

// Delivery fee zones
const ZONE_1_FEE = 200; // Nairobi
const ZONE_2_FEE = 300; // Outside Nairobi

interface LocationIQAddress {
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    suburb?: string;
    neighbourhood?: string;
    road?: string;
    house_number?: string;
}

interface LocationIQSuggestion {
    place_id: string;
    osm_id: string;
    osm_type: string;
    licence: string;
    lat: string;
    lon: string;
    display_name: string;
    display_place: string;
    display_address: string;
    address: LocationIQAddress;
    boundingbox?: string[];
    type?: string;
    class?: string;
}

interface AddressAutocompleteProps {
    value: string;
    onAddressSelect: (address: {
        displayName: string;
        zone: 1 | 2;
        deliveryFee: number;
        city: string;
        county: string;
        addressLine1: string;
    }) => void;
    placeholder?: string;
    label?: string;
    required?: boolean;
}

export function AddressAutocomplete({
    value,
    onAddressSelect,
    placeholder = "Start typing your delivery location...",
    label = "Delivery Address",
    required = false,
}: AddressAutocompleteProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<LocationIQSuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Update query when value prop changes
    useEffect(() => {
        setQuery(value);
    }, [value]);

    // Debounced search function
    const searchAddresses = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 3) {
            setSuggestions([]);
            return;
        }

        if (!LOCATIONIQ_API_KEY) {
            setError("LocationIQ API key not configured");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                key: LOCATIONIQ_API_KEY,
                q: searchQuery,
                countrycodes: "ke",
                limit: "5",
                format: "json",
                addressdetails: "1",
                normalizeaddress: "1",
            });

            const response = await fetch(`${LOCATIONIQ_AUTOCOMPLETE_URL}?${params}`);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error("Invalid API key");
                }
                if (response.status === 429) {
                    throw new Error("Rate limit exceeded. Please wait.");
                }
                throw new Error(`API error: ${response.status}`);
            }

            const data: LocationIQSuggestion[] = await response.json();
            setSuggestions(data);
            setShowDropdown(data.length > 0);
        } catch (err) {
            console.error("LocationIQ API error:", err);
            setError(err instanceof Error ? err.message : "Failed to fetch suggestions");
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Handle input change with debounce
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setQuery(newValue);

        // Clear previous timer
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        // Set new debounce timer (300ms)
        debounceTimer.current = setTimeout(() => {
            searchAddresses(newValue);
        }, 300);
    };

    // Detect if address is in Nairobi
    const isNairobiAddress = (address: LocationIQAddress): boolean => {
        const fieldsToCheck = [address.state, address.county, address.city, address.suburb];
        return fieldsToCheck.some(field =>
            field?.toLowerCase().includes("nairobi")
        );
    };

    // Handle suggestion selection
    const handleSelectSuggestion = (suggestion: LocationIQSuggestion) => {
        const address = suggestion.address;
        const isNairobi = isNairobiAddress(address);
        const zone: 1 | 2 = isNairobi ? 1 : 2;
        const deliveryFee = isNairobi ? ZONE_1_FEE : ZONE_2_FEE;

        // Build address line 1 from components
        let addressLine1 = "";
        if (address.house_number) addressLine1 += address.house_number + " ";
        if (address.road) addressLine1 += address.road;
        if (!addressLine1 && address.suburb) addressLine1 = address.suburb;
        if (!addressLine1 && address.neighbourhood) addressLine1 = address.neighbourhood;
        if (!addressLine1) addressLine1 = suggestion.display_place || suggestion.display_name.split(",")[0];

        setQuery(suggestion.display_name);
        setShowDropdown(false);
        setSuggestions([]);

        onAddressSelect({
            displayName: suggestion.display_name,
            zone,
            deliveryFee,
            city: address.city || address.county || address.state || "",
            county: address.county || address.state || "",
            addressLine1: addressLine1.trim(),
        });
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <Label htmlFor="address-autocomplete" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {label}
            </Label>
            <div className="relative mt-1.5">
                <Input
                    id="address-autocomplete"
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder}
                    required={required}
                    className="pr-10"
                    autoComplete="off"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {error && (
                <p className="text-xs text-destructive mt-1">{error}</p>
            )}

            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion) => {
                        const isNairobi = isNairobiAddress(suggestion.address);
                        return (
                            <button
                                key={suggestion.place_id}
                                type="button"
                                className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0"
                                onClick={() => handleSelectSuggestion(suggestion)}
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{suggestion.display_place}</p>
                                        <p className="text-xs text-muted-foreground truncate">{suggestion.display_address}</p>
                                    </div>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${isNairobi
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                        }`}>
                                        {isNairobi ? "Nairobi" : "Outside Nairobi"}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <p className="text-xs text-muted-foreground mt-1.5">
                Type at least 3 characters to search. Delivery fee: Nairobi KES 200, Outside KES 300
            </p>
        </div>
    );
}

export default AddressAutocomplete;
