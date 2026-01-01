# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**G-MoP (Guinea Mobility Platform)** is a peer-to-peer car-sharing marketplace for Guinea, connecting vehicle owners with renters (NGOs, mining companies, government agencies, diaspora, individuals).

- **Team Size:** 3 people (Founder, Ops Manager, Developer)
- **Stage:** Early startup, pre-launch
- **Market:** Conakry, Guinea (French-speaking)
- **Model:** Platform is a facilitator only — does NOT own vehicles

## Build & Development Commands

### Frontend (Next.js 15)
```bash
cd src/frontend
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint check
npm run generate-api # Generate TypeScript types from Swagger (requires API running)
```

### Backend (.NET 10)
```bash
cd src/API
dotnet build                    # Compile project
dotnet run                      # Run dev server (https://localhost:5000)
dotnet ef migrations add <Name> # Create new EF migration
dotnet ef database update       # Apply migrations
```

### Development Prerequisites
- API must be running on `localhost:5000` before running `npm run generate-api`
- SQL Server must be accessible at the connection string in `appsettings.Development.json`

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui |
| Backend | ASP.NET Core 10 LTS (C#), Entity Framework Core 10 |
| Database | SQL Server 2025 Enterprise |
| Auth | JWT Bearer tokens |
| Deployment | Coolify (self-hosted PaaS), Cloudflare CDN |

## Architecture

### Backend Structure (src/API/)
- **Controllers/** - API endpoints (Auth, Vehicles, Bookings, Reviews, Admin)
- **Models/Entities.cs** - All 11 domain entities (User, Vehicle, Booking, Review, etc.)
- **Data/GMoPDbContext.cs** - EF Core context with fluent configuration
- **Services/** - Business logic services (EmailService, etc.)

### Frontend Structure (src/frontend/)
- **src/app/[locale]/** - Next.js App Router with i18n (en, fr)
- **src/components/ui/** - shadcn/ui primitives (button, input, card, etc.)
- **src/components/** - Domain components (SearchBar, VehicleCard, Header, Footer)
- **src/lib/api.ts** - Axios instance with JWT interceptor
- **src/lib/schema.d.ts** - Auto-generated OpenAPI types
- **messages/** - Translation files (en.json, fr.json)

### Key API Endpoints
- `POST /api/auth/register`, `/login`, `/verify` - Authentication
- `GET/POST /api/vehicles` - Vehicle search and creation
- `GET /api/vehicles/{id}` - Vehicle details with reviews
- `POST /api/bookings` - Create booking request
- `POST /api/reviews` - Submit review after booking

## Coding Style Rules

### Backend (C#)
1. **Comments in French** for business logic:
   ```csharp
   // Vérifier si le véhicule a tous les 4 documents valides
   if (!await _complianceService.IsVehicleCompliant(vehicleId))
   ```

2. **XML documentation in English** for public APIs:
   ```csharp
   /// <summary>
   /// Creates a new booking request
   /// </summary>
   [HttpPost]
   public async Task<IActionResult> CreateBooking(...)
   ```

3. **Naming:** PascalCase (public), _camelCase (private fields), Async suffix for async methods

4. **Always use:** Parameterized queries, FluentValidation, dependency injection, `[Authorize]` on protected endpoints

### Frontend (TypeScript/React)
1. Use App Router (not Pages Router)
2. Server Components by default, Client Components only when needed (`"use client"`)
3. Tailwind CSS for styling (no inline styles)
4. Use shadcn/ui components where available
5. Forms: React Hook Form + Zod validation

### SQL Server
1. Stored procedures for complex business logic
2. Use REGEXP_LIKE for pattern matching (SQL 2025 feature)
3. Ledger tables for Bookings and Penalties
4. JSON type for flexible attributes (not NVARCHAR)

## Business Logic Rules (DO NOT SKIP)

| Concept | Implementation |
|---------|----------------|
| Auth | JWT with role claims (Owner, Renter, Manager) |
| Compliance | 4-doc gate: INSURANCE, ROADWORTHINESS, TAX_STAMP, OWNERSHIP |
| Malus | 10+ points = restricted, 20+ points = banned |
| Off-platform | Detect phone/email in messages, flag for review |
| Payments | Manual first → Stripe Connect later |
| Bookings | All bookings need approval (no instant booking) |

## Things NOT to Do

### Technical
- Use Azure services, AI/ML features, or suggest alternative databases
- Recommend serverless (AWS Lambda, Azure Functions)
- Over-engineer for scale (we have 50 vehicles, not 50,000)

### Architectural
- Create microservices (monolith is intentional)
- Add Kubernetes/complex orchestration
- Suggest native mobile apps (PWA only for now)

### Business Logic
- Skip the 4-document compliance gate
- Allow instant booking
- Ignore the malus point system
- Write comments in English for business logic (use French)

## Key Reference Files

- `carshare_plan.md` - Business plan and market analysis
- `carshare_deployment.md` - Technical architecture and deployment
- `sql/schema.sql` - Database schema
- `sql/stored-procedures.sql` - Business logic stored procedures

## Guinea Context Considerations

- Low bandwidth environment - keep API responses lean, minimize image sizes
- French is the default language
- Chauffeur-driven rentals are common (cultural preference)
- Target users: B2B first (mining, NGOs), then B2C expansion
