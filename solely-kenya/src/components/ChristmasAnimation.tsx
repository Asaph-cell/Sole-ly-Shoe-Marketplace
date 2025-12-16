import { useEffect, useState } from "react";

interface Snowflake {
    id: number;
    left: number;
    animationDuration: number;
    opacity: number;
    size: number;
}

export const ChristmasAnimation = () => {
    const [snowflakes, setSnowflakes] = useState<Snowflake[]>([]);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        // Check if desktop (screen width > 768px)
        const checkDesktop = () => {
            setIsDesktop(window.innerWidth > 768);
        };

        checkDesktop();
        window.addEventListener('resize', checkDesktop);

        // Generate snowflakes only on desktop
        if (window.innerWidth > 768) {
            const flakes: Snowflake[] = Array.from({ length: 50 }, (_, i) => ({
                id: i,
                left: Math.random() * 100,
                animationDuration: Math.random() * 3 + 2,
                opacity: Math.random() * 0.6 + 0.4,
                size: Math.random() * 10 + 5,
            }));
            setSnowflakes(flakes);
        }

        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    return (
        <>
            {/* Snowflakes - Desktop Only */}
            {isDesktop && (
                <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
                    {snowflakes.map((flake) => (
                        <div
                            key={flake.id}
                            className="snowflake absolute animate-fall"
                            style={{
                                left: `${flake.left}%`,
                                opacity: flake.opacity,
                                fontSize: `${flake.size}px`,
                                animationDuration: `${flake.animationDuration}s`,
                                animationDelay: `${Math.random() * 2}s`,
                            }}
                        >
                            ❄️
                        </div>
                    ))}
                </div>
            )}

            {/* Christmas Banner - All Devices */}
            <div className="fixed top-0 left-0 right-0 z-40 bg-gradient-to-r from-red-600 via-green-600 to-red-600 text-white py-2 text-center shadow-lg">
                <div className="flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm font-semibold animate-pulse">
                    <span className="text-base md:text-xl">🎄</span>
                    <span>Merry Christmas from Solely! 🎁 Happy Holidays! ✨</span>
                    <span className="text-base md:text-xl">🎅</span>
                </div>
            </div>

            {/* Global styles for snowflake animation */}
            <style dangerouslySetInnerHTML={{
                __html: `
          @keyframes fall {
            0% {
              transform: translateY(-10vh) rotate(0deg);
            }
            100% {
              transform: translateY(100vh) rotate(360deg);
            }
          }
          .animate-fall {
            animation: fall linear infinite;
          }
        `
            }} />
        </>
    );
};
