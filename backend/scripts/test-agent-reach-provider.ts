import { Platform, Region } from '@prisma/client'
import { AgentReachProvider } from '../src/providers/search/agent-reach.provider.js'

async function main() {
  const keyword =
    process.argv.slice(2).join(' ').trim() ||
    'industrial automation suppliers USA'

  const provider = new AgentReachProvider()
  const results = await provider.search({
    keyword,
    platforms: [Platform.Reddit, Platform.X, Platform.YouTube],
    regions: [Region.USA],
  })

  console.log(`Agent Reach returned ${results.length} public results`)
  for (const result of results) {
  console.log('\n---')
  console.log(`来源: ${result.platform}`)
  console.log(`URL: ${result.sourceUrl}`)
  console.log(`公司: ${result.company ?? '未知'}`)
  console.log(`原始内容: ${result.rawContent}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
