# SvaraLens Pro — API Documentation (Phase 1C Secure Pilot)

## Base URL
Local: `http://localhost:8000/api`

## Security, Authentication & Identity Foundation
As of Phase 1C, all domain endpoints require an authenticated session via an HTTP `Authorization` header containing an HMAC-SHA256 Bearer JWT token:
```http
Authorization: Bearer <access_token>
```

### Role-Based Access Control (RBAC) Matrix
SvaraLens Pro enforces four discrete security roles in all backend dependencies:

| Role | Description | Test Case / Run Creation | Finding Confirmation | Capsule Compilation | Regression Approval | User Admin |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **`ADMIN`** | System & organisation administrator | Yes | Yes | Yes | Yes | Yes |
| **`QA_LEAD`** | Senior quality lead | Yes | Yes | Yes | Yes | No |
| **`QA_REVIEWER`** | Quality engineer / reviewer | Yes | Yes | Yes | **No (403)** | No |
| **`AUDITOR`** | Read-only compliance auditor | **No (403)** | **No (403)** | **No (403)** | **No (403)** | No |

### Multi-Tenant Organisation Isolation
Every user belongs to an `Organisation` (`org_id`).
* All domain entities (`Suite`, `TestCase`, `Run`, `Finding`, `Review`, `Capsule`, `RegressionRun`, `AuditEvent`) carry an authoritative `org_id`.
* The backend strictly filters every protected query by `current_user.org_id`.
* Any attempt to access a resource belonging to another organisation returns **`404 Not Found`** (never `403`), preventing resource existence enumeration.
* Client-supplied `org_id` values in request bodies are ignored in favor of the caller's authenticated session.

---

## 1. Authentication & Identity (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user using username and password. Issues a signed JWT access token.
* **Public Endpoint** (no token required).
* **Request:**
```json
{
  "username": "admin",
  "password": "AdminPassword@123!"
}
```
* **Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in_minutes": 480,
  "user": {
    "id": "usr-admin-01",
    "org_id": "org-default",
    "username": "admin",
    "email": "admin@gnani.ai",
    "role": "ADMIN",
    "full_name": "System Administrator",
    "is_active": 1,
    "created_at": "2026-11-10T00:00:00Z",
    "last_login_at": "2026-11-10T10:15:00Z"
  }
}
```

### `POST /api/auth/register`
Provisions a new user account within the caller's organisation.
* **Permission:** `ADMIN` role required.
* **Request:**
```json
{
  "username": "priya_qa",
  "email": "priya@gnani.ai",
  "password": "SecurePassword@123!",
  "role": "QA_REVIEWER",
  "full_name": "Priya Sharma"
}
```
* **Response:** `201 Created` with `UserResponse`.

### `GET /api/auth/me`
Returns profile and role metadata for the currently authenticated caller.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** `UserResponse`

### `POST /api/auth/logout`
Concludes client session; emits an audit event.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** `{"status": "ok", "message": "Successfully logged out."}`

### `POST /api/auth/admin/reset-password`
Administrative override to reset a user's password.
* **Permission:** `ADMIN` role required.
* **Request:**
```json
{
  "target_user_id": "usr-reviewer-01",
  "new_password": "NewSecurePassword@123!"
}
```

### `POST /api/auth/change-password`
Allows an authenticated user to update their own password.
* **Request:**
```json
{
  "current_password": "OldPassword@123!",
  "new_password": "NewSecurePassword@123!"
}
```

### `GET /api/auth/users`
Lists all user accounts belonging to the caller's organisation.
* **Permission:** `ADMIN` role required.

---

## 2. Persistent Audit Trail (`/api/audit`)

### `GET /api/audit`
Retrieves immutable audit log events scoped strictly to the caller's organisation.
* **Permissions:** Accessible to all authenticated roles including `AUDITOR`.
* **Query Parameters:**
  * `resource_type`: Filter by entity type (`TestCase`, `Finding`, `Capsule`, `RegressionRun`, `User`, `Auth`).
  * `action`: Filter by action (e.g. `FINDING_CONFIRMED`, `REGRESSION_APPROVED`, `AUTH_LOGIN`).
  * `actor_id`: Filter by actor user identifier.
  * `limit`: Page size (default 50, max 200).
  * `offset`: Page offset (default 0).
* **Response (200 OK):**
```json
[
  {
    "id": "AUD-9A7B31E24F",
    "org_id": "org-default",
    "actor_id": "usr-lead-01",
    "actor_username": "qalead",
    "actor_role": "QA_LEAD",
    "action": "REGRESSION_APPROVED",
    "resource_type": "Capsule",
    "resource_id": "SL-014",
    "timestamp": "2026-11-10T10:18:14.645038+00:00",
    "details": {
      "regression_run_id": "RR-177BE68E",
      "approved_by": "qalead",
      "verdict": "RESOLVED"
    },
    "ip_address": "127.0.0.1"
  }
]
```

---

## 3. Health & Telemetry

### `GET /api/health`
Returns backend service availability, database connectivity, and Gnani platform status.
* **Unauthenticated:** Accessible for liveness and readiness probes.

---

## 4. Test Case Studio (`/api/cases`)

* **Headers:** `Authorization: Bearer <token>`
* **Mutations:** Blocked for `AUDITOR` role (HTTP 403).

### `GET /api/cases`
Lists test scenarios with optional query parameters (`suite_id`, `search`, `language`, `severity`). Filtered strictly by caller's `org_id`.

### `POST /api/cases`
Creates a new test scenario scoped to `current_user.org_id`.
* Payload:
```json
{
  "suite_id": "suite-insurance-hi",
  "scenario": "Term Life Maturity Notice",
  "language": "hi-IN",
  "reference_text": "आपकी टर्म लाइफ पॉलिसी 15 दिसंबर को मैच्योर हो रही है।",
  "critical_phrases": [
    {"text": "15 दिसंबर", "variants": ["15 december"], "severity": "HIGH"}
  ],
  "voice": "Shivani",
  "tts_model": "timbre-v3.0",
  "channel": "standard",
  "severity": "CRITICAL"
}
```

### `GET /api/cases/{id}`
Retrieves a scenario. Returns `404 Not Found` if scenario does not belong to caller's organisation.

### `PATCH /api/cases/{id}`
Partially updates fields of an existing scenario.

### `POST /api/cases/{id}/duplicate`
Duplicates the scenario under a newly assigned case ID (`TC-XXX`).

### `DELETE /api/cases/{id}`
Safely deletes a scenario.

---

## 5. Speech Generation & Acoustic Analysis (`/api/cases/{id}/runs`)

### `POST /api/cases/{id}/runs/generate`
Executes multi-model synthesis (Gnani Timbre v2.5 or v3.0), dual-ASR transcription (Prisma v2.5 and v3.0), and 6 automated acoustic/lexical QA checks.
* Query parameters:
  * `tts_model`: `timbre-v2.5` | `timbre-v3.0`
  * `tts_voice`: `Shivani` | `Nalini` | `ananya`
  * `injected_fault`: `END_TRUNCATION` | `CLIPPING` | `UNEXPECTED_SILENCE` (for deterministic QA evaluation)

---

## 6. Review Studio & Defect Findings (`/api/findings`)

### `PATCH /api/findings/{id}`
Updates human reviewer findings.
* **Authoritative Identity Enforcement:** The field `reviewed_by` is strictly set from `current_user.username`. Client attempts to forge this field are discarded.
* **Audit Event:** Automatically records `FINDING_CONFIRMED` event.
* **Mutations:** Blocked for `AUDITOR` (HTTP 403).

### `POST /api/findings/{id}/capsule`
Compiles an immutable Voice Defect Capsule from a confirmed finding.
* **Pre-condition:** Finding must be in `HUMAN_CONFIRMED` review state.

---

## 7. Voice Defect Capsules & Regression Engine (`/api/capsules`)

### `GET /api/capsules`
Lists all defect capsules in caller's organisation.

### `GET /api/capsules/{id}`
Retrieves full capsule including immutable SHA-256 digest and frozen assertion spec.

### `GET /api/capsules/{id}/validate`
Cryptographically verifies the failing audio file byte stream against the registered SHA-256 hash.

### `POST /api/capsules/{id}/rerun`
Executes regression verification against candidate replacement audio or freshly synthesised speech. Evaluates assertions via the pure fail-closed engine.
* Returns verdict: `RESOLVED` | `NEEDS_REVIEW` | `STILL_FAILING` | `REGRESSED` | `BLOCKED`.

### `POST /api/capsules/{id}/rerun/{rr_id}/approve`
Signs off and resolves a regression run with verdict `NEEDS_REVIEW`.
* **Permissions:** Strictly requires `QA_LEAD` or `ADMIN` role. Attempt by `QA_REVIEWER` or `AUDITOR` returns **`403 Forbidden`**.
* **Authoritative Identity Enforcement:** `signed_off_by` / `approved_by` is set from `current_user.username`.
* **State Machine:** Transitions capsule state to `RESOLVED`.
* **Audit Event:** Automatically records `REGRESSION_APPROVED` immutable audit event.
