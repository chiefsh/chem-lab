# chem-lab

初中化学**宏观虚拟实验台**，按 [Agent Skills](https://agentskills.io/) 规范打包。把已登记实验的剧本注入固定模板，生成可直接用浏览器打开的自包含 HTML：写实 2D 器材（可选 3D）、试剂架、分步讲解和安全选择题。

不要让模型现写实验页或 WebGL。从目录匹配实验再生成；对不上就停，不要编造。

Junior-high **macroscopic chemistry virtual lab** as an [Agent Skill](https://agentskills.io/). The skill injects a scripted experiment into a fixed template and writes a self-contained HTML page: realistic 2D glassware (optional 3D), a reagent shelf, step-by-step guidance, and safety choices.

Do not hand-write lab HTML or WebGL. Generate from the catalog, or stop if nothing matches.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 适用场景 / Use when

- 用户要虚拟化学实验、实验台，或初中演示（制氧气、制氢气、二氧化碳、电解水、酸碱中和、过滤、蒸发等）。
- 需要一份可操作的实验页，而不是现画器材或手写 HTML。
- The user wants a virtual chemistry lab, 实验台, or a junior-high demo (制氧气, 制氢气, 二氧化碳, 电解水, 酸碱中和, 过滤, 蒸发, …).
- An agent should produce a playable lab page instead of inventing apparatus graphics.

## 安装 / Installation

安装到当前 agent（Cursor、Claude Code、Codex 及其他支持 Agent Skills 的环境）：

Install into the current agent (Cursor, Claude Code, Codex, and others that speak Agent Skills):

```bash
npx skills add chiefsh/chem-lab
```

或克隆到 skills 目录：

```bash
git clone git@github.com:chiefsh/chem-lab.git ~/.cursor/skills/chem-lab
```

Agent 读 [`SKILL.md`](SKILL.md)。人可以直接跑 CLI，不必经过 agent。

The agent reads [`SKILL.md`](SKILL.md). Humans can run the CLI without an agent.

## 命令行 / CLI

需要 **Python 3**（仅标准库）。

Requires **Python 3** (standard library only).

```bash
python3 scripts/generate.py list
python3 scripts/generate.py match 制取氧气
python3 scripts/generate.py prep_oxygen_kmno4 ./prep_oxygen_kmno4.html
python3 scripts/generate.py dump prep_oxygen_kmno4
```

不传输出路径时，写到当前工作目录 `./<实验key>.html`。不要把生成页写回本技能目录。

成品 HTML 自包含。3D 从 jsDelivr 加载 Three.js（`three@0.160.1`）；失败则留在 2D。

Omit the output path to write `./<experiment-key>.html` in the current working directory. Do not write generated pages back into this skill folder. The HTML is self-contained. 3D loads Three.js from jsDelivr (`three@0.160.1`); if that fails, the page stays on 2D.

## 实验目录 / Experiments

共 23 个初中实验。以 `python3 scripts/generate.py list` 为准。

23 junior-high labs. `python3 scripts/generate.py list` is authoritative.

| 分组 Group | Keys |
|---|---|
| 制取气体 | `prep_oxygen_kmno4` `prep_hydrogen` `prep_co2` |
| 反应与性质 | `co2_candles` `air_oxygen` `charcoal_in_oxygen` `sulfur_in_oxygen` `iron_in_oxygen` `charcoal_reduce_cuo` `nh4hco3_decomp` `electrolysis` `neutralization` `acid_indicator` `metal_acid` `metal_oxide_acid` `metal_displace` `mass_conservation` `iron_rust` `combustion_conditions` |
| 基本操作 | `filtration` `evaporation` `solution_prep` `dilute_h2so4` |

标题、场景与关键词见 [`references/catalog.md`](references/catalog.md)。剧本 JSON 字段见 [`references/lab-schema.md`](references/lab-schema.md)。

课题对不上时不要编新实验，列出目录让用户选一个。

Titles, scenes, and keyword matching: [`references/catalog.md`](references/catalog.md). Script JSON fields: [`references/lab-schema.md`](references/lab-schema.md). Unknown topics must not invent a new lab. List the catalog and ask the user to pick one.

## 目录结构 / Skill layout

符合 [Agent Skills](https://agentskills.io/) 目录约定：

Follows the [Agent Skills](https://agentskills.io/) folder shape:

```
chem-lab/
├── SKILL.md                 # agent 说明 + YAML 头 / agent instructions + YAML frontmatter
├── scripts/generate.py      # 目录、剧本、CLI / catalog, scripts, CLI
├── template/                # lab.html + lab2d.js + lab3d.js
└── references/              # 实验目录与 JSON 字段 / catalog and JSON schema
```

## 许可 / License

[MIT](LICENSE)
