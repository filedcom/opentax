#!/usr/bin/env python3
"""Inventory the loaded TY2025 product and TY2026 graph; never certify parity.

Run from any directory. --check compares without writing. Review annotations live
in inventories/node-review.csv and are never overwritten by this generator.
"""
import argparse
import csv
import io
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DOCS = ROOT / 'docs/ty2026'
OUT = DOCS / 'inventories'
IDENTIFIER = r'[A-Za-z_$][A-Za-z0-9_$]*'


def imports(path):
    """Read named relative imports; the runtime probe verifies object identity."""
    bindings = {}
    for names, module in re.findall(
        r'import\s*\{([^{}]+)\}\s*from\s*"([^"]+)"\s*;', path.read_text()
    ):
        if not module.startswith('.'):
            continue
        target = (path.parent / module).resolve()
        target.relative_to(ROOT)
        if not target.is_file():
            raise ValueError(f'Missing import: {target}')
        for item in names.split(','):
            item = item.strip()
            if not item or item.startswith('type '):
                continue
            match = re.fullmatch(f'({IDENTIFIER})(?:\\s+as\\s+({IDENTIFIER}))?', item)
            if not match:
                raise ValueError(f'Unrecognized import in {path}: {item}')
            exported, alias = match.groups()
            name = alias or exported
            if name in bindings:
                raise ValueError(f'Duplicate import: {name}')
            bindings[name] = {'module': target.as_uri(), 'exported': exported}
    return bindings


def declaration_entries(path, name, opener, closer):
    pattern = rf'export const {name}(?:\s*:[^=]+)?\s*=\s*{re.escape(opener)}(.*?){re.escape(closer)}\s*(?:as const\s*)?;'
    match = re.search(pattern, path.read_text(), re.S)
    if not match:
        raise ValueError(f'Cannot parse {name} in {path}')
    lines = []
    for line in match.group(1).splitlines():
        code = line.split('//', 1)[0].strip().removesuffix(',')
        if code:
            lines.append(code)
    if not lines:
        raise ValueError(f'Empty inventory: {name}')
    return lines


def registry_bindings(path, name):
    bindings = imports(path)
    result = []
    for code in declaration_entries(path, name, '{', '}'):
        # These two explicit factory declarations are the only non-imported nodes.
        if code == 'start' and re.search(r'const start = buildStartNode\(inputNodes\);', path.read_text()):
            key, binding = 'start', 'buildStartNode'
        elif code == 'start: buildStartNode(inputNodes, { routeLegacyJointSeOwners: false })':
            key, binding = 'start', 'buildStartNode'
        else:
            match = re.fullmatch(f'({IDENTIFIER})(?:\\s*:\\s*({IDENTIFIER}))?', code)
            if not match:
                raise ValueError(f'Unrecognized registry entry: {code}')
            key, binding = match.group(1), match.group(2) or match.group(1)
            if key == 'start' and binding not in bindings:
                raise ValueError('Unrecognized start factory; review inventory mapping')
        if binding not in bindings:
            raise ValueError(f'Unresolved node: {key}: {binding}')
        result.append({'key': key, **bindings[binding]})
    if len({r['key'] for r in result}) != len(result):
        raise ValueError('Duplicate registry key')
    return result


def descriptor_bindings(path, name):
    bindings = imports(path)
    result = []
    for index, symbol in enumerate(declaration_entries(path, name, '[', ']')):
        if not re.fullmatch(IDENTIFIER, symbol) or symbol not in bindings:
            raise ValueError(f'Unresolved descriptor: {symbol}')
        result.append({'key': str(index), 'symbol': symbol, **bindings[symbol]})
    return result


def relative(binding):
    from urllib.parse import unquote, urlparse
    return Path(unquote(urlparse(binding['module']).path)).relative_to(ROOT).as_posix()


def csv_text(rows, fields):
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fieldnames=fields, lineterminator='\n')
    writer.writeheader()
    writer.writerows(rows)
    return output.getvalue()


def review_notes(path):
    with path.open(newline='') as handle:
        rows = list(csv.DictReader(handle))
    fields = {'node_type', 'priority', '2026_disposition', 'progress_or_next_action'}
    result = {}
    for row in rows:
        if set(row) != fields or not all(row.values()) or row['node_type'] in result:
            raise ValueError(f'Invalid or duplicate review annotation: {row}')
        if row['priority'] not in {'P0', 'P1', 'P2'}:
            raise ValueError(f'Invalid priority: {row}')
        result[row['node_type']] = row
    return result


def build():
    request = {
        'nodes2025': registry_bindings(ROOT / 'forms/f1040/2025/registry.ts', 'registry'),
        'nodes2026': registry_bindings(ROOT / 'forms/f1040/2026/source-registry.ts', 'sourceRegistry2026'),
        'pdf': descriptor_bindings(ROOT / 'forms/f1040/2025/pdf/forms/index.ts', 'ALL_PDF_FORMS'),
        'mef': descriptor_bindings(ROOT / 'forms/f1040/2025/mef/forms/index.ts', 'ALL_MEF_FORMS'),
    }
    probe = subprocess.run(
        ['deno', 'run', '--cached-only', '--frozen', '--allow-read', str(DOCS / 'tooling/runtime_inventory.ts')],
        cwd=ROOT, input=json.dumps(request), text=True, capture_output=True, check=True,
    )
    runtime = json.loads(probe.stdout)
    notes = review_notes(OUT / 'node-review.csv')
    current_keys = {row['key'] for row in runtime['nodes2025']}
    orphaned = set(notes) - current_keys
    if orphaned:
        raise ValueError(f'Review notes refer to removed nodes; reconcile explicitly: {sorted(orphaned)}')
    manifest = json.loads((DOCS / 'corpus/manifest.json').read_text())
    drafts = {Path(f['path']).stem for f in manifest['files']
              if f['kind'] == 'draft-form' and f['status'] == 'downloaded'}
    artifacts = {}
    pdf_rows, mef_rows = [], []
    for key, rows in [('pdf', pdf_rows), ('mef', mef_rows)]:
        if len(request[key]) != len(runtime[key]):
            raise ValueError(f'Runtime descriptor count mismatch: {key}')
        for index, (binding, loaded) in enumerate(zip(request[key], runtime[key]), 1):
            path = relative(binding)
            if key == 'pdf':
                slug = re.search(r'/([a-z0-9]+)(?:--\d{4})?\.pdf(?:$|\?)', loaded['url'])
                rows.append(dict(component=Path(path).stem, pdf_descriptor=path,
                    ty2025_pdf_url=loaded['url'], irs_slug=slug.group(1) if slug else '',
                    ty2026_draft_snapshot='yes' if slug and slug.group(1) in drafts else 'no',
                    sequence=index, symbol=binding['symbol'], pending_key=loaded['pending_key']))
            else:
                rows.append(dict(sequence=index, symbol=binding['symbol'],
                    pending_key=loaded['pending_key'], ty2025_module=path))
    artifacts['pdf-coverage.csv'] = csv_text(pdf_rows, list(pdf_rows[0]))
    artifacts['mef-descriptor-coverage.csv'] = csv_text(mef_rows, list(mef_rows[0]))
    modules = sorted({r['ty2025_module'] for r in mef_rows})
    artifacts['mef-coverage.csv'] = csv_text(
        [dict(component=Path(p).stem, ty2025_serializer=p) for p in modules],
        ['component', 'ty2025_serializer'])
    pdf_keys = {r['pending_key'] for r in pdf_rows}
    mef_keys = {r['pending_key'] for r in mef_rows}
    draft_keys = {r['pending_key'] for r in pdf_rows if r['ty2026_draft_snapshot'] == 'yes'}
    node_rows = []
    for binding in request['nodes2025']:
        key = binding['key']
        path = relative(binding)
        content = (ROOT / path).read_text()
        group = path.split('/nodes/', 1)[1].split('/')[0] if '/nodes/' in path else 'year-specific'
        note = notes.get(key, dict(priority='P1', **{
            '2026_disposition': 'audit-required',
            'progress_or_next_action': 'New since the reviewed baseline: assign a 2026 route owner; audit source intake, shared calculation, graph outputs, PDF/MeF and return evidence.'}))
        node_rows.append(dict(node_type=key, ty2025_source=path, group=group,
            **{'2025_mentions_in_module': sum('2025' in line for line in content.splitlines())},
            uses_ctx_tax_year='yes' if 'ctx.taxYear' in content else 'no',
            ty2025_mef_module='yes' if key in mef_keys else 'no',
            ty2025_pdf_descriptor='yes' if key in pdf_keys else 'no',
            ty2026_draft_snapshot='yes' if key in draft_keys else 'no' if key in pdf_keys else 'n/a',
            **{k: note[k] for k in ['priority', '2026_disposition', 'progress_or_next_action']}))
    artifacts['node-coverage.csv'] = csv_text(node_rows, list(node_rows[0]))
    literals = []
    for path in sorted((ROOT / 'forms/f1040/nodes').rglob('*.ts')):
        if path.name.endswith('.test.ts') or '/config/' in str(path):
            continue
        for number, line in enumerate(path.read_text().splitlines(), 1):
            if '2025' in line:
                literals.append(dict(file=path.relative_to(ROOT).as_posix(), line=number, source_excerpt=line.strip()[:180]))
    artifacts['year-literals.csv'] = csv_text(literals, ['file', 'line', 'source_excerpt'])
    keys2026 = {row['key'] for row in runtime['nodes2026']}
    edges = sorted({(row['key'], target) for row in runtime['nodes2026'] for target in row['targets']})
    artifacts['graph-routes.csv'] = csv_text([
        dict(source=s, target=t, target_registered='yes' if t in keys2026 else 'no') for s, t in edges
    ], ['source', 'target', 'target_registered'])
    gaps = [(s, t) for s, t in edges if t not in keys2026]
    artifacts['graph-route-gaps.csv'] = csv_text([
        dict(source=s, target=t, in_2025_registry='yes' if t in current_keys else 'no') for s, t in gaps
    ], ['source', 'target', 'in_2025_registry'])
    for binding, node in zip(request['nodes2026'], runtime['nodes2026']):
        node['source_module'] = relative(binding)
    artifacts['runtime-surface.json'] = json.dumps({
        'scope': 'Loaded registrations and declared edges only; not branch parity or filing acceptance.',
        'ty2025': dict(registry_nodes=len(node_rows), pdf_descriptors=len(pdf_rows),
            mef_modules=len(modules), mef_descriptors=len(mef_rows),
            nodes_without_review_notes=sorted(current_keys - set(notes))),
        'ty2026': dict(registry_nodes=len(keys2026), declared_edges=len(edges),
            unregistered_target_edges=len(gaps), nodes=runtime['nodes2026']),
    }, indent=2) + '\n'
    return artifacts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Exit nonzero for stale artifacts; write nothing.')
    args = parser.parse_args()
    # Build and validate everything before opening any output for writing.
    artifacts = build()
    stale = [name for name, content in artifacts.items()
             if not (OUT / name).exists() or (OUT / name).read_text() != content]
    if args.check:
        if stale:
            print('Stale inventory: ' + ', '.join(stale))
            return 1
        print('Runtime inventories are current.')
    else:
        for name in stale:
            (OUT / name).write_text(artifacts[name])
        print(f'Refreshed {len(stale)} inventories in {OUT.relative_to(ROOT)}.')
    summary = json.loads(artifacts['runtime-surface.json'])
    print(json.dumps({year: {k: v for k, v in summary[year].items() if k != 'nodes'}
                      for year in ['ty2025', 'ty2026']}, indent=2))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        raise SystemExit(f'Runtime inventory failed (no outputs written):\n{error.stderr}')
