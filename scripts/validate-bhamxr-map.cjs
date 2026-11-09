#!/usr/bin/env node
'use strict';

// Usage: node scripts/validate-bhamxr-map.cjs static/bhamxr-map/members.json
// Optional: --expected-members 116 --expected-groups 7
// Counts are deliberately optional so an ordinary CMS edit can add members.
const fs = require('node:fs');

const KEYS = {
  root: ['updated', 'title', 'intro', 'groups', 'people'],
  group: ['id', 'short', 'label', 'topics'],
  person: ['id', 'name', 'affiliation', 'summary', 'interests', 'methods', 'groups'],
};
const normalize = value => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

function validateMap(data, { expectedMembers, expectedGroups } = {}) {
  const errors = [];
  const fail = message => errors.push(message);
  const object = (value, path, allowed) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      fail(`${path} must be an object`);
      return false;
    }
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) fail(`${path}.${key} is not an allowed public field`);
    }
    for (const key of allowed) {
      if (!Object.prototype.hasOwnProperty.call(value, key)) fail(`${path}.${key} is required`);
    }
    return true;
  };
  const string = (value, path) => {
    if (typeof value !== 'string' || !value.trim()) {
      fail(`${path} must be a nonempty string`);
      return false;
    }
    return true;
  };
  const strings = (value, path, allowEmpty = false) => {
    if (!Array.isArray(value)) {
      fail(`${path} must be an array`);
      return false;
    }
    if (!allowEmpty && value.length === 0) fail(`${path} must not be empty`);
    const seen = new Set();
    value.forEach((entry, index) => {
      if (!string(entry, `${path}[${index}]`)) return;
      const key = normalize(entry);
      if (seen.has(key)) fail(`${path} contains a duplicate value: ${entry}`);
      seen.add(key);
    });
    return true;
  };
  const identifier = (value, path) => {
    if (string(value, path) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      fail(`${path} must be a lowercase slug`);
    }
  };
  const unique = (value, seen, path) => {
    if (typeof value !== 'string' || !value.trim()) return;
    const key = normalize(value);
    if (seen.has(key)) fail(`${path} duplicates ${seen.get(key)}: ${value}`);
    else seen.set(key, path);
  };
  const count = (actual, expected, label) => {
    if (expected === undefined) return;
    if (!Number.isSafeInteger(expected) || expected < 1) fail(`${label} expected count must be a positive integer`);
    else if (actual !== expected) fail(`${label}: expected ${expected}, found ${actual}`);
  };

  if (!object(data, 'map', KEYS.root)) return errors;
  for (const key of ['updated', 'title', 'intro']) string(data[key], `map.${key}`);
  if (typeof data.updated === 'string') {
    const date = new Date(`${data.updated}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.updated) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== data.updated) {
      fail('map.updated must be a valid YYYY-MM-DD date');
    }
  }
  const groups = Array.isArray(data.groups) ? data.groups : [];
  const people = Array.isArray(data.people) ? data.people : [];
  if (!Array.isArray(data.groups) || !groups.length) fail('map.groups must be a nonempty array');
  if (!Array.isArray(data.people) || !people.length) fail('map.people must be a nonempty array');
  count(groups.length, expectedGroups, 'Groups');
  count(people.length, expectedMembers, 'Members');

  const groupIds = new Map();
  const groupLabels = new Map();
  groups.forEach((group, index) => {
    const path = `map.groups[${index}]`;
    if (!object(group, path, KEYS.group)) return;
    identifier(group.id, `${path}.id`);
    unique(group.id, groupIds, `${path}.id`);
    for (const key of ['short', 'label', 'topics']) string(group[key], `${path}.${key}`);
    unique(group.label, groupLabels, `${path}.label`);
  });
  const personIds = new Map();
  const personNames = new Map();
  people.forEach((person, index) => {
    const path = `map.people[${index}]`;
    if (!object(person, path, KEYS.person)) return;
    identifier(person.id, `${path}.id`);
    unique(person.id, personIds, `${path}.id`);
    for (const key of ['name', 'affiliation', 'summary']) string(person[key], `${path}.${key}`);
    unique(person.name, personNames, `${path}.name`);
    strings(person.interests, `${path}.interests`);
    // Unestablished methods stay empty; do not invent methods to satisfy a build.
    strings(person.methods, `${path}.methods`, true);
    if (strings(person.groups, `${path}.groups`)) {
      person.groups.forEach((id, groupIndex) => {
        if (typeof id === 'string' && !groups.some(group => group && group.id === id)) {
          fail(`${path}.groups[${groupIndex}] refers to an unknown group: ${id}`);
        }
      });
    }
  });
  return errors;
}

function main(argv) {
  const usage = 'Usage: node validate-bhamxr-map.cjs <members.json> [--expected-members N] [--expected-groups N]';
  if (argv.length === 1 && ['--help', '-h'].includes(argv[0])) {
    console.log(usage);
    return 0;
  }
  const file = argv[0];
  if (!file || file.startsWith('-')) throw new Error(usage);
  const options = {};
  const flags = { '--expected-members': 'expectedMembers', '--expected-groups': 'expectedGroups' };
  for (let index = 1; index < argv.length; index += 2) {
    const option = flags[argv[index]];
    const value = argv[index + 1];
    if (!option || value === undefined || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || options[option] !== undefined) {
      throw new Error(`Invalid or duplicate option: ${argv[index]}\n${usage}`);
    }
    options[option] = Number(value);
  }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const errors = validateMap(data, options);
  if (errors.length) {
    console.error(`BhamXR public data validation failed (${errors.length}):\n${errors.map(error => `- ${error}`).join('\n')}`);
    return 1;
  }
  console.log(`BhamXR public data valid: ${data.people.length} people, ${data.groups.length} themes (${file}).`);
  return 0;
}

module.exports = { validateMap };
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { console.error(`BhamXR public data validation failed: ${error.message}`); process.exitCode = 1; }
}
