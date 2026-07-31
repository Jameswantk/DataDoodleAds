# Terra website-audit quality benchmark

Date: 2026-07-30

## Decision

Terra is a conditional pass for the audit narrative and visual-review layer.
It is not sufficient as a standalone functionality tester or an
unvalidated report publisher.

The five reports were differentiated, commercially useful, restrained in
tone, and grounded in the supplied screenshots and checks. The production
design should retain deterministic scoring, validate every finding, and
separately test real interactions.

## Method

Each website was captured at desktop and mobile viewport sizes. Terra received:

- the two screenshots;
- the existing deterministic crawl and score evidence;
- an output schema;
- instructions not to browse, use tools, infer hidden behavior, or make
  unsupported traffic, ranking, revenue, competitor, or customer claims.

The runs used `gpt-5.6-terra` through the signed-in Codex CLI at medium
reasoning effort. Five runs executed concurrently. This was a quality
benchmark, not a measurement of Responses API pricing.

## Results

| Website | Industry | Rules score | Terra score | Reviewer quality | Strongest result | Main reservation |
| --- | --- | ---: | ---: | ---: | --- | --- |
| Lee, Perara & Tan | Legal services | 72 | 66 | 90 | Correctly identified the service-message, mobile-context, proof, and enquiry gaps | WhatsApp hook is safe but could be more outcome-led |
| KL Fix | Home services | 90 | 85 | 94 | Precisely caught the mobile WhatsApp overlap and delayed conversion message | Existing title rule fails a detailed title without explaining why |
| Dewakan | Fine dining | 77 | 75 | 91 | Correctly separated premium aesthetics from cookie-overlay and discoverability issues | Hero judgment is based on a carousel state |
| Sunway Medical Centre | Healthcare | 93 | 86 | 84 | Correctly identified mobile control density and heading hierarchy | The conversation hook over-focused on the cancer carousel slide |
| Christy Ng | Fashion e-commerce | 85 | 81 | 91 | Correctly identified the desktop email modal as a conversion trade-off | One low-priority contrast recommendation was mildly speculative |

Average reviewer quality: **90/100**.

## Quality gates

| Gate | Result |
| --- | --- |
| Valid structured output | 5/5 |
| Distinct, industry-specific report | 5/5 |
| Invented broken functionality | 0 findings |
| Unsupported rankings, traffic, revenue, or competitor claims | 0 findings |
| Strongly grounded and client-usable findings | 20/22 |
| Safe WhatsApp conversation hooks | 5/5 |
| Hooks strong enough to publish without editing | 3/5 |
| Approximate concurrent run latency | 22–24 seconds per report |

## Findings about the audit system

1. **Screenshot state affects the answer.** Carousels, cookie notices, timed
   newsletter modals, and chat widgets can dominate a single capture. Production
   should capture an initial state and a settled state, then label both.

2. **The rendered heading tree is needed.** Raw HTML can select a carousel or
   later-page H1 rather than the heading a visitor perceives as primary.

3. **Rule failures need explicit reasons.** KL Fix has a descriptive title, but
   the current length rule fails it. Terra correctly called this a scoring
   mismatch. Evidence should say the measured length and permitted range.

4. **Visual claims were materially better than the current text-only
   narrative.** Terra found real overlap, contrast, hierarchy, overlay, and
   mobile-density issues that are not available to the existing Llama narrative.

5. **Functionality remains untested.** Screenshots cannot establish whether
   menus, forms, booking flows, WhatsApp links, checkout, or accessibility
   controls work. Those require browser actions and network evidence.

6. **Conversation hooks need a separate commercial standard.** The outputs were
   respectful and safe, but some were too technical. The final CTA should lead
   with the highest-value visitor outcome and offer one concrete discussion
   point.

## Production recommendation

Use Terra for visual judgment and evidence-constrained explanation, subject to:

- deterministic scoring outside the model;
- browser-tested functionality evidence;
- desktop and mobile screenshots in controlled states;
- strict schema validation;
- rejection of findings without a valid evidence reference;
- a second validation pass for contradictions and prohibited claims;
- a deterministic fallback report;
- a separate, tested WhatsApp CTA template.

Do not publish Terra's raw response directly to a lead.

## Reproduction

Generate the deterministic evidence and prompts:

```powershell
npm run benchmark:terra:inputs
```

The schema is in `benchmarks/terra-audit.schema.json`. Generated screenshots,
prompts, evidence, and model responses are intentionally kept under
`output/playwright/terra-benchmark/` and ignored by Git.
