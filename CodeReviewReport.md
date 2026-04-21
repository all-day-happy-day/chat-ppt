# ChatPPT — Code Review Report

**Scope:** Repository snapshot review (`api/` FastAPI backend, `console/` Vite + React frontend).
**Focus:** Stability, resources, structure, backend/frontend responsibilities, security, maintainability, and operational readiness.

---

## Executive summary

The project shows a deliberate **hexagonal / layered layout** on the backend (domain → application/use cases → infrastructure → HTTP adapters) and a **typed React** client with a small API layer and route-based UI. Strengths include clear module boundaries for bounded contexts (auth, project, powerpoint, song, bible, user), Pydantic models for requests/responses, and Alembic migrations.

Critical gaps: **no automated tests or CI** surfaced in the repo; **authorization is not consistently enforced** on core business APIs (project/powerpoint flows accept client-supplied `user_id` without binding to the session); **PPTX export’s concrete presentation service is an unimplemented stub**, which blocks or breaks that feature; several **dependency and configuration** issues (unused packages, possible typo in an extra, hard-coded SMTP). These should be addressed before treating the system as production-ready.

---

## 1. Repository structure

| Area             | Role                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------ |
| `api/`           | Python 3.13+ service: FastAPI, SQLAlchemy 2, Alembic, JWT/cookie auth, PPTX handling |
| `console/`       | SPA: React 19, React Router 7, Vite 8, Tailwind 4                                    |
| Root `README.md` | Minimal; onboarding is largely implicit                                              |

**Observation:** Backend and frontend are cleanly separated by deployable units. Shared contract is implied via HTTP and `console/api-docs.json` (OpenAPI artifact), not a generated client library—acceptable, but sync drift is a risk.

---

## 2. Backend / frontend role division

**Backend owns:** persistence, auth token issuance/verification, business rules (project lifecycle, templates, lyrics scraping, bible text resolution), file paths for uploaded PPTX templates, and export orchestration.

**Frontend owns:** routing and UX, calling REST endpoints with `credentials: "include"` for cookies, mapping HTTP errors to user-facing strings (`lib/*-error-message.ts`), and lightweight response validation in the API modules.

**Gap:** Sensitive operations should derive **identity from the authenticated session** (cookie/JWT), not from request body fields such as `user_id`, except where an admin explicitly acts on behalf of another user (with explicit authorization). Today, `CreateProjectRequest` includes `user_id` supplied by the client, which is a **privilege escalation / IDOR** class of issue unless mitigated elsewhere (it is not visible in the project/powerpoint routers).

---

## 3. Architecture and modularity (backend)

**Strengths**

- **Use cases** wired through FastAPI `Depends` in `app/di/application/usecase.py`, keeping handlers thin.
- **Domain exceptions** mapped to HTTP status in routers (consistent pattern).
- **Repositories** behind interfaces in domain layers supports testing (in principle).

**Risks**

- **Typo in package path:** `app/song/infrastructure/respository/` (“respository”) increases friction for navigation and tooling.
- **Naming:** e.g. `get_bibile_phrases` in the bible router—small quality issues that add noise in logs and OpenAPI.

---

## 4. Stability and correctness

| Topic                      | Assessment                                                                                                                                                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PPTX export**            | `PPTXPresentationService` is a stub (`class PPTXPresentationService(PresentationService): ...`) with **no `create_and_save` implementation**. The domain `PresentationService` defines an abstract method; this subclass does not implement it, so instantiation should fail under normal ABC rules, and export cannot work as written. |
| **Validation**             | Global handlers for `RequestValidationError` and Pydantic `CoreValidationError` in `app/main.py` provide structured error payloads.                                                                                                                                                                                                     |
| **External HTML scraping** | `BugsLyricsFetcherService` uses `requests` + BeautifulSoup with `assert` on DOM shape. Assertions can be stripped with `python -O`, and the scraper is inherently brittle if the remote site changes.                                                                                                                                   |
| **Email**                  | `EmailNotifier` uses synchronous `SMTP_SSL` to Gmail—acceptable for low volume but can block request workers if invoked inline (signup uses `BackgroundTasks`, which is better than inline).                                                                                                                                            |

---

## 5. Security

**High priority**

1. **Authorization model:** Project and PowerPoint routers do not use `get_current_user` (only the user router does). Combined with client-supplied `user_id` on create operations, the API surface is vulnerable to **cross-user data access and spoofing** unless all use cases enforce ownership internally (not verified in this review for every path).
2. **Cookies:** `set_cookie` for auth tokens does not set `secure=True` or `samesite` in the auth router. For production HTTPS, **Secure** and an explicit **SameSite** policy are important; **HttpOnly** is already set (good).
3. **Token lifetime:** Defaults in the auth router read multi-year lifetimes from `AUTH_TOKEN_LIFE_DAY` (thousands of days if mis-set). Refresh/access durations should be **policy-driven**, short-lived access tokens, and documented.

**Medium priority**

4. **CORS** is limited to localhost origins—fine for dev; production needs configuration via environment.
5. **`pyproject.toml`:** `python-jose[cyptography]` likely intends **`cryptography`**; the typo may omit the intended extra.
6. **Secrets in config:** Email password and JWT secret are env-based (good); ensure `.env` never ships to VCS (verify `.gitignore` in deployment).

---

## 6. Resources (CPU, memory, I/O, database)

- **SQLAlchemy engine** (`core/db/db.py`): `pool_size` and `max_overflow` come from `DBConfig`—appropriate knobs for concurrency; ensure values match deployment size.
- **File storage:** `LocalDiskTemplateFileService` writes under `PPT_UPLOAD_DIRECTORY` per user ULID—plan for **disk quotas**, antivirus scanning if uploads are user-controlled, and **backup** strategy.
- **Blocking I/O:** Lyrics fetch and SMTP are synchronous; under load, consider timeouts, retries, and moving heavy work to a queue if latency or reliability becomes an issue.
- **Dependency bloat:** `pyproject.toml` lists **MySQL drivers** (`mysqlclient`, `pymysql`) while `core/db/config.py` builds a **PostgreSQL** URL—unused drivers increase install size and attack surface; `httpx` appears unused; `docker` appears unused in Python sources—candidates for removal or documentation.

---

## 7. Frontend structure and quality

**Strengths**

- **TypeScript** with ESLint (recommended + React hooks + refresh).
- **API helpers** validate minimal response shapes before use (`auth.ts` pattern).
- **Routing** is explicit in `App.tsx`; `AppRoot` handles initial session probe—clear separation between “marketing/home” and authenticated app areas.

**Observations**

- **Dual navigation model:** `AppRoot` uses local screen state while other flows use React Router—works but can confuse contributors; document when to add a route vs. a screen toggle.
- **Environment:** `VITE_API_BASE_URL` drives API origin; empty string implies same-origin—document required env for each environment.

---

## 8. Testing, CI, and quality gates

- **No test suite** (`pytest`, `vitest`, etc.) was found in the tree at review time.
- **No GitHub Actions** (or similar) workflows were present—no automated lint/test on PRs.
- **Ruff** (`api/ruff.toml`) selects `E`, `F`, `I` only—good baseline; **type checking** is not part of Ruff by default—consider `mypy` or `pyright` for the API.

This is the largest **stability risk**: refactors and security fixes lack a safety net.

---

## 9. Observability and operations

- No structured logging or request ID middleware was identified in `main.py`.
- No metrics/health endpoints were reviewed in depth beyond standard FastAPI behavior.
- **README** at repo root is essentially empty—operational runbooks, env var tables, and migration steps are missing for new contributors.

---

## 10. API contract and documentation

- `console/api-docs.json` can serve as a contract snapshot; ensure it is **regenerated** when the API changes (manual drift otherwise).
- Exception responses mix raw `errors()` lists (validation) and `detail` strings—clients should treat error bodies as structured but version them if mobile or third parties consume the API.

---

## 11. Prioritized recommendations

1. **Implement or remove** `PPTXPresentationService.create_and_save` and add a minimal test that exports a known template.
2. **Enforce authentication and authorization** on all mutating and user-scoped reads: derive `user_id` from `get_current_user` (or equivalent), never from unchecked client input.
3. **Add CI** running `ruff check`, `pytest` (even a few tests), and `pnpm run build` / `pnpm run lint` for the console.
4. **Trim unused dependencies** and fix the `python-jose` extra name; document the actual DB backend (PostgreSQL).
5. **Harden cookies** and token policy for production; make CORS origins configurable.
6. **Rename** `respository` → `repository` when feasible (mechanical refactor).
7. **Expand README** with env vars, local run instructions, and architecture notes.

---

## 12. Conclusion

The codebase demonstrates **solid structural intent** (layered backend, typed frontend) and is appropriate for an internal or early-stage product. **Security boundaries between client-supplied identifiers and server-side identity**, **completion of the PPTX export path**, and **automated testing/CI** are the main blockers for confidence in stability and safe multi-tenant use. Addressing those will materially improve both **security posture** and **long-term maintainability**.
