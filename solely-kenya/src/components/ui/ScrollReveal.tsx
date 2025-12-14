"use client";

import { motion, useInView, useAnimation, Variant } from "framer-motion";
import { useEffect, useRef } from "react";

interface ScrollRevealProps {
    children: React.ReactNode;
    width?: "fit-content" | "100%";
    mode?: "fade-up" | "slide-in" | "zoom-in" | "aggressive";
    delay?: number;
    duration?: number;
    className?: string;
    enableHover?: boolean;
}

export const ScrollReveal = ({
    children,
    width = "100%",
    mode = "fade-up",
    delay = 0,
    duration = 0.5,
    className = "",
    enableHover = false
}: ScrollRevealProps & { enableHover?: boolean }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-10% 0px" });
    const mainControls = useAnimation();

    useEffect(() => {
        if (isInView) {
            mainControls.start("visible");
        }
    }, [isInView, mainControls]);

    const variants = {
        "fade-up": {
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } },
        },
        "slide-in": {
            hidden: { opacity: 0, x: -40 },
            visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: "easeOut" } },
        },
        "zoom-in": {
            hidden: { opacity: 0, scale: 0.8 },
            visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } },
        },
        "aggressive": {
            hidden: { opacity: 0, y: 100, scale: 0.9 },
            visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: {
                    type: "spring",
                    stiffness: 100,
                    damping: 15,
                    mass: 1,
                    delay: delay
                }
            },
        }
    };

    return (
        <div ref={ref} style={{ position: "relative", width }} className={className}>
            <motion.div
                variants={variants[mode] as { hidden: Variant; visible: Variant }}
                initial="hidden"
                animate={mainControls}
                transition={{ duration, delay }}
                style={{ willChange: "transform, opacity" }}
                whileHover={enableHover ? {
                    scale: 1.05,
                    transition: { duration: 0.2 }
                } : undefined}
            >
                {children}
            </motion.div>
        </div>
    );
};
