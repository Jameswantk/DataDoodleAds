# Expanded outbound-directory backtest

Date: 2026-07-31  
Methodology: `site-readiness-v2`  
Source directory: https://thunderous-kitsune-ca7394.netlify.app/

## Scope

This is a stratified deterministic backtest across 21 additional
companies from 7 industries, selected from 95 parsed
prospects. It tests crawlability and evidence rules. It does not independently
prove live inclusion or exclusion in ChatGPT, Gemini, Claude, or Google AI, and
it does not include a rendered aesthetic assessment.

The directory's older "Google + AI Findability" score is retained only as a
comparison benchmark. Its methodology is not available in the directory and it
must not be treated as ground truth.

## Results

- Completed: 20/21
- Needs verification: 1/21
- Mean directory score among completed sites: 48.3
- Mean current deterministic readiness score: 76.7
- Large directional mismatches (directory <=55, current readiness >=85): 9
- No deterministic gap found; route to rendered visual review: 3

| Industry | Company | Directory score | Current result | Difference | Failed deterministic checks |
| --- | --- | ---: | --- | ---: | --- |
| Funeral | 80殡仪服务 80 KLP Funeral Services | 41 | Clear opportunity (62) | 21 | title, description, h1, structured-data, contact, cta |
| Funeral | KL FUNERAL SERVICES | 38 | Clear opportunity (58) | 20 | title, description, canonical, viewport, language, h1, structured-data, question-content |
| Funeral | Nirvana Memorial Center 富贵纪念馆 Official | 46 | Strong foundation (87) | 41 | description, structured-data |
| Pet Adjacent | Avatar Angels | 53 | Established (71) | 18 | title, h1, question-content, proof, about |
| Pet Adjacent | Grooms By ARP | 38 | Foundational opportunity (31) | -7 | description, canonical, h1, structured-data, service-language, location-language, question-content, internal-links, contact, proof, about, cta |
| Pet Adjacent | Letoro Grooming \| Happy Garden | 49 | Clear opportunity (60) | 11 | description, structured-data, question-content, internal-links, contact, proof, about |
| Law | Donny Wong & Co. | 53 | Strong foundation (100) | 47 | None detected |
| Law | WenJie & Co. Law Firm \| Kuala Lumpur Malaysia | 53 | Strong foundation (95) | 42 | title |
| Law | Ramesh Yum & Co | 45 | Clear opportunity (64) | 19 | title, description, canonical, language, structured-data, question-content, about |
| Kids Enrichment | Speech Academy \| Speech & Language Therapy Desa Sri Hartamas | 42 | Clear opportunity (65) | 23 | title, canonical, language, h1, structured-data, proof |
| Kids Enrichment | Alisther Intervention & Rehabilitation Centre Bukit Jalil | 53 | Strong foundation (100) | 47 | None detected |
| Kids Enrichment | Fed to Flourish Sdn Bhd | 53 | Strong foundation (100) | 47 | None detected |
| Tuition | Collinz IGCSE Tuition Centre (Uptown Damansara Branch) | 53 | Foundational opportunity (53) | 0 | h1, service-language, question-content, internal-links, contact, proof, about, cta |
| Tuition | Zcode Academy - Homeschool, Tuition & After-School \| IGCSE, A Level & IB \| Mont Kiara | 50 | Established (70) | 20 | h1, service-language, question-content, proof, about |
| Tuition | Axiom Learning - Kuala Lumpur | 53 | Strong foundation (88) | 35 | title, h1 |
| Allied Health | Apple Physio Rehab (KL) | 53 | Needs verification (HOMEPAGE_HTTP_403) | — | None detected |
| Allied Health | Chirozone Family Solaris Mont Kiara Chiropractic | 53 | Strong foundation (95) | 42 | question-content |
| Allied Health | Perfect Physio | 44 | Established (83) | 39 | description, canonical, structured-data |
| Home Living | BAAGUS Damansara Uptown (Curtains \| Blinds \| Wallpaper) | 46 | Established (72) | 26 | h1, structured-data, contact, cta |
| Home Living | KL City Curtain Enterprise \| Window Blinds \| Curtain Supplier \| Carpet and Wallpapers Supplier \| Ready-Made \| Custom-Made | 53 | Strong foundation (86) | 33 | h1, proof |
| Home Living | A Trio Design Sdn Bhd | 50 | Strong foundation (93) | 43 | h1 |

## Interpretation

1. The two scores are not measuring the same thing. A large difference is not
   automatically a defect in either number, but it is a warning against
   presenting either one as observed AI-platform visibility.
2. Crawl failures are reported as "Needs verification" and are not converted
   into low prospect scores.
3. The current result can legitimately show a strong technical/content
   foundation while still leaving aesthetic, positioning, conversion, or
   platform-observation opportunities for a consultation.
4. The source outbound message is largely templated. It offers a useful sales
   tone benchmark, but its statements that AI platforms do not name the company
   and that buyers are landing on competitors are unsupported by evidence in
   the directory itself and should not be copied into generated reports.
5. A site with no deterministic gap should be routed to the rendered aesthetic
   and conversion review. Its score should not be artificially reduced merely
   to manufacture a sales opportunity.

## Targeted rendered spot-check

The three 100-point deterministic results were opened in a real desktop browser
because they are the highest-risk false-complete cases:

- **Donny Wong & Co.** passed every structural rule, but the first screen uses a
  dated, visually dense split layout with an FAQ promotion competing against a
  long consultation form. A visual model should still identify hierarchy,
  positioning, and conversion opportunities.
- **Alisther Intervention & Rehabilitation Centre** passed every structural
  rule, but the first screen has an oversized identity block, substantial empty
  space, and a cramped navigation/contact row before the main proposition.
- **Fed to Flourish** passed every structural rule and also presented a clear,
  modern proposition with legible service language and two visible actions.

Two of the three perfect structural results still contain meaningful visual
opportunities. Therefore a deterministic 100 must mean "no rule gap detected,"
not "nothing to improve." Paid-traffic reports should not imply that aesthetics
were assessed until the Terra screenshot stage is connected.
