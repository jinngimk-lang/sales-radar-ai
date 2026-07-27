import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { Industry, Platform, Region } from '@prisma/client'
import type { SearchResult } from '../src/providers/search/search-provider.interface.js'
import { LeadNormalizerService } from '../src/services/lead-normalizer.service.js'

const normalizer = new LeadNormalizerService()

function youtubeResult(
  title: string,
  rawContent: string,
  company: string | null = null,
): SearchResult {
  return {
    externalId: 'youtube-result',
    platform: Platform.YouTube,
    sourceUrl: 'https://youtube.com/watch?v=case',
    profileUrl: 'https://youtube.com/@industrial-channel',
    company,
    customerName: company ?? 'Industrial channel',
    country: 'United States',
    region: Region.USA,
    industry: Industry.IndustrialManufacturing,
    rawContent,
    metadata: {
      provider: 'agent-reach',
      title,
      author: company,
    },
  }
}

describe('YouTube Lead classification', () => {
  it('classifies a customer spotlight as company and selects the customer', () => {
    const lead = normalizer.normalize(
      youtubeResult(
        'GEW Customer Spotlight Nosco',
        'A customer case showing a packaging line automation application.',
        'GEW UV Curing',
      ),
      'agent-reach',
    )
    const metadata = lead.sourceMetadata as {
      leadType?: string
      companyName?: string
      contactName?: string | null
    }

    assert.equal(lead.company, 'Nosco')
    assert.equal(lead.displayName, 'Nosco')
    assert.equal(metadata.companyName, 'Nosco')
    assert.equal(metadata.contactName, null)
    assert.equal(metadata.leadType, 'company')
  })

  it('prefers the described pharmaceutical customer over the vendor', () => {
    const lead = normalizer.normalize(
      youtubeResult(
        'Cobots Pharmaceutical Products | FANUC Europe PHYTOPHARM',
        'Customer application showing cobots on a pharmaceutical production line.',
        'FANUC Europe',
      ),
      'agent-reach',
    )
    const metadata = lead.sourceMetadata as {
      relatedCompanies?: string[]
    }

    assert.equal(lead.company, 'PHYTOPHARM')
    assert.ok(metadata.relatedCompanies?.includes('FANUC Europe'))
    assert.ok(metadata.relatedCompanies?.includes('PHYTOPHARM'))
  })

  it('keeps a tutorial without a commercial subject as content', () => {
    const lead = normalizer.normalize(
      youtubeResult(
        'Top 10 Packaging Automation Tips Tutorial',
        'A beginner tutorial explaining packaging automation.',
      ),
      'agent-reach',
    )

    assert.equal(
      (lead.sourceMetadata as { leadType?: string }).leadType,
      'content',
    )
    assert.equal(lead.company, undefined)
  })
})
