"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
    theme: Theme
    resolvedTheme: "light" | "dark"
    setTheme: (theme: Theme) => void
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system")
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light")

    useEffect(() => {
        Promise.resolve().then(() => {
            const storedTheme = localStorage.getItem("theme") as Theme | null
            if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
                setThemeState(storedTheme)
            }
        })
    }, [])

    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)")

        const applyTheme = () => {
            const nextResolvedTheme = theme === "system" ? getSystemTheme() : theme
            setResolvedTheme(nextResolvedTheme)
            document.documentElement.classList.toggle("dark", nextResolvedTheme === "dark")
        }

        applyTheme()
        media.addEventListener("change", applyTheme)

        return () => media.removeEventListener("change", applyTheme)
    }, [theme])

    const setTheme = React.useCallback((nextTheme: Theme) => {
        localStorage.setItem("theme", nextTheme)
        setThemeState(nextTheme)
    }, [])

    const toggleTheme = React.useCallback(() => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }, [resolvedTheme, setTheme])

    const value = useMemo(
        () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
        [theme, resolvedTheme, setTheme, toggleTheme]
    )

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider")
    }
    return context
}
