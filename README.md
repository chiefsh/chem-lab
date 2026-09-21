# chem-lab

Junior-high **macroscopic chemistry virtual lab** as an [Agent Skill](https://agentskills.io/). The skill injects a scripted experiment into a fixed template and writes a self-contained HTML page: realistic 2D glassware (optional 3D), a reagent shelf, step-by-step guidance, and safety choices.

Do not hand-write lab HTML or WebGL. Generate from the catalog, or stop if nothing matches.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Use when

- The user wants a virtual chemistry lab, 实验台, or a junior-high demo (制氧气, 制氢气, 二氧化碳, 电解水, 酸碱中和, 过滤, 蒸发, …).
- An agent should produce a playable lab page instead of inventing apparatus graphics.

## Installation

Install into the current agent (Cursor, Claude Code, Codex, and others that speak Agent Skills):

```bash
npx skills add chiefsh/chem-lab
```

Or clone into a skills directory:

```bash
git clone git@github.com:chiefsh/chem-lab.git ~/.cursor/skills/chem-lab
```

The agent reads [`SKILL.md`](SKILL.md). Humans can run the CLI without an agent.

## CLI

Requires **Python 3** (standard library only).

```bash
python3 scripts/generate.py list
python3 scripts/generate.py match 制取氧气
python3 scripts/generate.py prep_oxygen_kmno4 ./prep_oxygen_kmno4.html
python3 scripts/generate.py dump prep_oxygen_kmno4
```

Omit the output path to write `./<experiment-key>.html` in the current working directory. Do not write generated pages back into this skill folder.

The HTML is self-contained. 3D loads Three.js from jsDelivr (`three@0.160.1`); if that fails, the page stays on 2D.

## Experiments

23 junior-high labs. `python3 scripts/generate.py list` is authoritative.

| Group | Keys |
|---|---|
| 制取气体 | `prep_oxygen_kmno4` `prep_hydrogen` `prep_co2` |
| 反应与性质 | `co2_candles` `air_oxygen` `charcoal_in_oxygen` `sulfur_in_oxygen` `iron_in_oxygen` `charcoal_reduce_cuo` `nh4hco3_decomp` `electrolysis` `neutralization` `acid_indicator` `metal_acid` `metal_oxide_acid` `metal_displace` `mass_conservation` `iron_rust` `combustion_conditions` |
| 基本操作 | `filtration` `evaporation` `solution_prep` `dilute_h2so4` |

Titles, scenes, and keyword matching: [`references/catalog.md`](references/catalog.md). Script JSON fields: [`references/lab-schema.md`](references/lab-schema.md).

Unknown topics must not invent a new lab. List the catalog and ask the user to pick one.

## Skill layout

Follows the [Agent Skills](https://agentskills.io/) folder shape:

```
chem-lab/
├── SKILL.md                 # agent instructions + YAML frontmatter
├── scripts/generate.py      # catalog, scripts, CLI
├── template/                # lab.html + lab2d.js + lab3d.js
└── references/              # catalog and JSON schema
```

## License

[MIT](LICENSE)
