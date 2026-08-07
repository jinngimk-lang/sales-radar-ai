from pathlib import Path

path = Path('src/features/market-intelligence/MarketBrowserWorkspace.tsx')
text = path.read_text(encoding='utf-8')
old = "网页快照已按完整桌面宽度适配；上下滚动查看页面"
new = "不可交互网页快照已按桌面宽度适配；上下滚动仅用于核对公开页面"
if old not in text:
    raise RuntimeError('Snapshot label seam not found')
path.write_text(text.replace(old, new, 1), encoding='utf-8')
print('Clarified static snapshot label.')
