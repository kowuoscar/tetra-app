# Backend Scaffold

## Domain

backend

## Plan

`plans/plan-00-bootstrap.md`

## Depends on

None — can start immediately.

## References

- `specs/backend.md` — full service and data layer spec
- `docs/architecture.md` — data model and key technical decisions
- `specs/infrastructure.md#local-development` — Docker Compose environment

## Context

Scaffold the Spring Boot 3 / Java 21 backend project with the complete feature package structure, configure PostgreSQL + Flyway, write the initial schema migration containing all tables, and provide a Docker Compose file for local development. No business logic — only the skeleton that every subsequent backend task builds on. The project must be runnable with `./mvnw spring-boot:run` locally (with Docker Compose running) and must pass `mvn verify` with no test failures.

---

### Inlined spec excerpts

**Package root:** `com.tetramobile.tetra`

**Feature packages to create (empty — stubs only):**

```
com.tetramobile.tetra/
  auth/
  user/
  customer/
  phone/
  simcard/
  request/
  invoice/
  dashboard/
  settings/
  shared/
    config/
    exception/
    security/
    storage/
    whatsapp/
    util/
```

Each feature package gets a placeholder `package-info.java` — no real classes yet. The `shared/exception/` package gets a `GlobalExceptionHandler.java` stub (class + `@RestControllerAdvice` annotation, no handler methods yet). The `shared/config/` package gets a `SecurityConfig.java` stub (permit all for now — auth security wired in plan-01).

**Maven dependencies (pom.xml):**

```xml
<!-- Spring Boot parent -->
<parent>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-parent</artifactId>
  <version>3.3.5</version>
</parent>

<!-- Core -->
<dependency>spring-boot-starter-web</dependency>
<dependency>spring-boot-starter-data-jpa</dependency>
<dependency>spring-boot-starter-actuator</dependency>
<dependency>spring-boot-starter-validation</dependency>
<dependency>spring-boot-starter-security</dependency>

<!-- Database -->
<dependency>org.postgresql:postgresql</dependency>
<dependency>org.flywaydb:flyway-core</dependency>
<dependency>org.flywaydb:flyway-database-postgresql</dependency>

<!-- jOOQ -->
<dependency>org.springframework.boot:spring-boot-starter-jooq</dependency>
<dependency>org.jooq:jooq</dependency>

<!-- JWT -->
<dependency>io.jsonwebtoken:jjwt-api:0.12.6</dependency>
<dependency>io.jsonwebtoken:jjwt-impl:0.12.6</dependency>
<dependency>io.jsonwebtoken:jjwt-jackson:0.12.6</dependency>

<!-- MinIO / S3 -->
<dependency>software.amazon.awssdk:s3</dependency>

<!-- PDF -->
<dependency>com.github.librepdf:openpdf:2.0.3</dependency>
<dependency>org.springframework.boot:spring-boot-starter-thymeleaf</dependency>

<!-- Test -->
<dependency>spring-boot-starter-test</dependency>
<dependency>org.testcontainers:postgresql:1.20.1</dependency>
<dependency>org.testcontainers:junit-jupiter:1.20.1</dependency>
```

**application.yml (src/main/resources):**

```yaml
spring:
  application:
    name: tetra-api
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/tetra}
    username: ${SPRING_DATASOURCE_USERNAME:tetra}
    password: ${SPRING_DATASOURCE_PASSWORD:tetra}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration
  profiles:
    active: ${SPRING_PROFILES_ACTIVE:local}

management:
  endpoints:
    web:
      exposure:
        include: health,prometheus
  endpoint:
    health:
      show-details: always

server:
  port: 8080

jvm:
  options: "-XX:MaxRAMPercentage=75.0"
```

**application-local.yml (src/main/resources):**

```yaml
logging:
  level:
    com.tetramobile.tetra: DEBUG
```

**Initial Flyway migration — `V1__initial_schema.sql`**

Location: `src/main/resources/db/migration/V1__initial_schema.sql`

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Sequences
CREATE SEQUENCE invoice_number_seq START 1 INCREMENT 1;

-- Users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR NOT NULL,
    password_hash   VARCHAR NOT NULL,
    name            VARCHAR NOT NULL,
    role            VARCHAR NOT NULL CHECK (role IN ('admin','company','customer')),
    customer_id     UUID,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX users_email_idx ON users (LOWER(email));
CREATE INDEX users_customer_id_idx ON users (customer_id);

-- Customers
CREATE TABLE customers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                VARCHAR NOT NULL,
    contact_info        VARCHAR,
    whatsapp_group_id   VARCHAR,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX customers_name_idx ON customers (name);

-- Phones
CREATE TABLE phones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model       VARCHAR NOT NULL,
    ownership   VARCHAR NOT NULL CHECK (ownership IN ('customer','company')),
    customer_id UUID NOT NULL REFERENCES customers(id),
    status      VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active','in_repair','replaced')),
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX phones_customer_id_idx ON phones (customer_id);
CREATE INDEX phones_customer_id_status_idx ON phones (customer_id, status);

-- SIM cards
CREATE TABLE sim_cards (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type              VARCHAR NOT NULL CHECK (type IN ('prepaid','postpaid')),
    base_monthly_fee  NUMERIC(10,2) NOT NULL,
    customer_id       UUID NOT NULL REFERENCES customers(id),
    phone_id          UUID REFERENCES phones(id),
    status            VARCHAR NOT NULL DEFAULT 'active' CHECK (status IN ('active','unassigned','cancelled')),
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX sim_cards_customer_id_idx ON sim_cards (customer_id);
CREATE INDEX sim_cards_phone_id_idx ON sim_cards (phone_id);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id),
    token_hash  VARCHAR NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX refresh_tokens_token_hash_idx ON refresh_tokens (token_hash);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);

-- Requests
CREATE TABLE requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        VARCHAR NOT NULL CHECK (type IN ('phone_repair','phone_replacement','sim_topup','new_sim','manual_support','onboarding')),
    status      VARCHAR NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','in_progress','done')),
    customer_id UUID NOT NULL REFERENCES customers(id),
    phone_id    UUID REFERENCES phones(id),
    sim_card_id UUID REFERENCES sim_cards(id),
    author      VARCHAR NOT NULL CHECK (author IN ('customer','company')),
    fee         NUMERIC(10,2),
    notes       TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    done_at     TIMESTAMP
);
CREATE INDEX requests_customer_id_idx ON requests (customer_id);
CREATE INDEX requests_status_idx ON requests (status);
CREATE INDEX requests_customer_id_status_idx ON requests (customer_id, status);
CREATE INDEX requests_done_at_idx ON requests (done_at);

-- Request parts
CREATE TABLE request_parts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id  UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    description VARCHAR NOT NULL,
    cost        NUMERIC(10,2) NOT NULL
);
CREATE INDEX request_parts_request_id_idx ON request_parts (request_id);

-- Attachments
CREATE TABLE attachments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id          UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    storage_key         VARCHAR NOT NULL,
    uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX attachments_request_id_idx ON attachments (request_id);

-- Invoices
CREATE TABLE invoices (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number              INT NOT NULL DEFAULT nextval('invoice_number_seq'),
    period_month                INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year                 INT NOT NULL,
    support_fees                NUMERIC(10,2) NOT NULL DEFAULT 0,
    support_expenses            NUMERIC(10,2) NOT NULL DEFAULT 0,
    rolling_advance_current     NUMERIC(10,2) NOT NULL DEFAULT 0,
    rolling_advance_previous    NUMERIC(10,2) NOT NULL DEFAULT 0,
    previous_balance            NUMERIC(10,2) NOT NULL DEFAULT 0,
    taxes                       NUMERIC(10,2) NOT NULL DEFAULT 0,
    total                       NUMERIC(10,2) NOT NULL DEFAULT 0,
    status                      VARCHAR NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','paid')),
    pdf_storage_key             VARCHAR,
    created_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX invoices_period_idx ON invoices (period_year, period_month);
CREATE INDEX invoices_status_idx ON invoices (status);

-- SIM monthly billing
CREATE TABLE sim_monthly_billing (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sim_card_id     UUID NOT NULL REFERENCES sim_cards(id),
    period_month    INT NOT NULL CHECK (period_month BETWEEN 1 AND 12),
    period_year     INT NOT NULL,
    actual_amount   NUMERIC(10,2) NOT NULL
);
CREATE UNIQUE INDEX sim_monthly_billing_period_idx ON sim_monthly_billing (sim_card_id, period_month, period_year);

-- System settings (single row)
CREATE TABLE system_settings (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_holder         VARCHAR,
    bank_iban                   VARCHAR,
    bank_swift                  VARCHAR,
    company_name                VARCHAR,
    company_address             VARCHAR,
    company_whatsapp_group_id   VARCHAR
);

-- Admin seed (initial superuser — change password after first login)
INSERT INTO users (email, password_hash, name, role, is_active)
VALUES (
    'admin@tetramobile.ae',
    '$2a$12$placeholder_bcrypt_hash_replace_before_production',
    'Oscar',
    'admin',
    true
);
```

**Docker Compose — `docker-compose.yml` (project root):**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: tetra
      POSTGRES_USER: tetra
      POSTGRES_PASSWORD: tetra
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  api:
    build:
      context: ./api
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      SPRING_PROFILES_ACTIVE: local
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/tetra
      SPRING_DATASOURCE_USERNAME: tetra
      SPRING_DATASOURCE_PASSWORD: tetra
      JWT_SECRET: local-dev-secret-not-for-production
      MINIO_ENDPOINT: http://minio:9000
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
      MINIO_BUCKET: tetra-local-attachments
    depends_on:
      - postgres
      - minio

  web:
    build:
      context: ./web
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:8080
    depends_on:
      - api

volumes:
  postgres_data:
  minio_data:
```

**Monorepo layout:**

```
tetra-app/                  ← project root (this repo)
  api/                      ← Spring Boot project
    src/
    pom.xml
    Dockerfile
  web/                      ← Next.js project (created in task 01)
    src/
    package.json
    Dockerfile
  docker-compose.yml
  .github/
    workflows/              ← created in task 03
```

**api/Dockerfile:**

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw dependency:go-offline -q
COPY src/ src/
RUN ./mvnw package -DskipTests -q

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]
```

**Health check endpoint:**

`GET /actuator/health` is provided automatically by `spring-boot-starter-actuator`. No additional code needed — just confirm it is exposed in `management.endpoints.web.exposure.include`.

---

## Implementation

1. Create `api/` directory under project root. Generate Spring Boot project using Spring Initializr or Maven archetype with group `com.tetramobile` and artifact `tetra`. Java 21, packaging `jar`.
2. Replace generated `pom.xml` with the dependencies listed above. Ensure AWS SDK BOM is added for S3 dependency version management: `software.amazon.awssdk:bom:2.27.0` as import scope BOM.
3. Create the package directory tree under `src/main/java/com/tetramobile/tetra/` with `package-info.java` files. Create `GlobalExceptionHandler.java` in `shared/exception/` with `@RestControllerAdvice` and empty body. Create `SecurityConfig.java` in `shared/config/` with `@Configuration` + `@EnableWebSecurity` and a bean that permits all requests (temporary until plan-01 wires auth).
4. Create `src/main/resources/application.yml` with the config shown above.
5. Create `src/main/resources/application-local.yml` with DEBUG log level for the project package.
6. Create `src/main/resources/db/migration/V1__initial_schema.sql` with the full schema shown above. Replace the admin seed bcrypt hash with a real hash for `Admin1234!` using `BCrypt.hashpw("Admin1234!", BCrypt.gensalt(12))` — run this as a one-off in a test or main method.
7. Create `src/test/java/com/tetramobile/tetra/HealthCheckIT.java` — a `@SpringBootTest` integration test using Testcontainers PostgreSQL that starts the app and calls `/actuator/health`, asserts 200 and `{"status":"UP"}`. This is the only test for this task.
8. Create `api/Dockerfile` as shown above.
9. Create `docker-compose.yml` in the project root as shown above.
10. Run `./mvnw verify` — confirm all tests pass including `HealthCheckIT`.
11. Run `docker compose up -d postgres minio` then `./mvnw spring-boot:run` — confirm `curl http://localhost:8080/actuator/health` returns `{"status":"UP"}`.

---

## Acceptance criteria

- [ ] `./mvnw verify` passes with zero test failures
- [ ] `HealthCheckIT` passes — app connects to Testcontainers PostgreSQL and `/actuator/health` returns 200
- [ ] All tables in `V1__initial_schema.sql` are created without error when Flyway runs against a fresh PostgreSQL instance
- [ ] `docker compose up` starts postgres + minio + api; `curl localhost:8080/actuator/health` returns `{"status":"UP"}`
- [ ] Package structure matches the feature layout from `specs/backend.md`
- [ ] `pom.xml` includes all required dependencies

## Automated checks

```bash
cd api
./mvnw verify
# Expect: BUILD SUCCESS, 0 failures

# Integration smoke
docker compose up -d postgres minio
./mvnw spring-boot:run &
sleep 20
curl -f http://localhost:8080/actuator/health
# Expect: {"status":"UP",...}
```
