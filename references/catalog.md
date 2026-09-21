# 已登记实验

`python3 scripts/generate.py list` 与 `match` 以此为准。`scene` 是 2D/3D 工位布局；多种实验可共用同一布局。

## 制取气体

| key | 标题 | scene |
|---|---|---|
| `prep_oxygen_kmno4` | 高锰酸钾制取氧气 | `oxygen` |
| `prep_hydrogen` | 锌和稀盐酸制取氢气 | `gas_wet` |
| `prep_co2` | 大理石和稀盐酸制取二氧化碳 | `gas_air` |

关键词：制氧 / 高锰酸钾 / 带火星 / 复燃；制氢 / 锌粒 / 爆鸣 / 验纯；大理石 / 石灰石 / 向上排空气 / 变浑浊。

## 反应与性质

| key | 标题 | scene |
|---|---|---|
| `co2_candles` | 倾倒二氧化碳熄灭蜡烛 | `co2_candles` |
| `air_oxygen` | 测定空气中氧气的含量 | `air_oxygen` |
| `charcoal_in_oxygen` | 木炭在氧气中燃烧 | `burn` |
| `sulfur_in_oxygen` | 硫在氧气中燃烧 | `burn` |
| `iron_in_oxygen` | 铁丝在氧气中燃烧 | `burn` |
| `charcoal_reduce_cuo` | 木炭还原氧化铜 | `nh4hco3_decomp` |
| `nh4hco3_decomp` | 碳酸氢铵受热分解 | `oxygen` |
| `electrolysis` | 电解水 | `electrolysis` |
| `neutralization` | 酸碱中和（酚酞指示剂） | `neutralization` |
| `acid_indicator` | 酸碱指示剂变色 | `neutralization` |
| `metal_acid` | 金属与稀盐酸反应 | `neutralization` |
| `metal_oxide_acid` | 氧化铜与稀硫酸反应 | `oxide` |
| `metal_displace` | 铁与硫酸铜的置换反应 | `metal_acid` |
| `mass_conservation` | 验证质量守恒定律 | `solution_prep` |
| `iron_rust` | 探究铁钉生锈的条件 | `iron_rust` |
| `combustion_conditions` | 探究燃烧的条件 | `combustion_conditions` |

## 基本操作

| key | 标题 | scene |
|---|---|---|
| `filtration` | 过滤 | `filtration` |
| `evaporation` | 蒸发结晶 | `evaporation` |
| `solution_prep` | 配制一定溶质质量分数的溶液 | `solution_prep` |
| `dilute_h2so4` | 稀释浓硫酸 | `neutralization` |

## 匹配提示

- 「制氧气」→ `prep_oxygen_kmno4`，不要用燃烧类实验凑数。
- 「二氧化碳灭火 / 两支蜡烛」→ `co2_candles`，不是 `prep_co2`。
- 「铁生锈」→ `iron_rust`；「铁丝燃烧」→ `iron_in_oxygen`。
- 「石蕊 / 酚酞变色」→ `acid_indicator`；「中和滴定」→ `neutralization`。
- 「质量守恒」→ `mass_conservation`，不要用置换反应页代替称量对照。
