"""Guard inventory omissions and preserve the independent review annotations."""
import csv
import contextlib
import io
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build_inventory as inventory


class InventoryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name).resolve()
        self.addCleanup(self.directory.cleanup)

    def source(self, text):
        path = self.root / 'registry.ts'
        path.write_text(text)
        (self.root / 'node.ts').write_text('export const source = {};')
        return path

    def parse(self, text):
        with patch.object(inventory, 'ROOT', self.root):
            return inventory.registry_bindings(self.source(text), 'registry')

    def test_alias_and_nested_module_resolve_without_name_guess(self):
        (self.root / 'nested').mkdir()
        (self.root / 'nested/node.ts').write_text('export const source = {};')
        rows = self.parse('''import { source as named } from "./nested/node.ts";
export const registry: NodeRegistry = {
  renamed: named,
};''')
        self.assertEqual(rows, [{'key': 'renamed', 'exported': 'source',
                                'module': (self.root / 'nested/node.ts').as_uri()}])

    def test_spread_or_computed_registry_entry_fails_instead_of_disappearing(self):
        for entry in ['...other', '[dynamic]: source', 'node: makeNode()']:
            with self.subTest(entry=entry), self.assertRaises(ValueError):
                self.parse(f'''import {{ source }} from "./node.ts";
export const registry = {{
  {entry},
}};''')

    def test_duplicate_key_fails(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate registry key'):
            self.parse('''import { source } from "./node.ts";
export const registry = {
  node: source,
  node: source,
};''')

    def test_changed_start_factory_requires_review(self):
        with self.assertRaisesRegex(ValueError, 'start factory'):
            self.parse('''import { source } from "./node.ts";
const unknownStart = source;
export const registry = {
  start: unknownStart,
};''')


    def test_imported_start_is_resolved_for_runtime_identity_check(self):
        rows = self.parse('''import { source as sourceStart2026 } from "./node.ts";
export const registry = {
  start: sourceStart2026,
};''')
        self.assertEqual(rows[0]['exported'], 'source')
        self.assertEqual(rows[0]['key'], 'start')

    def test_descriptor_spread_fails(self):
        path = self.source('''import { source } from "./node.ts";
export const ALL = [
  source,
  ...extra,
] as const;''')
        with patch.object(inventory, 'ROOT', self.root), self.assertRaises(ValueError):
            inventory.descriptor_bindings(path, 'ALL')

    def test_notes_preserve_review_text_and_reject_duplicates(self):
        path = self.root / 'notes.csv'
        row = {'node_type': 'ira', 'priority': 'P0', '2026_disposition': 'audit-required',
               'progress_or_next_action': 'Keep owner basis, conversions → 1040; filing open.'}
        path.write_text(inventory.csv_text([row], list(row)))
        self.assertEqual(inventory.review_notes(path)['ira'], row)
        path.write_text(inventory.csv_text([row, row], list(row)))
        with self.assertRaisesRegex(ValueError, 'duplicate'):
            inventory.review_notes(path)

    def test_empty_gap_inventory_keeps_headers(self):
        text = inventory.csv_text([], ['source', 'target', 'in_2025_registry'])
        self.assertEqual(text, 'source,target,in_2025_registry\n')
        self.assertEqual(list(csv.DictReader(text.splitlines())), [])

    def test_stale_check_returns_failure_without_writing(self):
        path = self.root / 'ledger.csv'
        path.write_text('existing reviewable artifact\n')
        with patch.object(inventory, 'OUT', self.root), \
                patch.object(inventory, 'build', return_value={
                    'ledger.csv': 'replacement\n', 'missing.csv': 'new\n'}), \
                patch('sys.argv', ['build_inventory.py', '--check']), \
                contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(inventory.main(), 1)
        self.assertEqual(path.read_text(), 'existing reviewable artifact\n')
        self.assertFalse((self.root / 'missing.csv').exists())


if __name__ == '__main__':
    unittest.main()
