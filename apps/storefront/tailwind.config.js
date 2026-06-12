import path from "path"
import medusaUiPreset from "@medusajs/ui-preset"
import tailwindcssRadix from "tailwindcss-radix"

export default {
  darkMode: "class",
  presets: [medusaUiPreset],
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/modules/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      transitionProperty: {
        width: "width margin",
        height: "height",
        bg: "background-color",
        display: "display opacity",
        visibility: "visibility",
        padding: "padding-top padding-right padding-bottom padding-left",
      },
      colors: {
        grey: {
          0: "#FFFFFF",
          5: "#F9FAFB",
          10: "#F3F4F6",
          20: "#E5E7EB",
          30: "#D1D5DB",
          40: "#9CA3AF",
          50: "#6B7280",
          60: "#4B5563",
          70: "#374151",
          80: "#1F2937",
          90: "#111827",
        },
        "surface-container-lowest": "#ffffff",
        "on-primary-container": "#848484",
        "graphite": "#333333",
        "silver-sand": "#E5E5E5",
        "inverse-surface": "#2f3131",
        "on-primary": "#ffffff",
        "background": "#ffffff",
        "on-error": "#ffffff",
        "tertiary-container": "#1b1b1b",
        "on-secondary": "#ffffff",
        "surface-bright": "#ffffff",
        "tertiary": "#000000",
        "surface-container-highest": "#e2e2e2",
        "surface-variant": "#e2e2e2",
        "surface-container-low": "#ffffff",
        "outline": "#7e7576",
        "surface-container": "#ffffff",
        "surface": "#ffffff",
        "error": "#ba1a1a",
        "primary": "#000000",
        "secondary": "#5d5f5f",
        "on-background": "#1a1c1c",
        "on-surface": "#1a1c1c"
      },
      borderRadius: {
        none: "0px",
        soft: "0px",
        base: "0px",
        rounded: "0px",
        large: "0px",
        circle: "0px",
        DEFAULT: "0px",
        lg: "0px",
        xl: "0px",
        full: "0px",
      },
      spacing: {
        "stack-sm": "20px",
        "gutter": "1px",
        "margin-desktop": "80px",
        "stack-xl": "160px",
        "stack-md": "40px",
        "margin-mobile": "20px",
        "margin-tablet": "40px",
        "stack-lg": "80px",
        "container-max": "1440px"
      },
      maxWidth: {
        "8xl": "100rem",
      },
      screens: {
        "2xsmall": "320px",
        xsmall: "512px",
        small: "1024px",
        medium: "1280px",
        large: "1440px",
        xlarge: "1680px",
        "2xlarge": "1920px",
      },
      fontSize: {
        "3xl": "2rem",
        "display-lg": ["64px", {"lineHeight": "1.1", "letterSpacing": "-0.02em", "fontWeight": "400"}],
        "body-md": ["14px", {"lineHeight": "1.6", "fontWeight": "400"}],
        "label-lg": ["12px", {"lineHeight": "1", "letterSpacing": "0.15em", "fontWeight": "500"}],
        "headline-sm": ["18px", {"lineHeight": "1.4", "letterSpacing": "0.1em", "fontWeight": "600"}],
        "headline-md": ["32px", {"lineHeight": "1.3", "fontWeight": "400"}],
        "headline-lg": ["40px", {"lineHeight": "1.2", "letterSpacing": "0em", "fontWeight": "400"}],
        "label-md": ["10px", {"lineHeight": "1", "letterSpacing": "0.2em", "fontWeight": "500"}],
        "body-lg": ["16px", {"lineHeight": "1.6", "fontWeight": "400"}]
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Ubuntu",
          "sans-serif",
        ],
        "display-lg": ["var(--font-eb-garamond)"],
        "body-md": ["var(--font-hanken-grotesk)"],
        "label-lg": ["var(--font-hanken-grotesk)"],
        "headline-sm": ["var(--font-hanken-grotesk)"],
        "headline-md": ["var(--font-eb-garamond)"],
        "headline-lg": ["var(--font-eb-garamond)"],
        "label-md": ["var(--font-hanken-grotesk)"],
        "body-lg": ["var(--font-hanken-grotesk)"],
      },
      keyframes: {
        ring: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "fade-in-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)",
          },
        },
        "fade-in-top": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "fade-out-top": {
          "0%": {
            height: "100%",
          },
          "99%": {
            height: "0",
          },
          "100%": {
            visibility: "hidden",
          },
        },
        "accordion-slide-up": {
          "0%": {
            height: "var(--radix-accordion-content-height)",
            opacity: "1",
          },
          "100%": {
            height: "0",
            opacity: "0",
          },
        },
        "accordion-slide-down": {
          "0%": {
            "min-height": "0",
            "max-height": "0",
            opacity: "0",
          },
          "100%": {
            "min-height": "var(--radix-accordion-content-height)",
            "max-height": "none",
            opacity: "1",
          },
        },
        enter: {
          "0%": { transform: "scale(0.9)", opacity: 0 },
          "100%": { transform: "scale(1)", opacity: 1 },
        },
        leave: {
          "0%": { transform: "scale(1)", opacity: 1 },
          "100%": { transform: "scale(0.9)", opacity: 0 },
        },
        "slide-in": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        ring: "ring 2.2s cubic-bezier(0.5, 0, 0.5, 1) infinite",
        "fade-in-right":
          "fade-in-right 0.3s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-in-top": "fade-in-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "fade-out-top":
          "fade-out-top 0.2s cubic-bezier(0.5, 0, 0.5, 1) forwards",
        "accordion-open":
          "accordion-slide-down 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        "accordion-close":
          "accordion-slide-up 300ms cubic-bezier(0.87, 0, 0.13, 1) forwards",
        enter: "enter 200ms ease-out",
        "slide-in": "slide-in 1.2s cubic-bezier(.41,.73,.51,1.02)",
        leave: "leave 150ms ease-in forwards",
      },
    },
  },
  plugins: [tailwindcssRadix()],
}
