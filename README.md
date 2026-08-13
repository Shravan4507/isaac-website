# ISAAC Synergy Network (Indian Synergy of Astronomy & Astrophysics Clubs)

Welcome to the ISAAC Synergy Network platform — a unified space connecting astronomy clubs, students, educators, and space enthusiasts across India to share resources, organize national events, publish research findings, and coordinate observations.

> [!IMPORTANT]
> **📢 Branch Protection & Contribution Notice**  
> Direct pushes to the `main` branch are currently locked. Collaborators working on this repository should create a separate feature branch and submit a Pull Request (PR):
> 
> ```bash
> # 1. Create a feature branch
> git checkout -b feature/your-feature-name
> 
> # 2. Push your changes
> git push origin feature/your-feature-name
> 
> # 3. Open a Pull Request on GitHub against `main`
> ```
> All submitted PRs will be reviewed and merged.

---

## 🪐 Core Features

- **Command Palette Search**: Minimalist, keyboard-driven search overlay (`ESC` & back-button aware) for quick settings and action launches.
- **User Dashboard**: Personal profile hub featuring custom banner presets, avatar crop & upload, telemetry stats, and badges.
- **Security Suite**: Hardware Passkeys (WebAuthn), 2FA TOTP Authenticator, real-time screenshot protection, and full account deletion.
- **Editable Handles & Verification**: Custom username validation (3–15 characters) with real-time Firestore availability checks & auto-suggestions.
- **Club Directory Map**: Interactive India astronomy club map with satellite, cosmos, and street views.
- **Glassmorphic UI**: SpaceX/Cosmic-inspired dark mode aesthetics built with Vanilla CSS and responsive layouts.

---

## 🛠️ Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Styling**: Vanilla CSS (Custom Design System & Dynamic Tokens)
- **Backend & Database**: Firebase Auth, Cloud Firestore, Firebase Storage
- **Hosting**: Vercel

---

## 🚀 Local Setup

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Local Engine**:
   ```bash
   npm run dev
   ```

3. **Verify Production Build**:
   ```bash
   npm run build
   ```
