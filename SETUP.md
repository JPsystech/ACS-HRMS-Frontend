# Setup Instructions

## 1. Install Dependencies

```bash
cd hrms-admin
npm install
```

## 2. Configure Environment

Create `.env.local` file:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 3. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 4. Login

Use your employee code and password to login. The token will be stored in localStorage.

## Project Structure

```
hrms-admin/
├── app/
│   ├── login/              # Login page (public)
│   ├── dashboard/          # Dashboard page (protected)
│   ├── departments/        # Departments page (protected, HR only)
│   ├── employees/          # Employees page (protected, HR only)
│   ├── attendance/         # Attendance page (protected)
│   ├── leaves/             # Leaves page (protected)
│   ├── calendars/          # Calendar pages (protected)
│   │   ├── holidays/
│   │   └── restricted-holidays/
│   ├── compoff/            # Comp-off page (protected)
│   ├── accrual/            # Accrual page (protected, HR only)
│   ├── policy/             # Policy page (protected, HR only)
│   └── reports/            # Reports page (protected)
├── components/
│   ├── ui/                 # shadcn/ui components
│   └── layout/             # Layout components
│       ├── sidebar.tsx     # Sidebar with role-based navigation
│       └── topbar.tsx      # Top navigation bar
├── lib/
│   ├── api.ts              # API client with auth handling
│   ├── auth.ts             # Auth utilities (token decode, etc.)
│   └── utils.ts            # Utility functions
└── store/
    └── auth-store.ts       # Zustand auth state management
```

## Features

- ✅ Next.js 14 App Router
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ shadcn/ui components
- ✅ JWT authentication
- ✅ Role-based navigation (HR, MANAGER, EMPLOYEE)
- ✅ Protected routes with client-side guard
- ✅ API client with automatic token attachment
- ✅ 401 handling with auto-logout

## Authentication Flow

1. User logs in at `/login` with `emp_code` and `password`
2. Token is stored in `localStorage` as `access_token`
3. Token is decoded using `jose` library to extract user info
4. User info (id, emp_code, role) is stored in Zustand store
5. Protected routes check authentication via `AuthGuard` component
6. API client automatically attaches `Authorization: Bearer <token>` header
7. On 401 response, user is logged out and redirected to `/login`

## Role-Based Access

- **HR**: Full access to all pages including Departments, Employees, Accrual, Policy
- **MANAGER**: Access to most pages except HR-only features
- **EMPLOYEE**: Access to personal pages (Attendance, Leaves, Comp-off, Reports)

## Notes

- The middleware is simplified and allows all routes; client-side `AuthGuard` handles protection
- Token is stored in localStorage (consider httpOnly cookies for production)
- User profile is decoded from JWT token (no `/me` endpoint needed)
- All API calls use the base URL from `NEXT_PUBLIC_API_BASE_URL`
