# Plan 01 — Auth

## Goal

A user can open the dashboard, sign in with email and password, and reach the correct home screen for their role (admin/company → Overview, customer → My Phones). Subsequent requests include the JWT access cookie automatically. When the access token expires the client transparently refreshes it. Logging out clears the session and redirects to the login page. All authenticated routes reject unauthenticated access.

## Depends on

- plan-00: Spring Boot skeleton, PostgreSQL running, Next.js scaffold with route groups, CI/CD pipeline

## Tasks

Listed in execution order. Tasks marked [parallel] can run concurrently.

- [ ] `tasks/plan-01-auth/00-backend-auth-model.md` — User + RefreshToken JPA entities, repositories
- [ ] `tasks/plan-01-auth/01-backend-security-infra.md` — JwtTokenProvider, Spring Security filter chain, GlobalExceptionHandler handlers [depends on 00]
- [ ] `tasks/plan-01-auth/02-backend-auth-endpoints.md` — AuthController + AuthService (login/refresh/logout/me) [depends on 01]
- [ ] `tasks/plan-01-auth/03-backend-user-endpoints.md` — UserController + UserService admin CRUD [depends on 01] [parallel with 02]
- [ ] `tasks/plan-01-auth/04-frontend-login-page.md` — LoginForm, POST /auth/login, role-based redirect [depends on 02]
- [ ] `tasks/plan-01-auth/05-frontend-auth-middleware.md` — Next.js middleware, route protection, Zustand auth store [depends on 02, 04]
- [ ] `tasks/plan-01-auth/06-frontend-app-shell.md` — AppShell with role-aware sidebar, topbar, logout [depends on 05]

## Validation

At the end of this plan, a human reviewer confirms:

- Admin user logs in at `/login` with `admin@tetramobile.ae` — redirected to `/overview`
- A customer user logs in — redirected to `/phones`
- Unauthenticated access to `/overview` redirects to `/login`
- Logout button clears session and redirects to `/login`
- `GET /actuator/health` still returns 200 (regression check)
- `mvn verify` and `pnpm build` still pass
- All automated checks pass
