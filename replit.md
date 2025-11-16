# Overview

This is a Next.js-based appointment management system designed for the Sala Sensorial ALECE (Sensory Room at the Legislative Assembly of Ceará). The application manages appointments for individuals with autism, Down syndrome, and ADHD, providing digital signature capture, document management, and notification services.

The system features role-based access control with four user levels (superadmin, admin, atendente, user), biometric signature capture using Wacom STU-300 and Hanvon ESP560 devices, and automated email notifications for appointment confirmations and reminders.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: Next.js 16.0.1 with App Router and React 19
- Uses Turbopack for development builds
- Server and client components mixed architecture
- TypeScript strict mode enabled for type safety
- Standalone output configuration for optimized deployments

**State Management**:
- React Context API for authentication (AuthContext) and user management (UserContext)
- Custom hooks for permissions (`usePermissions`), authentication (`useAuth`), and SDK integrations
- Local state management with useState/useEffect patterns

**UI Components**:
- Tailwind CSS with custom design tokens and utility classes
- Headless UI for accessible components (@headlessui/react)
- Radix UI for toast notifications
- Custom component library in `/components` directory with reusable elements
- Responsive design with mobile-first approach

**Route Protection**:
- Guard components (`DashboardGuard`, `AdminGuard`, `SuperAdminGuard`) wrap protected routes
- Permission checks happen at layout level before rendering
- Redirects to appropriate pages based on user role

## Backend Architecture

**Database**: Supabase (PostgreSQL)
- Row Level Security (RLS) policies for data access control
- Two Supabase clients: `supabase-client.ts` (client-side with auth) and `supabase-server.ts` (server-side with service role key)
- Custom storage handling with session expiry validation (3-hour sessions)
- Database initialization via `initializeDatabase()` in User model

**Authentication System**:
- Supabase Auth with email/password and Google OAuth
- Session management with automatic expiry (3 hours)
- Custom auth utilities for password validation and error handling in `auth-utils.ts`
- User roles stored in separate `users` table linked via `auth_id`

**Permission Model** (`lib/auth/permissions.ts`):
- Four roles: superadmin, admin, atendente, user
- Hierarchical permissions system where higher roles inherit lower role permissions
- Route-based access control with explicit permission checks
- Helper functions: `hasPermission()`, `hasRouteAccess()`, `isAdmin()`, `isSuperAdmin()`

**API Routes** (Next.js API Routes):
- Protected endpoints requiring Bearer token authentication
- User management APIs at `/api/users`
- Webhook handlers for external integrations

## Data Models

**User Model** (`lib/models/User.ts`):
- Fields: id, auth_id, name, email, phone, role, status, timestamps
- Methods: `getUserByAuthId()`, `createUser()`, `hasAccessToDashboard()`, `isAdmin()`, `isSuperAdmin()`
- Database initialization function ensures users table exists

**Appointment/Atendimento**:
- Core fields: nome, cpf, email, data, horario, status, protocolo
- Enhanced fields: observacoes, fotos_coletadas, assinatura_base64
- Delivery tracking: nome_recebedor, cpf_recebedor, vinculo, data_entrega
- Status workflow: agendado → em_atendimento → concluido/ausente/cancelado

**Signature Data**:
- Multiple signature formats supported (PNG base64, ISO/IEC 19794-7 for Wacom)
- Biometric data captured from physical devices
- Document binding with SHA-256 hashes

## External Dependencies

### Supabase Integration
- **Purpose**: PostgreSQL database, authentication, and storage
- **Configuration**: Requires `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key**: `SUPABASE_SERVICE_ROLE_KEY` for server-side operations bypassing RLS
- **Features Used**: Auth, Realtime subscriptions, Storage, Database

### Email Services
- **Nodemailer** for Gmail SMTP integration
  - Requires `EMAIL_USER` (Gmail address) and `EMAIL_PASSWORD` (app-specific password)
  - Used in `lib/emailService.ts` for appointment confirmations and reminders
- **Resend** package installed but implementation appears to be via Nodemailer

### Signature Capture Devices

**Wacom STU-300**:
- SDK: `@wacom/signature-sdk` (JavaScript WebAssembly)
- Integration: `SignaturePadWacom.tsx` component with `useWacomSDK` hook
- License required: `NEXT_PUBLIC_WACOM_LICENCE` environment variable
- Output: PNG + ISO/IEC 19794-7 biometric format
- Browser-based, no backend required (WebHID API)

**Hanvon ESP560**:
- Architecture: .NET Bridge (Windows service) + WebSocket
- Integration: `SignaturePadHanvon.tsx` component
- Requires separate bridge application running on Windows
- Output: PNG + custom JSON biometric data

### PDF Generation
- **jsPDF** + **jsPDF-autotable** for client-side PDF generation
- **@react-pdf/renderer** for React-based PDF templates
- **html2canvas** for HTML-to-image conversion before PDF embedding

### UI Libraries
- **Lucide React** (icons)
- **React Icons** (additional icon sets: FiIcons, etc.)
- **React Slick** + **Slick Carousel** for carousels
- **Recharts** for data visualization/charts
- **class-variance-authority** + **clsx** + **tailwind-merge** for dynamic styling

### Form Libraries
- **@tailwindcss/forms** for styled form elements
- Custom validation utilities in `lib/auth-utils.ts`

### Development Tools
- **ESLint** with Next.js config
- **TypeScript** with strict mode
- **Autoprefixer** + **PostCSS** for CSS processing

## Configuration Notes

**Build Configuration** (`next.config.js`):
- TypeScript strict checking enabled (`ignoreBuildErrors: false`)
- Remote image patterns configured for multiple domains
- Standalone output for containerization

**Known Issues**:
- Wacom SDK requires manual download or NPM private registry authentication (token-based)
- Documentation suggests TypeScript/ESLint were previously disabled but are now re-enabled
- Session management uses localStorage which may not work in all server-rendering scenarios