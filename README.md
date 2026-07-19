# ISAAC Synergy Network (Indian Synergy of Astronomy & Astrophysics Clubs)

Welcome to the ISAAC Synergy Network dashboard. This platform is a unified space designed to connect astronomy clubs, students, educators, and space enthusiasts across India to share resources, plan events, publish research findings, and coordinate observations.

## 🛰️ Current Development Status

> [!WARNING]
> **Work In Progress**
> This repository represents a few hours of rapid development. There is a significant amount of work remaining to reach production-grade features.
>
> As this is an early prototype, **there might be bugs**. If you encounter any unexpected behaviors, please report them immediately so we can refine our flight deck coordinate systems!

## 🪐 Features Implemented So Far

- **Custom State-Based SPA Router**: Allows seamless transitions between cosmic coordinates without page reloads.
  - `/home` - Main Dashboard showing upcoming events, resources, gallery, and publications.
  - `/clubs` - Clubs interactive map directory with map style toggles (Cosmos, Satellite, Streets) and zoom controls.
  - `/about` - About placeholder page.
  - `/login` - Auth gateway with premium glassmorphic credentials styling.
  - `/onboarding` - Pilot configuration settings card (horizontal split layout).
  - `/{username}` - Dynamic pilot profile card showing ranks and cosmic telemetry logs.
- **Dynamic 3D Backgrounds**: Integration of custom WebGL-based stars/galaxy renderings.
- **Responsive Layouts**: Scaled and refined interfaces optimized for mobile views up to massive desktop screens.

## 🚀 Setting Up local Orbit

1. **Clone & Install**:
   ```bash
   npm install
   ```

2. **Launch Dev Engine**:
   ```bash
   npm run dev
   ```

3. **Verify Bundle**:
   ```bash
   npm run build
   ```
