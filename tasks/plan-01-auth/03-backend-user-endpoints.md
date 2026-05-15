# Backend — User Management Endpoints

## Domain

backend

## Plan

`plans/plan-01-auth.md`

## Depends on

- `tasks/plan-01-auth/01-backend-security-infra.md` — `SecurityUtils`, `PasswordEncoder`, typed exceptions must exist

## References

- `specs/backend.md#user-rules` — business logic: email uniqueness, customer_id validation, soft delete
- `docs/contracts.md#get-users` through `DELETE /users/{id}` — full contract specs

## Context

Implement the four admin-only user management endpoints. These are needed immediately after auth to onboard company and customer users. Only admin role can call these — `SecurityUtils.requireAdmin()` enforces this at the service layer. Parallel with task 02 since they share the User entity and UserRepository but touch different controllers and services.

---

### Inlined spec excerpts

**GET /users**
```
Auth: admin only
Query: page (default 0), size (default 20, max 100), role (optional filter)
Response 200: PagedResponse<UserSummary>
Errors: 401 unauthenticated, 403 forbidden
```

**POST /users**
```
Auth: admin only
Request: { email: string, name: string, password: string (min 8), role: "company"|"customer", customer_id?: uuid }
Response 201: UserSummary
Errors:
  401 unauthenticated
  403 forbidden
  409 email_already_in_use
  422 customer_id_required  — role=customer but customer_id missing
  422 customer_not_found    — customer_id does not exist
```

**PATCH /users/{id}**
```
Auth: admin only
Request: { name?: string, email?: string, password?: string (min 8) }
Response 200: UserSummary
Errors:
  401 unauthenticated
  403 forbidden
  404 not_found
  409 email_already_in_use  — email taken by another user
```

**DELETE /users/{id}**
```
Auth: admin only
Path: id (UUID)
Response 204: no content
Errors:
  401 unauthenticated
  403 forbidden
  404 not_found
  422 cannot_deactivate_self — admin trying to deactivate their own account
```

**Business rules (inlined from specs/backend.md):**
- Email must be unique case-insensitively across all users. On create AND update: if email already taken by another user, throw `ConflictException("email_already_in_use", ...)`.
- When `role = customer`, `customer_id` is required. If absent → `UnprocessableEntityException("customer_id_required", ...)`. If provided but customer doesn't exist → `UnprocessableEntityException("customer_not_found", ...)`.
- When `role = company` or `role = admin`, `customer_id` must be null (ignore it if provided — do not error).
- `POST /users` cannot create `role = admin` — reject with 422 `invalid_role` (admin only seeded).
- `DELETE /users/{id}` is soft delete: set `is_active = false`. Does NOT delete the row. If caller's `userId == path id` → `UnprocessableEntityException("cannot_deactivate_self", ...)`.
- `PATCH /users/{id}` is partial — only update fields present in the request body.

---

## Implementation

### 1. UserService + UserServiceImpl

Create `com.tetramobile.tetra.user.UserService` interface:
```java
public interface UserService {
    Page<UserSummaryResponse> listUsers(UserRole roleFilter, Pageable pageable);
    UserSummaryResponse createUser(CreateUserRequest request);
    UserSummaryResponse updateUser(UUID id, UpdateUserRequest request);
    void deactivateUser(UUID id, UUID callerUserId);
}
```

Implement in `UserServiceImpl`. Key logic:

**createUser:**
```java
SecurityUtils.requireAdmin();
if (request.role() == UserRole.admin) throw new UnprocessableEntityException("invalid_role", "Cannot create admin via API");
if (userRepository.existsByEmailIgnoreCase(request.email()))
    throw new ConflictException("email_already_in_use", "Email address is already in use");
if (request.role() == UserRole.customer) {
    if (request.customerId() == null)
        throw new UnprocessableEntityException("customer_id_required", "customer_id is required for customer role");
    if (!customerRepository.existsById(request.customerId()))
        throw new UnprocessableEntityException("customer_not_found", "Customer not found");
}
User user = new User();
user.setEmail(request.email().toLowerCase());
user.setName(request.name());
user.setPasswordHash(passwordEncoder.encode(request.password()));
user.setRole(request.role());
user.setCustomerId(request.role() == UserRole.customer ? request.customerId() : null);
return UserSummaryResponse.from(userRepository.save(user));
```

**updateUser:**
```java
SecurityUtils.requireAdmin();
User user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
if (request.email() != null) {
    if (userRepository.existsByEmailIgnoreCaseAndIdNot(request.email(), id))
        throw new ConflictException("email_already_in_use", "Email address is already in use");
    user.setEmail(request.email().toLowerCase());
}
if (request.name() != null) user.setName(request.name());
if (request.password() != null) user.setPasswordHash(passwordEncoder.encode(request.password()));
return UserSummaryResponse.from(userRepository.save(user));
```

**deactivateUser:**
```java
SecurityUtils.requireAdmin();
if (id.equals(callerUserId))
    throw new UnprocessableEntityException("cannot_deactivate_self", "Cannot deactivate your own account");
User user = userRepository.findById(id).orElseThrow(() -> new NotFoundException("User not found"));
user.setActive(false);
userRepository.save(user);
```

### 2. UserController

Create `com.tetramobile.tetra.user.UserController`:

```java
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<PagedResponse<UserSummaryResponse>> list(
            @RequestParam(required = false) UserRole role,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") @Max(100) int size) {
        SecurityUtils.requireAdmin();
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<UserSummaryResponse> result = userService.listUsers(role, pageable);
        return ResponseEntity.ok(PagedResponse.from(result));
    }

    @PostMapping
    public ResponseEntity<UserSummaryResponse> create(@Valid @RequestBody CreateUserRequest request) {
        return ResponseEntity.status(201).body(userService.createUser(request));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<UserSummaryResponse> update(@PathVariable UUID id,
                                                       @Valid @RequestBody UpdateUserRequest request) {
        return ResponseEntity.ok(userService.updateUser(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable UUID id) {
        AuthenticatedUser caller = SecurityUtils.currentUser();
        userService.deactivateUser(id, caller.userId());
        return ResponseEntity.noContent().build();
    }
}
```

Create DTOs:
- `CreateUserRequest` record: `email`, `name`, `password`, `role`, `customerId` — with `@NotBlank`/`@Email`/`@Size(min=8)` validations
- `UpdateUserRequest` record: `name`, `email`, `password` — all optional, add `@Size(min=8)` on password when present
- `PagedResponse<T>` wrapper in `shared.dto` (used across all paginated endpoints):
  ```java
  public record PagedResponse<T>(List<T> content, long totalElements, int totalPages, int page, int size) {
      public static <T> PagedResponse<T> from(Page<T> page) {
          return new PagedResponse<>(page.getContent(), page.getTotalElements(),
              page.getTotalPages(), page.getNumber(), page.getSize());
      }
  }
  ```

Add `CustomerRepository` minimal interface in `com.tetramobile.tetra.customer` (empty extending `JpaRepository<Customer, UUID>`) plus a `Customer` entity placeholder with just `id` field — sufficient for `existsById` check. Full Customer entity wired in plan-02.

### 3. Integration tests

Write `UserControllerIT` using `@SpringBootTest` + Testcontainers + MockMvc with admin JWT cookie:

- `GET /users` without auth → 401
- `GET /users` with customer JWT → 403
- `GET /users` with admin JWT → 200, paginated list
- `POST /users` creates company user → 201, returns UserSummary
- `POST /users` with duplicate email → 409 `email_already_in_use`
- `POST /users` with `role=customer` and no `customer_id` → 422 `customer_id_required`
- `DELETE /users/{adminId}` with admin JWT → 422 `cannot_deactivate_self`
- `PATCH /users/{id}` updates name → 200, name changed

---

## Acceptance criteria

- [ ] `GET /users` returns paginated user list for admin; rejects company/customer with 403
- [ ] `POST /users` creates user with bcrypt-hashed password; email uniqueness enforced
- [ ] `POST /users` with `role=customer` and missing `customer_id` returns 422
- [ ] `DELETE /users/{id}` soft-deletes — sets `is_active=false`; user can no longer log in
- [ ] Admin cannot deactivate own account — 422 `cannot_deactivate_self`
- [ ] `./mvnw verify` passes with zero test failures

## Automated checks

```bash
cd api
./mvnw test -Dtest=UserControllerIT
# Expect: BUILD SUCCESS, 0 failures

./mvnw verify
# Expect: BUILD SUCCESS
```
