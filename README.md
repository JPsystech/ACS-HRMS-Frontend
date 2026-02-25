# ACS HRMS Admin Panel

Next.js Admin Panel for ACS HRMS Backend.

## Features

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui components
- JWT-based authentication
- Role-based navigation (HR, MANAGER, EMPLOYEE)
- Protected routes

## Setup

1. Install dependencies:
```bash
npm install
```

2. (Optional) Create `.env.local`:
   - **Direct backend (e.g. port 8001)**: set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8001`. All request paths already include `/api/v1` (e.g. `/api/v1/employees`), so the base URL must be the origin only (no path).
   - **Proxy (same-origin)**: leave `NEXT_PUBLIC_API_BASE_URL` unset; Next.js will proxy `/api` to `BACKEND_URL` (default `http://127.0.0.1:8000`). Set `BACKEND_URL=http://127.0.0.1:8001` if the backend runs on 8001.

3. Run the backend (from `hrms-backend`): `uvicorn app.main:app --reload --port 8000`

4. Run development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000). If you see 404 on `/api/v1/...`, ensure the backend is running and the base URL/port matches (see step 2). The dashboard and other pages call `/api/v1/employees`, `/api/v1/leaves/pending`, etc. only after the user is logged in (token available); the login page only calls `POST /api/v1/auth/login`.

## Project Structure

```
hrms-admin/
├── app/
│   ├── login/          # Login page
│   ├── dashboard/      # Dashboard layout and page
│   ├── departments/    # Departments management
│   ├── employees/      # Employees management
│   ├── attendance/     # Attendance management
│   ├── leaves/         # Leave management
│   ├── calendars/       # Calendar pages
│   ├── compoff/        # Comp-off management
│   ├── accrual/        # Accrual management
│   ├── policy/         # Policy management
│   └── reports/        # Reports
├── components/
│   ├── ui/             # shadcn/ui components
│   └── layout/          # Layout components (Sidebar, Topbar)
├── lib/
│   ├── api.ts          # API client
│   ├── auth.ts         # Authentication utilities
│   └── utils.ts        # Utility functions
└── store/
    └── auth-store.ts   # Zustand auth store
```

## Authentication Flow

1. User logs in at `/login` with `emp_code` and `password`
2. Token is stored in localStorage
3. Token is decoded to get user info (id, emp_code, role)
4. Protected routes check authentication via middleware
5. API client automatically attaches `Authorization: Bearer <token>` header
6. On 401 response, user is logged out and redirected to login

## Role-Based Navigation

- **HR**: Full access to all pages
- **MANAGER**: Access to most pages except HR-only features
- **EMPLOYEE**: Limited access to personal pages

## Developed & Designed by JPSystech
