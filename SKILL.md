---
name: chem-lab
description: >-
  生成中学化学宏观虚拟实验台：自包含 HTML，学生把写实器材拖到同形虚线工位、把药品拖进容器，再按步骤加热/滴加、观察现象并处理安全操作。
  剧本驱动，覆盖制氧气、制氢气、制二氧化碳、电解水、酸碱中和、金属与酸、碳酸氢铵分解、铁丝/木炭/硫在氧气中燃烧、过滤、蒸发结晶、配制溶液、倾倒二氧化碳熄灭蜡烛、测定空气中氧气含量、木炭还原氧化铜、质量守恒、铁与硫酸铜、铁钉生锈、燃烧条件、指示剂变色、稀释浓硫酸。
  失败不得编造未登记实验，不要让模型现写 HTML / WebGL。
  触发词：虚拟实验, 实验台, 化学实验, 制取氧气, 制氢气, 二氧化碳, 电解水, 酸碱中和, 过滤, 蒸发, 酚酞, 验纯, 铁丝燃烧, 碳酸氢铵, 稀释浓硫酸, 质量守恒, chemistry lab, virtual lab, chem-lab.
---

# 宏观化学实验台

产出一份可直接用浏览器打开的自包含 HTML：左侧试剂架，中间 2D 示意或 3D 实验台，右侧分步讲解可自动演示。

数据由 `scripts/generate.py` 注入 `template/lab.html`，并内联 `template/lab2d.js`（3D 脚本延迟加载，Three.js 走 CDN）。**不要让模型现写 HTML / WebGL。**

本技能不依赖智课星后端。标准库 Python 3 即可。

## 工作流程

1. 把用户课题收成关键词（例如「制氧气」「酚酞中和」「一贴二低三靠」）。
2. 用 CLI 匹配已登记实验，取分数最高且语义对得上的 `key`：

```bash
python3 <本技能目录>/scripts/generate.py list
python3 <本技能目录>/scripts/generate.py match 制取氧气
```

3. 对不上目录时：**停止**。列出可用实验，询问用户选哪一个；不要编造未登记实验，也不要手写实验页。
4. 生成 HTML。成品写到**用户当前工作目录**（`Path.cwd()`），除非用户指定路径。不要写进技能目录。

```bash
python3 <本技能目录>/scripts/generate.py prep_oxygen_kmno4 ./prep_oxygen_kmno4.html
```

不传路径时默认 `./<实验key>.html`。

5. 把路径告诉用户，可直接打开。3D 需能访问 jsDelivr（`three@0.160.1`）；离线时页面会留在 2D。

可选：`python3 scripts/generate.py dump <key>` 打印注入模板的 JSON 剧本。

## 硬规则

- 只生成 `REGISTRY` 里的实验。匹配失败 = 失败，不是自由创作。
- 不要改 `template/` 来「凑合」一节课，除非用户明确要求加新实验。
- 现象、方程式、安全操作必须符合初中课本；对不上就换已有实验或拒绝。
- 微观分子动画不是本技能（那是另一套反应演示）。

## 加实验（仅当用户明确要求）

1. 在 `scripts/generate.py` 增加 `build_*`，登记到 `REGISTRY` 与 `CATALOG`。
2. `scene` 必须是模板已有布局。优先复用最接近的场景，而不是新画一套。
3. 新布局才改 `template/lab2d.js` 的 `SCENES` 和 `template/lab3d.js` 的 `layout`；两边工位 `id` 必须一致。
4. 剧本字段见 [references/lab-schema.md](references/lab-schema.md)。目录与关键词见 [references/catalog.md](references/catalog.md)。

## 目录

- `scripts/generate.py` — 剧本、目录、CLI
- `template/lab.html` — 页面壳 + HUD
- `template/lab2d.js` — 2D 写实器材与工位
- `template/lab3d.js` — 3D 实验台（延迟 eval）
- `references/catalog.md` — 已登记实验
- `references/lab-schema.md` — 剧本 JSON 字段
