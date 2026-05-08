---
name: AI Vibe Coding Engineering Standard
description: Production-Grade Development Skill Framework. Every generated line of code must comply with these mandatory engineering standards for AI coding agents participating in production software development.
---

# AI VIBE CODING ENGINEERING STANDARD
## Production-Grade Development Skill Framework

> [!IMPORTANT]  
> **MANDATORY INSTRUCTION FOR ALL TASKS:** Before answering or executing any task, you **MUST** actively search the `antigravity-awesome-skills` directory for any relevant skills that can assist you. You are required to use all appropriate skills available to execute the user's request effectively.

Version: 1.0
Scope: Web & Mobile Systems
Target: AI Coding Agents & Hybrid Cloud Mirroring Workflow

### 1. PURPOSE
This document defines the mandatory engineering standards for AI coding agents participating in production software development.
This is not guidance.
This is policy.
Every generated line of code must comply.
The objective:
- Build durable systems
- Ensure long-term maintainability
- Guarantee security by default
- Enable scalability without refactor
- Support multi-team evolution
- Be audit-ready
- Be production-safe

### 2. CORE PHILOSOPHY
#### 2.1 Production-First Engineering
Every piece of code must be:
- Testable
- Maintainable
- Explicit
- Deterministic
- Documented
- Replaceable

Working but fragile solutions are rejected.
No shortcuts.
No clever tricks.
No hidden coupling.

#### 2.2 Security By Default
All inputs are hostile.
All access is verified.
All secrets are protected.

Mandatory:
- Input validation (schema-based)
- Output sanitization
- Authentication required
- Authorization verified per action
- Rate limiting
- Structured audit logging
- Centralized error handling
- API versioning
- Encryption in transit
- Encryption at rest where required

Forbidden:
- Hardcoded secrets
- Silent catches
- Unstructured logs
- Debug leftovers
- Trusting frontend validation
- In-memory-only critical state

#### 2.3 Architecture Before Code
Before generating code, the agent must define:
- Responsibilities
- Boundaries
- Layer separation
- Data flow
- Dependency direction
- API contracts
- Domain model
- Failure strategy
No implementation without architecture clarity.

### 3. ARCHITECTURE PRINCIPLES
#### 3.1 Layered Separation
Required separation:
- Domain layer (business rules)
- Application layer (use cases)
- Infrastructure layer (DB, APIs, storage)
- Interface layer (HTTP/UI)

Strict rules:
- Domain must not depend on infrastructure
- UI must not contain business logic
- No direct DB access from frontend
- Dependencies are unidirectional

#### 3.2 Modularity
Each module must:
- Have a single responsibility
- Expose explicit interfaces
- Avoid tight coupling
- Be independently testable
- Be replaceable without rewriting system core

#### 3.3 Statelessness
Application services must be stateless.
No critical state in memory.
State must be persisted or distributed.

#### 3.4 Multi-Tenant Awareness (if applicable)
Must ensure:
- Tenant isolation at data layer
- Tenant ID verification on every request
- No cross-tenant data leakage
- Tenant-aware logging

### 4. CODE QUALITY STANDARDS
#### 4.1 Function Rules
- Maximum ~40 lines
- One responsibility
- Explicit parameters
- Typed return values
- No hidden side effects

#### 4.2 Naming
- Explicit names
- No abbreviations unless universal
- Domain vocabulary consistent
- No generic "utils" dumping

#### 4.3 Comments
Comment:
- Why a decision is taken
- Why an alternative was rejected
- Non-obvious constraints
- Security assumptions

Do not comment:
- Obvious logic
- Self-explanatory code

### 5. TESTING REQUIREMENTS
Mandatory test coverage:
- Unit tests for domain logic
- Integration tests for API
- E2E tests for critical flows
- Tenant isolation tests (if multi-tenant)
- Failure scenario tests
- Security boundary tests

Code without tests = unreliable code.

### 6. API STANDARDS
#### 6.1 REST or GraphQL
- Versioned
- Documented (OpenAPI)
- Schema validated
- Consistent error format
- Idempotent where required

#### 6.2 Error Handling
Centralized error middleware.
Errors must:
- Return consistent structure
- Not expose internal details
- Be logged with correlation ID

#### 6.3 Webhooks
- Signed
- Verified
- Timeout controlled
- Retry with backoff
- Circuit breaker supported

### 7. SECURITY CHECKLIST
Every feature must verify:
- Input validation
- Output sanitization
- Authorization guard
- Rate limiting
- Audit logging
- Secure headers
- CSRF protection (if session-based)
- XSS protection
- Injection prevention
- File upload scanning
- Access logging

### 8. CONFIGURATION MANAGEMENT
- Environment-based configuration
- No hardcoded values
- Secret vault usage
- Safe defaults
- Production and development isolated
- No production data in dev

### 9. DEVOPS REQUIREMENTS
- Dockerized services
- CI/CD pipeline mandatory
- Tests required before merge
- Lint + format enforcement
- Automated rollback capability
- Version tagging
- Infrastructure as Code preferred

### 10. OBSERVABILITY
System must provide:
- Structured logs (JSON)
- Metrics (latency, errors, throughput)
- Health checks
- Alert thresholds
- Audit trail
- Traceability ID per request

### 11. PERFORMANCE PRINCIPLES
- No premature optimization
- DB index where needed
- Query analysis
- Lazy loading
- Pagination required
- Cache only where justified
- Monitor before optimizing

### 12. FRONTEND STANDARDS
- Mobile-first
- Accessibility compliant
- Component isolation
- No business logic in UI
- Error visibility
- Loading states explicit
- Secure token storage
- Use custom-styled components only (Zero Native Components)
- Avoid global mutable state
- **Browser Style Reset & Customization**: All browser default styles must be completely overridden by custom implementations that align with the project's design system (e.g., focus states, scrollbars, inputs, and buttons).

### 13. DATA PRINCIPLES
- Explicit schemas
- Migrations versioned
- Referential integrity enforced
- Soft delete only when justified
- Audit history preserved
- Immutable critical records when required
- **Migration Naming Standard**: New database migration files must follow a strict timestamp-based nomenclature (Format: `YYYYMMDDHHmmss_description.sql`) to ensure chronological order and auditability.

### 14. AI AGENT BEHAVIORAL RULES
When generating code, the agent must:
- Clarify architecture assumptions.
- Define domain model.
- Define interfaces.
- Define error strategy.
- Define test strategy.
Only then implement.

If ambiguity exists:
- Choose robust solution.
- Choose long-term maintainability.
- Choose explicitness.

Never:
- Generate experimental code.
- Generate speculative architecture.
- Guess security.
- Ignore failure cases.
- **Wander off-task or make unauthorized changes.** Focus strictly on the assigned task. In case of bugs or feature additions, perform *only* what is requested. **Do NOT modify or delete code, styles, or logic outside the scope of the exact request without explicit permission.**

### 15. HYBRID DEVELOPMENT MODEL
Cloud Agent Responsibilities:
- Generate architecture
- Generate structured boilerplate
- Ensure consistency
- Enforce standards
- Validate cohesion

Local Runtime Responsibilities:
- Run containers
- Connect real infrastructure
- Execute real tests
- Validate networking
- Validate filesystem
- Validate integrations
The cloud agent does not assume runtime correctness.
Local environment is source of truth.

### 16. CODE REVIEW STANDARD FOR AI
Before finalizing output, the agent must self-verify:
- Separation respected?
- Security enforced?
- Error handling centralized?
- Tests defined?
- No hardcoded values?
- No silent assumptions?
- Logging structured?
- Scalable architecture?
If not, revise before output.

### 17. LONG-TERM EVOLUTION
System must support:
- Adding modules
- Adding integrations
- Adding roles
- API extension
- Refactor without rewrite
- Horizontal scaling
No architectural dead-ends.

### 18. REJECTION CONDITIONS
Code must be rejected if:
- Logic in UI
- Secrets exposed
- Silent failures
- No validation
- No tests
- Hard coupling
- Global mutable state
- Unversioned API
- Unbounded queries
- Fragile assumptions

### 19. ENGINEERING ETHOS
Think:
Architect first.
Engineer second.
Hacker never.

Write code that your future self will respect.
Write code that another team can maintain.
Write code that survives audits.
Write code that scales without panic.

This is vibe coding as disciplined systems engineering.

### 21. ARTISTIC & VISUAL EXCELLENCE (YUMI STANDARD)
- **Zero Emojis**: Forbidden in all application interfaces. Use professionally curated icons (e.g., Lucide, Phosphor) instead.
- **Visual Sobriety**: No blinking, fluorescent, or overly aggressive effects. Subtlety is maturity.
- **Clean & Elegant Design**: Prioritize "Elite" aesthetics (classy, premium, minimalist) over flashy effects.
- **Graphic Charter Mandatory**: Every project must have a central design system (CSS variables or Theme Provider) for colors, typography, and tokens. All values must be maintainable from a single point.
- **Total Customization**: Zero reliance on browser native components.
  - Custom Dropdowns
  - Custom Calendars/Date Pickers
  - Custom Scrollbars (Subtle Hairline)
  - Custom Spinners (Minimalist)
  - Custom Toasts & Alerts (Consistent Design)
- **Code Repetition Prevention**: Mandatory `common/` directory in `src/components/` or `src/lib/` for shared assets, components, and logic.

### 22. ADVANCED CLEAN CODE & MAINTAINABILITY
- **Guard Clauses Policy**: Favor early returns to minimize nesting and improve readability.
- **Zero 'Any' Tolerance**: Strict TypeScript typing is mandatory. The use of `any` is strictly forbidden.
- **Atomic Functions**: Each function must perform a single, focused task and be as pure as possible.
- **Self-Documenting Code**: Prioritize explicit naming for variables and functions over descriptive comments.
- **Error Handling Excellence**: Utilize Error Boundaries and centralized handlers to prevent silent failures or UI crashes.

### 23. CONCLUSION
This skill framework defines:
- How AI agents must reason
- How code must be structured
- How systems must be secured
- How scalability must be ensured
- How durability must be engineered

This is not vibe coding as improvisation.
This is vibe coding as disciplined systems engineering.
