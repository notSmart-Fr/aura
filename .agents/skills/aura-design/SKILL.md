---
name: aura-design
description: "Design system, visual tokens, styling, Tailwind config, typography, colors, layout, UI components, frontend"
---

# Aura Design System

Source: `design.md` at repo root. Consult before generating/editing styling.

## Core Tokens
- Zero border radius (`rounded-none`) — sharp architectural edges
- No gradients, no shadows, no grayscale filters on product images
- Background: `#ffffff` uniform across nav, body, footer

## Colors
| Token | Hex | Use |
|-------|-----|-----|
| primary | `#000000` | Headers, borders, actions |
| secondary | `#5d5f5f` | Subtext, aux borders |
| background | `#ffffff` | Viewport body |
| surface | `#ffffff` | Nav, Footer, Cards |
| silver-sand | `#E5E5E5` | Hairline dividers (`1px`) |

## Typography
- EB Garamond (serif): hero headers, displays, structural quotes
- Hanken Grotesk (sans-serif): labels, body copy, UI metadata

## Spacing
- `1px` gutter for grid dividers
- Margins: 20px (mobile) / 40px (tablet) / 80px (desktop)
- Container max-width: 1440px

## Image Rules
- 100% color accuracy — no grayscale/desaturation
- No gradient overlays on campaign images
- No placeholder gray boxes — use real media paths
