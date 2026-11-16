# Hero-Compiler — Interface Design System

## Direction & Feel
- **Product Domain**: Interactive Arithmetic Compiler Workbench (`MiniArit` 7-Stage Pipeline & 64-bit Register VM).
- **Feel**: Precision hardware-software engineering workbench (Linear / Teenage Engineering / Shenzhen I/O aesthetic). Quiet dark obsidian surfaces, single focal point per view, whisper-quiet borders, high-contrast tabular monospace telemetry, and zero decorative clutter.

## Surface & Depth Strategy
- **Depth Strategy**: Whisper-quiet 1px hairlines (`rgba(255, 255, 255, 0.07)`) paired with a 4-tier lightness elevation scale on a `#080B10` silicon canvas.
- **Surface Scale**:
  - `--bg`: `#080B10` (Canvas substrate)
  - `--panel`: `#0C1017` (Primary workbench surface)
  - `--panel-2`: `#111722` (Interactive card / control container)
  - `--panel-3`: `#161E2E` (Active / focused element surface)
  - `--panel-inset`: `#05070B` (Recessed terminal / game arena well)

## Visual Hierarchy & Proportions
- **2-Column Workbench Layout (`ArenaScreen`)**:
  - **Left Column (Primary Focal Point)**: Active interactive stage challenge (Phases 1–6) or Virtual OS Desktop (`programa.exe` in Phase 7).
  - **Right Column (Live Telemetry Inspector)**: Live phase output structure (`TokensView`, `AstView`, `SymbolsView`, `IrView`, `OptView`, `AsmView`, `HexView`) + step-by-step `PhasePlayer` and `ExplainPanel`.
- **Typography**:
  - UI: `Space Grotesk` (`-0.02em` optical tracking on headings).
  - Telemetry / Code: `JetBrains Mono` with `font-variant-numeric: tabular-nums`.
- **60/30/10 Color Restraint**:
  - 60% Obsidian canvas & recessed wells (`#080B10` / `#05070B`)
  - 30% Elevated slate panels & subtle hairlines (`#0C1017` / `#111722`)
  - 10% Intentional semantic signals (`#38BDF8` active focus, `#10B981` verified compiler state, `#F43F5E` compiler fault)

## Key Component Patterns
- **Top Navigation Bar**: 48px compact bar, segmented pill nav (`padding: 2px`, `border-radius: 8px`), status chip on the right.
- **Pipeline Stepper (`PhaseStepper`)**: 7-column segmented bar (`padding: 4px`, `gap: 4px`), inline items (`6px` status dot + `01` mono index + phase label).
- **Interactive Stage Controls**: `kbd` keycap badges (`padding: 1px 6px`, `--panel-inset`, `1px solid var(--line-strong)`), 44px minimum hit areas.
