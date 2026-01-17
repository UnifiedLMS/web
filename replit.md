# Unified Admin Interface

## Overview

This is a full-stack web application serving as an administrative interface called "Unified." It features a React frontend with modern UI components, an Express backend that proxies authentication requests to an external API (`unifyapi.onrender.com`), and PostgreSQL for data persistence. The application includes user authentication, a dashboard, settings page with theme customization (light/dark mode and accent color picker), and animated entry sequences.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state, React hooks for local state
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (supports light/dark mode and custom accent colors)
- **Animations**: Framer Motion for entry animations and background effects
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite with path aliases (`@/` for client source, `@shared/` for shared code)

### Backend Architecture
- **Framework**: Express 5 running on Node.js
- **API Pattern**: Proxy architecture - the server forwards authentication requests to an external API using curl commands
- **Database**: No local database used. All persistent data is handled by external APIs.
- **Session Management**: Client-side token storage in localStorage.
- **Build Process**: Custom esbuild script bundles server code, Vite builds the client

### Shared Code Structure
- **Schema Definitions**: `shared/schema.ts` contains API request/response schemas (Zod)
- **Route Definitions**: `shared/routes.ts` defines API endpoints with input/output types for type-safe API calls

### Authentication Flow
- External API authentication proxied through the Express server
- Tokens stored in localStorage on the client
- Token validation endpoint for session checking

### Directory Structure
```
client/           # React frontend
  src/
    components/   # UI components (Shadcn/ui)
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
    pages/        # Route components
server/           # Express backend
  routes.ts       # API route handlers
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Code shared between client and server
  schema.ts       # Database and API schemas
  routes.ts       # API route definitions
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Database schema management and queries
- **drizzle-kit**: Database migrations with `npm run db:push`

### External APIs
- **unifyapi.onrender.com**: External authentication API for login and token validation
  - Login endpoint: `POST /api/v1/auth/login` (form-urlencoded with OAuth2 password grant)
  - The Express server proxies these requests using curl

### Key Frontend Libraries
- **@tanstack/react-query**: Data fetching and caching
- **framer-motion**: Animations
- **lucide-react**: Icons
- **react-hook-form**: Form state management
- **zod**: Schema validation
- **wouter**: Client-side routing

### UI Framework
- **Shadcn/ui**: Component library configured in `components.json`
- **Radix UI**: Accessible primitive components
- **Tailwind CSS**: Utility-first styling with custom theme variables