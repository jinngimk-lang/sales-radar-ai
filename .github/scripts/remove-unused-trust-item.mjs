import { readFileSync, writeFileSync } from 'node:fs'

const path = 'src/features/revenue/RevenueLiveOpsPanel.tsx'
const source = readFileSync(path, 'utf8')
const pattern = /\nfunction TrustItem\([\s\S]*?\n}\n(?=\nfunction |\nconst |\nexport |$)/
if (!pattern.test(source)) {
  throw new Error('TrustItem function block was not found')
}
writeFileSync(path, source.replace(pattern, '\n'))
console.log('Removed unused TrustItem helper.')
