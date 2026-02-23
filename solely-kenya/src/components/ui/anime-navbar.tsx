"use client"

import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
    name: string
    url: string
    icon: LucideIcon
}

interface NavBarProps {
    items: NavItem[]
    className?: string
    defaultActive?: string
}

export function AnimeNavBar({ items, className, defaultActive = "Shop" }: NavBarProps) {
    const location = useLocation()
    const [mounted, setMounted] = useState(false)
    const [hoveredTab, setHoveredTab] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<string>(defaultActive)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Sync active tab with current route
    useEffect(() => {
        const currentItem = items.find(item => location.pathname === item.url || location.pathname.startsWith(item.url + '/'))
        if (currentItem) {
            setActiveTab(currentItem.name)
        }
    }, [location.pathname, items])

    if (!mounted) return null

    return (
        <motion.div
            className={cn(
                "flex items-center gap-1 sm:gap-2 bg-black/50 border border-white/10 backdrop-blur-lg py-1.5 px-1.5 rounded-full shadow-lg relative",
                className
            )}
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
            }}
        >
            {items.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.name
                const isHovered = hoveredTab === item.name

                return (
                    <Link
                        key={item.name}
                        to={item.url}
                        onClick={() => {
                            setActiveTab(item.name)
                            window.scrollTo(0, 0)
                        }}
                        onMouseEnter={() => setHoveredTab(item.name)}
                        onMouseLeave={() => setHoveredTab(null)}
                        className={cn(
                            "relative cursor-pointer text-sm font-semibold px-4 sm:px-6 py-2.5 rounded-full transition-all duration-300",
                            "text-white/70 hover:text-white",
                            isActive && "text-white"
                        )}
                    >
                        {/* Active tab glow */}
                        {isActive && (
                            <motion.div
                                className="absolute inset-0 rounded-full -z-10 overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{
                                    opacity: [0.3, 0.5, 0.3],
                                    scale: [1, 1.03, 1]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                            >
                                <div className="absolute inset-0 bg-primary/25 rounded-full blur-md" />
                                <div className="absolute inset-[-4px] bg-primary/20 rounded-full blur-xl" />
                                <div className="absolute inset-[-8px] bg-primary/15 rounded-full blur-2xl" />
                                <div className="absolute inset-[-12px] bg-primary/5 rounded-full blur-3xl" />

                                <div
                                    className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0"
                                    style={{
                                        animation: "shine 3s ease-in-out infinite"
                                    }}
                                />
                            </motion.div>
                        )}

                        {/* Tab label */}
                        <span className="relative z-10 hidden md:inline">{item.name}</span>
                        <motion.span
                            className="md:hidden relative z-10"
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                        >
                            <Icon size={18} strokeWidth={2.5} />
                        </motion.span>

                        {/* Hover highlight for non-active tabs */}
                        <AnimatePresence>
                            {isHovered && !isActive && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute inset-0 bg-white/10 rounded-full -z-10"
                                />
                            )}
                        </AnimatePresence>

                        {/* Sneaker mascot above active tab */}
                        {isActive && (
                            <motion.div
                                layoutId="sneaker-mascot"
                                className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none"
                                initial={false}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 30,
                                }}
                            >
                                <div className="relative w-10 h-10">
                                    <motion.div
                                        className="absolute left-1/2 -translate-x-1/2"
                                        animate={
                                            hoveredTab ? {
                                                scale: [1, 1.15, 1],
                                                rotate: [0, -8, 8, 0],
                                                transition: {
                                                    duration: 0.5,
                                                    ease: "easeInOut"
                                                }
                                            } : {
                                                y: [0, -3, 0],
                                                transition: {
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    ease: "easeInOut"
                                                }
                                            }
                                        }
                                    >
                                        {/* Sneaker SVG */}
                                        <svg width="32" height="28" viewBox="0 0 32 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            {/* Shoe sole */}
                                            <path d="M2 22C2 20.5 3 19 5 18.5L13 16C15 15.5 17 15 20 15.5C23 16 26 17.5 28 18.5C29.5 19.2 30 20 30 21.5V22.5C30 23.9 28.9 25 27.5 25H4.5C3.1 25 2 23.9 2 22.5V22Z" fill="white" />
                                            {/* Shoe upper */}
                                            <path d="M5 18.5C5 18.5 6 12 7 9C8 6 10 4 13 3.5C16 3 17 4 18 5C19 6 19.5 8 20 10C20.5 12 20 15.5 20 15.5" fill="white" fillOpacity="0.9" />
                                            {/* Shoe tongue */}
                                            <path d="M13 3.5C13 3.5 14 1.5 16 1C18 0.5 19 2 19 3C19 4 18 5 18 5" fill="white" fillOpacity="0.7" />
                                            {/* Sole line */}
                                            <path d="M4 22H28" stroke="currentColor" strokeWidth="1" className="text-primary" strokeOpacity="0.5" />
                                            {/* Lace detail */}
                                            <path d="M12 8L15 7M11 11L15 10M11 14L14 13" stroke="currentColor" strokeWidth="0.8" className="text-primary" strokeOpacity="0.6" strokeLinecap="round" />
                                            {/* Swoosh/accent line */}
                                            <path d="M7 16C7 16 10 13 14 12C18 11 22 12 25 14" stroke="currentColor" strokeWidth="1.2" className="text-primary" strokeOpacity="0.4" strokeLinecap="round" />
                                        </svg>

                                        {/* Sparkles on hover */}
                                        <AnimatePresence>
                                            {hoveredTab && (
                                                <>
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0 }}
                                                        className="absolute -top-1 -right-2 text-xs text-yellow-300"
                                                    >
                                                        ✨
                                                    </motion.div>
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0 }}
                                                        transition={{ delay: 0.1 }}
                                                        className="absolute -top-2 -left-1 text-xs text-yellow-300"
                                                    >
                                                        ✨
                                                    </motion.div>
                                                </>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>

                                    {/* Arrow pointing down to active tab */}
                                    <motion.div
                                        className="absolute -bottom-1 left-1/2 w-3 h-3 -translate-x-1/2"
                                        animate={
                                            hoveredTab ? {
                                                y: [0, -3, 0],
                                                transition: {
                                                    duration: 0.3,
                                                    repeat: Infinity,
                                                    repeatType: "reverse" as const
                                                }
                                            } : {
                                                y: [0, 2, 0],
                                                transition: {
                                                    duration: 1,
                                                    repeat: Infinity,
                                                    ease: "easeInOut",
                                                    delay: 0.5
                                                }
                                            }
                                        }
                                    >
                                        <div className="w-full h-full bg-white rotate-45 transform origin-center" />
                                    </motion.div>
                                </div>
                            </motion.div>
                        )}
                    </Link>
                )
            })}
        </motion.div>
    )
}
