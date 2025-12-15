import { useEffect, useRef, useState } from "react";
import heroImage from "@/assets/hero-shoes.jpg";

interface ParallaxHeroProps {
    children: React.ReactNode;
}

const ParallaxHero = ({ children }: ParallaxHeroProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
    const [isHovering, setIsHovering] = useState(false);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const updateParallax = () => {
            if (!bgRef.current || !containerRef.current) return;

            const rect = containerRef.current.getBoundingClientRect();

            // Only apply parallax when hero is visible
            if (rect.bottom > 0 && rect.top < window.innerHeight) {
                // Direct, instant mapping - no interpolation lag
                const scrollY = window.scrollY;
                const parallaxOffset = scrollY * 0.3; // Reduced multiplier for subtlety

                // Apply transform directly
                bgRef.current.style.transform = `translate3d(0, ${parallaxOffset}px, 0)`;
            }
        };

        const handleScroll = () => {
            // Cancel any pending frame
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }

            // Schedule update on next frame
            rafRef.current = requestAnimationFrame(updateParallax);
        };

        // Initial update
        updateParallax();

        // Listen to scroll with passive for performance
        window.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            window.removeEventListener("scroll", handleScroll);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        setMousePosition({ x, y });
    };

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
            {/* Parallax Background - direct responsive mapping */}
            <div
                ref={bgRef}
                className="absolute inset-0 scale-110"
                style={{
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                }}
            >
                <img
                    src={heroImage}
                    alt="Colorful shoes collection"
                    className="w-full h-full object-cover"
                    style={{
                        transform: 'translateZ(0)',
                    }}
                />
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-transparent" />

            {/* Interactive Glow Effect */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle 400px at ${glowX}% ${glowY}%, 
            hsla(45, 69%, 45%, ${isHovering ? 0.25 : 0}) 0%, 
            transparent 60%)`,
                    opacity: isHovering ? 1 : 0,
                    transition: 'opacity 0.5s ease-out',
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
