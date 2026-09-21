# 宏观实验剧本

`generate.py` 的 `build_*` 返回一份 JSON，注入 `template/lab.html` 的 `__LAB_DATA__`。生成时内联 `lab2d.js`，3D 源码放在 `#lab3d-src`。

## 必填

`id`、`scene`、`title`、`inventory`、`required_apparatus`、`required_reagents`、`steps`、`complete`。

常用可选：`subtitle`、`equation`、`goal`、`badge`、`scene_init`。

`inventory.*.slot` 由 `with_slots` 自动填：所需器材 `slot` = 器材 `id`，所需药品 `slot` = `reagent`，干扰项 `slot` 为空（拖上台面会失败）。

## scene 布局

2D `SCENES` 与 3D `layout` 共用这些键（后五种是别名）：

`prep_oxygen_kmno4` `nh4hco3_decomp` `prep_hydrogen` `prep_co2` `iron_in_oxygen` `neutralization` `metal_acid` `solution_prep` `electrolysis` `filtration` `evaporation` `co2_candles` `metal_oxide_acid` `air_oxygen` `combustion_conditions` `iron_rust`

别名：`oxygen` → 制氧台，`gas_wet` → 制氢，`gas_air` → 制二氧化碳，`burn` → 燃烧瓶，`oxide` → 氧化铜试管。

`DATA.scene` 选布局，`DATA.id` 优先精确匹配。没有独立布局的实验应复用最接近的场景（见 catalog）。

## 器材 id

工位 id 必须出现在该 `scene` 的布局里。2D 图形（`ART`）包括：

`stand` `tripod` `tube` `lamp` `delivery` `delivery_down` `delivery_air` `trough` `bottle` `bottle_inv` `splint` `candle_beaker` `beaker` `dropper` `rod` `clamp` `goggles` `funnel` `paper` `dish` `gauze` `cell` `power` `tubes` `balance` `cylinder` `wire` `cover` `lime_beaker` `reagent` `condition_beaker` `rust_tubes`

药品用 `inventory.reagents[].id` + `color`；真正上台的药品工位永远是 `reagent`。

## steps[].need

- `select`：把器材拖到同形虚线工位、药品拖到「药品」；全部放对后进入下一步。
- `choice`：二选一/三选一，`choices[].correct` 为真才进入下一步；错选记安全事故。
- `action`：点一次操作按钮，写入 `phenomenon`，可带 `scene` 开关。

`choices[]`：`id` `label` `correct`，可选 `ok` / `hazard` / `scene`。

## 场景开关

写入 `scene_init` 或某步的 `scene`。2D `applyEffects` 识别：

| 开关 | 作用 |
|---|---|
| `powder` / `zinc` / `marble` / `acid` / `cotton` / `oxide` / `oxide_acid` | 试管内药品与酸液 |
| `flame` / `heat` / `no_lamp` | 酒精灯 |
| `upright` / `tilt_down` / `tilt_up` | 试管口方向 |
| `air_collect` / `bubbles` / `collected` | 集气方式与气泡 |
| `splint_on` / `pop` / `jet_flame` / `sparks` | 检验与燃烧 |
| `bottle_water` / `water_rise` / `wet_paper` | 瓶底留水、液面上升、试纸 |
| `lime` / `lime_milky` | 石灰水变浑浊 |
| `goggles` / `liquid` / `dripping` / `metal` / `acid_bubbles` / `done` | 烧杯实验；`liquid` 为 `clear` \| `pink` \| `pale` \| `blue` |
| `gases` / `ratio` | 电解水 |
| `paper` / `drain` / `residue` / `filtrate` | 过滤 |
| `stir` / `crystals` | 蒸发 |
| `co2_fill` / `lit` / `pouring` / `co2_low` / `co2_mid` / `low_out` / `high_out` | 倾倒二氧化碳 |
| `hot_water` / `wp_air` / `rp_air` / `wp_water` / `wp_o2` | 燃烧条件 |
| `rust_setup` / `rust` | 铁钉生锈 |

未登记的开关会被忽略，画面不会变。
