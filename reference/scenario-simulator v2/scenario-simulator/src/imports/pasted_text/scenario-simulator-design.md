Design a web application called "Scenario Simulator" for Provincie Zuid-Holland. 
The tool helps policy makers run structured scenario planning for complex 
spatial and infrastructure decisions. Desktop, 1440px wide, light UI.

---

IDENTITY & STYLE

App name: Scenario Simulator — Provincie Zuid-Holland
Visual tone: Clean, modern, accessible. Not heavy or corporate. Policy 
makers are text-oriented so hierarchy and readability are critical.
Color palette: White/light grey as base. Zuid-Holland brand accent: 
deep navy #1A3A5C for the sidebar and primary actions, muted teal 
#2E7D5E for success/active states, steel blue #1A5276 for interactive 
elements, amber #EF9F27 and blue #378ADD as data category colors.
Typography: Inter or system-ui, weights 400 and 500 only, no 700.
No gradients. No drop shadows. Flat, minimal borders (0.5px).
Border radius: 8–12px for cards, 6px for tags and buttons.

---

LAYOUT SHELL (all screens)

Fixed left sidebar: 220px wide, background #1A3A5C (dark navy).
  - App logo + name "Scenario Simulator" + sub-label "Provincie Zuid-Holland"
  - Navigation items: Overzicht, Dashboard, Instellingen
  - Project list with colored status dots (amber active, blue draft, 
    grey concept). Current project highlighted.
  - "Nieuw project" button at bottom of project list
  - User avatar + name at very bottom

Top bar: white, 52px, shows breadcrumb + contextual action buttons.

---

SCREEN 1: Home / Overzicht

Main area: white, generous padding.
Heading: "Scenario planning voor beleid" with a subtitle about starting 
or continuing a project.
Large dashed call-to-action card: "+ Start een nieuw project" with a 
sparkles icon, title and one-sentence description. Hover state 
highlights border in navy.
Below: section "Recente projecten" in a 3-column card grid.
  Each project card has:
  - A small colored category tag (e.g. "Energie", "Ruimte")
  - Project title (bold, 13px)
  - One-line description
  - Updated date + status dot with label (Actief in teal, In review 
    in amber, Concept in grey)

---

SCREEN 2: Dashboard (main working screen)

Top tab bar: Dashboard | Context & beslispunten | Variabelen | Scenario's

Main body splits into two columns:
  Left / center column (scrollable, ~70% width): three stacked sections
  Right column (fixed, ~30% width): chat interface

LEFT COLUMN — top section: Variable sliders panel
  Title: "Variabelen — aanpassen beïnvloedt scenario's live"
  Two-column grid of slider rows. Each row:
    - Label (left, 120px wide)
    - Slim horizontal slider track (4px, navy fill for choice variables, 
      blue fill for given variables)
    - Current value (right-aligned, bold)
    - Small type badge: "keuze" (amber) or "gegeven" (blue)
  Example variables: Omvang datacenter (MW), Aantal bewoners omgeving, 
  Waterverbruik, Klimaatscenario, Grondwaterpeil, Verkeersintensiteit.

LEFT COLUMN — middle section: Scenario comparison matrix
  Title: "Scenario's — impact per thema"
  A clean HTML table with:
    Columns: Theme label | S1 — Klein (20 MW) | S2 — Middel (60 MW) 
             | S3 — Groot (120 MW)
    Each scenario column header has a colored badge (blue for S1, 
    green for S2, amber for S3).
    Row themes: Ruimte, Energie, Water, Economie, Woningbouw, Verkeer
    Scores shown as either:
      - 5-dot icon rows (filled dots = impact level)
      - Text labels: "laag" (green), "middel" (amber), "hoog" (red)
      - Numeric values like "+310 FTE" or "+12%"
    Row alternation with very subtle background.

LEFT COLUMN — bottom section: Map row
  Title: "Kaartweergave per scenario"
  3-column row, one map card per scenario.
  Each map card:
    - Header with scenario badge
    - Schematic map SVG of the area (abstract outlines, water in blue, 
      terrain in muted green, datacenter footprint in light blue rect 
      that scales per scenario, impact radius as transparent circles)
    - Minimal legend (2 items max)
  The datacenter rect visually grows from S1 to S3. Impact circles grow.

RIGHT COLUMN — Chat interface
  Header: "Scenario-assistent" + subtitle "Stel vragen of verken variabelen"
  Chat message thread:
    - AI messages: grey bubble, left-aligned
    - User messages: navy background (#1A5276), white text, right-aligned
    - Below AI responses: 1–2 suggested follow-up prompts as buttons 
      (light blue bg, navy text, arrow ↗ suffix)
  Input area at bottom: textarea + send button (navy, arrow icon)
  The chat steers the user to think through variables, unknowns, 
  and decision points systematically.

---

SCREEN 3: Project overview — Context & beslispunten

Top tab bar: Context & beslispunten | Variabelen | Scenario's | Dashboard

Body splits into two columns:
  Left: narrow document navigation panel (200px, light grey bg)
    Sections: Context (Probleemstelling, Locatiecontext, Stakeholders), 
    Beslispunten (Open, Vastgesteld, Geblokkeerd — each with a status dot), 
    Documenten (linked files)
  Right: document content area

DOCUMENT CONTENT:
  Document header: h2 title, subtitle, metadata row (date, author, 
  last updated) with small icons.

  Section 1 — Probleemstelling: 
  Two paragraphs of body text describing the policy question. 
  Clean, readable, no decorative elements.

  Section 2 — Openstaande beslissingen:
  List of decision cards. Each card:
    - Title (bold 12.5px)
    - Status badge top-right: "Open" (amber), "Vastgesteld" (green), 
      "Geblokkeerd" (red)
    - One-to-two sentence description of what is unresolved or decided
    - Background: light secondary surface

  Section 3 — Kernvariabelen:
  A clean table with columns: Variabele | Type | Waarde/bandbreedte | Bron
  Type column shows colored tags: "keuze" (amber), "gegeven" (blue), 
  "berekend" (green)

Top-right actions: Export button (outlined) + "Aanvullen met AI" button 
(navy, sparkles icon)

---

INTERACTIONS TO NOTE (for prototype annotations)

- Sliders on the dashboard update the scenario matrix and map cards live
- Chat suggestions trigger the chat with predefined prompts
- Decision status badges are clickable to change status
- Tab navigation switches between document sections
- Sidebar project items highlight the active project
- "Nieuw project" button opens a modal with a text field 
  ("Beschrijf het beleidsvraagstuk") and an AI-generate button

---

ACCESSIBILITY

All interactive elements have hover states. Focus rings on inputs. 
Color is never the only way to convey meaning (always paired with text 
or icons). Minimum font size 11px. Sufficient contrast ratios throughout.
