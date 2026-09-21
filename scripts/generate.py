#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""宏观化学实验台：把实验剧本注入 template/lab.html，产出自包含 HTML。

用法：
    python3 scripts/generate.py list
    python3 scripts/generate.py match <课题或关键词>
    python3 scripts/generate.py dump <实验key>
    python3 scripts/generate.py <实验key> [输出.html]
不传路径时写到当前工作目录：./<实验key>.html
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
TEMPLATE = SKILL_DIR / "template" / "lab.html"
LAB2D_JS = SKILL_DIR / "template" / "lab2d.js"
LAB3D_JS = SKILL_DIR / "template" / "lab3d.js"
PLACEHOLDER = "__LAB_DATA__"


def with_slots(data: dict) -> dict:
    """给器材/药品打上拖放工位：所需器材 slot=自身 id，所需药品 slot=reagent，干扰项无工位。"""
    req_a = set(data.get("required_apparatus") or [])
    req_r = set(data.get("required_reagents") or [])
    for item in (data.get("inventory") or {}).get("apparatus") or []:
        item["slot"] = item["id"] if item.get("id") in req_a else ""
    for item in (data.get("inventory") or {}).get("reagents") or []:
        item["slot"] = "reagent" if item.get("id") in req_r else ""
    for step in data.get("steps") or []:
        if step.get("need") == "select":
            step["hint"] = (
                "点击试剂架「+ 加入」，或把器材拖到画布上形状相同的虚线工位。"
                "酒精灯在受热部位下方。放对卡住，放错弹回。"
            )
    return data


def _inline_js(src: str) -> str:
    return src.replace("</script>", "<\\/script>").replace("</SCRIPT>", "<\\/SCRIPT>")


def render_html(data: dict, out_path: Path) -> Path:
    template = TEMPLATE.read_text(encoding="utf-8")
    if PLACEHOLDER not in template or "__LAB2D_JS__" not in template or "__LAB3D_JS__" not in template:
        raise RuntimeError("模板缺少 __LAB_DATA__ / __LAB2D_JS__ / __LAB3D_JS__")
    lab2d = _inline_js(LAB2D_JS.read_text(encoding="utf-8"))
    lab3d = _inline_js(LAB3D_JS.read_text(encoding="utf-8"))
    payload = json.dumps(with_slots(data), ensure_ascii=False)
    html = (
        template.replace("__LAB2D_JS__", lab2d)
        .replace("__LAB3D_JS__", lab3d)
        .replace(PLACEHOLDER, payload)
    )
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(html, encoding="utf-8")
    return out_path


def build_prep_oxygen_kmno4() -> dict:
    return {
        "id": "prep_oxygen_kmno4",
        "scene": "oxygen",
        "title": "高锰酸钾制取氧气",
        "subtitle": "固体加热 · 排水法集气 · 防止倒吸",
        "equation": "2KMnO₄ △→ K₂MnO₄ + MnO₂ + O₂↑",
        "goal": "正确组装发生装置，用排水法收集氧气，并用带火星木条检验。",
        "badge": "初中化学 · 制取气体",
        "inventory": {
            "apparatus": [
                {"id": "stand", "name": "铁架台", "icon": "支架"},
                {"id": "tube", "name": "试管", "icon": "试管"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "delivery", "name": "导管", "icon": "管"},
                {"id": "trough", "name": "水槽", "icon": "槽"},
                {"id": "bottle", "name": "集气瓶", "icon": "瓶"},
                {"id": "splint", "name": "带火星木条", "icon": "木条"},
                {"id": "beaker", "name": "烧杯", "icon": "杯"},
            ],
            "reagents": [
                {"id": "kmno4", "name": "高锰酸钾", "color": "#6b21a8"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
                {"id": "naoh", "name": "氢氧化钠", "color": "#a3e635"},
            ],
        },
        "required_apparatus": ["stand", "tube", "lamp", "delivery", "trough", "bottle", "splint"],
        "required_reagents": ["kmno4"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "点选制氧气需要的仪器：铁架台、试管、酒精灯、导管、水槽、集气瓶、带火星木条；药品选高锰酸钾。试管口还要放棉花（下一步会问到）。",
            },
            {
                "id": "assemble",
                "need": "choice",
                "title": "组装发生装置",
                "hint": "固体加热制气时，试管口方向关系到冷凝水会不会倒流。",
                "choices": [
                    {"id": "tilt_down", "label": "试管口略向下倾斜", "correct": True,
                     "ok": "冷凝水能流向管口，热试管不会因倒流而炸裂。"},
                    {"id": "tilt_up", "label": "试管口向上倾斜", "correct": False,
                     "hazard": "冷凝水倒流到灼热试管底部，试管炸裂。"},
                ],
            },
            {
                "id": "cotton",
                "need": "choice",
                "title": "试管口的棉花",
                "hint": "高锰酸钾是粉末，加热时粉末会进入导管。",
                "choices": [
                    {"id": "plug", "label": "试管口放一团棉花，再塞导管", "correct": True,
                     "ok": "棉花拦住粉末，避免高锰酸钾进入水槽，收集的氧气更纯。",
                     "scene": {"cotton": True}},
                    {"id": "none", "label": "不放棉花，让气体出得更畅快", "correct": False,
                     "hazard": "粉末会随气流进入导管和水槽，堵塞导管，氧气也不纯。"},
                ],
            },
            {
                "id": "add",
                "need": "action",
                "title": "加入药品",
                "action_label": "把高锰酸钾装入试管",
                "hint": "药品平铺在试管底部，方便均匀受热。",
                "phenomenon": "试管底部铺上一层紫黑色固体。",
                "scene": {"powder": True, "cotton": True},
            },
            {
                "id": "heat",
                "need": "action",
                "title": "加热",
                "action_label": "点燃酒精灯加热",
                "hint": "先预热试管，再集中加热药品部位。",
                "phenomenon": "紫黑色固体逐渐变化，导管口有气泡冒出。",
                "scene": {"flame": True, "bubbles": True, "cotton": True},
            },
            {
                "id": "collect",
                "need": "action",
                "title": "排水法收集",
                "action_label": "用集气瓶排水收集氧气",
                "hint": "氧气不易溶于水，适合排水法。气泡连续均匀后再开始收集。",
                "phenomenon": "集气瓶中水面下降，收集到无色气体。",
                "scene": {"collected": True, "cotton": True},
            },
            {
                "id": "test",
                "need": "choice",
                "title": "检验氧气",
                "hint": "氧气能使带火星的木条复燃。",
                "choices": [
                    {"id": "glowing", "label": "伸入带火星的木条", "correct": True,
                     "ok": "木条复燃，说明收集到的是氧气。", "scene": {"splint_on": True}},
                    {"id": "burning", "label": "伸入燃着的木条看是否熄灭", "correct": False,
                     "hazard": "那是检验二氧化碳的思路。氧气应用带火星木条。"},
                ],
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "结束实验（防倒吸）",
                "hint": "导管还插在水里时熄灯，水会倒吸入热试管。",
                "choices": [
                    {"id": "tube_first", "label": "先把导管移出水面，再熄灭酒精灯", "correct": True,
                     "ok": "装置内气压下降时导管已离开水面，不会倒吸。"},
                    {"id": "lamp_first", "label": "先熄灭酒精灯，再撤导管", "correct": False,
                     "hazard": "水槽中的水倒吸入热试管，试管炸裂。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了高锰酸钾制氧气：装置正确、排水集气、木条复燃，并落实了「先撤导管再熄灯」。",
        },
    }


def build_neutralization() -> dict:
    return {
        "id": "neutralization",
        "scene": "neutralization",
        "title": "酸碱中和（酚酞指示剂）",
        "subtitle": "滴加 · 搅拌 · 观察褪色终点",
        "equation": "HCl + NaOH → NaCl + H₂O",
        "goal": "向氢氧化钠溶液中滴加稀盐酸，用酚酞指示中和终点。",
        "badge": "初中化学 · 酸碱盐",
        "inventory": {
            "apparatus": [
                {"id": "beaker", "name": "烧杯", "icon": "杯"},
                {"id": "dropper", "name": "胶头滴管", "icon": "滴管"},
                {"id": "rod", "name": "玻璃棒", "icon": "棒"},
                {"id": "goggles", "name": "护目镜", "icon": "镜"},
                {"id": "tube", "name": "试管", "icon": "试管"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "naoh", "name": "氢氧化钠溶液", "color": "#a3e635"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
                {"id": "phth", "name": "酚酞试液", "color": "#ec4899"},
                {"id": "kmno4", "name": "高锰酸钾", "color": "#6b21a8"},
            ],
        },
        "required_apparatus": ["beaker", "dropper", "rod", "goggles"],
        "required_reagents": ["naoh", "hcl", "phth"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "需要烧杯、胶头滴管、玻璃棒、护目镜；药品为氢氧化钠溶液、稀盐酸和酚酞试液。",
            },
            {
                "id": "goggles",
                "need": "action",
                "title": "安全准备",
                "action_label": "戴上护目镜",
                "hint": "酸、碱都有腐蚀性，操作前先做好护目。",
                "phenomenon": "已佩戴护目镜，可以开始取用溶液。",
                "scene": {"goggles": True},
            },
            {
                "id": "base",
                "need": "action",
                "title": "取氢氧化钠溶液",
                "action_label": "向烧杯中倒入氢氧化钠溶液",
                "hint": "碱液无色，还看不出是否过量，下一步要加指示剂。",
                "phenomenon": "烧杯中是无色氢氧化钠溶液。",
                "scene": {"liquid": "clear"},
            },
            {
                "id": "indicator",
                "need": "choice",
                "title": "滴加指示剂",
                "hint": "酚酞遇碱变红，遇酸无色，适合指示中和终点。",
                "choices": [
                    {"id": "phth", "label": "滴入几滴酚酞试液", "correct": True,
                     "ok": "溶液变为浅红色，说明烧杯中呈碱性。",
                     "scene": {"liquid": "pink"}},
                    {"id": "heat", "label": "用酒精灯加热溶液使反应加快", "correct": False,
                     "hazard": "中和反应在常温下即可进行，加热碱液易溅出伤人。"},
                ],
            },
            {
                "id": "drip",
                "need": "action",
                "title": "边搅边滴加稀盐酸",
                "action_label": "用胶头滴管滴加稀盐酸并搅拌",
                "hint": "边滴边搅拌，观察红色是否变浅。不要俯视去闻酸雾。",
                "phenomenon": "红色逐渐变浅。继续滴加，接近终点。",
                "scene": {"dripping": True, "liquid": "pale"},
            },
            {
                "id": "end",
                "need": "choice",
                "title": "判断终点",
                "hint": "酚酞红色刚好褪去，说明酸碱恰好完全反应。",
                "choices": [
                    {"id": "colorless", "label": "溶液由红刚好变为无色，停止滴加", "correct": True,
                     "ok": "到达中和终点，生成氯化钠和水。",
                     "scene": {"liquid": "clear", "done": True}},
                    {"id": "keep", "label": "继续大量加入盐酸，让反应更彻底", "correct": False,
                     "hazard": "盐酸过量后溶液呈酸性，已经不是恰好中和。"},
                    {"id": "taste", "label": "用玻璃棒蘸取溶液尝尝是否还有碱性", "correct": False,
                     "hazard": "实验室药品严禁口尝，碱和酸都会灼伤黏膜。"},
                ],
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "溅到皮肤怎么办",
                "hint": "酸碱溅到皮肤，立即大量清水冲洗并报告老师。",
                "choices": [
                    {"id": "rinse", "label": "立即用大量清水冲洗，并告知老师", "correct": True,
                     "ok": "正确处理意外，实验可以安全收尾。"},
                    {"id": "wipe", "label": "用抹布擦干再继续做", "correct": False,
                     "hazard": "残留酸碱会继续腐蚀皮肤，不能只擦不冲。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了酸碱中和：酚酞变红→滴加盐酸褪色，并掌握了护目与冲洗的安全操作。",
        },
    }


def build_prep_hydrogen() -> dict:
    return {
        "id": "prep_hydrogen",
        "scene": "gas_wet",
        "scene_init": {"no_lamp": True, "upright": True},
        "title": "锌和稀盐酸制取氢气",
        "subtitle": "固液不加热 · 排水集气 · 验纯后点燃",
        "equation": "Zn + 2HCl → ZnCl₂ + H₂↑",
        "goal": "用锌粒和稀盐酸制氢气，排水法收集，点燃前先验纯。",
        "badge": "初中化学 · 制取气体",
        "inventory": {
            "apparatus": [
                {"id": "tube", "name": "试管", "icon": "试管"},
                {"id": "delivery", "name": "导管", "icon": "管"},
                {"id": "trough", "name": "水槽", "icon": "槽"},
                {"id": "bottle", "name": "集气瓶", "icon": "瓶"},
                {"id": "splint", "name": "燃着的木条", "icon": "木条"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "stand", "name": "铁架台", "icon": "支架"},
            ],
            "reagents": [
                {"id": "zn", "name": "锌粒", "color": "#94a3b8"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
                {"id": "kmno4", "name": "高锰酸钾", "color": "#6b21a8"},
            ],
        },
        "required_apparatus": ["stand", "tube", "delivery", "trough", "bottle", "splint"],
        "required_reagents": ["zn", "hcl"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "固液不加热制氢气：铁架台、试管、导管、水槽、集气瓶、燃着的木条；药品为锌粒和稀盐酸。不要选酒精灯。",
            },
            {
                "id": "add_zn",
                "need": "action",
                "title": "加入锌粒",
                "action_label": "把锌粒放入试管",
                "hint": "先放固体，再沿管壁倒入液体。",
                "phenomenon": "试管底部有银白色锌粒。",
                "scene": {"zinc": True, "upright": True, "no_lamp": True},
            },
            {
                "id": "add_acid",
                "need": "action",
                "title": "加入稀盐酸",
                "action_label": "沿管壁倒入稀盐酸",
                "hint": "反应立即开始，不要用拇指堵住管口。",
                "phenomenon": "锌粒表面冒出气泡，有无色气体放出。",
                "scene": {"acid": True, "bubbles": True},
            },
            {
                "id": "collect",
                "need": "choice",
                "title": "收集氢气",
                "hint": "氢气难溶于水，密度比空气小。",
                "choices": [
                    {"id": "water", "label": "用排水法收集", "correct": True,
                     "ok": "氢气难溶于水，排水法收集较纯。",
                     "scene": {"collected": True}},
                    {"id": "up", "label": "用向上排空气法收集", "correct": False,
                     "hazard": "氢气比空气轻，向上排空气法收集不到。应排水法或向下排空气法。"},
                ],
            },
            {
                "id": "purity",
                "need": "choice",
                "title": "点燃前验纯",
                "hint": "不纯氢气点燃会爆炸，必须先验纯。",
                "choices": [
                    {"id": "test", "label": "用拇指堵住管口，移近火焰听是否有尖锐爆鸣", "correct": True,
                     "ok": "声音很小说明已较纯，可以在导管口点燃。安静的「噗」声为纯氢。",
                     "scene": {"pop": True}},
                    {"id": "direct", "label": "气体一产生就在发生装置口点燃", "correct": False,
                     "hazard": "装置内是氢空气混合物，直接点燃可能爆炸。"},
                ],
            },
            {
                "id": "ignite",
                "need": "action",
                "title": "导管口点燃",
                "action_label": "在导管口点燃验纯后的氢气",
                "hint": "纯净氢气安静燃烧，火焰呈淡蓝色。",
                "phenomenon": "导管口出现淡蓝色火焰，杯壁上有水雾。",
                "scene": {"pop": False, "jet_flame": True},
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "安全注意",
                "hint": "氢气是可燃气体，实验室要远离明火。",
                "choices": [
                    {"id": "away", "label": "发生装置远离明火，点燃只在验纯后的导管口进行", "correct": True,
                     "ok": "把制取和点燃分开，避免回火。"},
                    {"id": "heat", "label": "用酒精灯加热试管让反应更快", "correct": False,
                     "hazard": "此反应不需要加热；加热可燃气体混合物十分危险。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了制氢气：锌与稀盐酸反应、排水收集、验纯后在导管口点燃，见到淡蓝色火焰。",
        },
    }


def build_prep_co2() -> dict:
    return {
        "id": "prep_co2",
        "scene": "gas_air",
        "scene_init": {"no_lamp": True, "upright": True, "air_collect": True},
        "title": "大理石和稀盐酸制取二氧化碳",
        "subtitle": "固液不加热 · 向上排空气 · 石灰水检验",
        "equation": "CaCO₃ + 2HCl → CaCl₂ + H₂O + CO₂↑",
        "goal": "用大理石和稀盐酸制二氧化碳，向上排空气法收集，并用澄清石灰水检验。",
        "badge": "初中化学 · 制取气体",
        "inventory": {
            "apparatus": [
                {"id": "stand", "name": "铁架台", "icon": "支架"},
                {"id": "tube", "name": "试管 / 锥形瓶", "icon": "瓶"},
                {"id": "delivery", "name": "导管", "icon": "管"},
                {"id": "bottle", "name": "集气瓶", "icon": "瓶"},
                {"id": "lime_beaker", "name": "盛石灰水的烧杯", "icon": "杯"},
                {"id": "splint", "name": "燃着的木条", "icon": "木条"},
                {"id": "trough", "name": "水槽", "icon": "槽"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "caco3", "name": "大理石 / 石灰石", "color": "#e7e5e4"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
                {"id": "lime", "name": "澄清石灰水", "color": "#e0f2fe"},
                {"id": "h2so4", "name": "稀硫酸", "color": "#facc15"},
            ],
        },
        "required_apparatus": ["stand", "tube", "delivery", "bottle", "lime_beaker", "splint"],
        "required_reagents": ["caco3", "hcl", "lime"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "铁架台、试管、导管、集气瓶、澄清石灰水、燃着的木条；药品为大理石和稀盐酸。不要用水槽（二氧化碳能溶于水）。不要用稀硫酸。",
            },
            {
                "id": "add",
                "need": "action",
                "title": "加入药品",
                "action_label": "放入大理石并加入稀盐酸",
                "hint": "块状大理石，便于控制反应。",
                "phenomenon": "固体表面剧烈冒泡，有无色气体放出。",
                "scene": {"marble": True, "acid": True, "bubbles": True, "upright": True, "no_lamp": True, "air_collect": True},
            },
            {
                "id": "collect",
                "need": "choice",
                "title": "收集二氧化碳",
                "hint": "二氧化碳密度比空气大，能溶于水。",
                "choices": [
                    {"id": "up_air", "label": "用向上排空气法（瓶口向上）收集", "correct": True,
                     "ok": "二氧化碳比空气重，瓶口向上可把空气向上排出。",
                     "scene": {"air_collect": True}},
                    {"id": "water", "label": "用排水法收集", "correct": False,
                     "hazard": "二氧化碳能溶于水，排水法收集量少、气体不纯。"},
                ],
            },
            {
                "id": "test",
                "need": "choice",
                "title": "检验二氧化碳",
                "hint": "最常用澄清石灰水变浑浊；燃着的木条会熄灭。",
                "choices": [
                    {"id": "lime", "label": "通入澄清石灰水，观察是否变浑浊", "correct": True,
                     "ok": "石灰水变浑浊，证明是二氧化碳。",
                     "scene": {"lime": True, "lime_milky": True}},
                    {"id": "glow", "label": "伸入带火星的木条看是否复燃", "correct": False,
                     "hazard": "那是检验氧气。二氧化碳应使燃着的木条熄灭，或使石灰水变浑浊。"},
                ],
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "酸的使用",
                "hint": "不能用浓盐酸：挥发的 HCl 会混入气体。",
                "choices": [
                    {"id": "dilute", "label": "使用稀盐酸，不要用浓盐酸", "correct": True,
                     "ok": "稀盐酸反应平稳，气体较纯。"},
                    {"id": "conc", "label": "改用浓盐酸让反应更快", "correct": False,
                     "hazard": "浓盐酸挥发出的氯化氢会混在二氧化碳里，气体不纯，还刺激呼吸道。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了制二氧化碳：大理石与稀盐酸、向上排空气收集，并用石灰水检验。",
        },
    }


def build_electrolysis_water() -> dict:
    return {
        "id": "electrolysis",
        "scene": "electrolysis",
        "title": "电解水",
        "subtitle": "通电分解 · 正氧负氢 · 氢氧体积比约 2∶1",
        "equation": "2H₂O 通电→ 2H₂↑ + O₂↑",
        "goal": "观察电解水，根据电极和体积比判断氢气、氧气，并检验。",
        "badge": "初中化学 · 分解反应",
        "inventory": {
            "apparatus": [
                {"id": "cell", "name": "电解器 / 水槽", "icon": "槽"},
                {"id": "power", "name": "直流电源", "icon": "电"},
                {"id": "tubes", "name": "两支集气管", "icon": "管"},
                {"id": "splint", "name": "木条（点燃 / 带火星）", "icon": "木条"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "water", "name": "水（可加少量硫酸或氢氧化钠）", "color": "#38bdf8"},
                {"id": "hcl", "name": "浓盐酸", "color": "#22c55e"},
            ],
        },
        "required_apparatus": ["cell", "power", "tubes", "splint"],
        "required_reagents": ["water"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "电解器、直流电源、两支集气管、检验用木条；液体是水。可加少量硫酸或氢氧化钠增强导电，不要加浓盐酸当「电解质」主药品。",
            },
            {
                "id": "power",
                "need": "action",
                "title": "通电",
                "action_label": "接通直流电源",
                "hint": "两极都有气泡，负极气泡更多。",
                "phenomenon": "两极冒出气泡，负极一侧气体体积约为正极的两倍。",
                "scene": {"gases": True, "ratio": True},
            },
            {
                "id": "which",
                "need": "choice",
                "title": "判断气体",
                "hint": "正氧负氢：正极连电源正极，产生氧气；负极产生氢气。",
                "choices": [
                    {"id": "ok", "label": "负极是氢气（体积多），正极是氧气（体积少）", "correct": True,
                     "ok": "体积比约为 2:1，正好对应 2H₂ : O₂。"},
                    {"id": "swap", "label": "正极是氢气，负极是氧气", "correct": False,
                     "hazard": "记反了。口诀：正氧负氢。"},
                ],
            },
            {
                "id": "test",
                "need": "choice",
                "title": "检验两极气体",
                "hint": "氢气能点燃，氧气使带火星木条复燃。",
                "choices": [
                    {"id": "both", "label": "负极气体点燃；正极气体用带火星木条检验", "correct": True,
                     "ok": "负极氢气安静燃烧或轻微爆鸣；正极氧气使木条复燃。"},
                    {"id": "same", "label": "两支管子都伸入带火星木条", "correct": False,
                     "hazard": "氢气不能使带火星木条复燃，应用点燃的方法检验。"},
                ],
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "用电安全",
                "hint": "用低电压直流电，手和装置保持干燥。",
                "choices": [
                    {"id": "dc", "label": "使用低压直流电源，不要用湿手触摸电极", "correct": True,
                     "ok": "电解水是用电实验，先保证绝缘和干燥。"},
                    {"id": "ac", "label": "直接接家庭交流电 220V，反应更快", "correct": False,
                     "hazard": "高压交流电有触电危险，实验室只用低压直流电源。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了电解水：正氧负氢、氢气与氧气体积比约 2∶1，并正确检验了两种气体。",
        },
    }


def build_metal_acid() -> dict:
    return {
        "id": "metal_acid",
        "scene": "neutralization",
        "title": "金属与稀盐酸反应",
        "subtitle": "观察气泡 · 比较活动性 · 护目防溅",
        "equation": "Zn + 2HCl → ZnCl₂ + H₂↑",
        "goal": "观察锌（或铁）与稀盐酸反应产生氢气，体会金属活动性，注意护目。",
        "badge": "初中化学 · 金属活动性",
        "inventory": {
            "apparatus": [
                {"id": "beaker", "name": "烧杯 / 试管", "icon": "杯"},
                {"id": "goggles", "name": "护目镜", "icon": "镜"},
                {"id": "rod", "name": "玻璃棒", "icon": "棒"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "zn", "name": "锌粒", "color": "#94a3b8"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
                {"id": "cu", "name": "铜片", "color": "#d97706"},
            ],
        },
        "required_apparatus": ["beaker", "goggles", "rod"],
        "required_reagents": ["zn", "hcl"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "烧杯（或试管）、护目镜、玻璃棒；锌粒和稀盐酸。铜片可作对比，但本实验主反应是锌。不要选酒精灯。",
            },
            {
                "id": "goggles",
                "need": "action",
                "title": "戴护目镜",
                "action_label": "戴上护目镜",
                "hint": "酸有腐蚀性，气泡可能带出液滴。",
                "phenomenon": "已做好护目，可以取用盐酸。",
                "scene": {"goggles": True},
            },
            {
                "id": "mix",
                "need": "action",
                "title": "加入锌粒和稀盐酸",
                "action_label": "放入锌粒并倒入稀盐酸",
                "hint": "观察是否立即有气泡，手不要堵住容器口。",
                "phenomenon": "锌粒表面迅速冒出气泡，溶液仍接近无色。",
                "scene": {"metal": True, "acid_bubbles": True, "liquid": "clear"},
            },
            {
                "id": "compare",
                "need": "choice",
                "title": "活动性比较",
                "hint": "锌能置换出盐酸中的氢，铜在常温下几乎不与稀盐酸反应。",
                "choices": [
                    {"id": "zn", "label": "锌能反应放出氢气，铜与稀盐酸几乎不反应", "correct": True,
                     "ok": "金属活动性：锌在氢前，铜在氢后。"},
                    {"id": "cu", "label": "铜比锌更活泼，气泡应该更多", "correct": False,
                     "hazard": "铜不能从稀盐酸中置换出氢气。"},
                ],
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "能否密封加热",
                "hint": "有气体放出的反应不能密闭加热。",
                "choices": [
                    {"id": "open", "label": "容器开口，不加热，让氢气自行逸出后再处理残液", "correct": True,
                     "ok": "防止压强过大，也避免氢气遇明火。"},
                    {"id": "seal", "label": "塞紧橡皮塞再用酒精灯加热，让反应更快", "correct": False,
                     "hazard": "密闭加热会使气体压强骤增，容器可能爆裂。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你观察了锌与稀盐酸放氢，并比较了锌、铜的活动性，同时落实了护目与开口操作。",
        },
    }


def build_metal_oxide_acid() -> dict:
    return {
        "id": "metal_oxide_acid",
        "scene": "oxide",
        "title": "氧化铜与稀硫酸反应",
        "subtitle": "点击或拖拽试剂入管，加热后观察黑色粉末变成蓝色溶液",
        "equation": "CuO + H₂SO₄ → CuSO₄ + H₂O",
        "goal": "观察黑色氧化铜溶于稀硫酸生成蓝色硫酸铜溶液，认识金属氧化物与酸的反应。",
        "badge": "初中化学 · 金属氧化物",
        "inventory": {
            "apparatus": [
                {"id": "tube", "name": "试管"},
                {"id": "lamp", "name": "酒精灯"},
                {"id": "rod", "name": "试管夹"},
                {"id": "beaker", "name": "烧杯"},
            ],
            "reagents": [
                {"id": "cuo", "name": "氧化铜", "color": "#1e293b"},
                {"id": "h2so4", "name": "稀硫酸", "color": "#38bdf8"},
                {"id": "naoh", "name": "氢氧化钠", "color": "#a3e635"},
            ],
        },
        "required_apparatus": ["tube", "lamp", "rod"],
        "required_reagents": ["cuo", "h2so4"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "guide": "准备",
                "title": "取用仪器与药品",
                "hint": "试管、酒精灯、试管夹；氧化铜和稀硫酸。不要用氢氧化钠。",
            },
            {
                "id": "oxide",
                "need": "action",
                "guide": "准备",
                "title": "取用氧化铜",
                "action_label": "向试管中加入氧化铜粉末",
                "hint": "氧化铜是黑色粉末，用药匙沿试管内壁送入。",
                "phenomenon": "试管底部出现黑色氧化铜粉末。",
                "scene": {"oxide": True, "upright": True},
            },
            {
                "id": "acid",
                "need": "action",
                "guide": "准备",
                "title": "取用稀硫酸",
                "action_label": "加入稀硫酸",
                "hint": "酸沿玻璃棒或试管内壁缓缓倒入，不要洒到管外。",
                "phenomenon": "黑色粉末沉在酸液中，常温下溶解很慢。",
                "scene": {"oxide": True, "oxide_acid": True, "upright": True},
            },
            {
                "id": "mix",
                "need": "action",
                "guide": "操作",
                "title": "混合反应",
                "action_label": "振荡混合",
                "hint": "也可点下方「混合反应」。常温变化不明显，需要加热。",
                "phenomenon": "粉末与酸混合，溶液仍接近无色，黑色固体还在。",
                "scene": {"oxide": True, "oxide_acid": True, "upright": True},
            },
            {
                "id": "heat",
                "need": "choice",
                "guide": "操作",
                "title": "加热",
                "hint": "用酒精灯加热或把加热温度调到 60℃ 以上。试管口不要对着人。",
                "choices": [
                    {"id": "lamp", "label": "用试管夹夹持，酒精灯外焰加热", "correct": True,
                     "ok": "黑色氧化铜逐渐溶解，溶液变成蓝色。",
                     "scene": {"oxide": True, "oxide_acid": True, "heat": True, "flame": True,
                               "liquid": "blue", "upright": True}},
                    {"id": "seal", "label": "塞紧橡皮塞再加热，防止酸液蒸发", "correct": False,
                     "hazard": "密闭加热会使压强骤增，试管可能爆裂。"},
                    {"id": "mouth", "label": "凑近试管口闻一下，确认是不是硫酸味", "correct": False,
                     "hazard": "酸雾有腐蚀性，禁止对着管口去闻。"},
                ],
            },
            {
                "id": "see",
                "need": "action",
                "guide": "现象",
                "title": "观察现象",
                "action_label": "记录溶液颜色",
                "hint": "蓝色来自 Cu²⁺，不是硫酸本身的颜色。",
                "phenomenon": "黑色粉末消失，得到蓝色硫酸铜溶液。",
                "scene": {"oxide_acid": True, "liquid": "blue", "heat": True, "upright": True},
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "金属氧化物与酸反应生成盐和水：CuO + H₂SO₄ → CuSO₄ + H₂O。蓝色是硫酸铜溶液的特征。",
        },
    }


def build_filtration() -> dict:
    return {
        "id": "filtration",
        "scene": "filtration",
        "title": "过滤",
        "subtitle": "一贴二低三靠 · 分离不溶固体",
        "equation": "（物理操作，无化学方程式）",
        "goal": "用漏斗和滤纸把不溶固体从液体中分离，得到澄清滤液。",
        "badge": "初中化学 · 基本操作",
        "inventory": {
            "apparatus": [
                {"id": "funnel", "name": "漏斗", "icon": "斗"},
                {"id": "paper", "name": "滤纸", "icon": "纸"},
                {"id": "rod", "name": "玻璃棒", "icon": "棒"},
                {"id": "beaker", "name": "烧杯", "icon": "杯"},
                {"id": "stand", "name": "铁架台", "icon": "支架"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "mix", "name": "泥沙浊液", "color": "#a8a29e"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
            ],
        },
        "required_apparatus": ["funnel", "paper", "rod", "beaker", "stand"],
        "required_reagents": ["mix"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "漏斗、滤纸、玻璃棒、烧杯、铁架台；样品是浊液。过滤不需要酒精灯，也不要加盐酸。",
            },
            {
                "id": "paper",
                "need": "choice",
                "title": "安放滤纸",
                "hint": "滤纸紧贴漏斗内壁，中间不要留气泡。",
                "choices": [
                    {"id": "wet", "label": "滤纸对折后放入漏斗，用水润湿使它紧贴内壁", "correct": True,
                     "ok": "「一贴」：滤纸紧贴漏斗内壁。",
                     "scene": {"paper": True}},
                    {"id": "hole", "label": "在滤纸上戳一个洞，让液体流得更快", "correct": False,
                     "hazard": "戳洞会使固体漏下去，过滤失败。"},
                ],
            },
            {
                "id": "pour",
                "need": "choice",
                "title": "倾倒液体",
                "hint": "玻璃棒引流，液面低于滤纸边缘。",
                "choices": [
                    {"id": "drain", "label": "用玻璃棒引流，液面低于滤纸边缘", "correct": True,
                     "ok": "「二低三靠」：液面低、烧杯口靠棒、棒靠三层滤纸、漏斗下端靠烧杯壁。",
                     "scene": {"drain": True, "residue": True, "filtrate": True}},
                    {"id": "dump", "label": "把浊液直接倒进漏斗，倒满到漏斗口", "correct": False,
                     "hazard": "液体漫过滤纸边缘，固体会从缝隙流下。"},
                ],
            },
            {
                "id": "result",
                "need": "choice",
                "title": "判断滤液",
                "hint": "滤液应澄清；若仍浑浊，要换滤纸重滤。",
                "choices": [
                    {"id": "clear", "label": "烧杯中得到澄清滤液，残渣留在滤纸上", "correct": True,
                     "ok": "过滤完成：固体和液体分开了。"},
                    {"id": "stir", "label": "用玻璃棒把滤纸捅破，把残渣也冲下去", "correct": False,
                     "hazard": "过滤的目的就是留下不溶固体，不能弄破滤纸。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你按「一贴二低三靠」完成了过滤，得到澄清滤液，残渣留在滤纸上。",
        },
    }


def build_evaporation() -> dict:
    return {
        "id": "evaporation",
        "scene": "evaporation",
        "title": "蒸发结晶",
        "subtitle": "加热蒸发 · 玻璃棒搅拌 · 余热蒸干",
        "equation": "（物理操作，无化学方程式）",
        "goal": "把滤液加热蒸发，得到固体晶体，并防止液滴飞溅。",
        "badge": "初中化学 · 基本操作",
        "inventory": {
            "apparatus": [
                {"id": "dish", "name": "蒸发皿", "icon": "皿"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "rod", "name": "玻璃棒", "icon": "棒"},
                {"id": "stand", "name": "铁架台 / 三脚架", "icon": "架"},
                {"id": "gauze", "name": "陶土网", "icon": "网"},
                {"id": "funnel", "name": "漏斗", "icon": "斗"},
            ],
            "reagents": [
                {"id": "sol", "name": "食盐溶液 / 滤液", "color": "#38bdf8"},
                {"id": "kmno4", "name": "高锰酸钾固体", "color": "#6b21a8"},
            ],
        },
        "required_apparatus": ["dish", "lamp", "rod", "stand", "gauze"],
        "required_reagents": ["sol"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "蒸发皿、酒精灯、玻璃棒、铁架台（或三脚架）、陶土网；液体是滤液或食盐溶液。不要用漏斗蒸发。",
            },
            {
                "id": "pour",
                "need": "action",
                "title": "倒入溶液",
                "action_label": "把溶液倒入蒸发皿，液面不超过容积的三分之二",
                "hint": "蒸发皿能耐高温，烧杯一般不直接用来蒸干。",
                "phenomenon": "蒸发皿中有一层溶液。",
                "scene": {"stir": True},
            },
            {
                "id": "heat",
                "need": "action",
                "title": "加热并搅拌",
                "action_label": "点燃酒精灯，用玻璃棒不断搅拌",
                "hint": "搅拌是为了防止局部过热，液滴飞溅伤人。",
                "phenomenon": "溶液逐渐减少，有水蒸气逸出。",
                "scene": {"heat": True, "stir": True},
            },
            {
                "id": "stop",
                "need": "choice",
                "title": "何时停止加热",
                "hint": "大量固体析出时改用余热蒸干，避免晶体飞溅或烧焦。",
                "choices": [
                    {"id": "left", "label": "出现较多固体时停止加热，利用余热蒸干", "correct": True,
                     "ok": "余热足够把剩余水分蒸干，晶体不易飞溅。",
                     "scene": {"crystals": True, "heat": False}},
                    {"id": "dry", "label": "一直加热到皿底完全烧干、固体发黄", "correct": False,
                     "hazard": "过热会使晶体飞溅，也可能使固体分解变色。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了蒸发结晶：加热搅拌、见固体后改用余热蒸干。",
        },
    }


def build_nh4hco3_decomp() -> dict:
    return {
        "id": "nh4hco3_decomp",
        "scene": "oxygen",
        "title": "碳酸氢铵受热分解",
        "subtitle": "固体加热 · 检验氨气与二氧化碳 · 管口向下",
        "equation": "NH₄HCO₃ △→ NH₃↑ + CO₂↑ + H₂O",
        "goal": "加热碳酸氢铵，用湿润红色石蕊试纸和澄清石灰水检验产物。",
        "badge": "初中化学 · 分解反应",
        "inventory": {
            "apparatus": [
                {"id": "stand", "name": "铁架台", "icon": "支架"},
                {"id": "tube", "name": "试管", "icon": "试管"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "paper", "name": "湿润红色石蕊试纸", "icon": "纸"},
                {"id": "lime_beaker", "name": "盛石灰水的烧杯", "icon": "杯"},
                {"id": "trough", "name": "水槽", "icon": "槽"},
            ],
            "reagents": [
                {"id": "nh4", "name": "碳酸氢铵", "color": "#f8fafc"},
                {"id": "lime", "name": "澄清石灰水", "color": "#e0f2fe"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
            ],
        },
        "required_apparatus": ["stand", "tube", "lamp", "paper", "lime_beaker"],
        "required_reagents": ["nh4", "lime"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "铁架台、试管、酒精灯、湿润红色石蕊试纸、澄清石灰水；药品是碳酸氢铵。不要用水槽收集。",
            },
            {
                "id": "assemble",
                "need": "choice",
                "title": "试管口方向",
                "hint": "固体加热时试管口应略向下，防止冷凝水倒流。",
                "choices": [
                    {"id": "tilt_down", "label": "试管口略向下倾斜", "correct": True,
                     "ok": "生成的水蒸气冷凝后流向管口，热试管不会炸裂。"},
                    {"id": "tilt_up", "label": "试管口对着自己向上倾斜", "correct": False,
                     "hazard": "管口不能对着人；向上倾斜时冷凝水倒流会炸裂试管。"},
                ],
            },
            {
                "id": "add",
                "need": "action",
                "title": "加入药品并加热",
                "action_label": "放入碳酸氢铵，用酒精灯加热",
                "hint": "固体逐渐消失，有刺激性气味气体放出。",
                "phenomenon": "白色固体减少，管口有水雾，能闻到氨的气味。",
                "scene": {"powder": True, "flame": True, "wet_paper": True},
            },
            {
                "id": "test",
                "need": "choice",
                "title": "检验产物",
                "hint": "氨气使湿润红色石蕊试纸变蓝；二氧化碳使石灰水变浑浊。",
                "choices": [
                    {"id": "both", "label": "试纸变蓝说明有氨气，石灰水变浑浊说明有二氧化碳", "correct": True,
                     "ok": "同时还生成水。碳酸氢铵分解成三种物质。",
                     "scene": {"lime": True, "lime_milky": True, "wet_paper": True}},
                    {"id": "o2", "label": "用带火星木条伸入试管，复燃说明有氧气", "correct": False,
                     "hazard": "碳酸氢铵分解不产生氧气，这是制氧气的检验方法。"},
                ],
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "气味与加热",
                "hint": "氨有刺激性，不能凑近去闻；加热后先把导管移开再熄灯（若接了导管）。",
                "choices": [
                    {"id": "fan", "label": "用手轻轻扇闻，试管口不对着人", "correct": True,
                     "ok": "实验室闻气体一律扇闻，不要把鼻子凑到管口。"},
                    {"id": "sniff", "label": "把鼻子凑到试管口深吸一口确认是氨", "correct": False,
                     "hazard": "氨气刺激眼鼻，浓氨还会灼伤黏膜。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了碳酸氢铵受热分解：管口向下、检验出氨气和二氧化碳，并做到扇闻、不对着人。",
        },
    }


def build_iron_in_oxygen() -> dict:
    return {
        "id": "iron_in_oxygen",
        "scene": "burn",
        "scene_init": {"air_collect": True},
        "title": "铁丝在氧气中燃烧",
        "subtitle": "集气瓶底留水 · 预热铁丝 · 火星四射",
        "equation": "3Fe + 2O₂ 点燃→ Fe₃O₄",
        "goal": "观察铁丝在氧气中剧烈燃烧，并保护集气瓶不被溅落熔融物炸裂。",
        "badge": "初中化学 · 氧气的性质",
        "inventory": {
            "apparatus": [
                {"id": "bottle", "name": "盛氧气的集气瓶", "icon": "瓶"},
                {"id": "wire", "name": "绕成螺旋状的铁丝", "icon": "丝"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "cover", "name": "玻璃片", "icon": "片"},
                {"id": "trough", "name": "水槽", "icon": "槽"},
            ],
            "reagents": [
                {"id": "o2", "name": "氧气", "color": "#38bdf8"},
                {"id": "rust", "name": "火柴或一小粒火柴头（引燃）", "color": "#b45309"},
                {"id": "hcl", "name": "稀盐酸", "color": "#22c55e"},
            ],
        },
        "required_apparatus": ["bottle", "wire", "lamp", "cover"],
        "required_reagents": ["o2", "rust"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "盛氧气的集气瓶、螺旋铁丝、酒精灯、玻璃片；用火柴头帮助引燃。不要把水槽当反应容器。",
            },
            {
                "id": "water",
                "need": "choice",
                "title": "保护集气瓶",
                "hint": "熔融物溅到底部会炸裂玻璃，要垫一层水或细沙。",
                "choices": [
                    {"id": "water", "label": "集气瓶底先留少量水（或铺一层细沙）", "correct": True,
                     "ok": "水或细沙吸收热量，瓶底不易炸裂。",
                     "scene": {"air_collect": True, "bottle_water": True}},
                    {"id": "dry", "label": "瓶底保持干燥，燃烧更旺", "correct": False,
                     "hazard": "炽热熔融物打在干燥瓶底，集气瓶会炸裂。"},
                ],
            },
            {
                "id": "heat",
                "need": "action",
                "title": "预热铁丝",
                "action_label": "在酒精灯上烧至铁丝红热，迅速伸入氧气瓶",
                "hint": "铁丝绕成螺旋可增大受热面积；瓶口用玻璃片稍作遮挡。",
                "phenomenon": "铁丝剧烈燃烧，火星四射，生成黑色固体。",
                "scene": {"flame": True, "sparks": True, "air_collect": True, "bottle_water": True},
            },
            {
                "id": "safety",
                "need": "choice",
                "title": "操作注意",
                "hint": "红热铁丝要自上而下缓慢伸入，不要碰到瓶壁。",
                "choices": [
                    {"id": "slow", "label": "自上而下缓慢伸入，避免接触瓶壁和瓶底的水", "correct": True,
                     "ok": "既看清现象，又不炸裂瓶子。"},
                    {"id": "drop", "label": "把烧红的铁丝扔进瓶里立刻盖紧", "correct": False,
                     "hazard": "铁丝会砸裂瓶底，盖紧还会使瓶内压强骤变。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了铁丝在氧气中燃烧：瓶底留水、预热后伸入，看到火星四射。",
        },
    }


def build_solution_prep() -> dict:
    return {
        "id": "solution_prep",
        "scene": "solution_prep",
        "title": "配制一定溶质质量分数的溶液",
        "subtitle": "称量 · 量水 · 烧杯溶解 · 玻璃棒搅拌",
        "equation": "（配制操作，无化学方程式）",
        "goal": "按计算称取固体、量取水，在烧杯中溶解，得到指定质量分数的溶液。",
        "badge": "初中化学 · 溶液",
        "inventory": {
            "apparatus": [
                {"id": "balance", "name": "托盘天平", "icon": "秤"},
                {"id": "beaker", "name": "烧杯", "icon": "杯"},
                {"id": "cylinder", "name": "量筒", "icon": "筒"},
                {"id": "rod", "name": "玻璃棒", "icon": "棒"},
                {"id": "paper", "name": "称量纸", "icon": "纸"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "nacl", "name": "氯化钠固体", "color": "#f8fafc"},
                {"id": "water", "name": "蒸馏水", "color": "#38bdf8"},
            ],
        },
        "required_apparatus": ["balance", "beaker", "cylinder", "rod", "paper"],
        "required_reagents": ["nacl", "water"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "托盘天平、烧杯、量筒、玻璃棒、称量纸；氯化钠和水。溶解不需要酒精灯。",
            },
            {
                "id": "weigh",
                "need": "choice",
                "title": "称量固体",
                "hint": "药品不能直接放在托盘上。",
                "choices": [
                    {"id": "paper", "label": "在称量纸上称取计算量的氯化钠", "correct": True,
                     "ok": "固体放称量纸（或小烧杯）上，先放砝码再添药品，直至平衡。"},
                    {"id": "pan", "label": "把氯化钠直接倒在托盘上称", "correct": False,
                     "hazard": "药品会腐蚀托盘，称量也不准确。"},
                ],
            },
            {
                "id": "water",
                "need": "choice",
                "title": "量取水并溶解",
                "hint": "量筒只能量体积，不能当溶解容器。",
                "choices": [
                    {"id": "beaker", "label": "用量筒量水，倒入烧杯，用玻璃棒搅拌溶解", "correct": True,
                     "ok": "溶解在烧杯中进行，玻璃棒搅拌加快溶解。",
                     "scene": {"liquid": "clear"}},
                    {"id": "cyl", "label": "把氯化钠倒进量筒，直接在量筒里加水振荡", "correct": False,
                     "hazard": "量筒不能用于溶解或稀释，刻度会不准，也容易洒出。"},
                ],
            },
            {
                "id": "read",
                "need": "choice",
                "title": "读数与转移",
                "hint": "量筒读数时视线与凹液面最低处相平。",
                "choices": [
                    {"id": "eye", "label": "量水时平视凹液面最低处，再转移到烧杯", "correct": True,
                     "ok": "俯视读数偏小、仰视偏大，都会使溶质质量分数不准。"},
                    {"id": "heat", "label": "用酒精灯加热量筒，让固体溶得更快", "correct": False,
                     "hazard": "量筒不能加热。需要加速溶解应在烧杯中搅拌，必要时水浴。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "你完成了溶液配制：称量、量水、烧杯中溶解，没有在量筒里溶固体。",
        },
    }


def build_co2_candles() -> dict:
    return {
        "id": "co2_candles",
        "scene": "co2_candles",
        "scene_init": {"co2_fill": True},
        "title": "倾倒二氧化碳熄灭蜡烛",
        "subtitle": "密度比空气大 · 不支持燃烧 · 低处先灭",
        "equation": "（物理性质，无化学方程式）CO₂ 密度比空气大，不能燃烧也不支持燃烧",
        "goal": "把二氧化碳沿杯壁缓慢倒入，观察高低两支蜡烛熄灭的先后，并说明灭火原理。",
        "badge": "初中化学 · 二氧化碳的性质",
        "inventory": {
            "apparatus": [
                {"id": "beaker", "name": "装有高低两支蜡烛的烧杯", "icon": "杯"},
                {"id": "bottle", "name": "盛满二氧化碳的集气瓶", "icon": "瓶"},
                {"id": "cover", "name": "玻璃片", "icon": "片"},
                {"id": "trough", "name": "水槽", "icon": "槽"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "co2", "name": "二氧化碳", "color": "#64748b"},
                {"id": "o2", "name": "氧气", "color": "#38bdf8"},
                {"id": "hcl", "name": "稀盐酸", "color": "#22c55e"},
            ],
        },
        "required_apparatus": ["beaker", "bottle"],
        "required_reagents": [],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "要演示二氧化碳灭火，需要：装有高低两支蜡烛的烧杯、盛满二氧化碳的集气瓶。不要用水槽或酒精灯。",
            },
            {
                "id": "light",
                "need": "action",
                "title": "点燃蜡烛",
                "action_label": "点燃烧杯里高低两支蜡烛",
                "hint": "两支蜡烛要有明显高度差，这样才看得出气体先在哪里积聚。",
                "phenomenon": "较高处和较低处的蜡烛都在燃烧。",
                "scene": {"co2_fill": True, "lit": True},
            },
            {
                "id": "pour_way",
                "need": "choice",
                "title": "怎样倒入二氧化碳",
                "hint": "二氧化碳密度比空气大。倒得太猛会搅乱层次，看不清先后。",
                "choices": [
                    {"id": "slow", "label": "沿烧杯内壁缓慢倾倒", "correct": True,
                     "ok": "气体沉到杯底，能看清从下往上积聚。",
                     "scene": {"co2_fill": True, "lit": True, "pouring": True}},
                    {"id": "dump", "label": "把集气瓶口朝下，一下子倒完", "correct": False,
                     "hazard": "气流太急，杯内气体被搅乱，高低蜡烛可能几乎同时熄灭，看不出密度差异。"},
                ],
            },
            {
                "id": "low",
                "need": "action",
                "title": "观察较低处蜡烛",
                "action_label": "继续缓慢倾倒，盯住较低处蜡烛",
                "hint": "二氧化碳比空气重，先在杯底铺开。",
                "phenomenon": "较低处蜡烛先熄灭，较高处蜡烛仍在燃烧。",
                "scene": {"co2_fill": True, "lit": True, "pouring": True, "co2_low": True, "low_out": True},
            },
            {
                "id": "high",
                "need": "action",
                "title": "观察较高处蜡烛",
                "action_label": "再倒一些，看较高处蜡烛",
                "hint": "杯底被二氧化碳占满后，气层逐渐升高。",
                "phenomenon": "较高处蜡烛随后熄灭。",
                "scene": {"co2_fill": True, "lit": True, "pouring": True, "co2_mid": True, "low_out": True, "high_out": True},
            },
            {
                "id": "why",
                "need": "choice",
                "title": "为什么能灭火",
                "hint": "联系刚才的熄灭顺序：先灭的在下面。",
                "choices": [
                    {"id": "dense", "label": "二氧化碳密度比空气大，沉在下方隔绝氧气，且本身不支持燃烧", "correct": True,
                     "ok": "低处先灭说明它比空气重；两支最终都灭说明它不能支持燃烧。灭火器就是利用这一点。"},
                    {"id": "light", "label": "二氧化碳比空气轻，先跑到杯口把高处蜡烛闷灭", "correct": False,
                     "hazard": "如果比空气轻，应该高处蜡烛先灭。实验里是低处先灭。"},
                    {"id": "react", "label": "二氧化碳和蜡烛发生化学反应，把蜡消耗掉了", "correct": False,
                     "hazard": "蜡烛熄灭是因为缺氧、火焰被隔绝，蜡并没有被二氧化碳反应掉。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "二氧化碳密度比空气大，倒入烧杯后从底部往上积聚，所以较低处蜡烛先灭；它不能燃烧也不支持燃烧，因而能灭火。",
        },
    }


def build_air_oxygen() -> dict:
    return {
        "id": "air_oxygen",
        "scene": "air_oxygen",
        "scene_init": {"air_collect": True, "bottle_water": True},
        "title": "测定空气中氧气的含量",
        "subtitle": "红磷燃烧耗氧 · 冷却后水面上升约 1/5",
        "equation": "4P + 5O₂ 点燃→ 2P₂O₅",
        "goal": "用足量红磷消耗密闭空气中的氧气，冷却后看水面上升约占原来气体体积的 1/5。",
        "badge": "初中化学 · 空气",
        "inventory": {
            "apparatus": [
                {"id": "bottle", "name": "集气瓶（水面上方五等分）", "icon": "瓶"},
                {"id": "wire", "name": "燃烧匙", "icon": "匙"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "beaker", "name": "烧杯（盛水）", "icon": "杯"},
                {"id": "cover", "name": "玻璃片", "icon": "片"},
            ],
            "reagents": [
                {"id": "p_red", "name": "红磷", "color": "#dc2626"},
                {"id": "kmno4", "name": "高锰酸钾", "color": "#6b21a8"},
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
            ],
        },
        "required_apparatus": ["bottle", "wire", "lamp", "beaker"],
        "required_reagents": ["p_red"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "集气瓶、燃烧匙、酒精灯、盛水的烧杯；药品用红磷。不要用高锰酸钾或盐酸。",
            },
            {
                "id": "mark",
                "need": "choice",
                "title": "怎样准备集气瓶",
                "hint": "要量的是瓶内空气里氧气占的体积分数。",
                "choices": [
                    {"id": "water", "label": "瓶内先加少量水，把水面上方空间分成 5 等份并做标记", "correct": True,
                     "ok": "冷却后看液面升到哪一条刻度，就能读出消耗的体积分数。",
                     "scene": {"air_collect": True, "bottle_water": True}},
                    {"id": "dry", "label": "用干燥的空瓶，直接点燃红磷", "correct": False,
                     "hazard": "没有水和刻度，看不出体积变化；也不能形成连通器把水吸进来。"},
                ],
            },
            {
                "id": "burn",
                "need": "action",
                "title": "点燃红磷并密封",
                "action_label": "点燃足量红磷，立即伸入瓶中并塞紧",
                "hint": "红磷必须足量，才能把瓶里的氧气几乎耗尽。塞紧后气体不能进出。",
                "phenomenon": "红磷剧烈燃烧，产生五氧化二磷白烟，随后火焰熄灭。",
                "scene": {"air_collect": True, "bottle_water": True, "flame": True, "sparks": True},
            },
            {
                "id": "cool",
                "need": "choice",
                "title": "什么时候打开弹簧夹",
                "hint": "燃烧时气体受热膨胀。要测的是冷却后减少的体积。",
                "choices": [
                    {"id": "wait", "label": "待红磷熄灭并冷却到室温，再打开弹簧夹", "correct": True,
                     "ok": "温度回到室温后，减少的体积才等于被消耗的氧气体积。"},
                    {"id": "now", "label": "火焰一灭立刻打开，趁热观察", "correct": False,
                     "hazard": "瓶内气体还热、压强偏大，吸入的水偏少，测得氧气含量会偏低。"},
                ],
            },
            {
                "id": "rise",
                "need": "action",
                "title": "观察水面",
                "action_label": "打开弹簧夹，看烧杯中的水被吸入集气瓶",
                "hint": "氧气约占空气体积的 1/5。足量红磷、装置不漏气时，液面大约升到第一格。",
                "phenomenon": "水被吸入集气瓶，液面大约上升至五等分的 1/5。",
                "scene": {"air_collect": True, "bottle_water": True, "water_rise": True},
            },
            {
                "id": "why",
                "need": "choice",
                "title": "为什么大约是 1/5",
                "hint": "红磷只和空气中能支持燃烧的那种气体反应。",
                "choices": [
                    {"id": "o2", "label": "红磷消耗了氧气，氧气约占空气体积的 1/5，所以水面上升约 1/5", "correct": True,
                     "ok": "氮气等其余气体几乎不参加反应，剩下约 4/5。"},
                    {"id": "n2", "label": "红磷把氮气烧掉了，氮气大约占空气的 1/5", "correct": False,
                     "hazard": "氮气不支持燃烧，红磷消耗的是氧气。氮气约占 4/5。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "足量红磷在密闭空气中燃烧消耗氧气，冷却后水面上升约占原气体体积的 1/5，说明氧气约占空气体积的 1/5。",
        },
    }


def build_charcoal_in_oxygen() -> dict:
    return {
        "id": "charcoal_in_oxygen",
        "scene": "burn",
        "scene_init": {"air_collect": True},
        "title": "木炭在氧气中燃烧",
        "subtitle": "发出白光 · 生成使石灰水变浑浊的气体",
        "equation": "C + O₂ 点燃→ CO₂",
        "goal": "比较木炭在空气和氧气中燃烧的剧烈程度，并用澄清石灰水检验产物。",
        "badge": "初中化学 · 氧气的性质",
        "inventory": {
            "apparatus": [
                {"id": "bottle", "name": "盛氧气的集气瓶", "icon": "瓶"},
                {"id": "wire", "name": "坩埚钳", "icon": "钳"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "cover", "name": "玻璃片", "icon": "片"},
                {"id": "lime_beaker", "name": "澄清石灰水", "icon": "杯"},
            ],
            "reagents": [
                {"id": "c", "name": "木炭", "color": "#1e293b"},
                {"id": "o2", "name": "氧气", "color": "#38bdf8"},
                {"id": "hcl", "name": "稀盐酸", "color": "#22c55e"},
            ],
        },
        "required_apparatus": ["bottle", "wire", "lamp"],
        "required_reagents": ["c", "o2"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "盛氧气的集气瓶、坩埚钳、酒精灯；木炭和氧气。石灰水留到检验产物再用。",
            },
            {
                "id": "air",
                "need": "action",
                "title": "先在空气中加热",
                "action_label": "用坩埚钳夹木炭，在酒精灯上加热",
                "hint": "先看空气中的现象，再伸进氧气瓶作对比。",
                "phenomenon": "木炭在空气中燃烧较缓慢，发出红热。",
                "scene": {"air_collect": True, "flame": True},
            },
            {
                "id": "oxy",
                "need": "action",
                "title": "伸入氧气瓶",
                "action_label": "把燃着的木炭迅速插入盛氧气的集气瓶",
                "hint": "氧气比空气含氧多，燃烧会更剧烈。",
                "phenomenon": "木炭剧烈燃烧，发出白光，放出热量。",
                "scene": {"air_collect": True, "flame": True, "sparks": True},
            },
            {
                "id": "test",
                "need": "choice",
                "title": "怎样检验产物",
                "hint": "碳充分燃烧的产物是二氧化碳。",
                "choices": [
                    {"id": "lime", "label": "向瓶中倒入澄清石灰水，振荡", "correct": True,
                     "ok": "石灰水变浑浊，说明生成了二氧化碳：CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O。",
                     "scene": {"air_collect": True, "lime_milky": True}},
                    {"id": "pop", "label": "用燃着的木条伸入瓶口听爆鸣", "correct": False,
                     "hazard": "那是检验氢气的方法。二氧化碳不能燃烧也不支持燃烧。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "木炭在氧气中比在空气中燃烧更旺，发出白光，生成的二氧化碳使澄清石灰水变浑浊。",
        },
    }


def build_sulfur_in_oxygen() -> dict:
    return {
        "id": "sulfur_in_oxygen",
        "scene": "burn",
        "scene_init": {"air_collect": True},
        "title": "硫在氧气中燃烧",
        "subtitle": "空气中淡蓝 · 氧气中蓝紫 · 刺激性二氧化硫",
        "equation": "S + O₂ 点燃→ SO₂",
        "goal": "比较硫在空气和氧气中的火焰颜色，认识产物二氧化硫有刺激性气味。",
        "badge": "初中化学 · 氧气的性质",
        "inventory": {
            "apparatus": [
                {"id": "bottle", "name": "盛氧气的集气瓶", "icon": "瓶"},
                {"id": "wire", "name": "燃烧匙", "icon": "匙"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "cover", "name": "玻璃片", "icon": "片"},
                {"id": "goggles", "name": "护目镜", "icon": "镜"},
            ],
            "reagents": [
                {"id": "s", "name": "硫粉", "color": "#eab308"},
                {"id": "o2", "name": "氧气", "color": "#38bdf8"},
                {"id": "c", "name": "木炭", "color": "#1e293b"},
            ],
        },
        "required_apparatus": ["bottle", "wire", "lamp"],
        "required_reagents": ["s", "o2"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "盛氧气的集气瓶、燃烧匙、酒精灯；硫和氧气。本实验应在通风处进行。",
            },
            {
                "id": "air",
                "need": "action",
                "title": "硫在空气中燃烧",
                "action_label": "在燃烧匙里放少量硫，加热至燃烧",
                "hint": "先看空气中的火焰，再伸进氧气瓶。",
                "phenomenon": "硫在空气中燃烧，发出微弱的淡蓝色火焰。",
                "scene": {"air_collect": True, "flame": True},
            },
            {
                "id": "oxy",
                "need": "action",
                "title": "伸入氧气瓶",
                "action_label": "把燃着的硫插入盛氧气的集气瓶",
                "hint": "氧气中燃烧更旺，火焰颜色会改变。",
                "phenomenon": "发出明亮的蓝紫色火焰，放出热量，产生有刺激性气味的气体。",
                "scene": {"air_collect": True, "flame": True, "sparks": True},
            },
            {
                "id": "smell",
                "need": "choice",
                "title": "怎样闻气味",
                "hint": "二氧化硫有刺激性，不能凑到瓶口去闻。",
                "choices": [
                    {"id": "fan", "label": "用手在瓶口轻轻扇闻", "correct": True,
                     "ok": "产物是二氧化硫。刺激性气体一律扇闻，不要对着瓶口深吸。"},
                    {"id": "nose", "label": "把鼻子凑到瓶口用力吸一下，才能闻清楚", "correct": False,
                     "hazard": "二氧化硫刺激呼吸道。课本要求扇闻，且本实验应在通风橱中演示。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "硫在空气中发出淡蓝色火焰，在氧气中发出蓝紫色火焰，生成有刺激性气味的二氧化硫。",
        },
    }


def build_charcoal_reduce_cuo() -> dict:
    return {
        "id": "charcoal_reduce_cuo",
        "scene": "nh4hco3_decomp",
        "title": "木炭还原氧化铜",
        "subtitle": "高温夺氧 · 黑色变红 · 石灰水变浑浊",
        "equation": "2CuO + C 高温→ 2Cu + CO₂↑",
        "goal": "加热木炭和氧化铜的混合物，观察黑色粉末变红，并用石灰水检验二氧化碳。",
        "badge": "初中化学 · 碳的化学性质",
        "inventory": {
            "apparatus": [
                {"id": "stand", "name": "铁架台", "icon": "支架"},
                {"id": "tube", "name": "试管", "icon": "试管"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
                {"id": "lime_beaker", "name": "澄清石灰水", "icon": "杯"},
                {"id": "paper", "name": "纸（倒出产物）", "icon": "纸"},
            ],
            "reagents": [
                {"id": "cuo", "name": "氧化铜粉末", "color": "#1e293b"},
                {"id": "c", "name": "烘干的木炭粉", "color": "#334155"},
                {"id": "hcl", "name": "稀盐酸", "color": "#22c55e"},
            ],
        },
        "required_apparatus": ["stand", "tube", "lamp", "lime_beaker"],
        "required_reagents": ["cuo", "c"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "铁架台、试管、酒精灯、澄清石灰水；烘干的木炭粉和氧化铜。不要用盐酸。",
            },
            {
                "id": "load",
                "need": "choice",
                "title": "药品怎么放",
                "hint": "木炭和氧化铜要接触才能反应；导管要通入石灰水。",
                "choices": [
                    {"id": "mix", "label": "把烘干的木炭粉和氧化铜混匀，铺在试管里，导管插入石灰水", "correct": True,
                     "ok": "粉末烘干是为了避免水蒸气干扰。导管插入石灰水，才能检验生成的二氧化碳。",
                     "scene": {"powder": True, "oxide": True}},
                    {"id": "wet", "label": "木炭不用烘干，直接和氧化铜一起加热更省事", "correct": False,
                     "hazard": "水蒸气会进入石灰水，也可能使试管局部炸裂，现象说不清。"},
                ],
            },
            {
                "id": "heat",
                "need": "action",
                "title": "高温加热",
                "action_label": "用酒精灯（可加网罩）加热混合物几分钟",
                "hint": "这个反应需要较高温度。先加热，再观察石灰水。",
                "phenomenon": "混合物由黑变红，澄清石灰水变浑浊。",
                "scene": {"powder": True, "oxide": True, "flame": True, "lime_milky": True, "heat": True},
            },
            {
                "id": "stop",
                "need": "choice",
                "title": "停止加热的顺序",
                "hint": "导管还插在石灰水里时就停火，水会倒吸。",
                "choices": [
                    {"id": "out", "label": "先撤出导管，再停止加热，冷却后把粉末倒在纸上", "correct": True,
                     "ok": "防止石灰水倒吸进热试管。冷却后能看到红色的铜。",
                     "scene": {"metal": True, "lime_milky": True}},
                    {"id": "fire", "label": "先灭酒精灯，导管继续留在石灰水里冷却", "correct": False,
                     "hazard": "试管内气压下降，石灰水倒吸，热试管会炸裂。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "高温下碳夺取氧化铜中的氧：黑色氧化铜变成红色铜，生成的二氧化碳使石灰水变浑浊。这是还原反应。",
        },
    }


def build_mass_conservation() -> dict:
    return {
        "id": "mass_conservation",
        "scene": "solution_prep",
        "title": "验证质量守恒定律",
        "subtitle": "密闭容器 · 铁与硫酸铜 · 反应前后总质量相等",
        "equation": "Fe + CuSO₄ → Cu + FeSO₄",
        "goal": "在密闭装置中让铁与硫酸铜反应，称量反应前后总质量，认识质量守恒。",
        "badge": "初中化学 · 质量守恒定律",
        "inventory": {
            "apparatus": [
                {"id": "balance", "name": "托盘天平", "icon": "秤"},
                {"id": "beaker", "name": "锥形瓶（塞紧）", "icon": "瓶"},
                {"id": "rod", "name": "小试管（盛硫酸铜）", "icon": "管"},
                {"id": "paper", "name": "称量纸", "icon": "纸"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "fe", "name": "打磨过的铁丝", "color": "#94a3b8"},
                {"id": "cuso4", "name": "硫酸铜溶液", "color": "#2563eb"},
                {"id": "hcl", "name": "稀盐酸", "color": "#22c55e"},
            ],
        },
        "required_apparatus": ["balance", "beaker", "rod"],
        "required_reagents": ["fe", "cuso4"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "天平、塞紧的锥形瓶、盛硫酸铜的小试管；铁丝和硫酸铜溶液。本方案不加热，不用酒精灯。",
            },
            {
                "id": "weigh1",
                "need": "action",
                "title": "反应前称量",
                "action_label": "铁丝放在锥形瓶底，小试管盛硫酸铜，塞紧后放上天平，记下 m₁",
                "hint": "必须密闭。如果敞口，生成或逸出的气体会让质量对不上。",
                "phenomenon": "记录反应前总质量 m₁。",
                "scene": {"metal": True, "liquid": "blue"},
            },
            {
                "id": "mix",
                "need": "action",
                "title": "倾斜混合",
                "action_label": "取下锥形瓶，倾斜使硫酸铜流入，观察后再称量",
                "hint": "铁把铜从硫酸铜溶液里置换出来。",
                "phenomenon": "铁丝表面出现红色的铜，溶液由蓝逐渐变浅。",
                "scene": {"metal": True, "liquid": "blue", "acid_bubbles": False},
            },
            {
                "id": "weigh2",
                "need": "choice",
                "title": "比较 m₁ 和 m₂",
                "hint": "参加反应的各物质质量总和，等于生成物质量总和。",
                "choices": [
                    {"id": "same", "label": "密闭装置中 m₂ 等于 m₁，总质量不变", "correct": True,
                     "ok": "铜和硫酸亚铁仍在瓶内，没有物质跑掉，所以总质量相等。这就是质量守恒定律。"},
                    {"id": "light", "label": "生成了铜，铜比铁轻，所以 m₂ 一定变小", "correct": False,
                     "hazard": "铁减少的质量和铜、硫酸亚铁增加的质量加在一起仍然相等。不能只看一种生成物。"},
                    {"id": "open", "label": "应该打开瓶塞再称，否则气体胀破瓶子", "correct": False,
                     "hazard": "这个反应没有气体逸出。若换成碳酸钠和盐酸敞口称量，二氧化碳跑掉，质量会减小。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "在密闭容器中，铁与硫酸铜反应前后总质量相等。参加反应的各物质质量总和等于生成物质量总和。",
        },
    }


def build_metal_displace() -> dict:
    return {
        "id": "metal_displace",
        "scene": "metal_acid",
        "title": "铁与硫酸铜的置换反应",
        "subtitle": "铁钉插入硫酸铜 · 表面覆铜 · 溶液由蓝变浅",
        "equation": "Fe + CuSO₄ → Cu + FeSO₄",
        "goal": "观察铁把铜从硫酸铜溶液中置换出来，认识金属活动性：铁比铜强。",
        "badge": "初中化学 · 金属活动性",
        "inventory": {
            "apparatus": [
                {"id": "goggles", "name": "护目镜", "icon": "镜"},
                {"id": "beaker", "name": "烧杯", "icon": "杯"},
                {"id": "rod", "name": "铁钉或铁丝", "icon": "钉"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "cuso4", "name": "硫酸铜溶液", "color": "#2563eb"},
                {"id": "hcl", "name": "稀盐酸", "color": "#22c55e"},
                {"id": "agno3", "name": "硝酸银溶液", "color": "#f8fafc"},
            ],
        },
        "required_apparatus": ["goggles", "beaker", "rod"],
        "required_reagents": ["cuso4"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "护目镜、烧杯、打磨过的铁钉；硫酸铜溶液。本实验不加热。",
            },
            {
                "id": "dip",
                "need": "action",
                "title": "浸入硫酸铜",
                "action_label": "把打磨光亮的铁钉浸入硫酸铜溶液",
                "hint": "铁的活动性比铜强，能把铜置换出来。",
                "phenomenon": "铁钉表面逐渐覆盖一层红色的铜，溶液蓝色变浅（生成浅绿色硫酸亚铁）。",
                "scene": {"liquid": "blue", "metal": True},
            },
            {
                "id": "why",
                "need": "choice",
                "title": "这说明什么",
                "hint": "比较铁和铜谁更容易失去电子、谁更能把对方从盐溶液里换出来。",
                "choices": [
                    {"id": "fe", "label": "铁的活动性比铜强，发生了置换反应", "correct": True,
                     "ok": "一种单质和一种化合物反应，生成另一种单质和另一种化合物，这就是置换反应。"},
                    {"id": "cu", "label": "铜的活动性比铁强，所以铜会镀到铁上", "correct": False,
                     "hazard": "如果铜更活泼，应该是铜把铁从溶液里置换出来，铁钉不会变红。"},
                    {"id": "mix", "label": "只是铁钉沾上了蓝色的硫酸铜，没有新物质", "correct": False,
                     "hazard": "红色固体是铜单质，溶液成分也变成了硫酸亚铁，有新物质生成。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "铁能把铜从硫酸铜溶液中置换出来：Fe + CuSO₄ → Cu + FeSO₄。铁的金属活动性比铜强。",
        },
    }


def build_iron_rust() -> dict:
    return {
        "id": "iron_rust",
        "scene": "iron_rust",
        "title": "探究铁钉生锈的条件",
        "subtitle": "对照实验 · 既要水也要氧气",
        "equation": "4Fe + 3O₂ + xH₂O → 2Fe₂O₃·xH₂O",
        "goal": "用三支试管对照：水和空气、隔绝空气的水、干燥空气，判断铁生锈的条件。",
        "badge": "初中化学 · 金属资源保护",
        "inventory": {
            "apparatus": [
                {"id": "tube", "name": "试管（三支）", "icon": "试管"},
                {"id": "beaker", "name": "烧杯", "icon": "杯"},
                {"id": "lamp", "name": "酒精灯（煮沸蒸馏水）", "icon": "灯"},
            ],
            "reagents": [
                {"id": "fe", "name": "洁净无锈的铁钉", "color": "#94a3b8"},
                {"id": "water", "name": "蒸馏水", "color": "#38bdf8"},
                {"id": "oil", "name": "植物油", "color": "#ca8a04"},
                {"id": "cacl2", "name": "氯化钙（干燥剂）", "color": "#f8fafc"},
            ],
        },
        "required_apparatus": ["tube"],
        "required_reagents": ["fe", "water"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "三支试管和洁净铁钉；还要用蒸馏水。植物油、氯化钙用来做对照。",
            },
            {
                "id": "setup",
                "need": "choice",
                "title": "怎样控制变量",
                "hint": "一次只改变一个条件：有没有水、有没有氧气。",
                "choices": [
                    {"id": "three", "label": "①铁钉+水和空气 ②煮沸冷却的水+油封 ③干燥剂+棉花（干燥空气）", "correct": True,
                     "ok": "第一支既有水又有氧气；第二支有水但隔绝空气；第三支有空气但干燥。",
                     "scene": {"rust_setup": True}},
                    {"id": "one", "label": "三支试管都放铁钉和水，一起观察就行", "correct": False,
                     "hazard": "条件都一样，看不出生锈到底需要水还是需要氧气。"},
                ],
            },
            {
                "id": "wait",
                "need": "action",
                "title": "观察一周后的结果",
                "action_label": "快进到放置约一周后（真实实验需提前一周开始）",
                "hint": "课本要求连续观察约一周。虚拟实验把时间压缩，对照关系不变。",
                "phenomenon": "只有与水和空气同时接触的铁钉明显生锈；油封的和干燥的几乎不生锈。",
                "scene": {"rust_setup": True, "rust": True},
            },
            {
                "id": "why",
                "need": "choice",
                "title": "铁生锈需要什么",
                "hint": "对比三支试管：谁生锈、谁不生锈。",
                "choices": [
                    {"id": "both", "label": "铁生锈需要水和氧气同时存在", "correct": True,
                     "ok": "所以防锈可以保持干燥，或隔绝空气（涂油、镀层）。铁锈主要成分是 Fe₂O₃·xH₂O。"},
                    {"id": "water", "label": "只要有水就会生锈，和氧气无关", "correct": False,
                     "hazard": "油封那支也有水，却几乎不生锈，说明还缺氧气。"},
                    {"id": "air", "label": "只要接触空气就会生锈，和水无关", "correct": False,
                     "hazard": "放了干燥剂的那支有空气却几乎不生锈，说明还缺水。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "铁生锈需要水和氧气同时存在。保持干燥或隔绝空气都可以防锈。",
        },
    }


def build_combustion_conditions() -> dict:
    return {
        "id": "combustion_conditions",
        "scene": "combustion_conditions",
        "title": "探究燃烧的条件",
        "subtitle": "白磷 / 红磷对照 · 可燃物 · 氧气 · 着火点",
        "equation": "（探究实验，结论为燃烧三条件）",
        "goal": "用热水、铜片上的白磷和红磷、水中白磷通氧气，归纳燃烧需要的三个条件。",
        "badge": "初中化学 · 燃烧与灭火",
        "inventory": {
            "apparatus": [
                {"id": "beaker", "name": "烧杯（热水）", "icon": "杯"},
                {"id": "cover", "name": "薄铜片", "icon": "片"},
                {"id": "lamp", "name": "酒精灯", "icon": "灯"},
            ],
            "reagents": [
                {"id": "p_white", "name": "白磷", "color": "#f8fafc"},
                {"id": "p_red", "name": "红磷", "color": "#dc2626"},
                {"id": "o2", "name": "氧气", "color": "#38bdf8"},
            ],
        },
        "required_apparatus": ["beaker", "cover"],
        "required_reagents": ["p_white", "p_red"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "烧杯盛热水、薄铜片；白磷和红磷。白磷剧毒，真实实验由教师在通风橱演示。",
            },
            {
                "id": "plate",
                "need": "action",
                "title": "铜片上的对照",
                "action_label": "热水上盖铜片：一端放干燥红磷，另一端放吸去表面水的白磷",
                "hint": "铜片温度相同，都接触空气，只有可燃物种类不同。",
                "phenomenon": "铜片上的白磷燃烧，红磷不燃烧；热水中的白磷不燃烧。",
                "scene": {"hot_water": True, "wp_air": True, "rp_air": True, "wp_water": True},
            },
            {
                "id": "temp",
                "need": "choice",
                "title": "白磷燃、红磷不燃说明什么",
                "hint": "白磷着火点约 40 ℃，红磷约 260 ℃。热水能把铜片加热到四十多度，到不了二百多度。",
                "choices": [
                    {"id": "ign", "label": "燃烧需要温度达到可燃物的着火点", "correct": True,
                     "ok": "同样是可燃物、同样有空气，温度够的白磷才燃烧。"},
                    {"id": "kind", "label": "红磷根本不是可燃物", "correct": False,
                     "hazard": "红磷可以燃烧，只是着火点更高。空气中的红磷实验就能点燃。"},
                ],
            },
            {
                "id": "oxygen",
                "need": "choice",
                "title": "水里的白磷为什么不燃",
                "hint": "热水已超过白磷着火点，它也是可燃物。",
                "choices": [
                    {"id": "o2", "label": "水把白磷和氧气隔开了，燃烧还需要氧气（或空气）", "correct": True,
                     "ok": "可燃物、温度够，缺氧气就不能燃烧。"},
                    {"id": "cold", "label": "水太凉，没有达到白磷着火点", "correct": False,
                     "hazard": "烧杯里是热水，铜片上的白磷就是靠这壶热水达到着火点的。"},
                ],
            },
            {
                "id": "blow",
                "need": "action",
                "title": "向水中白磷通氧气",
                "action_label": "用导管向热水中的白磷通入少量氧气",
                "hint": "补上刚才缺少的那个条件。",
                "phenomenon": "热水中的白磷燃烧。",
                "scene": {"hot_water": True, "wp_air": True, "rp_air": True, "wp_water": True, "wp_o2": True, "flame": True},
            },
            {
                "id": "sum",
                "need": "choice",
                "title": "燃烧需要哪些条件",
                "hint": "把三次对照合在一起。",
                "choices": [
                    {"id": "three", "label": "可燃物、氧气（或空气）、温度达到着火点，三者缺一不可", "correct": True,
                     "ok": "灭火就是破坏其中至少一个条件：移走可燃物、隔绝空气或降低到着火点以下。"},
                    {"id": "two", "label": "只要有可燃物和氧气就会燃烧，温度无所谓", "correct": False,
                     "hazard": "铜片上的红磷有空气却不燃，就是因为没达到着火点。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "燃烧需要：可燃物、氧气（或空气）、温度达到着火点。白磷着火点低，红磷着火点高；隔绝氧气则不能燃烧。",
        },
    }


def build_acid_indicator() -> dict:
    return {
        "id": "acid_indicator",
        "scene": "neutralization",
        "title": "酸碱指示剂变色",
        "subtitle": "石蕊：酸红碱蓝 · 酚酞：遇碱变红",
        "equation": "（指示剂变色，无新的化合方程式）",
        "goal": "向稀盐酸、氢氧化钠溶液中分别滴加紫色石蕊和无色酚酞，记住标准颜色。",
        "badge": "初中化学 · 溶液的酸碱性",
        "inventory": {
            "apparatus": [
                {"id": "goggles", "name": "护目镜", "icon": "镜"},
                {"id": "beaker", "name": "试管或烧杯", "icon": "杯"},
                {"id": "dropper", "name": "胶头滴管", "icon": "滴管"},
                {"id": "rod", "name": "玻璃棒", "icon": "棒"},
            ],
            "reagents": [
                {"id": "hcl", "name": "稀盐酸", "color": "#38bdf8"},
                {"id": "naoh", "name": "氢氧化钠溶液", "color": "#a3e635"},
                {"id": "litmus", "name": "紫色石蕊溶液", "color": "#7c3aed"},
                {"id": "phen", "name": "无色酚酞溶液", "color": "#f8fafc"},
            ],
        },
        "required_apparatus": ["goggles", "beaker", "dropper"],
        "required_reagents": ["hcl", "naoh"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "护目镜、烧杯或试管、胶头滴管；稀盐酸和氢氧化钠。石蕊、酚酞在下一步滴加。",
            },
            {
                "id": "litmus_acid",
                "need": "action",
                "title": "石蕊遇酸",
                "action_label": "向稀盐酸中滴加紫色石蕊溶液",
                "hint": "石蕊只有红、紫、蓝，没有彩虹色。",
                "phenomenon": "紫色石蕊溶液变成红色。",
                "scene": {"liquid": "pink", "dripping": True},
            },
            {
                "id": "litmus_base",
                "need": "action",
                "title": "石蕊遇碱",
                "action_label": "向氢氧化钠溶液中滴加紫色石蕊溶液",
                "hint": "碱使石蕊变蓝。",
                "phenomenon": "紫色石蕊溶液变成蓝色。",
                "scene": {"liquid": "blue", "dripping": True},
            },
            {
                "id": "phen",
                "need": "choice",
                "title": "酚酞怎么变",
                "hint": "无色酚酞遇酸仍为无色，遇碱变红。",
                "choices": [
                    {"id": "ok", "label": "稀盐酸中酚酞仍无色；氢氧化钠中酚酞变红", "correct": True,
                     "ok": "记住：石蕊酸红碱蓝；酚酞遇碱红、遇酸无色。不能用万能指示剂的彩虹色冒充石蕊或酚酞。",
                     "scene": {"liquid": "pink"}},
                    {"id": "both", "label": "酚酞遇酸变红，遇碱也变红", "correct": False,
                     "hazard": "酚酞在酸性溶液里是无色的。变红是碱的特征。"},
                    {"id": "rainbow", "label": "石蕊在不同 pH 会变成彩虹的七种颜色", "correct": False,
                     "hazard": "那是 pH 试纸或万能指示剂。石蕊只有红、紫、蓝。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "紫色石蕊遇酸变红、遇碱变蓝；无色酚酞遇酸无色、遇碱变红。可用来检验溶液的酸碱性。",
        },
    }


def build_dilute_h2so4() -> dict:
    return {
        "id": "dilute_h2so4",
        "scene": "neutralization",
        "title": "稀释浓硫酸",
        "subtitle": "酸入水 · 沿壁慢注 · 玻璃棒搅拌",
        "equation": "（稀释操作，放出大量热）",
        "goal": "按规范把浓硫酸稀释成稀硫酸：酸沿器壁注入水中并不断搅拌，切不可把水倒进浓硫酸。",
        "badge": "初中化学 · 常见的酸",
        "inventory": {
            "apparatus": [
                {"id": "goggles", "name": "护目镜", "icon": "镜"},
                {"id": "beaker", "name": "烧杯（先盛水）", "icon": "杯"},
                {"id": "rod", "name": "玻璃棒", "icon": "棒"},
                {"id": "dropper", "name": "胶头滴管", "icon": "滴管"},
            ],
            "reagents": [
                {"id": "h2so4", "name": "浓硫酸", "color": "#e2e8f0"},
                {"id": "water", "name": "水", "color": "#38bdf8"},
                {"id": "hcl", "name": "浓盐酸", "color": "#86efac"},
            ],
        },
        "required_apparatus": ["goggles", "beaker", "rod"],
        "required_reagents": ["h2so4", "water"],
        "steps": [
            {
                "id": "pick",
                "need": "select",
                "title": "选取仪器与药品",
                "hint": "必须戴护目镜。烧杯、玻璃棒；浓硫酸和水。不要用浓盐酸代替。",
            },
            {
                "id": "order",
                "need": "choice",
                "title": "谁倒进谁",
                "hint": "浓硫酸密度比水大，溶解时放出大量热。",
                "choices": [
                    {"id": "acid_in_water", "label": "把浓硫酸沿烧杯内壁缓慢注入水中，同时用玻璃棒搅拌", "correct": True,
                     "ok": "酸沉到水底并被搅拌散开，热量被水吸收，不易飞溅。",
                     "scene": {"liquid": "clear", "dripping": True}},
                    {"id": "water_in_acid", "label": "把水倒进盛有浓硫酸的烧杯，溶解得更快", "correct": False,
                     "hazard": "水浮在酸面上，局部沸腾，酸滴向四周飞溅，非常危险。"},
                ],
            },
            {
                "id": "heat",
                "need": "action",
                "title": "搅拌并观察温度",
                "action_label": "不断搅拌，用手在烧杯外壁感受温度（不要用手触碰液体）",
                "hint": "稀释过程明显放热。",
                "phenomenon": "烧杯外壁发烫，溶液仍澄清。",
                "scene": {"liquid": "clear", "heat": True},
            },
            {
                "id": "skin",
                "need": "choice",
                "title": "万一沾到皮肤",
                "hint": "浓硫酸有强腐蚀性和脱水性。",
                "choices": [
                    {"id": "wash", "label": "立即用大量水冲洗，再涂 3%~5% 的碳酸氢钠溶液", "correct": True,
                     "ok": "先冲水稀释并降温，再用弱碱中和残留酸。不要先擦或用布吸。"},
                    {"id": "wipe", "label": "用布把酸擦掉，再涂牙膏", "correct": False,
                     "hazard": "擦会扩大灼伤面。必须先大量水冲洗。"},
                ],
            },
        ],
        "complete": {
            "title": "实验完成",
            "summary": "稀释浓硫酸：酸入水，沿壁慢注，玻璃棒搅拌。切不可把水倒入浓硫酸。",
        },
    }


REGISTRY = {
    "prep_oxygen_kmno4": build_prep_oxygen_kmno4,
    "prep_hydrogen": build_prep_hydrogen,
    "prep_co2": build_prep_co2,
    "electrolysis": build_electrolysis_water,
    "neutralization": build_neutralization,
    "metal_acid": build_metal_acid,
    "metal_oxide_acid": build_metal_oxide_acid,
    "filtration": build_filtration,
    "evaporation": build_evaporation,
    "nh4hco3_decomp": build_nh4hco3_decomp,
    "iron_in_oxygen": build_iron_in_oxygen,
    "charcoal_in_oxygen": build_charcoal_in_oxygen,
    "sulfur_in_oxygen": build_sulfur_in_oxygen,
    "air_oxygen": build_air_oxygen,
    "charcoal_reduce_cuo": build_charcoal_reduce_cuo,
    "mass_conservation": build_mass_conservation,
    "metal_displace": build_metal_displace,
    "iron_rust": build_iron_rust,
    "combustion_conditions": build_combustion_conditions,
    "acid_indicator": build_acid_indicator,
    "dilute_h2so4": build_dilute_h2so4,
    "solution_prep": build_solution_prep,
    "co2_candles": build_co2_candles,
}

CATALOG = [
    {"key": "prep_oxygen_kmno4", "title": "高锰酸钾制取氧气", "group": "制取气体",
     "scene": "oxygen", "keywords": ("制氧", "制取氧气", "高锰酸钾", "氯酸钾", "过氧化氢", "带火星", "复燃")},
    {"key": "prep_hydrogen", "title": "锌和稀盐酸制取氢气", "group": "制取气体",
     "scene": "gas_wet", "keywords": ("制氢", "制取氢气", "锌粒", "爆鸣", "验纯", "向下排空气")},
    {"key": "prep_co2", "title": "大理石和稀盐酸制取二氧化碳", "group": "制取气体",
     "scene": "gas_air", "keywords": ("大理石", "石灰石", "变浑浊", "向上排空气", "制取二氧化碳")},
    {"key": "co2_candles", "title": "倾倒二氧化碳熄灭蜡烛", "group": "反应与性质",
     "scene": "co2_candles", "keywords": ("蜡烛", "灭火", "灭火原理", "倾倒二氧化碳", "密度比空气", "不支持燃烧", "两支蜡烛")},
    {"key": "air_oxygen", "title": "测定空气中氧气的含量", "group": "反应与性质",
     "scene": "air_oxygen", "keywords": ("测定空气", "氧气含量", "红磷燃烧", "水面上升", "空气中氧气")},
    {"key": "charcoal_in_oxygen", "title": "木炭在氧气中燃烧", "group": "反应与性质",
     "scene": "burn", "keywords": ("木炭在氧气", "木炭燃烧", "发出白光", "碳和氧气")},
    {"key": "sulfur_in_oxygen", "title": "硫在氧气中燃烧", "group": "反应与性质",
     "scene": "burn", "keywords": ("硫在氧气", "硫燃烧", "蓝紫色火焰", "二氧化硫")},
    {"key": "charcoal_reduce_cuo", "title": "木炭还原氧化铜", "group": "反应与性质",
     "scene": "nh4hco3_decomp", "keywords": ("木炭还原氧化铜", "还原氧化铜", "碳还原氧化铜", "还原反应")},
    {"key": "mass_conservation", "title": "验证质量守恒定律", "group": "反应与性质",
     "scene": "solution_prep", "keywords": ("质量守恒定律", "反应前后质量", "密闭称量")},
    {"key": "metal_displace", "title": "铁与硫酸铜的置换反应", "group": "反应与性质",
     "scene": "metal_acid", "keywords": ("铁与硫酸铜", "置换反应", "铁钉硫酸铜", "金属活动性顺序")},
    {"key": "iron_rust", "title": "探究铁钉生锈的条件", "group": "反应与性质",
     "scene": "iron_rust", "keywords": ("铁钉生锈", "铁生锈", "生锈条件", "铁锈")},
    {"key": "combustion_conditions", "title": "探究燃烧的条件", "group": "反应与性质",
     "scene": "combustion_conditions", "keywords": ("燃烧的条件", "燃烧条件", "白磷红磷", "着火点")},
    {"key": "acid_indicator", "title": "酸碱指示剂变色", "group": "反应与性质",
     "scene": "neutralization", "keywords": ("酸碱指示剂", "石蕊", "酚酞", "指示剂变色")},
    {"key": "dilute_h2so4", "title": "稀释浓硫酸", "group": "基本操作",
     "scene": "neutralization", "keywords": ("稀释浓硫酸", "浓硫酸稀释", "酸入水")},
    {"key": "electrolysis", "title": "电解水", "group": "反应与性质",
     "scene": "electrolysis", "keywords": ("电解水", "正氧负氢", "霍夫曼", "通电分解")},
    {"key": "neutralization", "title": "酸碱中和（酚酞指示剂）", "group": "反应与性质",
     "scene": "neutralization", "keywords": ("中和", "中和反应", "酸碱中和", "滴定", "恰好完全")},
    {"key": "metal_acid", "title": "金属与稀盐酸反应", "group": "反应与性质",
     "scene": "neutralization", "keywords": ("金属活动性", "置换氢", "锌和稀盐酸", "铁和稀盐酸", "铜不反应", "金属与稀盐酸")},
    {"key": "metal_oxide_acid", "title": "氧化铜与稀硫酸反应", "group": "反应与性质",
     "scene": "oxide", "keywords": ("氧化铜", "稀硫酸", "硫酸铜", "金属氧化物", "黑色粉末变蓝")},
    {"key": "nh4hco3_decomp", "title": "碳酸氢铵受热分解", "group": "反应与性质",
     "scene": "oxygen", "keywords": ("碳酸氢铵", "铵盐分解", "碳酸氢铵受热", "湿润红色石蕊", "扇闻")},
    {"key": "iron_in_oxygen", "title": "铁丝在氧气中燃烧", "group": "反应与性质",
     "scene": "burn", "keywords": ("铁丝", "铁丝燃烧", "铁丝在氧气中燃烧", "火星四射", "氧气中燃烧", "四氧化三铁", "瓶底留水")},
    {"key": "filtration", "title": "过滤", "group": "基本操作",
     "scene": "filtration", "keywords": ("过滤", "滤纸", "一贴二低三靠", "残渣")},
    {"key": "evaporation", "title": "蒸发结晶", "group": "基本操作",
     "scene": "evaporation", "keywords": ("蒸发", "结晶", "蒸发皿", "余热蒸干", "飞溅")},
    {"key": "solution_prep", "title": "配制一定溶质质量分数的溶液", "group": "基本操作",
     "scene": "solution_prep", "keywords": ("溶质质量分数", "配制溶液", "称量", "量筒", "托盘天平")},
]

TITLES = {e["key"]: e["title"] for e in CATALOG}
for k, fn in REGISTRY.items():
    TITLES.setdefault(k, fn()["title"])


def match_query(q: str) -> list[tuple[int, dict]]:
    text = (q or "").strip().lower()
    scored: list[tuple[int, dict]] = []
    for e in CATALOG:
        score = 0
        if e["key"] in text:
            score += 10
        title = e["title"]
        if title and title in (q or ""):
            score += 8
        for kw in e["keywords"]:
            if kw and kw in (q or ""):
                score += 3
        if score:
            scored.append((score, e))
    scored.sort(key=lambda x: (-x[0], x[1]["key"]))
    return scored


def main(argv: list[str]) -> None:
    if not argv or argv[0] in ("list", "-h", "--help"):
        print("已注册实验:")
        for e in CATALOG:
            print(f"  - {e['key']:24}  [{e['group']}]  {e['title']}")
        extra = [k for k in REGISTRY if k not in TITLES]
        for k in extra:
            print(f"  - {k:24}  {TITLES.get(k, '')}")
        return
    if argv[0] == "match":
        q = " ".join(argv[1:]).strip()
        if not q:
            print("用法: python3 scripts/generate.py match <课题或关键词>")
            sys.exit(1)
        hits = match_query(q)
        if not hits:
            print("无匹配。可用实验见: python3 scripts/generate.py list")
            sys.exit(2)
        for score, e in hits:
            print(f"{score:3}  {e['key']:24}  {e['title']}")
        return
    if argv[0] == "dump":
        if len(argv) < 2 or argv[1] not in REGISTRY:
            print(f"用法: python3 scripts/generate.py dump <实验key>")
            sys.exit(1)
        print(json.dumps(with_slots(REGISTRY[argv[1]]()), ensure_ascii=False, indent=2))
        return
    key = argv[0]
    if key not in REGISTRY:
        print(f"未知实验 {key}；可用: {', '.join(REGISTRY)}")
        sys.exit(1)
    out = Path(argv[1]) if len(argv) > 1 else (Path.cwd() / f"{key}.html")
    render_html(REGISTRY[key](), out)
    print("written:", out)


if __name__ == "__main__":
    main(sys.argv[1:])
