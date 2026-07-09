# EEOS Customer Experience — Design System

## Three Stylistic Approaches

### 1. Obsidian Command
**Theme Name:** Obsidian Command  
**Intro:** Deep-space dark UI with luminous amber/gold accents. Feels like mission control — authoritative, precise, and commanding. Every element communicates intelligence at scale.  
**Probability:** 0.07

### 2. Meridian Clarity
**Theme Name:** Meridian Clarity  
**Intro:** Crisp white-and-slate architecture with electric blue signal lines. Clean enough for enterprise procurement committees, dynamic enough for investor demos. Feels like a Bloomberg terminal reimagined for the C-suite.  
**Probability:** 0.04

### 3. Sovereign Night
**Theme Name:** Sovereign Night  
**Intro:** Midnight navy canvas with crystalline teal and platinum accents. Evokes the gravitas of a war room and the precision of aerospace software. Designed to make executives feel they are operating at a higher level of intelligence.  
**Probability:** 0.09

---

## Chosen Approach: Sovereign Night

### Design Movement
**Aerospace Command Interface** — the visual language of mission-critical software: F-35 cockpit HUDs, satellite operations centers, and sovereign intelligence platforms. Not "dark mode SaaS" — something genuinely different.

### Core Principles
1. **Signal over noise** — every element earns its place; negative space is structural, not decorative
2. **Luminous precision** — glowing edges, crystalline data surfaces, and micro-detail that rewards close inspection
3. **Gravitational hierarchy** — content pulls the eye through deliberate weight and luminosity gradients
4. **Kinetic intelligence** — motion communicates meaning; animations reveal data relationships, not just aesthetics

### Color Philosophy
The palette is built around the idea of a sovereign intelligence operating in the dark:
- **Canvas:** `#050C1A` — near-black midnight navy, the void from which intelligence emerges
- **Surface:** `#0A1628` — deep navy for cards and panels
- **Surface-elevated:** `#0F1E35` — slightly lighter for interactive elements
- **Teal Signal:** `#00D4C8` — the primary accent; crystalline, electric, unmistakably EEOS
- **Platinum:** `#E8EDF5` — primary text; cold white with a hint of blue
- **Amber Alert:** `#F59E0B` — used sparingly for priority signals and warnings
- **Crimson:** `#EF4444` — critical alerts only
- **Emerald:** `#10B981` — positive signals and success states
- **Border glow:** `rgba(0, 212, 200, 0.15)` — subtle teal borders that suggest luminous edges

### Layout Paradigm
**Asymmetric Command Grid** — sections break from centered symmetry. Hero content anchors left with data visualizations bleeding right. Navigation is a floating glass bar. Cards use a masonry-style stagger. The onboarding wizard uses a split-screen with a live preview panel on the right.

### Signature Elements
1. **Scan-line grid overlay** — a subtle 1px grid pattern at 3% opacity over dark sections, suggesting a command interface
2. **Teal glow halos** — key metrics and CTAs emit a soft `box-shadow: 0 0 24px rgba(0, 212, 200, 0.3)` glow
3. **Crystalline data cards** — glass-morphism panels with `backdrop-blur` and luminous teal top-border accents

### Interaction Philosophy
Interactions should feel like operating precision instruments. Hover states reveal additional data. Click states compress and release. Transitions use physics-based easing. Nothing feels random — every motion has a direction and purpose.

### Animation
- **Page entrances:** Staggered fade-up with `translateY(20px) → 0` at 60ms intervals
- **Data reveals:** Numbers count up from 0 on scroll entry
- **Card hovers:** `scale(1.02)` + teal border brightens + subtle shadow lift (200ms ease-out)
- **Navigation:** Glass bar transitions opacity 0→1 with `blur(20px)` backdrop on scroll
- **Demo transitions:** Slide panels with spring physics (stiffness: 300, damping: 30)
- **Onboarding wizard:** Step transitions use a horizontal slide with depth (z-axis perspective)
- **Knowledge graph:** Nodes pulse with a breathing animation; connections draw in on hover
- **All durations:** Micro 100–160ms, Standard 200–300ms, Orchestrated 400–600ms

### Typography System
- **Display / Headlines:** `Space Grotesk` — geometric, technical, distinctive. Used for H1–H3.
- **Body / UI:** `Inter` — clean and readable for body text and UI labels (acceptable here as supporting role)
- **Monospace / Data:** `JetBrains Mono` — for metrics, code snippets, and data values
- **Scale:** 
  - Hero: 72px / 5rem, weight 700, tracking -0.02em
  - H2: 48px / 3rem, weight 600, tracking -0.01em
  - H3: 32px / 2rem, weight 600
  - Body: 16px / 1rem, weight 400, line-height 1.7
  - Caption: 13px, weight 500, tracking 0.05em, uppercase

### Brand Essence
**EEOS is the operating system for executive intelligence — built for Fortune 500 leaders who need to see everything, decide faster, and never be caught off-guard.**  
Personality: **Authoritative. Precise. Inevitable.**

### Brand Voice
Headlines sound like briefings, not pitches. CTAs are directives, not invitations.  
- "Your organization has a nervous system. EEOS is its brain."
- "Request Access" not "Sign Up Free"
- "Activate EEOS" not "Get Started Today"
- Never: "Welcome to our website", "Revolutionizing the way...", "Best-in-class solution"

### Wordmark & Logo
An eagle-eye motif: a stylized hexagonal iris/aperture with a central focal point, suggesting both an eagle's eye and a targeting reticle. The mark sits in teal on dark backgrounds. The wordmark uses Space Grotesk Bold with tight tracking.

### Signature Brand Color
**Crystalline Teal `#00D4C8`** — unmistakably EEOS. Used for primary CTAs, data highlights, active states, and the logo mark. Never diluted with opacity below 70% in interactive contexts.

---

## Style Decisions
- Navigation: floating glass bar with backdrop-blur, transitions to opaque on scroll
- Hero: full-viewport with animated data visualization bleeding off-screen right
- Section dividers: subtle scan-line gradient transitions, no hard borders
- All cards: `bg-[#0A1628]` with `border border-[#00D4C8]/15` and `shadow-[0_0_24px_rgba(0,212,200,0.08)]`
- Primary CTA: teal background with glow halo, white text
- Secondary CTA: transparent with teal border and teal text
