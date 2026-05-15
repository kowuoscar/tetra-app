# Backend — Security Infrastructure

## Domain

backend

## Plan

`plans/plan-01-auth.md`

## Depends on

- `tasks/plan-01-auth/00-backend-auth-model.md` — `User`, `UserRole`, `UserRepository` must exist

## References

- `specs/backend.md#auth-implementation` — token strategy, cookie config, security rules
- `docs/architecture.md#auth-strategy` — JWT claims, RBAC roles

## Context

Wire the JWT token provider, Spring Security filter chain, and GlobalExceptionHandler. After this task, every authenticated endpoint can extract the caller's role and customer_id from the access token cookie. The SecurityConfig temporarily permits all endpoints (auth endpoints added next in task 02 will enforce their own rules); task 02 replaces the permissive config with the real RBAC rules once all auth endpoints exist.

---

### Inlined spec excerpts

**JWT access token:**
- Signed with HS256 using `JWT_SECRET` env var
- TTL: 15 minutes (`Max-Age=900`)
- Cookie name: `access_token`; path `/`; HttpOnly; Secure; SameSite=Strict
- Claims: `sub` (user UUID string), `role` (admin/company/customer), `customer_id` (UUID string or null)

**Refresh token cookie:**
- Cookie name: `refresh_token`; path `/api/v1/auth/refresh`; HttpOnly; Secure; SameSite=Strict
- TTL: 7 days (`Max-Age=604800`)
- Value: opaque UUID (plaintext in cookie, SHA-256 hash in DB)

**Security rule:** Every authenticated endpoint reads role and customer_id from JWT claims only — no additional DB lookup per request.

**GlobalExceptionHandler typed exceptions:**
```
NotFoundException        → 404, code "not_found"
ForbiddenException       → 403, code from exception
UnauthorizedException    → 401, code from exception (also clears auth cookies)
ConflictException        → 409, code from exception
UnprocessableEntityException → 422, code from exception
MethodArgumentNotValidException → 422, field errors in details map
MaxUploadSizeExceededException → 413, code "file_too_large"
```

**Standard error response shape:**
```json
{
  "error": {
    "code": "snake_case_error_code",
    "message": "Human-readable sentence",
    "details": {}
  }
}
```

---

## Implementation

### 1. Typed exceptions

Create in `com.tetramobile.tetra.shared.exception`:

```java
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}
public class ForbiddenException extends RuntimeException {
    private final String code;
    public ForbiddenException(String code, String message) { super(message); this.code = code; }
    public String getCode() { return code; }
}
public class UnauthorizedException extends RuntimeException {
    private final String code;
    public UnauthorizedException(String code, String message) { super(message); this.code = code; }
    public String getCode() { return code; }
}
public class ConflictException extends RuntimeException {
    private final String code;
    public ConflictException(String code, String message) { super(message); this.code = code; }
    public String getCode() { return code; }
}
public class UnprocessableEntityException extends RuntimeException {
    private final String code;
    public UnprocessableEntityException(String code, String message) { super(message); this.code = code; }
    public String getCode() { return code; }
}
```

### 2. GlobalExceptionHandler

Fill in `com.tetramobile.tetra.shared.exception.GlobalExceptionHandler`:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(404).body(ErrorResponse.of("not_found", ex.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException ex) {
        return ResponseEntity.status(403).body(ErrorResponse.of(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorized(UnauthorizedException ex,
                                                             HttpServletResponse response) {
        clearAuthCookies(response);
        return ResponseEntity.status(401).body(ErrorResponse.of(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex) {
        return ResponseEntity.status(409).body(ErrorResponse.of(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(UnprocessableEntityException.class)
    public ResponseEntity<ErrorResponse> handleUnprocessable(UnprocessableEntityException ex) {
        return ResponseEntity.status(422).body(ErrorResponse.of(ex.getCode(), ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> details = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
            .forEach(e -> details.put(e.getField(), e.getDefaultMessage()));
        return ResponseEntity.status(422)
            .body(ErrorResponse.of("validation_error", "Validation failed", details));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleFileTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.status(413).body(ErrorResponse.of("file_too_large", "File exceeds 10 MB limit"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return ResponseEntity.status(500).body(ErrorResponse.of("internal_server_error", "An unexpected error occurred"));
    }

    private void clearAuthCookies(HttpServletResponse response) {
        Stream.of("access_token", "refresh_token").forEach(name -> {
            Cookie cookie = new Cookie(name, "");
            cookie.setMaxAge(0);
            cookie.setHttpOnly(true);
            cookie.setPath("/");
            response.addCookie(cookie);
        });
    }
}
```

Create `ErrorResponse` record in `shared.exception`:
```java
public record ErrorResponse(ErrorBody error) {
    public record ErrorBody(String code, String message, Map<String, String> details) {}
    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(new ErrorBody(code, message, Map.of()));
    }
    public static ErrorResponse of(String code, String message, Map<String, String> details) {
        return new ErrorResponse(new ErrorBody(code, message, details));
    }
}
```

### 3. JwtTokenProvider

Create `com.tetramobile.tetra.shared.security.JwtTokenProvider`:

```java
@Component
public class JwtTokenProvider {

    private final SecretKey key;

    public JwtTokenProvider(@Value("${jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateAccessToken(UUID userId, UserRole role, UUID customerId) {
        return Jwts.builder()
            .subject(userId.toString())
            .claim("role", role.name())
            .claim("customer_id", customerId != null ? customerId.toString() : null)
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + 900_000L))  // 15 min
            .signWith(key)
            .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    public boolean isValid(String token) {
        try { parseToken(token); return true; }
        catch (JwtException | IllegalArgumentException e) { return false; }
    }
}
```

Add to `application.yml`:
```yaml
jwt:
  secret: ${JWT_SECRET}
```

### 4. AuthenticatedUser value object

Create `com.tetramobile.tetra.shared.security.AuthenticatedUser`:
```java
public record AuthenticatedUser(UUID userId, UserRole role, UUID customerId) {
    public boolean isAdmin() { return role == UserRole.admin; }
    public boolean isCompany() { return role == UserRole.company; }
    public boolean isCustomer() { return role == UserRole.customer; }
}
```

### 5. JWT security filter

Create `com.tetramobile.tetra.shared.security.JwtAuthFilter` extending `OncePerRequestFilter`:

```java
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String token = extractTokenFromCookie(request, "access_token");

        if (token != null && jwtProvider.isValid(token)) {
            Claims claims = jwtProvider.parseToken(token);
            UUID userId = UUID.fromString(claims.getSubject());
            UserRole role = UserRole.valueOf(claims.get("role", String.class));
            String cidStr = claims.get("customer_id", String.class);
            UUID customerId = cidStr != null ? UUID.fromString(cidStr) : null;

            AuthenticatedUser principal = new AuthenticatedUser(userId, role, customerId);
            UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null,
                    List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        chain.doFilter(request, response);
    }

    private String extractTokenFromCookie(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
            .filter(c -> name.equals(c.getName()))
            .map(Cookie::getValue)
            .findFirst().orElse(null);
    }
}
```

### 6. SecurityConfig

Replace the permissive stub in `shared/config/SecurityConfig.java`:

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public
                .requestMatchers("/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
                .requestMatchers("/actuator/health", "/actuator/prometheus").permitAll()
                // Everything else requires authentication — role checks are enforced in service layer
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> {
                    res.setStatus(401);
                    res.setContentType("application/json");
                    res.getWriter().write("{\"error\":{\"code\":\"unauthenticated\",\"message\":\"Authentication required\",\"details\":{}}}");
                })
            );
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
```

### 7. Helper — current user accessor

Create `com.tetramobile.tetra.shared.security.SecurityUtils`:
```java
public class SecurityUtils {
    public static AuthenticatedUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUser user)) {
            throw new UnauthorizedException("unauthenticated", "Authentication required");
        }
        return user;
    }

    public static void requireAdmin() {
        AuthenticatedUser user = currentUser();
        if (!user.isAdmin()) throw new ForbiddenException("forbidden", "Admin access required");
    }

    public static void requireAdminOrCompany() {
        AuthenticatedUser user = currentUser();
        if (user.isCustomer()) throw new ForbiddenException("forbidden", "Access denied");
    }
}
```

### 8. Tests

Write `JwtTokenProviderTest` (unit test):
- `generateAccessToken` produces a token parseable by `parseToken` with correct claims
- `isValid` returns false for a tampered token
- `isValid` returns false for an expired token (set expiry to -1 second via reflection or test override)

Write `GlobalExceptionHandlerIT` (`@WebMvcTest` against a test controller):
- Throwing `NotFoundException` returns 404 with `{"error":{"code":"not_found",...}}`
- Throwing `UnprocessableEntityException("invalid_foo", "...")` returns 422 with `code: "invalid_foo"`

---

## Acceptance criteria

- [ ] `JwtTokenProvider` generates and validates access tokens with correct claims
- [ ] `JwtAuthFilter` populates `SecurityContextHolder` for valid cookie; leaves it empty for missing/invalid cookie
- [ ] `SecurityConfig` blocks unauthenticated requests to `/api/v1/users` with 401 JSON response
- [ ] `GlobalExceptionHandler` maps each exception type to correct HTTP status + error code
- [ ] `./mvnw verify` passes with zero test failures

## Automated checks

```bash
cd api
./mvnw test -Dtest=JwtTokenProviderTest,GlobalExceptionHandlerIT
# Expect: BUILD SUCCESS, 0 failures

./mvnw verify
# Expect: BUILD SUCCESS
```
