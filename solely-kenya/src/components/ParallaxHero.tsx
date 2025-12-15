import { useEffect, useRef, useState } from "react";
import heroImage from "@/assets/hero-shoes.jpg";

interface ParallaxHeroProps {
    children: React.ReactNode;
}

const ParallaxHero = ({ children }: ParallaxHeroProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollY, setScrollY] = useState(0);
    const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                // Only apply parallax when hero is visible
                if (rect.bottom > 0 && rect.top < window.innerHeight) {
                    setScrollY(window.scrollY);
                }
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setMousePosition({ x, y });
    };

    // Calculate parallax offset (image moves slower than scroll)
    const parallaxOffset = scrollY * 0.4;

    // Calculate mouse-based movement for glow effect
    const glowX = mousePosition.x * 100;
    const glowY = mousePosition.y * 100;

    return (
        <section
            ref={containerRef}
            className="relative h-auto min-h-[500px] sm:h-[600px] flex items-center justify-center overflow-hidden py-12 sm:py-0"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Parallax Background */}
            <div
                className="absolute inset-0 will-change-transform"
                style={{
                    transform: `translateY(${parallaxOffset}px) scale(1.1)`,
                }}
            >
                <img
                    src={heroImage}
                    alt="Colorful shoes collection"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />

            {/* Interactive Glow Effect */}
            <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-500"
                style={{
                    background: `radial-gradient(circle 400px at ${glowX}% ${glowY}%, 
            hsla(45, 69%, 50%, ${isHovering ? 0.15 : 0}) 0%, 
            transparent 60%)`,
                    opacity: isHovering ? 1 : 0,
                }}
            />

            {/* Subtle Shimmer Effect */}
            <div
                className="absolute inset-0 pointer-events-none hero-shimmer"
                style={{
                    opacity: isHovering ? 0.3 : 0.1,
                    transition: "opacity 0.5s ease",
                }}
            />

            {children}
        </section>
    );
};

export default ParallaxHero;
