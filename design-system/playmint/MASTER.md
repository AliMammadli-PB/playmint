---
name: Playmint
description: "Arcade Dark and related light Studio/admin"
colors:
  arcade-ink: "#101317"
  arcade-ink-2: "#171c22"
  arcade-surface: "#1b2129"
  arcade-surface-2: "#222b34"
  arcade-surface-3: "#2b3741"
  arcade-paper: "#f0f6f2"
  arcade-muted: "#b3c3bb"
  arcade-faint: "#a2b4aa"
  arcade-line: "#303c43"
  arcade-line-strong: "#45565c"
  arcade-mint: "#70edb8"
  arcade-mint-2: "#95f4ce"
  arcade-mint-dim: "#4cba8c"
  arcade-amber: "#f1ca78"
  arcade-danger: "#ff989d"
  arcade-sky: "#8bc8ff"
  studio-ink: "#f5f7f6"
  studio-ink-2: "#eff3f1"
  studio-surface: "#fff"
  studio-surface-2: "#edf3ef"
  studio-surface-3: "#e1ebe4"
  studio-paper: "#19372a"
  studio-muted: "#52675b"
  studio-faint: "#627368"
  studio-line: "#d7e2da"
  studio-line-strong: "#b7c9bd"
  studio-mint: "#08774e"
  studio-mint-2: "#065f3e"
  studio-mint-dim: "#20855d"
  studio-amber: "#805b0d"
  studio-danger: "#b92d3c"
  studio-sky: "#245e9c"
  arcade-action-ink: "#103626"
  studio-action-ink: "#fff"
typography:
  display:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(36px,4vw,56px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px,3vw,42px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.035em"
  studio-headline:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px,3vw,36px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.035em"
  body:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: 1.6
  label:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 650
  button:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.3
  hint:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.6
  badge:
    fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 650
rounded:
  control: "10px"
  panel: "16px"
  badge: "6px"
spacing:
  mobile-edge: "12px"
  tablet-edge: "16px"
  gap-compact: "20px"
  gap: "24px"
  gap-wide: "32px"
components:
  button-primary:
    backgroundColor: "{colors.arcade-mint}"
    textColor: "{colors.arcade-action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.arcade-mint-2}"
  button-studio-primary:
    backgroundColor: "{colors.studio-mint}"
    textColor: "{colors.studio-action-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "44px"
  button-studio-primary-hover:
    backgroundColor: "{colors.studio-mint-2}"
  button-ghost:
    textColor: "{colors.arcade-paper}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "44px"
  button-danger:
    textColor: "{colors.arcade-danger}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
    height: "44px"
  input:
    backgroundColor: "{colors.arcade-surface}"
    textColor: "{colors.arcade-paper}"
    rounded: "{rounded.control}"
    padding: "11px 14px"
    height: "46px"
    width: "100%"
  card:
    backgroundColor: "{colors.arcade-surface}"
    rounded: "{rounded.panel}"
  category-chip:
    backgroundColor: "{colors.arcade-surface}"
    textColor: "{colors.arcade-muted}"
    rounded: "{rounded.control}"
    padding: "10px 15px"
    height: "44px"
  badge:
    typography: "{typography.badge}"
    rounded: "{rounded.badge}"
    padding: "3px 9px"
---
# Design System: Playmint

## Overview

**Creative North Star: "Arcade and Studio"**

Arcade Dark and Studio share one visual language with two working environments. The public environment uses deep charcoal surfaces and luminous mint actions; Studio and admin use pale green-gray grounds, white panels, and darker mint actions. Montserrat headings and Montserrat body copy connect the environments.

The system is direct, spacious, and game-led. Solid fills, visible borders, and compact rounded controls keep navigation and forms clear. Existing generated PNG identity assets and original illustrations remain recognizable; SVG flags represent language choices. Motion stays brief and follows reduced-motion preferences.

**Key Characteristics:**
- Dark public Arcade with related light Studio/admin.
- One semantic color vocabulary across both environments.
- Solid surfaces, visible boundaries, and mint actions.
- Responsive navigation, keyboard focus, and readable controls.
- Existing PNG identity assets and SVG language flags.

## Colors

Charcoal and pale green-gray neutrals share mint action roles; the frontmatter records the implemented dark and light values separately.

### Primary

- **Arcade Mint:** Public primary actions, selected filters, and focus indicators use `arcade-mint`; hover uses `arcade-mint-2`, with deep green `arcade-action-ink` text.
- **Studio Mint:** Studio/admin primary actions use `studio-mint`; hover deepens to `studio-mint-2`, with white `studio-action-ink` text.

### Secondary

- **Amber:** Premium and caution treatments use the environment's `amber` role.
- **Danger:** Error messages and destructive actions use the environment's `danger` role.
- **Sky:** Informational treatments use the environment's `sky` role.

### Neutral

- **Ink / Ink 2:** Page ground and secondary ground, dark in Arcade and pale in Studio.
- **Surface / Surface 2 / Surface 3:** Cards, secondary regions, and selected navigation backgrounds.
- **Paper:** High-contrast primary text, light in Arcade and deep green in Studio.
- **Muted / Faint:** Secondary copy and less prominent metadata.
- **Line / Line Strong:** Panel boundaries and stronger control strokes.

## Typography

**Display Font:** Montserrat (ui-sans-serif, system-ui, sans-serif fallback).
**Body Font:** Montserrat (ui-sans-serif, system-ui, sans-serif fallback).
**Label/Mono Font:** Labels use Montserrat; code uses ui-monospace, SFMono-Regular, Menlo, monospace.

**Character:** Compact geometric headings anchor friendly, legible body copy. These are the current implemented faces retained in the approved world.

### Hierarchy

- **Display:** Public opening heading; the mobile rule fixes its size at (36px).
- **Headline:** Shared page titles; Studio uses its smaller dedicated headline role.
- **Title:** Section headings use (26px), reducing to (23px) on small phones; game titles use (20px), weight (650).
- **Body:** Normal copy and form values; Studio descriptions have a maximum width of (65ch), legal copy (72ch).
- **Label:** Field labels and navigation. Supporting copy uses the hint role; compact badges use the badge role.

## Layout

The public portal caps at (1600px), with a (188px) category rail and (24px) gaps. Studio caps at (1480px) and uses (225px), reducing to (195px) at its intermediate breakpoint. Main gaps use the frontmatter spacing scale. Generic content containers cap at (80rem); Studio content caps at (1180px).

At a maximum width of (1199px), catalogue covers become three columns and upload content becomes one column. At (900px), public side navigation becomes a horizontal scrolling row. At (800px), Studio navigation becomes a horizontal row and authentication becomes one column. At (580px), catalogue covers become two columns, shell edges use the mobile-edge token, and Studio illustration shortcuts become compact rows. Existing Tailwind utility breakpoints complement these shell transitions.

Tables retain readable spacing and tabular numerals. Buttons meet a minimum height of (44px); fields meet (46px). Frontmatter component heights describe these minimums; CSS remains authoritative for content-driven expansion. Long labels and three supported interface languages must fit the responsive shells.

## Elevation & Depth

Solid tonal surfaces and borders carry most depth. Cards are flat at rest. The language dropdown has a structural shadow; the player's play control has a stronger shadow over the game stage. Game cards use a short upward hover translation and border-color change; reduced-motion disables translation.

### Shadow Vocabulary

- **Language menu:** (`0 12px 30px #0003`) separates floating language choices from the page.
- **Player play action:** (`0 8px 30px #0005`) keeps the action legible above the game stage.

## Shapes

Controls use the control radius; panels and game cards use the panel radius. Badges use the smaller badge radius. Catalogue card covers stay square. The homepage spotlight uses a wide cover with a bottom gradient to keep its title and play action legible. Language flags keep their rectangular proportions (24px by 16px); timeline step markers are circular (24px).

## Components

### Buttons

Direct and compact, with readable text and clear state changes.

- **Shape:** Gently rounded control corners; shared padding and minimum height are recorded in frontmatter.
- **Primary:** Mint fill and environment-specific action text; hover changes to the second mint role.
- **Secondary / Ghost:** Transparent background, strong line border, primary text; hover uses the second surface and mint border.
- **Danger:** Danger text and stroke; hover adds a (12%) danger tint.
- **Focus / Disabled:** Keyboard focus uses a mint outline (2px) offset (4px); disabled buttons have half opacity and a disabled cursor. State transitions take (.18s ease).

### Chips

Category filters use solid surface fills, a strong line stroke, muted copy, and rounded control corners. Active and hovered chips use mint copy and stroke. Status badges use their smaller silhouette and compact label role.

### Cards / Containers

Flat bordered surfaces with rounded panel corners. General cards supply their boundary and fill; individual surfaces choose content padding, commonly (20–28px). Game cards clip square covers, use (18px) metadata padding, and translate upward (-3px) on hover with a mint border.

### Inputs / Fields

Solid surface fill, primary text, strong line stroke, and rounded control corners. Placeholder text uses the faint role. Focus uses a mint outline (2px) offset (2px). Form errors use danger copy and a tinted bordered container; success messages use mint. Pending submit buttons show their pending label and spinner and disable resubmission.

### Navigation

Public and Studio navigation share icon-and-text links, muted defaults, surface hover states, and mint selected states. Studio selected links use the third surface role. On narrow screens, navigation scrolls horizontally. The language picker uses native disclosure behavior, rectangular SVG flags, and explicit current-language state.

### Upload and Version Timeline

A wrapping ordered sequence uses circular numbered markers; completed/current wizard steps use mint. The three-stage wizard validates the current fields before continuing and moves focus to the step title. The version timeline independently reflects upload, security scan, review, and playable-output retention.

### ZIP Picker

A dashed strong-line boundary on the second surface surrounds an inline upload icon and file label. The full picker is a native file-input target; focus-within draws a mint outline (2px) offset (3px). Long filenames wrap.

## Do's and Don'ts

### Do:
- **Do** preserve the public dark and Studio/admin light environments.
- **Do** use semantic color roles so shared components follow their environment.
- **Do** retain the existing generated PNG brand mark and use SVG language flags.
- **Do** preserve visible keyboard focus and reduced-motion behavior.
- **Do** use square cover frames for catalogue game cards.

### Don't:
- **Don't** replace authentic game covers with invented game artwork.
- **Don't** hide action labels or focus indicators in forms.
- **Don't** replace the established brand mark with a text-only approximation.

## Public portal update — 2026-10-07

The public homepage follows the cover-led discovery patterns reviewed on gd.games and CrazyGames. A small page heading precedes a real approved-game spotlight. A colorful six-category discovery grid sits alongside it on desktop and below it on phones. Trending, recently added, and most-liked links open real catalogue filters. All twelve category tiles show actual published-game counts, including zero.

The spotlight is selected from approved featured games, falling back to trending games. Game IDs are deduplicated across the spotlight and following shelves. Empty shelves stay hidden; no demo or invented games fill the catalogue. Desktop game grids use four columns, then three and two at narrower widths. Metadata is compact so covers carry the hierarchy. The public header exposes an actual search input on phones; SVG language flags and Montserrat remain unchanged.
