# Security Policy

## Supported versions

Sales Radar AI is currently a public preview. Security fixes target the latest commit on `main` and the latest published release.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability or include secrets, customer data, cookies or exploit details in a Discussion.

Use GitHub's **Report a vulnerability** flow in the repository Security tab. Include:

- affected commit or release;
- impacted endpoint or component;
- reproduction steps using non-sensitive test data;
- expected impact;
- any safe mitigation you have identified.

If private vulnerability reporting is unavailable, contact the repository owner through their GitHub profile without publishing exploit details.

## Sensitive areas

Please take particular care with:

- workspace/user isolation;
- server-side API keys and provider credentials;
- external URL validation and SSRF boundaries;
- Agent tool permissions and prompt/data exposure;
- public contact evidence and privacy;
- Revenue operator tokens and Browserbase live sessions;
- webhook or provider authenticity.

Do not test against systems, accounts or data you do not own or have explicit permission to use.
