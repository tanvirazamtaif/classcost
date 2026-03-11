# EduTrack v3.0 — Education Expense Manager

A comprehensive, multi-role education expense tracking application built for the Bangladeshi education system, covering every stage from Playgroup to PhD. EduTrack helps students log daily spending, manage semester fees, track education loans, and gives parents a dedicated monitoring dashboard — all from a single shared account.

## Table of Contents

- [Features](#features)
- [Education Modules](#education-modules)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Application Flow](#application-flow)
- [Key Concepts](#key-concepts)
- [Testing](#testing)
- [Code Quality](#code-quality)
- [Demo Credentials](#demo-credentials)
- [Scripts](#scripts)

## Features

### Student Features
- **Daily Expense Logging** — Transport, canteen/tiffin, hostel, coaching, batch fees, and custom categories
- **Semester/Term Fee Management** — Add semesters with courses, fees, and waiver percentages
- **Education Loan Tracker** — Bank EMI, family loans, government loans, Islamic financing, and deferred repayment with full amortization schedules
- **Custom Expense Modules** — Create your own recurring expense categories (library fee, sports club, robotics, etc.)
- **Courses & Activities** — Track IELTS, computer courses, language classes, sports, music, art, and certifications
- **Varsity Admission Phase** — Dedicated tracking for coaching, mock tests, study materials, application fees, and travel costs
- **Smart Promotion Engine** — Automatic class/year advancement reminders based on academic calendar
- **Stage Upgrade Wizard** — Transition between education levels (e.g., School to College, College to University) while archiving all previous data
- **Academic Journey Timeline** — Visual history of all education stages with archived expenses
- **Multi-Currency Support** — 10 currencies: BDT, USD, EUR, GBP, INR, CAD, AUD, SAR, AED, MYR
- **Cost Privacy (PIN Lock)** — 4-digit PIN to hide sensitive cost totals from prying eyes
- **Reports & Analytics** — Pie charts, line charts, monthly trends, and category breakdowns via Recharts

### Parent Mode
- **PIN-Protected Access** — Separate 4-digit PIN for parent authentication
- **Budget Management** — Set monthly budgets for total spending, transport, canteen, and hostel
- **Student Visibility Controls** — Hide cost totals, lock loan details, set selective visibility
- **Share Password** — Give student a temporary 60-second reveal via a shared PIN
- **Loan Overview** — View all education loans, outstanding balances, and repayment progress
- **Expense Monitoring** — See all student entries, category breakdowns, and budget compliance

### Admin Panel
- **User Management** — View all registered students and parents
- **Module Analytics** — See user distribution across education modules
- **API Reference** — Mock REST API endpoint documentation
- **AI Pipeline** — Placeholder for future cross-module behavioral analytics

## Education Modules

EduTrack supports **12 distinct education types** organized into 5 groups:

| Group | Modules | Description |
|-------|---------|-------------|
| **Early Education** | Pre-Primary / Playgroup | Playgroup, Nursery, KG-1, KG-2 |
| **School** | Primary School | Class 1–5 (Government, Private, English Medium, Madrasha) |
| | Junior Secondary | Class 6–8 (JSC/JDC track) |
| | Secondary (SSC) | Class 9–10 (SSC, Dakhil, O-Level) |
| | Full School (1–12) | Schools running Class 1 to 12 under one roof |
| **College** | HSC / Intermediate | Class 11–12 (HSC, A-Level, Alim, BM) |
| | Degree College | 3-year BA/BSc/BCom Pass Course (National University) |
| | Honours College | 4-year Honours under National University |
| **University** | Private University (UG) | Semester-based undergrad (trimester or semester system) |
| | Public University (UG) | Session-based undergrad (DU, BUET, etc.) |
| **Postgraduate** | Masters Programme | MA/MSc/MBA/MEng (1–2 years) |
| | MPhil / PhD | Research degrees (2–5+ years) |

Each module has its own:
- Fee types and periodic billing (monthly, yearly, per-semester)
- Class/year levels and promotion rules
- Institution suggestions (Bangladeshi schools, colleges, universities)
- Feature flags (hostel, coaching, batch, tiffin, lab fee, waivers, exams, etc.)

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | ^18.2.0 | UI framework |
| **Vite** | ^5.1.0 | Build tool and dev server |
| **Tailwind CSS** | ^3.4.1 | Utility-first CSS styling |
| **Recharts** | ^2.12.0 | Charts (Pie, Line, Bar, Area) |
| **Vitest** | ^4.0.0 | Unit testing framework |
| **@testing-library/react** | ^16.3.0 | Component testing utilities |
| **ESLint** | ^9.0.0 | Code linting with React plugins |
| **PostCSS** | ^8.4.35 | CSS processing |
| **Autoprefixer** | ^10.4.17 | CSS vendor prefixing |

## Architecture

EduTrack follows a **modular component architecture** with clear separation of concerns:

- **React Context** (`AppProvider`) manages all global state, replacing prop drilling
- **Custom hooks** encapsulate reusable logic (localStorage persistence, toast notifications, promotion engine, privacy system)
- **Constants** are centralized and grouped by domain (currencies, education modules, loan types, categories)
- **Utility functions** are pure and testable (currency formatting, loan calculations, date helpers)
- **Page components** are self-contained views with their own local state
- **UI components** are generic, reusable building blocks (buttons, cards, inputs, modals)
- **ErrorBoundary** wraps the entire app for graceful error recovery
- **ARIA attributes** on interactive elements for accessibility

## Project Structure

```
edutrack/
├── index.html                  # Entry HTML
├── package.json                # Dependencies and scripts (v3.0.0)
├── vite.config.js              # Vite + Vitest configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS with Tailwind and Autoprefixer
├── eslint.config.js            # ESLint flat config with React plugins
└── src/
    ├── main.jsx                # React 18 root render with StrictMode
    ├── index.css               # Tailwind directives and base styles
    ├── App.jsx                 # Thin app shell with view router (~95 lines)
    ├── constants/
    │   ├── index.js            # Barrel export
    │   ├── currencies.js       # 10 currencies with conversion rates
    │   ├── education.js        # 12 education modules, groups, promotions, institutions
    │   ├── categories.js       # Expense categories, transport/hostel/course types
    │   └── loans.js            # Loan types and purposes
    ├── utils/
    │   ├── index.js            # Barrel export
    │   ├── helpers.js          # todayStr(), uid()
    │   ├── format.js           # makeFmt() currency formatter factory
    │   └── loan-calc.js        # EMI calculation, amortization schedules, payment tracking
    ├── hooks/
    │   ├── index.js            # Barrel export
    │   ├── useLocalStorage.js  # localStorage-backed state persistence
    │   ├── useToast.js         # Toast notification system
    │   ├── usePromotion.js     # Smart class promotion logic
    │   └── usePrivacy.js       # Dual-layer privacy (Student PIN + Parent Lock)
    ├── contexts/
    │   └── AppContext.jsx      # AppProvider with all global state + useApp() hook
    ├── components/
    │   ├── ui/                 # Btn, Card, Input, Select, Badge, Toggle, Modal, ToastContainer
    │   │   └── index.js
    │   └── feature/            # PINPad, BottomNav, ErrorBoundary, CostSummaryCard, PromotionBanner
    │       └── index.js
    ├── pages/
    │   ├── index.js            # Barrel export for all pages
    │   ├── LandingPage.jsx     # Email entry with Google sign-in UI
    │   ├── OTPVerification.jsx # 6-digit OTP verification
    │   ├── OnboardingWizard.jsx# 5-step student profile setup
    │   ├── DashboardView.jsx   # Main student dashboard with cost cards
    │   ├── AddExpenseView.jsx  # Expense entry with 9+ categories
    │   ├── SemesterView.jsx    # Semester/term fee management
    │   ├── ReportsView.jsx     # Analytics with charts
    │   ├── SettingsView.jsx    # Profile, currency, privacy, class management
    │   ├── StageUpgradeWizard.jsx # 4-step education stage transition
    │   ├── LoansView.jsx       # Multi-screen loan tracker with amortization
    │   ├── AcademicJourneyView.jsx # Visual timeline of education stages
    │   ├── ParentModeView.jsx  # Full parent dashboard
    │   └── AdminPanel.jsx      # Password-protected admin console
    └── __tests__/
        ├── setup.js            # Vitest setup (jsdom environment)
        ├── loan-calc.test.js   # 10 tests for loan calculations
        └── format.test.js      # 8 tests for formatting utilities
```

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm

### Installation

```bash
cd edutrack
npm install
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Application Flow

```
Landing Page (email entry)
    ↓
OTP Verification (demo code: 482913)
    ↓
Onboarding Wizard (5 steps)
    ├── Step 1: Name + Education Stage (12 modules)
    ├── Step 2: Institution + Class/Year
    ├── Step 3: Fees & Waivers
    ├── Step 4: Hostel, Coaching, Batch
    └── Step 5: Currency + Family Code
    ↓
Student Dashboard
    ├── Home — Cost summary, category cards, recent activity
    ├── Add — Log daily expenses (9+ built-in + custom modules)
    ├── Loans — Education loan management with amortization
    ├── Reports — Pie charts, line charts, analytics
    └── Settings
         ├── Profile & Class/Level management
         ├── Currency selection
         ├── Privacy PIN
         ├── Family Code
         ├── Stage Upgrade Wizard
         ├── Academic Journey History
         └── Parent Mode → (PIN-protected)
              ├── Overview — Budget compliance, category breakdown
              ├── Budget — Set monthly budgets per category
              ├── Loans — Full loan overview
              └── Settings — Parent PIN, notifications
```

## Key Concepts

### State Management
Global state is managed via React Context (`AppProvider` / `useApp` hook). All data persists to `localStorage` via the `useLocalStorage` hook with keys prefixed `ut_v3_*`:

| Key | Description |
|-----|-------------|
| `ut_v3_view` | Current view/page |
| `ut_v3_user` | User profile and auth state |
| `ut_v3_expenses` | All expense entries |
| `ut_v3_semesters` | Semester/term records with courses |
| `ut_v3_loans` | Education loans and payment history |
| `ut_v3_notifs` | Notification preferences |
| `ut_v3_privacy` | Privacy settings (student PIN, parent PIN, budgets) |
| `ut_v3_promo` | Promotion/advancement state |
| `ut_v3_custom_modules` | User-created expense categories |

### Smart Promotion Engine
Three modes for class advancement:
- **Smart** — App nudges user at the right calendar time (most school/college types)
- **Manual** — User updates level themselves with periodic reminders (National University, public universities with session backlogs)
- **Never** — Open-ended programme, annual check-in only (PhD/MPhil)

### Privacy System (Dual-Layer)
- **Layer 1 (Student PIN)** — Hides all cost totals from others using the same device. Auto-locks after 30 seconds.
- **Layer 2 (Parent Lock)** — Parent restricts specific metrics. Student can temporarily reveal via a share password (60-second window).

### Loan Calculation Engine
Full financial calculations including:
- **EMI Formula** — Standard reducing balance: `P * r * (1+r)^n / ((1+r)^n - 1)`
- **Grace Periods** — Interest-only months before repayment begins
- **Amortization Schedules** — Month-by-month breakdown of principal, interest, and remaining balance
- **Payment Tracking** — Paid vs scheduled comparison with percentage progress

### Stage Transitions
When a student moves to a new institution (e.g., School to College), the Stage Upgrade Wizard:
1. Archives the current stage with total expense amounts
2. Preserves name, currency, and family code
3. Creates a fresh profile for the new education level
4. All archived data remains accessible in Academic Journey

### Family Code
A 6-digit code generated during onboarding that links student and parent accounts. Parents use this to monitor expenses from their own Parent Mode interface.

## Testing

EduTrack uses **Vitest** with **@testing-library/react** for testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Coverage
- **Loan Calculations** (10 tests) — EMI calculation, grace periods, zero-interest loans, amortization schedule generation, payment tracking
- **Formatting Utilities** (8 tests) — Currency formatting across multiple currencies, date helpers, ID generation

## Code Quality

### Linting

```bash
npm run lint
```

ESLint is configured with:
- `eslint-plugin-react-hooks` — Enforces Rules of Hooks
- `eslint-plugin-react-refresh` — Validates fast refresh compatibility

### Performance
- `React.memo` on frequently re-rendered components
- `ErrorBoundary` for graceful error recovery
- Lazy-loadable page architecture (ready for `React.lazy` + `Suspense`)

### Accessibility
- ARIA labels on interactive elements
- Semantic HTML structure
- Keyboard-navigable PIN pad and forms

## Demo Credentials

| Screen | Credential |
|--------|-----------|
| **OTP Code** | `482913` |
| **Admin Panel** | Password: `admin123` |
| **Parent Mode** | Set your own 4-digit PIN on first access |
| **Student PIN** | Set your own 4-digit PIN in Settings |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite development server with HMR |
| `npm run build` | Build for production |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run all unit tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint source code with ESLint |
