from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Expected snippet not found in {path}: {old!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/features/market-intelligence/MarketBrowserWorkspace.tsx',
    'query={session?.target.product ?? title}',
    'query={title}',
)
replace_once(
    'src/pages/AICommandCenterPage.tsx',
    '}) as ChatSession)',
    '}) as unknown as ChatSession)',
)

print('Fixed frontend type contracts.')
