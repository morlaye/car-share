# CLAUDE.md
## Instructions for AI Assistants Working on G-MoP

---

## Project Overview

**G-MoP (Guinea Mobility Platform)** is a peer-to-peer car-sharing marketplace for Guinea, connecting vehicle owners with renters (NGOs, mining companies, government agencies, diaspora, individuals).

**Key Characteristics:**
- **Team Size:** 3 people (Founder, Ops Manager, Developer)
- **Stage:** Early startup, pre-launch
- **Market:** Conakry, Guinea (French-speaking)
- **Model:** Platform is a facilitator only — does NOT own vehicles

**Tech Stack:**
| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | ASP.NET Core 10 LTS (C#) |
| Database | SQL Server 2025 Enterprise |
| Deployment | Coolify (self-hosted PaaS) |
| CDN | Cloudflare (free tier) |
| Payments | Stripe Connect (future) |

**Infrastructure:**
- Dev: Windows 11 Pro + Hyper-V (SQL Server VM + Ubuntu/Coolify VM)
- Prod: Hetzner VPS + Cloudflare

---

## Coding Style Rules

### Backend (.NET/C#)

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

3. **Always use:**
   - Parameterized queries (never raw SQL)
   - FluentValidation for input validation
   - Dependency injection
   - Repository pattern for data access
   - `[Authorize]` on all controllers except explicitly public endpoints

4. **Naming conventions:**
   - PascalCase for public members
   - _camelCase for private fields
   - Async suffix for async methods

### Frontend (Next.js/TypeScript)

1. Use App Router (not Pages Router)
2. Server Components by default, Client Components only when needed
3. Tailwind CSS for styling (no inline styles)
4. Use shadcn/ui components where available

### SQL Server

1. Stored procedures for complex business logic
2. Use REGEXP_LIKE for pattern matching (SQL 2025 feature)
3. Ledger tables for Bookings and Penalties
4. JSON type for flexible attributes (not NVARCHAR)

---

## File Structure Expectations

```
GMoP/
├── docs/
│   ├── carshare_plan.md       # Business plan
│   └── carshare_deployment.md # Technical architecture
├── src/
│   ├── API/                   # .NET 10 Backend
│   │   ├── Controllers/
│   │   ├── Services/
│   │   ├── Models/
│   │   ├── Data/              # EF Core + Repository
│   │   └── Validators/        # FluentValidation
│   └── Frontend/              # Next.js 15
│       ├── app/               # App Router
│       ├── components/
│       └── lib/
├── sql/
│   ├── schema.sql             # Database schema
│   └── stored-procedures.sql  # Business logic SPs
├── docker-compose.yml         # Coolify deployment
└── CLAUDE.md                  # This file
```

---

## How Claude Should Respond

### DO:
- Ground recommendations in `carshare_plan.md` and `carshare_deployment.md`
- Write production-ready code with error handling
- Explain trade-offs for a 3-person team
- Consider Guinea context (low bandwidth, French language, chauffeur culture)
- Suggest simpler alternatives if a feature seems over-engineered
- Use the confirmed tech stack (SQL Server, .NET, Next.js)

### Response Format:
1. **Brief explanation** of approach
2. **Code** with French business logic comments
3. **Security considerations** if applicable
4. **Test suggestions** for critical paths

### Example Good Response:
```
I'll create the vehicle compliance check endpoint.

**Approach:** Call the existing `sp_CheckVehicleCompliance` stored procedure 
and return a structured response.

[Code block with implementation]

**Security:** This endpoint requires `[Authorize(Policy = "CanListVehicles")]` 
since only owners/managers should access it.

**Tests:** Verify behavior when 0, 1, 3, and 4 documents are valid.
```

---

## Things Claude Should NOT Do

### Technical:
- ❌ Use Azure services (no Azure OpenAI, no Azure hosting)
- ❌ Add AI/ML features (no vector search, no embeddings)
- ❌ Suggest PostgreSQL, MongoDB, or other databases
- ❌ Recommend serverless (AWS Lambda, Azure Functions)
- ❌ Over-engineer for scale (we have 50 vehicles, not 50,000)

### Architectural:
- ❌ Create microservices (monolith is intentional)
- ❌ Add Kubernetes/complex orchestration
- ❌ Suggest native mobile apps (PWA only for now)
- ❌ Build features not in the phased plan

### Business Logic:
- ❌ Skip the 4-document compliance gate
- ❌ Allow instant booking (all bookings need approval)
- ❌ Ignore the malus point system
- ❌ Remove platform liability disclaimers

### Process:
- ❌ Make changes without explaining rationale
- ❌ Assume features from Turo/competitors apply here
- ❌ Forget this is a 3-person team with limited capacity
- ❌ Write comments in English for business logic (use French)

---

## Quick Reference

| Concept | Implementation |
|---------|----------------|
| Auth | JWT with role claims (Owner, Renter, Manager) |
| Compliance | 4-doc gate: INSURANCE, ROADWORTHINESS, TAX_STAMP, OWNERSHIP |
| Malus | 10+ points = restricted, 20+ points = banned |
| Off-platform | Detect phone/email in messages, flag for review |
| Payments | Manual first → Stripe Connect later |
| Deployment | Coolify (dev) → Hetzner + Cloudflare (prod) |

---

## Context7 MCP (Recommended)

Use **Context7** to get up-to-date documentation for the tech stack.

### How to Use

Add `use context7` to prompts when working with libraries:

```
Create a booking endpoint with JWT auth in .NET 10. Use context7.
```

### Useful For

| Library | Why |
|---------|-----|
| ASP.NET Core 10 | Get Minimal APIs patterns, not old MVC |
| Next.js 15 | Get App Router, not Pages Router |
| SQL Server 2025 | Get REGEXP_LIKE, JSON type syntax |
| Tailwind CSS | Avoid deprecated classes |
| shadcn/ui | Get current component APIs |

### Installation (Claude Desktop)

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    }
  }
}
```

---

*Last updated: December 2025*
