# Sales Radar AI Skill Registry v2

Status: Active Governance Contract  
Scope: Sales Radar Agent OS skills, permissions, invocation boundaries, trace requirements, and data-write restrictions.

## 1. Registry Purpose

This registry defines:

- Which Skill owns each responsibility.
- Which inputs and outputs a Skill may use.
- Which Skill transitions are allowed.
- Which business entities a Skill must not modify.
- Which quality gates and user actions are required.
- What trace information every Skill must return.

Skills provide instructions and governance. A Skill does not gain database-write authority merely because it appears in an allowed workflow.

## 2. Global Truth Boundary

Every Skill must preserve:

```text
Source
  ↓
Evidence
  ↓
Fact
  ↓
Assessment
  ↓
Recommendation
```

And:

```text
Source != Evidence
Evidence != Fact
Fact != Opportunity
Market Signal != Opportunity
Opportunity != Customer
CompanyProfile != Customer
```

Global prohibitions:

- Do not fabricate a company.
- Do not fabricate a contact.
- Do not fabricate procurement, budget, project stage, supplier relationship, or purchase timing.
- Do not use company-name, keyword, domain, or URL similarity to establish an entity relationship.
- Do not associate entities owned by different users.
- Do not bypass Evidence Validation, Opportunity Quality, CRM Safety, Lead Quality Gate, Qualification Version, Assistant Trust Boundary, or Sales MCP action policy.
- Do not present an assessment or recommendation as a fact.
- Do not automatically promote research output into CRM truth.
- Do not treat a provider draft, accepted/queued response, opened external UI, or sequence request as verified sent/replied/meeting state.

## 3. Layer Classification

### 3.1 Governance and Control Plane

Skills:

- `sales-radar-product-owner`
- `source-management`
- `data-ingestion-governance`
- `agent-orchestration`
- `agent-evaluation`
- `sales-data-quality`
- `crm-safety`
- `sales-mcp-orchestration`

Responsibilities:

- Define product and architecture boundaries.
- Govern source lifecycle and health.
- Route tasks using least privilege.
- Evaluate changes and regressions.
- Protect data quality and CRM promotion boundaries.
- Guard Raw Data from being promoted without Evidence Validation.
- Gate external prospecting/enrichment/CRM/outbound providers by capability, cost, approval, dedupe and receipt policy.

Forbidden:

- Make unsupported commercial judgments.
- Create customer truth.
- Bypass domain services or quality gates.
- Weaken an external provider action risk declared by central policy.

### 3.2 Intelligence Layer

Skills:

- `product-intelligence`
- `market-intelligence`
- `company-intelligence`
- `competitive-intelligence`

Responsibilities:

- Understand the user's product.
- Identify evidence-backed market changes.
- Build evidence-backed company understanding.
- Analyze competitors from verified public information.

Allowed:

- Read Product Context and owned Evidence.
- Produce structured analysis.
- Return facts, assessments, recommendations, and review items separately.

Forbidden:

- Create Leads or Customers.
- Change sales or qualification status.
- Invent company, market, procurement, or competitor facts.

### 3.3 Evidence Layer

Skills:

- `evidence-validation`
- `source-grounding`
- `market-data-ingestion`
- `data-ingestion-governance`
- `market-signal-evaluation`

Responsibilities:

- Define how external information enters the Evidence pipeline.
- Validate source eligibility and content.
- Bind factual claims to explicit sources.
- Evaluate whether Evidence supports a Market Signal.

Allowed:

- Validate URLs, publishers, timestamps, content, and explicit relationships.
- Mark validation status.
- Return `NEEDS_REVIEW`.

Forbidden:

- Infer procurement or buying intent.
- Infer contacts or company relationships.
- Turn a source directly into an Opportunity or CRM entity.

### 3.4 Opportunity Layer

Skills:

- `opportunity-analysis`
- `opportunity-quality`
- `sales-reasoning`

Responsibilities:

- Explain why a verified change may matter commercially.
- Assess Product Context relevance.
- Validate Opportunity quality.
- Separate facts, commercial assessments, and recommended verification.

Allowed:

- Produce an Opportunity candidate and explain its reasoning.
- Recommend further research.

Forbidden:

- Create a Customer or Qualified Lead.
- State that procurement exists without explicit procurement Evidence.
- Bypass Opportunity Quality Gate.

### 3.5 Research and Trace Layer

Skills:

- `research-trace`
- `agent-trace`

Responsibilities:

- Build user-facing source-to-decision explanations.
- Record execution inputs, outputs, versions, reasons, sources, state, and errors.

Allowed:

- Read explicitly related records.
- Produce read-only explanations and audit views.

Forbidden:

- Modify business entities.
- Create facts not present in sources.
- Expose Prompt content, credentials, model internals, or unrelated user data.

### 3.6 Contact Layer

Skill:

- `contact-intelligence`

Required input:

```text
Owned CompanyProfile
+
Verified public source
+
Explicit user action
```

Allowed:

- Suggest departments and role categories.
- Analyze an explicitly verified public contact.
- Return verification questions.

Forbidden:

- Guess a name, title, email, phone number, profile URL, or company relationship.
- Automatically create a Contact.
- Automatically create or promote a Lead.

### 3.7 Action Layer

Skills:

- `sales-action-planning`
- `sales-copilot`

Responsibilities:

- Convert trusted research into recommended next steps.
- Generate evidence-aware drafts and discussion guidance.

Allowed:

- Recommend actions.
- Draft email, LinkedIn, WhatsApp, and call content.
- Clearly qualify uncertain information.

Forbidden:

- Automatically send messages.
- Pretend communication, agreement, meeting, or relationship history exists.
- Create a Customer, Lead, Contact, or sales outcome.

## 4. Skill Responsibility Registry

| Skill | Primary input | Primary output | May invoke/read next | Must not do |
|---|---|---|---|---|
| `sales-radar-product-owner` | Product direction, requested change | Scope and boundary decision | All layers for governance | Create customer truth |
| `source-management` | Source definition, ownership, health | Registry lifecycle decision | `market-data-ingestion` | Fetch content or generate Signal |
| `market-data-ingestion` | Registered Source | Raw capture | `data-ingestion-governance` | Create Signal, Opportunity, Lead |
| `data-ingestion-governance` | DataSource, IngestionRun, RawSourceDocument | Duplicate/revision and Evidence-eligibility decision | `evidence-validation` | Create Evidence, Signal, Opportunity, or CRM data |
| `product-intelligence` | User product description | Product Context | Search/Market Intelligence | Generate companies or market facts |
| `evidence-validation` | Raw page or Evidence candidate | Validation status | `source-grounding`, `market-signal-evaluation` | Fill missing facts |
| `source-grounding` | Claim and explicit sources | Grounding result | Intelligence and Trace layers | Link by similarity |
| `market-intelligence` | Validated Evidence | Market Signal candidate | `market-signal-evaluation` | Treat Signal as procurement |
| `market-signal-evaluation` | Validated Evidence and Signal candidate | FACT/ASSESSMENT/RECOMMENDATION/NEEDS_REVIEW | `opportunity-analysis` | Let social-only Signal become Opportunity |
| `opportunity-analysis` | Evidence, Market Signal, Product Context | Opportunity candidate | `opportunity-quality` | Create Customer or Lead |
| `opportunity-quality` | Opportunity candidate and sources | PASS/WARNING/BLOCK | Company research after persistence | Lower quality to increase volume |
| `company-intelligence` | Owned Opportunity, Evidence, Product Context | CompanyProfile candidate or update | `research-trace`; user-triggered Contact research | Create Lead or Contact |
| `competitive-intelligence` | Verified company, product, market sources | Competitor facts and assessments | `research-trace`, Action layer | Invent pricing, customers, partnerships |
| `research-trace` | Existing trusted entities | User-facing explanation | Action layer | Write domain data |
| `agent-trace` | Agent execution references | Execution trace | Evaluation and audit | Expose secrets or create facts |
| `sales-reasoning` | Facts and Product Context | Commercial assessment and verification advice | Opportunity or Action layer | Present inference as fact |
| `contact-intelligence` | CompanyProfile, verified source, user action | Contact direction or verified public contact candidate | `sales-action-planning`, `sales-mcp-orchestration` | Guess a person or contact detail |
| `sales-action-planning` | Trusted research | Recommended actions and questions | `sales-copilot`, `sales-mcp-orchestration` | Execute actions automatically |
| `sales-copilot` | Qualified Lead or high-confidence Opportunity | Sales-assistance drafts | User review or `sales-mcp-orchestration` after approval | Send messages or create CRM records |
| `sales-data-quality` | Proposed or stored sales data | PASS/NEEDS_REVIEW/REJECTED | Existing quality gates | Mutate business data |
| `crm-safety` | Proposed CRM promotion | Allow/block/review decision | Existing Lead Quality Gate, `sales-mcp-orchestration`, user confirmation | Promote research automatically |
| `sales-mcp-orchestration` | Approved provider action, owned references, evidence/qualification context | Provider selection, gated execution result, external IDs/receipts | `agent-trace`, existing domain services for verified state updates | Guess schemas, bypass approval, silently fail over after execution, manufacture provider outcomes |
| `agent-orchestration` | Task, IDs, permissions, state | Routed workflow | Only allowed transitions | Make commercial decisions |
| `agent-evaluation` | Agent or policy change | Regression results | Release decision | Modify production data |

## 5. Allowed Workflow

Primary research path:

```text
Product Intelligence
        ↓
Source Management
        ↓
Market Data Ingestion
        ↓
Evidence Validation
        ↓
Source Grounding
        ↓
Market Intelligence
        ↓
Market Signal Evaluation
        ↓
Opportunity Analysis
        ↓
Opportunity Quality
        ↓
Company Intelligence
        ↓
Research Trace
        ↓
Sales Action Planning
        ↓
Sales Copilot
```

Contact research branch:

```text
Company Intelligence
        ↓
Verified CompanyProfile and Source
        ↓
Explicit user action
        ↓
Contact Intelligence
        ↓
Sales Action Planning
```

External sales-system action branch:

```text
Trusted research / verified contact / approved CRM proposal
        ↓
CRM Safety and applicable quality gate
        ↓
Sales MCP Orchestration
        ↓
Provider capability + exact schema discovery
        ↓
READ/DRAFT automatic or explicit WRITE/CREDIT/SEND approval
        ↓
One selected provider execution
        ↓
Attributable external record / receipt
        ↓
Authorized domain-service state update
```

Quality controls apply across the workflow:

```text
Sales Data Quality
CRM Safety
Sales MCP Orchestration
Agent Evaluation
Agent Trace
Agent Orchestration
```

An allowed arrow means “may pass explicit IDs and structured outputs.” It does not authorize automatic persistence or promotion.

## 6. Forbidden Shortcuts

Never allow:

```text
Source → Customer
Source → Lead
Raw Data → Market Signal
Evidence → Opportunity without assessment
Market Signal → Opportunity without quality review
Opportunity → Lead
CompanyProfile → Customer
CompanyProfile → Contact
Contact direction → fabricated person
Sales recommendation → automatic outreach
Provider draft → SENT_VERIFIED
Provider accepted/queued → SENT_VERIFIED
Sequence enrollment → REPLIED_VERIFIED
Provider/domain similarity → CRM merge
```

Required protections:

- Opportunity persistence must remain independent from Lead qualification.
- Contact creation requires verified public contact data and explicit user action.
- CRM promotion requires Evidence, the existing quality gate, and user confirmation.
- External `WRITE`, `CREDIT`, and `SEND` actions require explicit approval; `DESTRUCTIVE` is blocked by default.
- Verified sent/replied/meeting states require attributable provider receipt/message/thread/event evidence and observed time.
- Supervisor routing cannot override domain permissions or the provider action policy.

## 7. Data Write Permission Matrix

Legend:

- `❌`: never write.
- `⚠️`: may produce a candidate or request an authorized domain-service action; never write directly from the Skill.
- `—`: outside the Skill responsibility.

| Skill group | Lead | Contact | Opportunity | CompanyProfile | MarketSignal | Infrastructure/Trace |
|---|---:|---:|---:|---:|---:|---:|
| Product Intelligence | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ Product Context through authorized service |
| Source Management | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ Source Registry through authorized service |
| Market Data Ingestion | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ Raw/Evidence candidate through pipeline |
| Evidence Layer | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ Validation state through Evidence service |
| Market Intelligence | ❌ | ❌ | ❌ | ❌ | ⚠️ | — |
| Opportunity Layer | ❌ | ❌ | ⚠️ | ❌ | ❌ | — |
| Company Intelligence | ❌ | ❌ | ❌ | ⚠️ | ❌ | ⚠️ Company snapshot/source through domain service |
| Contact Intelligence | ❌ | ⚠️ | ❌ | ❌ | ❌ | — |
| Action Layer | ❌ | ❌ | ❌ | ❌ | ❌ | — |
| Sales MCP Orchestration | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ External provider execution trace/receipt only; internal state through authorized domain service |
| Research Trace | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ Read-only view; execution trace only if authorized |
| Quality and Safety | ❌ | ❌ | ❌ | ❌ | ❌ | Quality result only |
| Agent Orchestration | ❌ | ❌ | ❌ | ❌ | ❌ | Workflow state only |

Every `⚠️` requires:

1. Same-user ownership validation.
2. Explicit input references.
3. An authorized domain service.
4. Applicable quality gate.
5. Idempotency and versioning.
6. Explicit user action when CRM, Contact, provider credit, or outbound execution is involved.

External provider mutation is additionally governed by `sales-mcp-orchestration`: provider schema/capability discovery, deterministic dedupe, authoritative risk classification, explicit approval where required, single-provider execution and receipt preservation.

## 8. Trace Contract

Every Skill output must include:

```ts
interface SkillTraceEnvelope {
  skill: string
  taskType: string
  inputReferences: Array<{ type: string; id: string }>
  sourceReferences: Array<{
    type: string
    id: string
    url?: string
    capturedAt?: string
  }>
  reasoning: string[]
  version: string
  timestamp: string
  userId: string
  status: 'COMPLETED' | 'NEEDS_REVIEW' | 'BLOCKED' | 'FAILED'
}
```

Rules:

- Use `sourceReferences: []` when the task has no factual source input.
- Explain why a source-free output is analysis context rather than fact.
- FACT requires at least one explicit Source Reference.
- ASSESSMENT requires reasoning.
- RECOMMENDATION requires advisory language.
- `NEEDS_REVIEW` requires verification questions.
- Provider execution traces must retain provider/action/risk/approval reference and attributable external IDs/receipts when available.
- Never expose Prompt content, API keys, OAuth tokens, credentials, model internals, or another user's IDs.

Research Trace presents user-facing reasoning. Agent Trace records operational execution. Neither may create business truth.

## 9. Orchestration Rules

The Supervisor may:

- Select an allowed Skill.
- Pass explicit IDs.
- Enforce user ownership.
- Manage retries and state before an externally consequential provider action begins.
- Record versions.
- Stop a workflow on quality failure.

The Supervisor must not:

- Create an entity relationship.
- Rewrite a FACT.
- Override `NEEDS_REVIEW`, `QUALITY_BLOCK`, CRM Safety, or Sales MCP action policy.
- Promote a Signal, Opportunity, CompanyProfile, or Contact candidate.
- Perform commercial reasoning itself.
- Retry an external write/credit/send through a second provider after execution begins unless a new plan/approval explicitly authorizes it.

Every workflow change must run `agent-evaluation`.

## 10. Registry Change Process

Before adding or changing a Skill:

1. Define Purpose, Input, Output, Allowed Actions, Forbidden Actions, Data Boundary, Traceability, and Future Extension.
2. Assign exactly one primary layer.
3. Add permitted upstream and downstream relationships.
4. Add or update the write-permission matrix.
5. Add Evaluation cases for truth-boundary failures.
6. Verify that no shortcut bypasses a quality gate.
7. Update this registry version.

Do not add a Skill when an existing Skill already owns the responsibility. Prefer extending the registry, contracts, adapters, or evaluations over creating overlapping Skills.

` sales-mcp-orchestration` is intentionally narrow: it owns external sales-system provider capability/schema discovery and execution safety, while `crm-safety` remains the CRM promotion gate, `contact-intelligence` remains the contact truth owner, `sales-action-planning` remains advisory, and `agent-orchestration` remains the general workflow router.
