# Sortify - Smart Package Sorting Platform

## Overview

Sortify is a full-stack web application designed for intelligent package sorting and mailroom management in multi-tenant organizations. It provides a comprehensive solution for tracking mail items, managing recipients, handling notifications, and integrating with external services. The application is built as a modern web app with a React frontend and Express.js backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Framework**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions stored in PostgreSQL
- **API Design**: RESTful API with organization-scoped endpoints

### Database Design
- **Primary Database**: PostgreSQL (via Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Key Tables**:
  - `users` - User authentication and profile data
  - `organizations` - Multi-tenant organization data
  - `organization_members` - User-organization relationships with roles
  - `recipients` - Mail recipients within organizations
  - `mail_items` - Individual mail/package tracking
  - `mail_item_history` - Audit trail for mail status changes
  - `integrations` - External service configurations
  - `sessions` - User session storage

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **User Management**: Automatic user creation/updates on authentication
- **Security**: HTTP-only cookies with secure session handling

### Organization Management
- **Multi-tenancy**: Organization-scoped data access with middleware
- **Role-based Access**: Member roles within organizations
- **Context Provider**: React context for current organization state
- **Organization Switching**: Users can belong to multiple organizations

### Mail Management System
- **Mail Intake**: Process for logging incoming mail/packages
- **Status Tracking**: Pending, notified, delivered status workflow
- **Recipient Management**: CRUD operations for mail recipients
- **History Tracking**: Complete audit trail of mail item changes
- **Notification System**: Integration points for email/SMS notifications

### Integration Framework
- **External Services**: Configurable integrations for notifications
- **Webhook Support**: Incoming webhook handling for external systems
- **Email Integration**: SMTP configuration for automated notifications
- **SMS Integration**: SMS service provider configuration

## Data Flow

### Authentication Flow
1. User accesses protected route
2. Middleware checks for valid session
3. If no session, redirect to Replit Auth
4. On successful auth, create/update user record
5. Establish session and redirect to application

### Mail Processing Flow
1. Mail arrives and is logged via intake form
2. System creates mail_item record with "pending" status
3. Notification integrations trigger (if configured)
4. Recipient receives notification about mail arrival
5. Upon pickup, status updates to "delivered"
6. All changes logged in mail_item_history

### Organization Context Flow
1. User authenticates and loads organization memberships
2. Organization context provider manages current organization
3. All API requests include organization header
4. Server middleware validates organization access
5. Data queries filtered by organization scope

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Database ORM and query builder
- **express**: Web framework for API server
- **@tanstack/react-query**: Client-side data fetching and caching
- **react-hook-form**: Form handling and validation
- **zod**: Schema validation for forms and API

### UI Dependencies
- **@radix-ui/***: Primitive UI components for accessibility
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **date-fns**: Date manipulation utilities

### Authentication Dependencies
- **openid-client**: OpenID Connect authentication
- **passport**: Authentication middleware
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for development

## Deployment Strategy

### Development Environment
- **Platform**: Replit with Node.js 20 runtime
- **Database**: Replit-provisioned PostgreSQL instance
- **Development Server**: Vite dev server with Express API
- **Hot Reload**: Vite HMR for frontend, tsx watch mode for backend

### Production Build
- **Frontend**: Vite production build to `dist/public`
- **Backend**: esbuild compilation of server code to `dist/index.js`
- **Static Assets**: Served directly by Express in production
- **Database**: Production PostgreSQL via DATABASE_URL environment variable

### Environment Configuration
- **Required Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `SESSION_SECRET`: Session encryption key
  - `REPL_ID`: Replit application identifier
  - `ISSUER_URL`: OpenID Connect issuer URL
  - `REPLIT_DOMAINS`: Allowed domains for authentication

### Scaling Considerations
- **Stateless Design**: Session stored in database for horizontal scaling
- **Database Connection Pooling**: Neon serverless handles connection scaling
- **CDN Ready**: Static assets can be served from CDN
- **Multi-tenant Architecture**: Single deployment serves multiple organizations

## Recent Changes

### July 15, 2025 - Complete Stripe Subscription Flow Testing & Validation
- **End-to-End Subscription Flow Tested**: Comprehensive testing of complete subscription process from trial to paid plan
- **Stripe Checkout Session Creation**: Successfully generates real Stripe payment URLs for live transactions
- **Database Update Flow**: Confirmed subscription webhooks properly update organization plan, status, and user limits
- **License Enforcement Validation**: Verified one-user-per-license model working correctly across trial and paid plans
- **User Invitation System**: Tested license limits properly enforce user addition restrictions and allow expansion after subscription
- **Real Payment Processing**: Live Stripe integration processes actual payments and updates subscription status
- **Organization State Management**: Confirmed smooth transition from trial (1 user) to professional (3 users) plan
- **Email Integration**: Invitation emails successfully sent via SendGrid with proper authentication
- **Production Ready**: Complete subscription flow operational with live Stripe environment and real payment processing
- **Core Functionality Verified**: All mailroom management features working alongside subscription system
- **Webhook Configuration Resolved**: Identified webhook endpoint mismatch between production configuration and development testing environment
- **Raw Body Parsing Fixed**: Resolved Express.js middleware order to allow proper Stripe webhook signature verification by ensuring raw body parsing before JSON middleware
- **Frontend Cache Refresh Solution**: Fixed webhook updates not appearing in UI by implementing aggressive cache busting on organization endpoints and 10-second auto-refresh intervals on subscription-related queries
- **Complete End-to-End Validation**: Webhook processing successfully updates database from starter→professional→enterprise→starter plans with correct user limits, and frontend automatically reflects changes within 10 seconds

### July 11, 2025 - Live Stripe Environment Activation & License Logic Refinement
- **Live Stripe Integration**: Successfully upgraded from test to live Stripe environment with real payment processing
- **License Counting Logic Fixed**: Corrected license enforcement to only count registered users, not pending invitations
- **Production Payment Processing**: Now processes real credit card payments and handles actual subscription billing cycles
- **Automatic Webhook Processing**: Live webhooks now automatically update license counts when customers modify subscriptions
- **Customer Portal Access**: Live customer portal allows real subscription management, payment method updates, and billing history access
- **License Enforcement Refined**: Pending invitations no longer count against license seats - only actual registered users count
- **Real-time License Updates**: Subscription changes in Stripe automatically sync license limits in real-time
- **Professional Plan Live**: System fully operational with 5-user Professional plan in live production environment
- **Production Ready**: Complete transition from demo to live environment with all features functioning on real Stripe infrastructure

### July 5, 2025 - Email & User Experience Fixes
- **Team Member Invitation Emails Fixed**: Updated all email functions to use correct verified SendGrid sender address (`signup@sortifyapp.com`)
- **Edit Recipient Dialog Fixed**: Resolved form validation issue by ensuring organizationId is properly included when editing recipients
- **Improved Registration Error Messages**: Added specific error handling for existing email addresses during registration, providing clear guidance instead of generic "registration failed" message
- **Fixed Password Reset HTTPS URLs**: Updated password reset emails to generate proper HTTPS links for Replit domains, resolving "connection is not private" errors
- **Fixed License Limit Synchronization**: Corrected billing confirmation to set organization maxUsers to plan limits instead of user count (Starter: 3 users, Professional: 10 users, Enterprise: unlimited)
- **Fixed Plan Selection Defaults**: Updated billing interface to show appropriate default user counts when selecting plans (Starter defaults to 3 users instead of 1)
- **Fixed Recipient Form State Issue**: Resolved form persistence bug where editing a recipient and then clicking "Add Recipient" would retain previous values instead of showing empty form
- **Fixed Customization Dropdown Synchronization**: Fixed mail intake form to use dynamic customization values instead of hardcoded options, ensuring deleted courier companies disappear from dropdowns immediately

### January 2, 2025 - Complete User Limit Synchronization & Billing System Finalization
- **Complete Stripe Integration**: Fully implemented Stripe Payment Intents for subscription billing
- **Final Pricing Structure**: Revised all billing components with simplified user limits:
  - Starter: $25/user/month (no minimum, up to 3 users, 1,000 packages/month)
  - Professional: $35/user/month (no minimum, up to 10 users, unlimited packages)
  - Enterprise: $45/user/month (no minimum, unlimited users, unlimited packages)
- **Complete User Limit Synchronization**: Fixed all inconsistencies across the application:
  - Updated database records to reflect correct plan limits
  - Synchronized User Management, Billing, and Settings displays
  - Removed all hardcoded fallback values
  - Added proper data fetching for complete organization information
- **Trial System Enhancement**: Added proper trial expiry enforcement and date tracking
- **User Management Cleanup**: Removed upgrade license prompts from User Management page
- **Payment Architecture**: Using Stripe Payment Intents (one-time payments) for full billing control
- **Database Consistency**: All organization records now have correct maxUsers and package limits

### January 7, 2025 - Invitation Management & Email Fixes
- **Enhanced Invitation System**: Added comprehensive pending invitation management:
  - View pending invitations in Members & Licenses tab (admin only)
  - Resend invitation functionality with new tokens and extended expiration
  - Proper duplicate invitation prevention with clear error messages
  - Backend APIs for fetching and resending invitations
- **Fixed Email URL Issues**: Resolved SendGrid redirect problems:
  - Disabled click tracking to prevent external redirect URLs
  - Password reset emails now use direct application URLs
  - All email types (invitations, password resets, notifications) use production domain
  - Fixed "connection is not private" errors from wrapped tracking URLs
- **Improved User Experience**: Enhanced invitation workflow with real-time updates and proper admin controls

### January 2, 2025 - Enhanced Unified Settings System
- **Expanded Settings Interface**: Added comprehensive 6-tab settings system:
  - Organization: Company profile and contact information
  - Customization: Dropdown value management (package types, sizes, couriers, statuses)
  - Preferences: System behavior toggles (photo requirements, notifications, edit permissions)
  - Members & Licenses: License management, user limits, member invitation/removal
  - Mailrooms: Physical location and storage area management
  - Integrations: Email and SMS notification service configuration
- **License Management**: Added license tracking with user count limits and status display
- **Member Management**: Enhanced with invite/remove functionality and role management
- **Mailroom Configuration**: Restored mailroom and storage location setup capabilities
- **Consolidated Navigation**: Integrated all settings under single "Settings" menu option
- **Infrastructure Ready**: All backend APIs and database schemas support full functionality