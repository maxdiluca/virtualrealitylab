#!/usr/bin/env python3
"""Derive editorial navigation topics from local metadata, with auditable evidence.

Never edits publication content. Run before Hugo; --check detects stale outputs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import sys
import unicodedata

import yaml

ROOT = Path(__file__).resolve().parents[1]
TRUSTED_KEYWORDS = {'published', 'author-page'}


def normalize(value):
    value = unicodedata.normalize('NFKD', str(value)).casefold()
    value = ''.join(c for c in value if not unicodedata.combining(c))
    return ' '.join(re.sub(r'[^a-z0-9]+', ' ', value).split())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_yaml(path):
    # Duplicate keys are usually a typo and must not silently discard a rule.
    class Loader(yaml.SafeLoader):
        pass

    def mapping(loader, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            key = loader.construct_object(key_node, deep=deep)
            if key in result:
                raise ValueError(f'{path}: duplicate key {key!r}')
            result[key] = loader.construct_object(value_node, deep=deep)
        return result

    Loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, mapping)
    return yaml.load(path.read_text(), Loader=Loader)


def validate_vocabulary(vocab):
    if vocab.get('version') != 1:
        raise ValueError('Unsupported vocabulary version')
    groups = {g['id']: g for g in vocab['groups']}
    if len(groups) != len(vocab['groups']):
        raise ValueError('Duplicate topic group')
    topics, aliases = {}, {}
    for topic in vocab['topics']:
        key = topic['id']
        if key in topics or not re.fullmatch(r'[a-z0-9]+(?:[ -][a-z0-9]+)*', key):
            raise ValueError(f'Invalid or duplicate topic ID: {key}')
        if topic['group'] not in groups or not topic.get('definition') or not topic.get('label'):
            raise ValueError(f'Missing group, label or definition: {key}')
        for name in [key, topic['label'], *topic.get('aliases', [])]:
            alias = normalize(name)
            if not alias or (alias in aliases and aliases[alias] != key):
                raise ValueError(f'Ambiguous or empty alias: {name}')
            aliases[alias] = key
        for field in ['aliases', 'title_terms', 'title_acronyms']:
            if not isinstance(topic.get(field, []), list) or any(not isinstance(x, str) or not x.strip() for x in topic.get(field, [])):
                raise ValueError(f'{key}: {field} must be a list of nonempty strings')
        topics[key] = topic
    def visit(key, chain):
        if key in chain:
            raise ValueError(f'Cycle in broader topics: {chain + [key]}')
        for parent in topics[key].get('broader', []):
            if parent not in topics:
                raise ValueError(f'Unknown broader topic: {parent}')
            visit(parent, chain + [key])
    for key in topics:
        visit(key, [])
    return topics, aliases


def phrase_match(text, phrase):
    return re.search(r'(?<!\w)' + re.escape(normalize(phrase)) + r'(?!\w)', normalize(text))


def signals(text, topic):
    """Bounded phrases; acronyms require their declared case in prose."""
    found = [term for term in topic.get('title_terms', []) if phrase_match(text, term)]
    found += [term for term in topic.get('title_acronyms', []) if re.search(r'(?<!\w)' + re.escape(term) + r'(?!\w)', text)]
    return found


def uncertain_title(text):
    # This is a conservative review flag, not a general negation parser.
    return bool(re.search(r'\b(without|not|no|non)\b', normalize(text)))


def classify(record, vocab, overrides=None):
    topics, aliases = validate_vocabulary(vocab)
    evidence, suggestions, issues, excluded = {}, {}, [], {}
    title = record.get('title', '')
    if not isinstance(title, str) or not title.strip():
        raise ValueError('Publication title must be a nonempty string')
    for field in ['tags', 'keywords']:
        if not isinstance(record.get(field, []), list) or any(not isinstance(x, str) for x in record.get(field, [])):
            raise ValueError(f'{field} must be a list of strings')

    def add(target, key, field, quote, rule):
        entry = dict(field=field, quote=quote, rule=rule)
        if entry not in target.setdefault(key, []):
            target[key].append(entry)

    for tag in record.get('tags', []):
        key = aliases.get(normalize(tag))
        if key:
            add(evidence, key, 'tags', tag, 'existing-editorial-tag')
        else:
            issues.append(f'Unknown tag {tag!r}: choose a canonical topic or extend the vocabulary')

    for key, topic in topics.items():
        for term in signals(title, topic):
            target = suggestions if uncertain_title(title) else evidence
            add(target, key, 'title', title, f'title phrase: {term}')
        for keyword in record.get('keywords', []):
            # Full-keyword equivalence is intentionally stricter than prose matching.
            if aliases.get(normalize(keyword)) == key:
                target = evidence if record.get('keywords_kind') in TRUSTED_KEYWORDS else suggestions
                add(target, key, 'keywords', keyword, f"keyword ({record.get('keywords_kind', 'unverified')})")
        abstract = record.get('abstract', '') or ''
        for term in signals(abstract, topic):
            # Keep an excerpt for review; never assign from an incidental abstract mention.
            sentences = re.split(r'(?<=[.!?])\s+', abstract)
            excerpt = next((s for s in sentences if signals(s, dict(title_terms=[term], title_acronyms=[term]))), abstract)
            add(suggestions, key, 'abstract', excerpt, f'abstract phrase: {term}')

    overrides = overrides or {}
    if set(overrides) - {'include', 'exclude'}:
        raise ValueError('Overrides support only include and exclude')
    seen = set()
    for action in ['include', 'exclude']:
        for entry in overrides.get(action, []):
            key = entry['topic']
            if key not in topics or key in seen:
                raise ValueError(f'Unknown, duplicate or conflicting override: {key}')
            seen.add(key)
            if action == 'exclude':
                if not entry.get('reason', '').strip():
                    raise ValueError(f'Exclusion needs a reason: {key}')
                excluded[key] = entry['reason']
                evidence.pop(key, None)
            else:
                field, quote = entry.get('field'), entry.get('quote', '')
                if field not in {'title', 'abstract', 'keywords'} or not normalize(quote):
                    raise ValueError(f'Addition needs a source field and quote: {key}')
                source = record.get(field, '')
                source = '\n'.join(source) if isinstance(source, list) else source
                if not phrase_match(source, quote):
                    raise ValueError(f'Override quote no longer occurs in {field}: {key}')
                add(evidence, key, field, quote, 'reviewed-addition')
    # Broader concepts are explicit vocabulary relationships, not inferred synonyms.
    def inherit(key):
        for parent in topics[key].get('broader', []):
            if parent not in excluded:
                add(evidence, parent, 'vocabulary', key, 'broader-topic relationship')
                inherit(parent)
    for key in list(evidence):
        inherit(key)
    suggestions = {k: v for k, v in suggestions.items() if k not in evidence and k not in excluded}
    if not evidence:
        issues.append('No supported topics: add source keywords, a recognised editorial tag, or a reviewed addition')
    ignored = {normalize(k) for k in vocab.get('ignore_keywords', [])}
    unmatched = [k for k in record.get('keywords', []) if normalize(k) not in aliases and normalize(k) not in ignored]
    return dict(topics=sorted(evidence), evidence=evidence, suggestions=suggestions, exclusions=excluded, unmatched_keywords=unmatched, issues=issues)


def frontmatter(path):
    text = path.read_text()
    parts = re.split(r'^---\s*$', text, maxsplit=2, flags=re.M)
    if len(parts) != 3 or parts[0].strip():
        raise ValueError(f'{path}: expected YAML front matter')
    record = yaml.safe_load(parts[1])
    if not isinstance(record, dict):
        raise ValueError(f'{path}: front matter must be a mapping')
    return record


def generate(root):
    vocab_path = root / 'data/publication_topics.yaml'
    overrides_path = root / 'data/publication_topic_overrides.yaml'
    vocab = load_yaml(vocab_path)
    topics, aliases = validate_vocabulary(vocab)
    overrides = load_yaml(overrides_path) or {}
    index = dict(version=1, vocabulary_hash=digest(vocab_path), overrides_hash=digest(overrides_path),
                 engine_hash=digest(Path(__file__)), groups=[], topics={}, aliases=aliases, publications={})
    for group in vocab['groups']:
        index['groups'].append(dict(**group, topics=[k for k,t in topics.items() if t['group']==group['id']]))
    for key, topic in topics.items():
        index['topics'][key] = {k: topic[k] for k in ['label', 'group', 'definition']}
        index['topics'][key]['search_terms'] = [key, topic['label'], *topic.get('aliases', [])]
    report = ['# Publication topic audit', '', 'Generated from local metadata. Assignments are editorial navigation labels, not author keywords or claims about results.',
              '', 'Abstract-only and unverified-keyword matches are suggestions, not published labels. No probabilistic confidence scores are used.', '']
    problems, seen = [], set()
    candidate_count = unmatched_count = 0
    for path in sorted((root/'content/publication').glob('*/index.md')):
        slug = path.parent.name
        seen.add(slug)
        record = frontmatter(path)
        review = overrides.get(slug, {})
        if review and review.get('source_hash') != digest(path):
            raise ValueError(f'{slug}: reviewed topic decisions are stale; re-review the overrides and update source_hash')
        result = classify(record, vocab, {k:v for k,v in review.items() if k != 'source_hash'})
        # Read all bundles, including drafts/future items; Hugo alone determines visibility.
        index['publications'][slug] = dict(source_hash=digest(path), topics=result['topics'])
        report.extend([f'## {slug}', '', record['title'], ''])
        for key in result['topics']:
            report.append(f"- **{topics[key]['label']}**")
            for ev in result['evidence'][key]:
                quote = ev['quote'].replace('\n',' ')
                report.append(f"  - {ev['field']} / {ev['rule']}: {quote}")
        candidate_count += len(result['suggestions'])
        unmatched_count += len(result['unmatched_keywords'])
        if result['suggestions']:
            report.extend(['', 'Review candidates (not assigned):', ''])
            for key, evs in sorted(result['suggestions'].items()):
                report.append(f"- **{topics[key]['label']}** — {evs[0]['field']}: {evs[0]['quote'].replace(chr(10), ' ')}")
        if result['unmatched_keywords']:
            report.extend(['', 'Unmapped source keywords (possible vocabulary extensions, not automatically assigned):', '', ', '.join(result['unmatched_keywords'])])
        if result['exclusions']:
            report.extend(['', 'Reviewed exclusions:', ''])
            report.extend(f'- {topics[key]["label"]}: {reason}' for key, reason in result['exclusions'].items())
        problems.extend(f'{slug}: {issue}' for issue in result['issues'])
        report.extend([''] + [f'ERROR: {issue}' for issue in result['issues']] + [''])
    unknown_overrides = set(overrides) - seen
    if unknown_overrides:
        problems.append(f'Overrides refer to missing papers: {sorted(unknown_overrides)}')
    if problems:
        raise ValueError('\n'.join(problems))
    index['review_summary'] = dict(candidate_assignments=candidate_count, unmapped_keyword_values=unmatched_count)
    report[6:6] = [f'Review queue: {candidate_count} candidate assignments and {unmatched_count} unmapped keyword values. Unmapped keywords can be specific details rather than useful navigation concepts.', '']
    return json.dumps(index, ensure_ascii=False, indent=2, sort_keys=True)+'\n', '\n'.join(report)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='fail if generated files are stale; do not write')
    args = parser.parse_args()
    try:
        index, report = generate(ROOT)
        outputs = {ROOT/'data/publication_topic_index.json': index, ROOT/'docs/publication-topic-audit.md': report}
        stale = [str(p.relative_to(ROOT)) for p,text in outputs.items() if not p.exists() or p.read_text()!=text]
        if args.check and stale:
            raise ValueError('Stale topic outputs; run python3 scripts/build-publication-topics.py: '+', '.join(stale))
        if not args.check:
            for path, text in outputs.items():
                if not path.exists() or path.read_text()!=text:
                    path.write_text(text)
        result = json.loads(index)
        print(f"Publication topics: {len(result['publications'])} papers; {len(result['topics'])} defined concepts; {'checked' if args.check else 'generated'} index and evidence audit.")
        print(f"Review queue: {result['review_summary']['candidate_assignments']} candidate assignments; {result['review_summary']['unmapped_keyword_values']} unmapped keyword values. See docs/publication-topic-audit.md.")
    except (ValueError, KeyError, TypeError, yaml.YAMLError) as error:
        print(f'Publication topics: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
