# Backend — Auth Data Model

## Domain

backend

## Plan

`plans/plan-01-auth.md`

## Depends on

None — can start immediately after `tasks/plan-00-bootstrap/00-backend-scaffold.md` is complete.

## References

- `specs/backend.md#auth-data-access` — entity fields, indexes, key queries
- `docs/architecture.md#data-model` — USER and REFRESH_TOKEN table definitions

## Context

Create the JPA entities and Spring Data repositories for `User` and `RefreshToken`. The schema already exists in `V1__initial_schema.sql` from plan-00 — this task only adds the Java data layer (entities + repositories). No business logic. These types are depended on by every subsequent auth task.

---

### Inlined spec excerpts

**User table (already in DB via Flyway):**
```sql
users(
  id UUID PK DEFAULT gen_random_uuid(),
  email VARCHAR NOT NULL,
  password_hash VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  role VARCHAR CHECK (role IN ('admin','company','customer')),
  customer_id UUID nullable,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
)
-- Indexes: UNIQUE on LOWER(email), INDEX on customer_id
```

**RefreshToken table (already in DB via Flyway):**
```sql
refresh_tokens(
  id UUID PK DEFAULT gen_random_uuid(),
  user_id UUID FK users.id,
  token_hash VARCHAR NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
)
-- Indexes: UNIQUE on token_hash, INDEX on user_id
```

**Key queries needed on UserRepository:**
- `findByEmailIgnoreCase(String email)` — login lookup
- `findAll(Pageable)` — admin list
- `findByRole(String role, Pageable)` — admin list with role filter
- `existsByEmailIgnoreCaseAndIdNot(String email, UUID id)` — email uniqueness on update

**Key queries needed on RefreshTokenRepository:**
- `findByTokenHashAndExpiresAtAfter(String hash, Instant now)` — refresh validation
- `deleteByTokenHash(String hash)` — logout / rotation
- `deleteByUserId(UUID userId)` — logout cleanup

---

## Implementation

1. Create `com.tetramobile.tetra.user.model.User`:

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private UserRole role;

    @Column(name = "customer_id")
    private UUID customerId;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // getters + setters (or Lombok @Getter @Setter)
}
```

2. Create `com.tetramobile.tetra.user.model.UserRole` enum: `admin`, `company`, `customer`.

3. Create `com.tetramobile.tetra.user.UserRepository` extending `JpaRepository<User, UUID>`:

```java
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCase(String email);
    Page<User> findByRole(UserRole role, Pageable pageable);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, UUID id);
    boolean existsByEmailIgnoreCase(String email);
}
```

4. Create `com.tetramobile.tetra.auth.model.RefreshToken`:

```java
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // getters + setters
}
```

5. Create `com.tetramobile.tetra.auth.RefreshTokenRepository` extending `JpaRepository<RefreshToken, UUID>`:

```java
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {
    Optional<RefreshToken> findByTokenHashAndExpiresAtAfter(String tokenHash, Instant now);
    void deleteByTokenHash(String tokenHash);
    void deleteByUserId(UUID userId);
}
```

6. Create `com.tetramobile.tetra.user.dto.UserSummaryResponse`:

```java
public record UserSummaryResponse(
    UUID id,
    String email,
    String name,
    UserRole role,
    UUID customerId,
    boolean isActive,
    Instant createdAt
) {}
```

Add a static factory `UserSummaryResponse.from(User user)`.

7. Write a `@DataJpaTest` integration test `UserRepositoryIT` that:
   - Saves a `User` with role `customer`
   - Asserts `findByEmailIgnoreCase` finds it regardless of email case
   - Asserts `existsByEmailIgnoreCase` returns true for that email

8. Write a `@DataJpaTest` test `RefreshTokenRepositoryIT` that:
   - Saves a `RefreshToken` with `expiresAt` = now + 7 days
   - Asserts `findByTokenHashAndExpiresAtAfter` returns it when `now` is current
   - Saves one with `expiresAt` = now - 1 second; asserts it is NOT returned

---

## Acceptance criteria

- [ ] `User` entity maps to `users` table — `@DataJpaTest` can persist and retrieve a user
- [ ] `RefreshToken` entity maps to `refresh_tokens` table — `@DataJpaTest` can persist and retrieve a token
- [ ] `findByEmailIgnoreCase("ADMIN@tetramobile.ae")` returns the seeded admin user
- [ ] `findByTokenHashAndExpiresAtAfter` does not return expired tokens
- [ ] `./mvnw verify` passes with zero test failures

## Automated checks

```bash
cd api
./mvnw test -pl . -Dtest=UserRepositoryIT,RefreshTokenRepositoryIT
# Expect: BUILD SUCCESS, 0 failures
```
