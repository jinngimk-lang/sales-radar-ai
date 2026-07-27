\# Sales Radar AI Development Context v0.6.0



\## 1. Project Overview



Project Name:



Sales Radar AI





Positioning:



Sales Radar AI is an AI Sales Intelligence Platform.



It helps B2B companies:



\- understand their products

\- discover potential customers

\- evaluate customer fit

\- learn from sales outcomes

\- continuously improve sales decisions





Sales Radar AI is NOT:



\- a traditional CRM

\- an AI chatbot

\- a simple lead database

\- an automation tool only





The core vision:



Build an intelligent sales system that becomes increasingly knowledgeable about a company's products, markets, customers, and successful sales patterns.





\---



\# 2. Product Philosophy





\## Core Principle



AI should assist human sales decisions, not replace human judgment.





The system should provide:



\- explainable recommendations

\- confidence awareness

\- business reasoning

\- actionable next steps





Avoid:



\- black-box AI decisions

\- excessive AI branding

\- fake intelligence

\- unsupported conclusions





\---



\# 3. Current Architecture





Current high-level flow:





Product Intelligence



↓



Global Search Intelligence



↓



Lead Discovery



↓



Lead Research AI



↓



LeadResearchFeedback



↓



LeadOutcome



↓



Sales Learning Analytics



↓



Sales Learning Intelligence



↓



Future Sales Brain





\---



\# 4. Completed Modules





\## 4.1 Product Intelligence Hub



Purpose:



Convert product descriptions into reusable product knowledge.





Capabilities:



\- product understanding

\- buyer persona

\- decision roles

\- keywords

\- market suggestions

\- channel strategy





Database:



ProductProfile





\---



\## 4.2 AI Provider Platform





Purpose:



Separate business logic from AI models.





Architecture:





Business Service



↓



AIProvider Interface



↓



AIProvider Factory



↓



Configured Provider



↓



AI Response Parser



↓



Structured Result







Current providers:



\- RuleBased Provider

\- Qwen Provider





Design principle:



Business services should not depend on specific AI models.





\---



\## 4.3 Lead Research AI





Purpose:



Evaluate whether a Lead is worth sales attention.





Outputs:



\- matchScore

\- purchaseLikelihood

\- industryFit

\- businessFit

\- recommendedAngle

\- contactReason

\- riskFactors

\- evidence





Rules:



\- explainable

\- evidence-based

\- no hallucinated customer information





\---



\## 4.4 Lead Research Quality Loop





Purpose:



Collect human feedback on AI judgment.





Data:



LeadResearchFeedback





Captures:



\- rating

\- feedbackType

\- comments





Important:



Feedback does NOT automatically modify AI behavior.





\---



\## 4.5 Lead Outcome Tracking





Purpose:



Capture real business outcomes.





Data:



LeadOutcome





Statuses:



\- NEW

\- CONTACTED

\- REPLIED

\- MEETING

\- QUALIFIED

\- PROPOSAL

\- WON

\- LOST





Purpose:



Provide commercial result signals for future learning.





\---



\## 4.6 Sales Learning Analytics





Purpose:



Analyze historical sales patterns.





Uses:



LeadResearch



\+



Feedback



\+



Outcome



\+



ProductProfile





Provides:



\- AI judgment quality

\- reply rate

\- meeting rate

\- win rate

\- product performance

\- score effectiveness





Important:



Read-only analytics layer.





\---



\## 4.7 Sales Learning Intelligence





Purpose:



Convert historical data into business insights.





Insight categories:



\- Product Insight

\- Market Insight

\- Sales Angle Insight

\- Lead Quality Insight





Each insight includes:



\- confidence

\- sample size

\- supporting metrics





Confidence rules:



HIGH:

>=20 samples



MEDIUM:

8-19 samples



LOW:

<8 samples





Low confidence insights must clearly state:



"Observation only, more data required."





\---



\# 5. AI Design Principles





\## Do



\- Use structured output

\- Validate AI responses

\- Provide fallback

\- Track provider/model usage

\- Preserve explainability





\## Do NOT



\- Automatically train models

\- Automatically modify prompts

\- Hide AI uncertainty

\- Store unnecessary private data





\---



\# 6. Data Philosophy





Sales Radar AI should build long-term business intelligence assets.





Data evolution:





Product knowledge



↓



Customer intelligence



↓



Sales feedback



↓



Business outcomes



↓



Sales intelligence



↓



Company sales knowledge





\---



\# 7. UX Principles





The product should NOT feel like:



"an AI tool"





It should feel like:



"an experienced sales assistant."





Avoid:



\- excessive AI labels

\- robotic language

\- complicated dashboards

\- CRM-like workflows





Prioritize:



\- clarity

\- simplicity

\- human workflow

\- business action





Reference products:



\- Linear

\- Stripe

\- Apple

\- Notion





\---



\# 8. Codex Collaboration Workflow





Standard workflow:





1\. Define product goal



↓



2\. ChatGPT reviews from:



\- Product perspective

\- AI architecture perspective

\- Sales perspective

\- UX perspective



↓



3\. Generate Codex implementation prompt



↓



4\. Codex development



↓



5\. Review Codex result



↓



6\. Git commit



↓



7\. Git push



↓



8\. Version tag





\---



\# 9. Git Workflow





After every completed development stage:





Check:



git status





Stage:



git add .





Commit:



git commit -m "Feature description"





Push:



git push





Create version:



git tag -a vx.x.x -m "Release description"





Push tag:



git push origin vx.x.x







Current versions:





v0.1.0



Initial foundation release





v0.3.0



AI Provider Platform foundation





v0.4.0



Real AI Provider Integration





v0.5.0



Lead Research AI





v0.6.0



Sales Learning Intelligence Foundation





\---



\# 10. Skill Usage Guide





Skills are tools, not mandatory workflow.





Use based on task type.





\## UI / UX tasks



Use:



\- ui-ux

\- design-system

\- graphic-design





Purpose:



Improve:



\- information hierarchy

\- user flow

\- visual quality





\---



\## Architecture diagrams



Use:



\- drawio





For:



\- system architecture

\- workflows

\- data flow





\---



\## Product explanation / presentations



Use:



\- presentation

\- pptx

\- documents

\- pdf





For:



\- investor decks

\- product demos

\- business documents





\---



\## Review tasks



Use:



\- reviewer

\- research





Before implementation:



analyze:



\- objective

\- audience

\- risks

\- improvement opportunities





\---



\# 11. Development Rules





Before adding features:





Ask:



1\. Does this improve sales intelligence?



2\. Does this create long-term data value?



3\. Does this improve user decision making?



4\. Does this avoid becoming a CRM?





Avoid unnecessary complexity.





\---



\# 12. Future Roadmap





\## Phase Next



Sales Intelligence Experience





Focus:



\- Dashboard intelligence

\- Customer detail improvement

\- AI sales assistant experience

\- Human-centered UX





\---



\## Future



Sales Learning Loop





Goal:



Use:



Feedback



\+



Outcome



\+



Analytics





to improve:



\- recommendations

\- prioritization

\- sales strategies





\---



\## Long-term Vision





Sales Radar AI becomes:





Company Sales Brain





A system that understands:



\- products

\- customers

\- markets

\- successful sales patterns



and helps companies make better sales decisions.

