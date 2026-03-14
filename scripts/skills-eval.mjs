#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "by",
  "for",
  "from",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "so",
  "that",
  "the",
  "their",
  "this",
  "to",
  "use",
  "when",
  "with",
  "without",
  "while",
  "your",
  "you",
  "should",
  "can",
  "needs",
  "need",
  "asked",
  "request",
  "user",
]);

const DEFAULTS = {
  fixtures: "tests/skills/fixtures/invocation-regression.ndjson",
  topK: 3,
  write: "",
  json: "",
  skillsRoot: ".agents/skills",
};

function parseArgs(argv) {
  const opts = { ...DEFAULTS };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--fixtures") {
      opts.fixtures = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--top-k") {
      const value = Number(argv[i + 1]);
      opts.topK =
        Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULTS.topK;
      i += 1;
      continue;
    }
    if (arg === "--write") {
      opts.write = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--json") {
      opts.json = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--skills-root") {
      opts.skillsRoot = argv[i + 1];
      i += 1;
    }
  }
  return opts;
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractFrontmatter(content, filePath) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    throw new Error(`Missing frontmatter in ${filePath}`);
  }
  const frontmatter = match[1];
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const descriptionMatch = frontmatter.match(/^description:\s*(.+)$/m);
  if (!nameMatch || !descriptionMatch) {
    throw new Error(`Missing name/description in frontmatter for ${filePath}`);
  }
  return {
    name: nameMatch[1].trim(),
    description: descriptionMatch[1].trim(),
  };
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function unique(tokens) {
  return [...new Set(tokens)];
}

function normalizePhrase(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cosineLike(promptTokens, skillTokens) {
  if (promptTokens.length === 0 || skillTokens.length === 0) {
    return 0;
  }
  const promptSet = new Set(promptTokens);
  let overlap = 0;
  for (const token of skillTokens) {
    if (promptSet.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.sqrt(promptTokens.length * skillTokens.length);
}

function parseDescriptionZones(description) {
  const lower = description.toLowerCase();
  const useIdx = lower.indexOf("use when");
  const avoidIdx = lower.indexOf("avoid when");
  const preferIdx = lower.indexOf("prefer");

  const core = useIdx >= 0 ? description.slice(0, useIdx) : description;
  let useWhen = "";
  if (useIdx >= 0) {
    const end = avoidIdx > useIdx ? avoidIdx : description.length;
    useWhen = description.slice(useIdx, end);
  }

  let avoidWhen = "";
  if (avoidIdx >= 0) {
    const end = preferIdx > avoidIdx ? preferIdx : description.length;
    avoidWhen = description.slice(avoidIdx, end);
  }

  let preferWhen = "";
  if (preferIdx >= 0) {
    preferWhen = description.slice(preferIdx);
  }

  return {
    core,
    useWhen,
    avoidWhen,
    preferWhen,
  };
}

function scorePrompt(prompt, skill) {
  const promptPhrase = normalizePhrase(prompt);
  const promptTokens = unique(tokenize(prompt));
  const coreTokens = unique(tokenize(skill.zones.core));
  const useTokens = unique(tokenize(skill.zones.useWhen));
  const avoidTokens = unique(tokenize(skill.zones.avoidWhen));
  const nameTokens = unique(tokenize(skill.name));

  const coreScore = cosineLike(promptTokens, coreTokens);
  const useScore = cosineLike(promptTokens, useTokens);
  const avoidScore = cosineLike(promptTokens, avoidTokens);

  let nameBoost = 0;
  const matchedNameTokens = nameTokens.filter((token) =>
    promptTokens.includes(token),
  ).length;

  if (nameTokens.length === 1) {
    if (matchedNameTokens === 1) {
      nameBoost = 0.35;
    }
  } else {
    const skillPhrase = normalizePhrase(skill.name);
    if (skillPhrase && promptPhrase.includes(skillPhrase)) {
      nameBoost = 0.5;
    } else if (matchedNameTokens === nameTokens.length) {
      nameBoost = 0.35;
    } else if (matchedNameTokens > 0) {
      nameBoost = 0.05 * matchedNameTokens;
    }
  }

  const total = coreScore + useScore * 1.6 - avoidScore * 0.6 + nameBoost;
  return {
    total,
    details: { coreScore, useScore, avoidScore, nameBoost },
  };
}

function loadSkills(skillsRoot) {
  const absRoot = path.resolve(skillsRoot);
  if (!fs.existsSync(absRoot)) {
    throw new Error(`Skills root not found: ${absRoot}`);
  }
  const dirs = fs.readdirSync(absRoot).sort();
  const skills = [];
  for (const dir of dirs) {
    const skillPath = path.join(absRoot, dir, "SKILL.md");
    if (!fs.existsSync(skillPath)) {
      continue;
    }
    const content = readFile(skillPath);
    const fm = extractFrontmatter(content, skillPath);
    const zones = parseDescriptionZones(fm.description);
    skills.push({
      dir,
      name: fm.name,
      description: fm.description,
      zones,
      filePath: skillPath,
    });
  }
  if (skills.length === 0) {
    throw new Error(`No skills discovered in ${absRoot}`);
  }
  return skills;
}

function loadFixtures(fixturesPath) {
  const absPath = path.resolve(fixturesPath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`Fixture file not found: ${absPath}`);
  }
  const lines = readFile(absPath)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.startsWith("#"));

  const fixtures = lines.map((line, idx) => {
    const data = JSON.parse(line);
    if (!data.id || !data.prompt || !Array.isArray(data.expectAny)) {
      throw new Error(`Invalid fixture at line ${idx + 1}`);
    }
    return {
      id: data.id,
      prompt: data.prompt,
      expectAny: data.expectAny,
      avoid: Array.isArray(data.avoid) ? data.avoid : [],
      notes: data.notes || "",
    };
  });

  if (fixtures.length === 0) {
    throw new Error(`No fixtures loaded from ${absPath}`);
  }
  return fixtures;
}

function evaluate(fixtures, skills, topK) {
  const rows = [];
  const confusion = new Map();
  const expectedMisses = new Map();

  let top1HitCount = 0;
  let recallAtKSum = 0;
  let avoidViolations = 0;

  for (const fixture of fixtures) {
    const ranked = skills
      .map((skill) => {
        const scored = scorePrompt(fixture.prompt, skill);
        return {
          skill: skill.name,
          score: scored.total,
          details: scored.details,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.skill.localeCompare(b.skill);
      });

    const top = ranked.slice(0, topK);
    const topNames = top.map((entry) => entry.skill);
    const hits = fixture.expectAny.filter((skill) => topNames.includes(skill));
    const recallAtK = fixture.expectAny.length
      ? hits.length / fixture.expectAny.length
      : 0;
    const top1Hit = fixture.expectAny.includes(top[0]?.skill);
    const avoidHits = fixture.avoid.filter((skill) => topNames.includes(skill));

    if (top1Hit) {
      top1HitCount += 1;
    }
    recallAtKSum += recallAtK;
    avoidViolations += avoidHits.length;

    if (!top1Hit && fixture.expectAny.length > 0 && top[0]) {
      const expected = fixture.expectAny[0];
      const predicted = top[0].skill;
      const key = `${expected} -> ${predicted}`;
      confusion.set(key, (confusion.get(key) || 0) + 1);
      expectedMisses.set(expected, (expectedMisses.get(expected) || 0) + 1);
    }

    rows.push({
      fixture,
      top,
      topNames,
      hits,
      recallAtK,
      top1Hit,
      avoidHits,
    });
  }

  const fixtureCount = fixtures.length;
  const summary = {
    fixtures: fixtureCount,
    skills: skills.length,
    topK,
    top1HitRate: fixtureCount ? top1HitCount / fixtureCount : 0,
    recallAtK: fixtureCount ? recallAtKSum / fixtureCount : 0,
    avoidViolationRate: fixtureCount ? avoidViolations / fixtureCount : 0,
  };

  const confusionRows = [...confusion.entries()]
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const missedSkillRows = [...expectedMisses.entries()]
    .map(([skill, count]) => ({ skill, count }))
    .sort((a, b) => b.count - a.count);

  return {
    summary,
    rows,
    confusionRows,
    missedSkillRows,
  };
}

function lintDescriptions(skills) {
  const issues = [];

  for (const skill of skills) {
    const description = skill.description;
    const hasUseWhen = /\bUse when\b/i.test(description);
    const hasAvoidWhen = /\bAvoid when\b/i.test(description);
    const hasPrefer = /\bPrefer\b/i.test(description);

    if (!hasUseWhen) {
      issues.push({
        severity: "error",
        skill: skill.name,
        issue: 'Description missing "Use when" segment.',
      });
    }

    if (!hasAvoidWhen && !hasPrefer) {
      issues.push({
        severity: "warning",
        skill: skill.name,
        issue:
          'Description missing both "Avoid when" and "Prefer ... when ..." boundary cues.',
      });
    }

    if (description.length > 420) {
      issues.push({
        severity: "warning",
        skill: skill.name,
        issue: `Description length ${description.length} exceeds 420 characters; tighten trigger density.`,
      });
    }
  }

  const overlapRows = [];
  for (let i = 0; i < skills.length; i += 1) {
    for (let j = i + 1; j < skills.length; j += 1) {
      const a = skills[i];
      const b = skills[j];
      const score = cosineLike(
        unique(tokenize(a.description)),
        unique(tokenize(b.description)),
      );
      if (score >= 0.47) {
        overlapRows.push({
          a: a.name,
          b: b.name,
          score,
        });
      }
    }
  }

  overlapRows.sort((x, y) => y.score - x.score);
  return { issues, overlapRows: overlapRows.slice(0, 20) };
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function toMarkdown({ summary, rows, confusionRows, missedSkillRows }, lint) {
  const lines = [];
  lines.push("# Skill Invocation Evaluation");
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push(`- Fixtures: ${summary.fixtures}`);
  lines.push(`- Skills evaluated: ${summary.skills}`);
  lines.push(`- Top-1 hit rate: ${formatPercent(summary.top1HitRate)}`);
  lines.push(`- Recall@${summary.topK}: ${formatPercent(summary.recallAtK)}`);
  lines.push(
    `- Avoid-hit rate@${summary.topK}: ${formatPercent(summary.avoidViolationRate)}`,
  );
  lines.push("");

  lines.push("## Description Lint");
  lines.push("");
  if (lint.issues.length === 0) {
    lines.push("- No lint issues.");
  } else {
    for (const item of lint.issues) {
      lines.push(`- [${item.severity}] ${item.skill}: ${item.issue}`);
    }
  }
  lines.push("");

  lines.push("## Highest Description Overlap Risk");
  lines.push("");
  if (lint.overlapRows.length === 0) {
    lines.push("- No high-overlap pairs above threshold.");
  } else {
    for (const row of lint.overlapRows.slice(0, 10)) {
      lines.push(
        `- ${row.a} <> ${row.b}: ${(row.score * 100).toFixed(1)} similarity`,
      );
    }
  }
  lines.push("");

  lines.push("## Confusion Hotspots");
  lines.push("");
  if (confusionRows.length === 0) {
    lines.push("- No top-1 confusion observed in fixture set.");
  } else {
    for (const row of confusionRows) {
      lines.push(`- ${row.pair}: ${row.count}`);
    }
  }
  lines.push("");

  lines.push("## Most-Missed Expected Skills");
  lines.push("");
  if (missedSkillRows.length === 0) {
    lines.push("- No missed expected skills.");
  } else {
    for (const row of missedSkillRows.slice(0, 10)) {
      lines.push(`- ${row.skill}: ${row.count}`);
    }
  }
  lines.push("");

  lines.push("## Fixture Results");
  lines.push("");
  for (const row of rows) {
    lines.push(`### ${row.fixture.id}`);
    lines.push("");
    lines.push(`- Prompt: ${row.fixture.prompt}`);
    lines.push(`- Expected: ${row.fixture.expectAny.join(", ")}`);
    lines.push(
      `- Avoid: ${row.fixture.avoid.length ? row.fixture.avoid.join(", ") : "(none)"}`,
    );
    lines.push(`- Top predictions: ${row.topNames.join(", ")}`);
    lines.push(`- Top-1 hit: ${row.top1Hit ? "yes" : "no"}`);
    lines.push(`- Recall@${summary.topK}: ${formatPercent(row.recallAtK)}`);
    lines.push(
      `- Avoid hits: ${row.avoidHits.length ? row.avoidHits.join(", ") : "(none)"}`,
    );
    if (row.fixture.notes) {
      lines.push(`- Notes: ${row.fixture.notes}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

function writeMaybe(filePath, content) {
  if (!filePath) {
    return;
  }
  const abs = path.resolve(filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function main() {
  const opts = parseArgs(process.argv);
  const skills = loadSkills(opts.skillsRoot);
  const fixtures = loadFixtures(opts.fixtures);
  const evalResult = evaluate(fixtures, skills, opts.topK);
  const lint = lintDescriptions(skills);
  const markdown = toMarkdown(evalResult, lint);

  const jsonPayload = {
    generatedAt: new Date().toISOString(),
    options: opts,
    summary: evalResult.summary,
    lint,
    confusionRows: evalResult.confusionRows,
    missedSkillRows: evalResult.missedSkillRows,
    fixtures: evalResult.rows.map((row) => ({
      id: row.fixture.id,
      expected: row.fixture.expectAny,
      avoid: row.fixture.avoid,
      top: row.top,
      topNames: row.topNames,
      top1Hit: row.top1Hit,
      recallAtK: row.recallAtK,
      avoidHits: row.avoidHits,
      notes: row.fixture.notes,
    })),
  };

  console.log(markdown);

  writeMaybe(opts.write, markdown);
  writeMaybe(opts.json, `${JSON.stringify(jsonPayload, null, 2)}\n`);
}

main();
