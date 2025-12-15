import { useRef, useState } from "react";
import heroImage from "@/assets/hero-shoes.jpg";

interface ParallaxHeroProps {
    children: React.ReactNode;
}

const ParallaxHero = ({ children }: ParallaxHeroProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
    const [isHovering, setIsHovering] = useState(false);

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
            {/* Static Background */}
            <div className="absolute inset-0">
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
