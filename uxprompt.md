# Luca UX Refinement — "Midnight Clarity" Design Direction

> A modern, dark-first analytics dashboard inspired by Linear, Vercel, and premium fintech applications.
> Focused on **clarity**, **speed**, and **confidence** — helping marketing teams make decisions faster.

---

## 0. Inputs

**Chosen UX Concept / Direction:**
> **"Midnight Clarity"** — A dark-mode-first dashboard with deep blacks, vivid teal/cyan accents, bento grid layouts, subtle glassmorphism, and bold typography. Inspired by Linear's craft-first approach, Vercel's developer aesthetic, and modern fintech dashboards like Mercury and Stripe.

**Your PRD:**
> See `prompt.md` for full product specification. Luca is an analytics dashboard for MENA e-commerce businesses that unifies ad platform data, provides first-party attribution, and calculates true profitability metrics (ROAS, Net Profit, MER).

**Additional Notes:**
> - Target users: Marketing managers who live in dashboards 8+ hours/day
> - Key insight: Dark mode reduces eye strain for heavy dashboard users
> - Inspiration sources: Linear, Vercel, Mercury, Stripe Dashboard, Raycast, Arc Browser
> - Tech stack: Next.js 16, Tailwind CSS v4, shadcn/ui, Recharts

---

## 1. Refinement Objectives

**Primary Goal of Refinement:**
> Transform Luca from a generic light-mode SaaS dashboard into a **premium, dark-first analytics experience** that feels fast, focused, and distinctly modern. The UI should communicate "precision" and "insight" — not "corporate spreadsheet."

**Core Design Language / System Reference:**
> - **Framework:** Tailwind CSS v4 with custom design tokens
> - **Components:** shadcn/ui as base, heavily customized
> - **Icons:** Phosphor Icons (replacing Material Symbols for sharper feel)
> - **Typography:** Inter or Geist for UI, JetBrains Mono for numbers/data
> - **Motion:** Framer Motion for micro-interactions

---

## 2. Strategic Refinement Checklist

### A. Hierarchy and Clarity

**Design Principles:**
- **Numbers are heroes** — KPI values should be the largest, boldest elements on screen
- **De-emphasize chrome** — Sidebar, headers, and navigation should recede; content comes forward
- **High contrast on dark** — White/cyan text on deep black backgrounds
- **Semantic color only** — Green = good/up, Red = bad/down, Cyan = primary action

**Action Hierarchy:**
- **Primary:** Solid cyan/teal button with glow effect on hover
- **Secondary:** Ghost button with subtle border, fills on hover
- **Tertiary:** Text link style, underline on hover
- **Destructive:** Red outline, fills red on hover (never solid red by default)

> **Hierarchy Refinement Notes:**
> - Current design has weak number hierarchy (metrics blend into cards)
> - Navigation competes with content for attention
> - Action buttons lack clear primary/secondary distinction
> - **Fix:** Implement 3-level type scale for data: Hero (48px), Primary (24px), Secondary (14px)

---

### B. Spacing and Layout Consistency

**Spacing System (8px base):**
```
4px   — xs (tight internal padding)
8px   — sm (default gaps)
12px  — md (card internal padding)
16px  — base (section gaps)
24px  — lg (card external margins)
32px  — xl (major section breaks)
48px  — 2xl (page-level padding)
64px  — 3xl (hero spacing)
```

**Layout Philosophy:**
- **Bento grid** for dashboard — asymmetric, modular cards that break the monotony
- **Max-width 1440px** for main content area
- **Sidebar: 240px fixed** (collapsible to 64px icons-only)
- **Cards have generous internal padding** (24px) but tight external gaps (16px)

> **Spacing Refinement Notes:**
> - Current layout is too uniform (same-size cards in grid)
> - Sidebar feels cramped (px-4 py-3 is too tight)
> - **Fix:** Implement bento layout with 2:1 and 1:2 card ratios, increase sidebar padding

---

### C. Color and Visual Polish

**Color Palette — "Midnight Clarity":**

```css
/* Backgrounds */
--bg-base: #0A0A0B;        /* Deep black, almost OLED */
--bg-subtle: #111113;       /* Card backgrounds */
--bg-muted: #18181B;        /* Elevated cards, modals */
--bg-elevated: #1F1F23;     /* Hover states, dropdowns */

/* Foregrounds */
--fg-base: #FAFAFA;         /* Primary text */
--fg-muted: #A1A1AA;        /* Secondary text */
--fg-subtle: #52525B;       /* Tertiary text, placeholders */

/* Accents */
--accent-primary: #06B6D4;   /* Cyan — primary actions, links */
--accent-glow: #22D3EE;      /* Lighter cyan for glows */
--accent-secondary: #8B5CF6; /* Purple — secondary highlights */

/* Semantic */
--success: #10B981;          /* Green — positive trends */
--success-muted: #064E3B;    /* Green background tint */
--danger: #EF4444;           /* Red — negative trends */
--danger-muted: #450A0A;     /* Red background tint */
--warning: #F59E0B;          /* Amber — warnings */

/* Borders */
--border-default: rgba(255, 255, 255, 0.06);
--border-hover: rgba(255, 255, 255, 0.12);
--border-active: rgba(6, 182, 212, 0.5);

/* Gradients */
--gradient-glow: linear-gradient(135deg, #06B6D4 0%, #8B5CF6 100%);
--gradient-card: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
```

**Visual Effects:**
- **Glassmorphism on modals:** `backdrop-blur-xl bg-white/5 border border-white/10`
- **Subtle glow on primary elements:** `shadow-[0_0_20px_rgba(6,182,212,0.3)]`
- **Card hover lift:** `hover:-translate-y-0.5 hover:shadow-lg transition-all`

> **Color/Polish Notes:**
> - Current palette is too muted (gray-on-gray lacks energy)
> - No glow effects or depth — feels flat
> - **Fix:** Implement cyan accent system with glow effects, add subtle gradients to cards

---

## 3. Component-Level Refinement

### 🧾 Inputs & Forms

| Component | Refinement Actions | Notes |
| :--- | :--- | :--- |
| **Inputs** | Dark bg (#111113), subtle inner shadow, 1px border (white/6%), cyan focus ring with glow, 12px rounded corners | Replace current gray inputs |
| **Labels** | Small caps (11px), tracking-wide, fg-muted color, positioned above input with 4px gap | Currently too prominent |
| **Search** | Pill-shaped (full rounded), icon inside left, CMD+K hint on right | Inspired by Raycast/Linear |
| **Dropdowns** | Glassmorphism panel, subtle slide-down animation, checkmark for selected | Currently basic select |
| **Date Picker** | Calendar popup with month navigation, preset pills (Today, 7D, 30D), comparison toggle | Keep but restyle dark |

---

### ⚡ Action & Status Elements

| Component | Refinement Actions | Notes |
| :--- | :--- | :--- |
| **Primary Button** | Solid cyan (#06B6D4), white text, subtle glow on hover, 8px rounded | Currently lacks punch |
| **Secondary Button** | Transparent bg, white/10 border, fills to white/5 on hover | Ghost style |
| **Icon Buttons** | 36px touch target, subtle bg on hover, tooltip on hover | For actions like sync, filter |
| **Status Badges** | Pill shape, semantic bg tints (success-muted, danger-muted), dot indicator | Platform status, campaign status |
| **Trend Indicators** | Arrow icon + percentage, green/red coloring, no background (cleaner) | Currently has sparklines — keep those but simplify badge |

---

### 🧭 Navigation & Wayfinding

| Component | Refinement Actions | Notes |
| :--- | :--- | :--- |
| **Sidebar** | Dark bg (#0A0A0B), items have left accent bar when active (4px cyan), subtle hover state (bg-elevated), collapsible to icons | Currently light bg, right border active |
| **Sidebar Header** | Logo + wordmark, subtle gradient glow behind logo on hover | Add polish |
| **Org Switcher** | Dropdown with org avatar, current org highlighted, "Create new" at bottom | Keep but restyle |
| **Top Header** | Minimal — page title (large), date range selector (right), no breadcrumbs needed | Simplify |
| **Mobile Nav** | Slide-out drawer from left, backdrop blur, same items as sidebar | Currently hidden on mobile |

---

### 🧩 Content & Layout Components

| Component | Refinement Actions | Notes |
| :--- | :--- | :--- |
| **Metric Cards (Bento)** | Various sizes (1x1, 2x1, 1x2), dark card bg with subtle gradient, large hero number, small label, trend badge, optional sparkline | **Most important component** |
| **Charts** | Dark theme (bg transparent), cyan/purple gradient fills, subtle grid lines (white/5%), large axis labels | Currently light theme charts |
| **Data Tables** | No zebra striping (too busy), subtle row hover (bg-elevated), sticky header, compact mode toggle | For campaigns list |
| **Platform Icons** | Consistent 20px size, subtle colored backgrounds matching brand (Meta blue, Snap yellow, etc.) | Visual platform identification |
| **Empty States** | Centered illustration (line art style), clear headline, single CTA, muted description | For no data / no integrations |
| **Loading States** | Skeleton with subtle shimmer animation (left-to-right gradient), matches final card shapes | Currently basic loading |
| **Modals** | Glassmorphism (backdrop-blur-xl, bg-white/5), centered, max-width 480px, slide-up animation | For confirmations, OAuth flows |

---

## 4. Dashboard Layout — Bento Grid

**Overview Page Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo]  Luca          │  Overview              [Date Range ▾]  │
│  ─────────────────────  ────────────────────────────────────────│
│  [Org Switcher    ▾]   │                                        │
│                        │  ┌──────────────┐ ┌──────────────┐     │
│  ┌──────────────────┐  │  │ TOTAL SALES  │ │  AD SPEND    │     │
│  │ 🚀 Complete Setup│  │  │   ريال 847K  │ │   ريال 124K  │     │
│  │ Step 1 of 2      │  │  │   ↑ 12.3%    │ │   ↑ 8.1%     │     │
│  │ ████████░░ 50%   │  │  └──────────────┘ └──────────────┘     │
│  └──────────────────┘  │                                        │
│                        │  ┌─────────────────────────────────┐   │
│  CORE                  │  │        NET PROFIT               │   │
│  ● Overview            │  │         ريال 312K              │   │
│  ○ Campaigns           │  │         ↑ 23.4%                 │   │
│  ○ Live Feed           │  │    [═══════════════ sparkline]  │   │
│  ○ Integrations        │  └─────────────────────────────────┘   │
│                        │                                        │
│  SETTINGS              │  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  ○ Team                │  │  ROAS    │ │   MER    │ │  MARGIN  ││
│                        │  │  6.8x    │ │  14.7%   │ │  36.8%   ││
│                        │  │  ↑ 0.4   │ │  ↓ 1.2%  │ │  ↑ 2.1%  ││
│                        │  └──────────┘ └──────────┘ └──────────┘│
│                        │                                        │
│                        │  ┌─────────────────────────────────┐   │
│                        │  │    PERFORMANCE OVER TIME        │   │
│                        │  │    [Area chart: Revenue/Spend]  │   │
│                        │  │    ════════════════════════════ │   │
│                        │  └─────────────────────────────────┘   │
│                        │                                        │
│  ┌──────────────────┐  │  ┌─────────────────────────────────┐   │
│  │ [Avatar] User    │  │  │    SPEND BY PLATFORM            │   │
│  └──────────────────┘  │  │    [Horizontal bar chart]       │   │
│                        │  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

**Bento Card Sizes:**
- **Hero (2x1):** Net Profit — the most important metric, gets double width
- **Standard (1x1):** Total Sales, Ad Spend, ROAS, MER, Margin
- **Wide (3x1):** Performance chart, Platform breakdown
- **Tall (1x2):** Could be used for live feed preview

---

## 5. Additional Refinement Passes

### Accessibility
- **Contrast ratios:** All text meets WCAG AA (4.5:1 minimum)
- **Focus states:** Cyan ring with 2px offset, visible on all interactive elements
- **Keyboard navigation:** Tab through cards, Enter to drill down
- **Reduced motion:** Respect `prefers-reduced-motion`, disable glow animations
- **Screen reader:** Proper ARIA labels on charts, trend descriptions ("Revenue increased 12.3% compared to last period")

### Microcopy & Tone
- **Headlines:** Direct, confident ("Your profit grew 23%" not "Profit overview")
- **Empty states:** Encouraging ("Connect your first ad platform to see spend breakdown")
- **Errors:** Helpful ("Couldn't sync campaigns — Meta's API is slow today. Try again?")
- **Tooltips:** Brief, useful ("ROAS = Revenue ÷ Ad Spend")
- **No jargon:** Say "cost per new customer" not "NCPA" in tooltips

### Responsiveness

**Breakpoints:**
```
sm:  640px  — Mobile (single column, stacked cards)
md:  768px  — Tablet (2-column bento, collapsed sidebar)
lg:  1024px — Desktop (full bento, expanded sidebar)
xl:  1280px — Wide desktop (larger cards, more whitespace)
2xl: 1536px — Ultra-wide (max-width container kicks in)
```

**Mobile Adaptations:**
- Sidebar becomes slide-out drawer (hamburger menu)
- Bento grid collapses to single column
- Hero metrics stack vertically
- Charts get horizontal scroll
- Date range becomes full-width bottom sheet

### Performance & Feedback
- **Skeleton loading:** Cards show shape outlines with shimmer animation
- **Optimistic updates:** UI updates immediately on sync button click
- **Real-time indicators:** Subtle pulse animation on live data
- **Progress feedback:** Sync button shows spinner + "Syncing..." text
- **Success feedback:** Brief toast notification ("Campaigns synced!")
- **Chart transitions:** Smooth 300ms animations when data updates

---

## 6. Animation & Motion Principles

**Timing:**
- **Micro:** 150ms (button hovers, focus states)
- **Standard:** 300ms (card transitions, menu opens)
- **Dramatic:** 500ms (page transitions, modal entrances)

**Easing:**
- **Enter:** `cubic-bezier(0, 0, 0.2, 1)` — ease-out
- **Exit:** `cubic-bezier(0.4, 0, 1, 1)` — ease-in
- **Move:** `cubic-bezier(0.4, 0, 0.2, 1)` — ease-in-out

**Motion Patterns:**
- **Card hover:** Lift (-2px translateY) + shadow increase
- **Sidebar item hover:** Background fade in (150ms)
- **Sidebar active:** Left border slides in (200ms)
- **Modal enter:** Fade in + scale from 0.95 to 1
- **Dropdown open:** Fade in + slide down (8px)
- **Number change:** Count-up animation on load
- **Chart load:** Lines draw in from left to right
- **Skeleton shimmer:** Gradient moves left-to-right (1.5s loop)

---

## 7. Typography System

**Font Stack:**
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
--font-arabic: 'IBM Plex Sans Arabic', 'Inter', sans-serif;
```

**Type Scale:**
```
Hero:      48px / 1.0 / -0.02em / font-bold    — Big metric numbers
Title:     24px / 1.2 / -0.01em / font-semibold — Page titles
Heading:   18px / 1.3 / 0       / font-semibold — Card titles
Body:      14px / 1.5 / 0       / font-normal   — Standard text
Small:     12px / 1.4 / 0       / font-medium   — Labels, captions
Tiny:      10px / 1.3 / 0.02em  / font-medium   — Badges, hints
```

**Number Display:**
- Use `font-mono` for all metric values (better alignment)
- Use `tabular-nums` for changing numbers (no layout shift)
- Right-align currency values in tables
- Include currency symbol with proper Arabic formatting (ريال)

---

## 8. Refinement Review Summary

**Refinement Strengths:**
> - Dark mode reduces eye strain for all-day dashboard users
> - Bento grid creates visual interest and hierarchy
> - Cyan accent is distinctive (not another blue SaaS)
> - Glassmorphism adds premium feel without sacrificing clarity
> - Large typography makes key metrics instantly readable

**Remaining Issues:**
> - Arabic/RTL support needs dedicated pass
> - Mobile experience requires separate design iteration
> - Chart library (Recharts) may need custom theme work
> - Glassmorphism can hurt performance on low-end devices

**Next Iteration Focus:**
> 1. Build design tokens in Tailwind config
> 2. Implement dark mode toggle (respect system preference)
> 3. Redesign MetricCard component with bento variants
> 4. Update Sidebar with new navigation pattern
> 5. Restyle charts with dark theme
> 6. Add micro-animations with Framer Motion

---

## 9. Implementation Priorities

### Phase 1: Foundation (Week 1)
- [ ] Update `globals.css` with new color tokens
- [ ] Configure Tailwind with spacing/typography system
- [ ] Install Phosphor Icons, remove Material Symbols
- [ ] Create base dark theme variables
- [ ] Update border-radius from 0px to 8px/12px system

### Phase 2: Core Components (Week 2)
- [ ] Redesign Sidebar component
- [ ] Create new MetricCard with bento variants
- [ ] Restyle buttons (primary, secondary, ghost)
- [ ] Update form inputs with dark styling
- [ ] Implement loading skeletons

### Phase 3: Dashboard (Week 3)
- [ ] Implement bento grid layout on Overview
- [ ] Restyle charts with dark theme
- [ ] Add number count-up animations
- [ ] Implement card hover effects
- [ ] Add sparkline to hero metric

### Phase 4: Polish (Week 4)
- [ ] Add glassmorphism to modals
- [ ] Implement toast notifications
- [ ] Add page transitions
- [ ] Mobile responsive pass
- [ ] Accessibility audit

---

## 10. Reference Links

**Inspiration:**
- [Linear UI Redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Mercury Banking](https://mercury.com)
- [Raycast](https://raycast.com)
- [SaaSFrame Dashboard Examples](https://www.saasframe.io/categories/dashboard)
- [BentoGrids.com](https://bentogrids.com)

**Design Systems:**
- [shadcn/ui](https://ui.shadcn.com)
- [Geist UI](https://geist-ui.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Phosphor Icons](https://phosphoricons.com)

**Articles:**
- [Bento Grid Dashboard Design](https://www.orbix.studio/blogs/bento-grid-dashboard-design-aesthetics)
- [Top SaaS Design Trends 2026](https://www.designstudiouiux.com/blog/top-saas-design-trends/)
- [Dashboard Design Trends](https://uitop.design/blog/design/top-dashboard-design-trends/)

---

**Your PRD:**
> See `/prompt.md` for complete product specification.

**Additional Notes:**
> - Current tech: Next.js 16, Tailwind v4, Convex, Clerk, Recharts
> - Current issues: 0px border radius (too sharp), weak color hierarchy, no dark mode
> - Key constraint: Must support Arabic/RTL for MENA market
> - Performance target: Dashboard loads in <2 seconds
