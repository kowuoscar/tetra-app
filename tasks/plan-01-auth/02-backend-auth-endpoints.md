# Backend — Auth Endpoints

## Domain

backend

## Plan

`plans/plan-01-auth.md`

## Depends on

- `tasks/plan-01-auth/01-backend-security-infra.md` — `JwtTokenProvider`, `SecurityConfig`, `RefreshTokenRepository`, typed exceptions must exist

## References

- `specs/backend.md#auth-rules` — full business logic for login/refresh/logout
- `docs/contracts.md#post-authlogin` — request/response shapes

## Context

Implement the four auth endpoints: login, refresh, logout, and a `GET /auth/me` endpoint used by the Next.js frontend to hydrate the Zustand auth store on page load. All business logic is in `AuthService`. After this task, a user can obtain JWT cookies via login, refresh them, and clear them via logout.

---

### Inlined spec excerpts

**POST /auth/login**
```
Auth required: No
Request: { "email": string, "password": string }
Response 200: { "user": UserSummary }
  Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=900; Path=/
  Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/api/v1/auth/refresh
Errors:
  401 invalid_credentials — email not found or password wrong
  403 account_deactivated — user.is_active = false
```

**POST /auth/refresh**
```
Auth required: No (uses refresh_token cookie)
Request: (no body)
Response 200: { "user": UserSummary } + rotated cookies
Errors:
  401 invalid_refresh_token — token missing, expired, or not found in DB
```

**DELETE /auth/session**
```
Auth required: Yes (any role)
Request: (no body)
Response 204: no content; clears access_token + refresh_token cookies (Max-Age=0)
Errors:
  401 unauthenticated — no valid access token
```

**GET /auth/me** (not in contracts.md — add here)
```
Auth required: Yes (any role)
Request: (no body)
Response 200: { "user": UserSummary }
  Looks up user by ID from JWT sub claim — one DB call
Errors:
  401 unauthenticated — no valid access token
```

**Business rules (inlined from specs/backend.md):**
- Case-insensitive email lookup. If not found → 401 `invalid_credentials` (same error whether email missing or password wrong — do not distinguish).
- Password check: `BCrypt.checkpw(rawPassword, user.getPasswordHash())`. If wrong → 401 `invalid_credentials`.
- If `user.isActive() == false` → 403 `account_deactivated`.
- Access token: JWT signed HS256, claims `sub`=userId, `role`, `customer_id` (null for admin/company), TTL 15 min.
- Refresh token: opaque UUID. Store SHA-256 hash in `refresh_tokens` table with `expiresAt = now + 7 days`. Send plaintext UUID in cookie.
- Token rotation: delete old refresh token row, insert new row with new UUID + new expiry. Single transaction.
- Grace window (5 s): if `findByTokenHashAndExpiresAtAfter` finds no row, check if a token with same hash was rotated within the last 5 seconds — if so, return the already-issued new access token rather than 401. (Implementation: store `rotated_at` timestamp on the row; check for recently-rotated tokens on rotation miss.)
- Logout: `deleteByTokenHash(hash)` + `deleteByUserId(userId)` (belt-and-suspenders). Clear both cookies.
- SHA-256 hash computation: `MessageDigest.getInstance("SHA-256")` on the raw UUID bytes.

---

## Implementation

### 1. AuthService interface + implementation

Create `com.tetramobile.tetra.auth.AuthService`:
```java
public interface AuthService {
    LoginResponse login(String email, String password, HttpServletResponse response);
    LoginResponse refresh(String refreshTokenValue, HttpServletResponse response);
    void logout(UUID userId, String refreshTokenValue, HttpServletResponse response);
    UserSummaryResponse me(UUID userId);
}
```

Implement in `AuthServiceImpl`. Key methods:

**login:**
```java
User user = userRepository.findByEmailIgnoreCase(email)
    .orElseThrow(() -> new UnauthorizedException("invalid_credentials", "Invalid credentials"));
if (!passwordEncoder.matches(rawPassword, user.getPasswordHash()))
    throw new UnauthorizedException("invalid_credentials", "Invalid credentials");
if (!user.isActive())
    throw new ForbiddenException("account_deactivated", "Account is deactivated");

String accessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole(), user.getCustomerId());
String rawRefreshToken = UUID.randomUUID().toString();
String tokenHash = sha256(rawRefreshToken);

RefreshToken rt = new RefreshToken();
rt.setUserId(user.getId());
rt.setTokenHash(tokenHash);
rt.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
refreshTokenRepository.save(rt);

setAccessTokenCookie(response, accessToken);
setRefreshTokenCookie(response, rawRefreshToken);

return new LoginResponse(UserSummaryResponse.from(user));
```

**refresh:**
```java
String hash = sha256(rawRefreshToken);
RefreshToken rt = refreshTokenRepository
    .findByTokenHashAndExpiresAtAfter(hash, Instant.now())
    .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token", "Refresh token is invalid or expired"));

User user = userRepository.findById(rt.getUserId())
    .orElseThrow(() -> new UnauthorizedException("invalid_refresh_token", "User not found"));

// Rotation: delete old, insert new — single transaction
refreshTokenRepository.deleteByTokenHash(hash);
String newRaw = UUID.randomUUID().toString();
RefreshToken newRt = new RefreshToken();
newRt.setUserId(user.getId());
newRt.setTokenHash(sha256(newRaw));
newRt.setExpiresAt(Instant.now().plus(7, ChronoUnit.DAYS));
refreshTokenRepository.save(newRt);

String newAccessToken = jwtProvider.generateAccessToken(user.getId(), user.getRole(), user.getCustomerId());
setAccessTokenCookie(response, newAccessToken);
setRefreshTokenCookie(response, newRaw);

return new LoginResponse(UserSummaryResponse.from(user));
```

**SHA-256 helper:**
```java
private String sha256(String input) {
    try {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hash);
    } catch (NoSuchAlgorithmException e) {
        throw new IllegalStateException("SHA-256 not available", e);
    }
}
```

**Cookie helpers:**
```java
private void setAccessTokenCookie(HttpServletResponse response, String token) {
    ResponseCookie cookie = ResponseCookie.from("access_token", token)
        .httpOnly(true).secure(true).sameSite("Strict")
        .path("/").maxAge(900).build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
}

private void setRefreshTokenCookie(HttpServletResponse response, String token) {
    ResponseCookie cookie = ResponseCookie.from("refresh_token", token)
        .httpOnly(true).secure(true).sameSite("Strict")
        .path("/api/v1/auth/refresh").maxAge(604800).build();
    response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
}

private void clearAuthCookies(HttpServletResponse response) {
    ResponseCookie ac = ResponseCookie.from("access_token", "")
        .httpOnly(true).secure(true).sameSite("Strict").path("/").maxAge(0).build();
    ResponseCookie rc = ResponseCookie.from("refresh_token", "")
        .httpOnly(true).secure(true).sameSite("Strict").path("/api/v1/auth/refresh").maxAge(0).build();
    response.addHeader(HttpHeaders.SET_COOKIE, ac.toString());
    response.addHeader(HttpHeaders.SET_COOKIE, rc.toString());
}
```

### 2. AuthController

Create `com.tetramobile.tetra.auth.AuthController`:

```java
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request,
                                               HttpServletResponse response) {
        return ResponseEntity.ok(authService.login(request.email(), request.password(), response));
    }

    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null)
            throw new UnauthorizedException("invalid_refresh_token", "Refresh token missing");
        return ResponseEntity.ok(authService.refresh(refreshToken, response));
    }

    @DeleteMapping("/session")
    public ResponseEntity<Void> logout(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        AuthenticatedUser current = SecurityUtils.currentUser();
        authService.logout(current.userId(), refreshToken, response);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<LoginResponse> me() {
        AuthenticatedUser current = SecurityUtils.currentUser();
        return ResponseEntity.ok(new LoginResponse(authService.me(current.userId())));
    }
}
```

Create `LoginRequest` record: `{ String email, String password }` with `@NotBlank` + `@Email` on email.
Create `LoginResponse` record: `{ UserSummaryResponse user }`.

### 3. Integration test

Write `AuthControllerIT` using `@SpringBootTest` + Testcontainers PostgreSQL + `MockMvc`:
- `POST /auth/login` with valid admin credentials → 200, response body contains user, `Set-Cookie` headers include `access_token` and `refresh_token`
- `POST /auth/login` with wrong password → 401 `invalid_credentials`
- `POST /auth/login` with unknown email → 401 `invalid_credentials` (same code — no enumeration)
- `DELETE /auth/session` without access token → 401
- `DELETE /auth/session` with valid access token cookie → 204, cookies cleared
- `GET /auth/me` with valid access token → 200, returns user
- `POST /auth/refresh` with valid refresh token → 200, new cookies set

The test must set the admin user's password hash to `BCryptPasswordEncoder(12).encode("Admin1234!")` via a `@Sql` annotation or test data insert before each test.

---

## Acceptance criteria

- [ ] `POST /auth/login` with correct credentials returns 200 + `access_token` and `refresh_token` Set-Cookie headers
- [ ] `POST /auth/login` with wrong credentials returns 401 `invalid_credentials`
- [ ] `POST /auth/refresh` issues new access token and rotates refresh token in DB
- [ ] `DELETE /auth/session` clears cookies and deletes refresh token row
- [ ] `GET /auth/me` returns authenticated user's info
- [ ] `./mvnw verify` passes with zero test failures

## Automated checks

```bash
cd api
./mvnw test -Dtest=AuthControllerIT
# Expect: BUILD SUCCESS, 0 failures

./mvnw verify
# Expect: BUILD SUCCESS
```
