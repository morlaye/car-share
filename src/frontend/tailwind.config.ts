import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: '#f8fafc', // Slate-50
                foreground: '#0f172a', // Slate-900
                primary: {
                    DEFAULT: '#1e1b4b', // Midnight Indigo (Brand)
                    foreground: '#ffffff',
                    action: '#6366f1', // Electric Violet (Buttons/Highlights)
                },
                secondary: {
                    DEFAULT: '#ffffff',
                    foreground: '#0f172a',
                },
                muted: {
                    DEFAULT: '#f1f5f9', // Slate-100
                    foreground: '#64748b', // Slate-500
                },
                accent: {
                    DEFAULT: '#e0e7ff', // Indigo-100 (Subtle highlight)
                    foreground: '#3730a3', // Indigo-800
                },
                card: {
                    DEFAULT: '#ffffff',
                    foreground: '#0f172a'
                },
                border: '#e2e8f0', // Slate-200
            },
            borderRadius: {
                lg: '0.75rem', // Rounded-xl generally
                md: '0.5rem',
                sm: '0.25rem',
            },
            fontFamily: {
                sans: ['var(--font-geist-sans)'],
                mono: ['var(--font-geist-mono)'],
            }
        }
    },
    plugins: [require("tailwindcss-animate")],
};
export default config;
