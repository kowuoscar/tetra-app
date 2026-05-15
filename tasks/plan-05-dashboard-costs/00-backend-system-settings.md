# Backend — SystemSettings Entity + /settings Endpoint

## Domain

backend

## Plan

`plans/plan-05-dashboard-costs.md`

## Depends on

- `tasks/plan-00-bootstrap/00-backend-scaffold.md` — Flyway V1 schema has `system_settings` table

## References

- `docs/contracts.md` — SystemSettings type, GET /settings, PUT /settings
- `specs/backend.md#system-settings-rules`

## Context

Single-row config table. Fields are bank details used on generated invoice PDFs. Admin reads and updates via `GET /settings` + `PUT /settings` (full replace). The WhatsApp group ID is a **per-customer** field — already on the `customers` table. System settings are company-wide bank/payment details only.

---

### Inlined spec excerpts

**SystemSettings type (contracts.md):**
```
bank_account_holder: string   ← e.g. "Oscar Doe"
bank_iban:           string   ← e.g. "AE070331234567890123456"
bank_swift:          string   ← e.g. "WIOBAEADXXX"
company_name:        string   ← invoice recipient name (Tetra Mobile Solutions FZ-LLC)
company_address:     string   ← invoice recipient address
```

**GET /settings:** admin only → 200 SystemSettings

**PUT /settings:** admin only, full replace → 200 SystemSettings

---

## Implementation

### 1. Flyway migration check

V1 must have:
```sql
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
    bank_account_holder VARCHAR(255),
    bank_iban VARCHAR(50),
    bank_swift VARCHAR(20),
    company_name VARCHAR(255),
    company_address TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO system_settings (id, company_name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tetra Mobile Solutions FZ-LLC')
ON CONFLICT (id) DO NOTHING;
```

If V1 had different columns (e.g., `company_whatsapp_group_id`), create the next-version migration to fix it.

### 2. SystemSettings entity

`com.tetramobile.tetra.settings.SystemSettings`:
```java
@Entity
@Table(name = "system_settings")
@Getter @Setter
public class SystemSettings {

    private static final UUID SINGLETON_ID =
        UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Id
    private UUID id = SINGLETON_ID;

    @Column(name = "bank_account_holder", length = 255)
    private String bankAccountHolder;

    @Column(name = "bank_iban", length = 50)
    private String bankIban;

    @Column(name = "bank_swift", length = 20)
    private String bankSwift;

    @Column(name = "company_name", length = 255)
    private String companyName;

    @Column(name = "company_address", columnDefinition = "TEXT")
    private String companyAddress;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public static UUID singletonId() { return SINGLETON_ID; }
}
```

### 3. SystemSettingsRepository

```java
public interface SystemSettingsRepository extends JpaRepository<SystemSettings, UUID> {}
```

### 4. DTOs

```java
public record SystemSettingsResponse(
    String bankAccountHolder,
    String bankIban,
    String bankSwift,
    String companyName,
    String companyAddress
) {}

// PUT replaces all fields — all required
public record ReplaceSystemSettingsRequest(
    @NotBlank String bankAccountHolder,
    @NotBlank String bankIban,
    @NotBlank String bankSwift,
    @NotBlank String companyName,
    @NotBlank String companyAddress
) {}
```

### 5. SystemSettingsService

```java
public interface SystemSettingsService {
    SystemSettingsResponse getSettings();
    SystemSettingsResponse replaceSettings(ReplaceSystemSettingsRequest body);
    SystemSettings load();  // used by InvoicePdfService
}
```

```java
@Service
@RequiredArgsConstructor
@Transactional
public class SystemSettingsServiceImpl implements SystemSettingsService {

    private final SystemSettingsRepository repository;

    @Override
    @Transactional(readOnly = true)
    public SystemSettingsResponse getSettings() {
        return toResponse(load());
    }

    @Override
    public SystemSettingsResponse replaceSettings(ReplaceSystemSettingsRequest body) {
        SystemSettings s = load();
        s.setBankAccountHolder(body.bankAccountHolder());
        s.setBankIban(body.bankIban());
        s.setBankSwift(body.bankSwift());
        s.setCompanyName(body.companyName());
        s.setCompanyAddress(body.companyAddress());
        return toResponse(repository.save(s));
    }

    @Override
    @Transactional(readOnly = true)
    public SystemSettings load() {
        return repository.findById(SystemSettings.singletonId())
            .orElseThrow(() -> new IllegalStateException("system_settings row missing"));
    }

    private SystemSettingsResponse toResponse(SystemSettings s) {
        return new SystemSettingsResponse(
            s.getBankAccountHolder(), s.getBankIban(), s.getBankSwift(),
            s.getCompanyName(), s.getCompanyAddress()
        );
    }
}
```

### 6. SystemSettingsController

Note: contract uses `/settings` (not `/system-settings`).

```java
@RestController
@RequestMapping("/api/v1/settings")
@RequiredArgsConstructor
public class SystemSettingsController {

    private final SystemSettingsService settingsService;

    @GetMapping
    public ResponseEntity<SystemSettingsResponse> get() {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping  // ← PUT not PATCH (full replace per contract)
    public ResponseEntity<SystemSettingsResponse> replace(
            @RequestBody @Valid ReplaceSystemSettingsRequest body) {
        SecurityUtils.requireAdmin();
        return ResponseEntity.ok(settingsService.replaceSettings(body));
    }
}
```

---

## Integration test

`SystemSettingsIT`:
- `GET /settings` as admin → 200, all fields returned
- `PUT /settings` with all fields → 200, persisted
- `GET /settings` again → returns updated values
- Non-admin → 403
- `PUT /settings` with missing required field → 400

---

## Acceptance criteria

- [ ] `GET /settings` returns bank details (not WhatsApp config)
- [ ] `PUT /settings` replaces all fields; partial body → 400 (all required)
- [ ] Non-admin → 403
- [ ] `SystemSettingsService.load()` available for injection into `InvoicePdfService`
- [ ] `./mvnw test -Dtest=SystemSettingsIT` passes

## Automated checks

```bash
cd api
./mvnw test -Dtest=SystemSettingsIT
./mvnw verify
```
