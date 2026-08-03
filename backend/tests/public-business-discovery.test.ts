import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PublicWebsiteDiscoveryService,
  extractPublicBusinessPage,
  parseRobots,
} from '../src/services/public-business-discovery.service.js'

describe('public business page extraction', () => {
  it('extracts only observed emails, phones, social links and JSON-LD people', () => {
    const html = `
      <html>
        <head>
          <title>Acme contact</title>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Person",
              "name": "Alex Morgan",
              "jobTitle": "Procurement Director",
              "email": "alex@acme.example.org",
              "telephone": "+1 212 555 0100",
              "sameAs": ["https://www.linkedin.com/in/alex-morgan"],
              "worksFor": {"@type": "Organization", "name": "Acme"}
            }
          </script>
        </head>
        <body>
          <a href="mailto:sales@acme.example.org">Sales</a>
          <a href="tel:+1 (212) 555-0101">Call us</a>
          <a href="https://linkedin.com/company/acme?utm_source=site">LinkedIn</a>
          <a href="/about/team">Our team</a>
        </body>
      </html>
    `

    const result = extractPublicBusinessPage(
      html,
      'https://acme.example.org/contact',
      'Acme',
      '2026-08-03T00:00:00.000Z',
    )

    const person = result.contacts.find((contact) => contact.name === 'Alex Morgan')
    const general = result.contacts.find((contact) => contact.name === null)
    assert.equal(person?.jobTitle, 'Procurement Director')
    assert.deepEqual(person?.emails, ['alex@acme.example.org'])
    assert.deepEqual(general?.emails, ['sales@acme.example.org'])
    assert.deepEqual(general?.phones, ['+12125550101'])
    assert.match(general?.socialProfiles[0] ?? '', /linkedin\.com\/company\/acme/)
    assert.equal(
      general?.evidence.find((item) => item.field === 'email')?.sourceUrl,
      'https://acme.example.org/contact',
    )
    assert.equal(
      result.organization?.evidence.find(
        (item) => item.field === 'email' && item.value === 'sales@acme.example.org',
      )?.extractionMethod,
      'mailto',
    )
    assert.deepEqual(result.sameOriginLinks, [
      'https://acme.example.org/about/team',
    ])
  })

  it('extracts supplier and intermediary candidates only from relationship pages', () => {
    const result = extractPublicBusinessPage(
      `
        <title>Authorized distributors and suppliers</title>
        <a href="https://northstar.example.net">Northstar Industrial</a>
        <a href="https://linkedin.com/company/northstar">LinkedIn</a>
        <a href="https://google.com/maps">Map</a>
      `,
      'https://manufacturer.example.org/distributors',
      'Manufacturer',
      '2026-08-03T00:00:00.000Z',
    )

    assert.equal(result.relatedBusinesses.length, 1)
    assert.equal(result.relatedBusinesses[0]?.name, 'Northstar Industrial')
    assert.equal(result.relatedBusinesses[0]?.relationship, 'distributor')
    assert.equal(
      result.relatedBusinesses[0]?.evidence[0]?.verificationStatus,
      'OBSERVED',
    )
  })

  it('does not invent an email from a name and company', () => {
    const result = extractPublicBusinessPage(
      '<title>Acme leadership</title><p>Alex Morgan, CEO of Acme</p>',
      'https://acme.example.org/team',
      'Acme',
    )
    assert.equal(result.contacts.length, 0)
    assert.deepEqual(result.organization?.emails, [])
  })
})

describe('bounded website discovery', () => {
  it('respects robots and only follows relevant same-origin links', async () => {
    const responses = new Map<string, string>([
      [
        'https://acme.example.org/robots.txt',
        'User-agent: *\nDisallow: /private*\n',
      ],
      [
        'https://acme.example.org/',
        '<a href="/contact">Contact</a><a href="/private/team">Private team</a><a href="/blog/post">Blog</a>',
      ],
      [
        'https://acme.example.org/contact',
        '<a href="mailto:hello@acme.example.org">hello</a>',
      ],
    ])
    const fetcher: typeof fetch = async (input) => {
      const url = String(input)
      const body = responses.get(url)
      return new Response(body ?? 'not found', {
        status: body === undefined ? 404 : 200,
        headers: {
          'content-type': url.endsWith('robots.txt')
            ? 'text/plain'
            : 'text/html',
        },
      })
    }
    const service = new PublicWebsiteDiscoveryService({
      fetcher,
      validateUrl: async () => {},
      cacheTtlMs: 0,
      maxPages: 4,
    })

    const result = await service.discover({
      seedUrls: ['https://acme.example.org/'],
      companyName: 'Acme',
    })

    assert.deepEqual(result.pagesVisited, [
      'https://acme.example.org/',
      'https://acme.example.org/contact',
    ])
    assert.equal(result.contacts[0]?.emails[0], 'hello@acme.example.org')
    assert.equal(
      result.errors.some((error) => error.url.includes('/private/team')),
      true,
    )
  })

  it('blocks a seed before fetching when URL validation fails', async () => {
    let fetchCalls = 0
    const service = new PublicWebsiteDiscoveryService({
      fetcher: async () => {
        fetchCalls += 1
        return new Response('')
      },
      validateUrl: async () => {
        throw new Error('Private network address is blocked')
      },
    })
    const result = await service.discover({
      seedUrls: ['http://127.0.0.1/admin'],
    })
    assert.equal(result.status, 'BLOCKED')
    assert.equal(fetchCalls, 0)
  })
})

describe('robots parser', () => {
  it('retains wildcard allow and disallow rules', () => {
    assert.deepEqual(
      parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/public'),
      { disallow: ['/private'], allow: ['/private/public'] },
    )
  })

  it('prefers the explicit crawler group over the wildcard group', () => {
    assert.deepEqual(
      parseRobots(`
        User-agent: *
        Disallow: /wildcard-only

        User-agent: SalesRadarAI-PublicEvidenceBot
        Allow: /
        Disallow: /private
      `),
      { disallow: ['/private'], allow: ['/'] },
    )
  })
})
