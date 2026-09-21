/* 宏观实验台：写实 2D 器材 + 同形虚线工位。 */
(function (global) {
  var NS = "http://www.w3.org/2000/svg";
  var svg, slots = {}, pieces = {}, fx = {};
  var selecting = false, needed = {};

  function el(name, attrs, html) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html) n.innerHTML = html;
    return n;
  }
  function tf(s) {
    var r = s.r || 0;
    var origin = (s.ox != null && s.oy != null) ? (" " + s.ox + " " + s.oy) : "";
    return "translate(" + s.x + "," + s.y + ") rotate(" + r + origin + ") scale(" + (s.s || 1) + ")";
  }

  var ART = {
    stand: {
      w: 150, h: 240, label: "铁架台",
      outline: "M8 220 h134 v18 h-56 v-198 h14 v180 h-92z M64 48 h62 v16 H86 v40 H74 V64 H64z",
      paint: '<defs><linearGradient id="g-iron" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f2937"/><stop offset=".45" stop-color="#9ca3af"/><stop offset="1" stop-color="#111827"/></linearGradient></defs>' +
        '<path d="M8 220 h134 v18 h-56 v-198 h14 v180 h-92z" fill="url(#g-iron)"/>' +
        '<path d="M64 48 h62 v16 H86 v40 H74 V64 H64z" fill="#374151"/>' +
        '<circle cx="80" cy="80" r="5" fill="#9ca3af"/>'
    },
    tripod: {
      w: 170, h: 130, label: "三脚架",
      outline: "M22 122 L78 34 h14 L148 122 h-16 L85 48 38 122z M60 22 h50 v12 H60z",
      paint: '<path d="M22 122 L78 34 h14 L148 122" fill="none" stroke="#4b5563" stroke-width="8" stroke-linejoin="round"/>' +
        '<line x1="85" y1="40" x2="85" y2="122" stroke="#4b5563" stroke-width="8"/>' +
        '<rect x="60" y="22" width="50" height="12" rx="2" fill="#6b7280"/>'
    },
    tube: {
      w: 64, h: 196, label: "试管",
      outline: "M18 8 h28 a4 4 0 0 1 4 4 v140 a18 22 0 0 1 -36 0 V12 a4 4 0 0 1 4 -4z",
      paint: '<defs><linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#94a3b8" stop-opacity=".35"/><stop offset=".22" stop-color="#f8fafc" stop-opacity=".15"/><stop offset=".55" stop-color="#bae6fd" stop-opacity=".45"/><stop offset="1" stop-color="#0369a1" stop-opacity=".28"/></linearGradient></defs>' +
        '<path d="M18 8 h28 a4 4 0 0 1 4 4 v140 a18 22 0 0 1 -36 0 V12 a4 4 0 0 1 4 -4z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.4"/>' +
        '<path d="M22 16 v148" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>' +
        '<rect x="16" y="4" width="32" height="8" rx="2" fill="#e2e8f0" stroke="#94a3b8"/>' +
        '<g class="fx-powder" visibility="hidden"><ellipse cx="32" cy="158" rx="11" ry="7" fill="#6b21a8"/><ellipse cx="28" cy="154" rx="4" ry="3" fill="#a855f7"/></g>' +
        '<g class="fx-zinc" visibility="hidden"><rect x="24" y="148" width="16" height="8" rx="1" fill="#94a3b8"/><rect x="26" y="150" width="6" height="4" fill="#e2e8f0"/></g>' +
        '<g class="fx-marble" visibility="hidden"><circle cx="28" cy="154" r="5" fill="#f8fafc" stroke="#cbd5e1"/><circle cx="36" cy="157" r="4" fill="#e2e8f0"/></g>' +
        '<g class="fx-acid" visibility="hidden"><path d="M20 120 h24 v36 a12 16 0 0 1 -24 0z" fill="#38bdf8" opacity=".45"/><ellipse cx="32" cy="120" rx="12" ry="4" fill="#7dd3fc" opacity=".6"/></g>' +
        '<g class="fx-acid-bubbles" visibility="hidden"><circle cx="24" cy="130" r="2.2" fill="#fff" opacity=".75"/><circle cx="36" cy="122" r="2" fill="#fff" opacity=".7"/><circle cx="30" cy="140" r="1.8" fill="#fff" opacity=".7"/></g>' +
        '<g class="fx-cotton" visibility="hidden"><ellipse cx="32" cy="22" rx="13" ry="7" fill="#f8fafc" stroke="#d6d3d1"/><ellipse cx="28" cy="20" rx="5" ry="4" fill="#e7e5e4"/></g>'
    },
    lamp: {
      w: 108, h: 136, label: "酒精灯",
      outline: "M44 18 h20 v16 h10 a38 32 0 1 1 -40 0 h10z",
      paint: '<defs><linearGradient id="g-amber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fde68a"/><stop offset=".45" stop-color="#f59e0b"/><stop offset="1" stop-color="#b45309"/></linearGradient></defs>' +
        '<path d="M20 54 h68 v48 a34 20 0 0 1 -68 0z" fill="url(#g-amber)" stroke="#92400e" stroke-width="1.4"/>' +
        '<path d="M20 54 h68 v38 a34 18 0 0 1 -68 0z" fill="#fbbf24" opacity=".35"/>' +
        '<ellipse cx="54" cy="54" rx="34" ry="8" fill="#fde68a"/>' +
        '<path d="M24 62 v48" stroke="#fff" stroke-opacity=".35" stroke-width="6"/>' +
        '<rect x="42" y="30" width="24" height="26" rx="3" fill="#78716c"/>' +
        '<rect x="46" y="22" width="16" height="12" rx="2" fill="#a8a29e"/>' +
        '<rect x="51" y="16" width="6" height="10" fill="#e7e5e4"/>' +
        '<g class="fx-flame" visibility="hidden">' +
        '<ellipse cx="54" cy="14" rx="10" ry="16" fill="#f97316" opacity=".9"/>' +
        '<ellipse cx="54" cy="16" rx="5" ry="10" fill="#fde68a"/>' +
        '</g>'
    },
    delivery: {
      w: 250, h: 290, label: "导管",
      outline: "M4 6 h210 v28 H46 v240 H18 V42 H4z",
      paint: '<circle cx="14" cy="20" r="9" fill="#7c2d12"/><circle cx="14" cy="20" r="4" fill="#1e293b"/>' +
        '<path d="M18 20 H 214 V 268" fill="none" stroke="#94a3b8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M18 20 H 214 V 268" fill="none" stroke="#e0f2fe" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M206 268 h16" fill="none" stroke="#475569" stroke-width="6" stroke-linecap="round"/>'
    },
    delivery_down: {
      w: 180, h: 340, label: "导管",
      outline: "M4 6 h150 v28 H40 v290 H16 V42 H4z",
      paint: '<circle cx="14" cy="20" r="9" fill="#7c2d12"/><circle cx="14" cy="20" r="4" fill="#1e293b"/>' +
        '<path d="M18 20 H 148 V 320" fill="none" stroke="#94a3b8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M18 20 H 148 V 320" fill="none" stroke="#e0f2fe" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M140 320 h16" fill="none" stroke="#475569" stroke-width="6" stroke-linecap="round"/>'
    },
    delivery_air: {
      w: 220, h: 250, label: "导管",
      outline: "M4 6 h200 v28 H42 v186 H16 V42 H4z",
      paint: '<circle cx="14" cy="20" r="9" fill="#7c2d12"/><circle cx="14" cy="20" r="4" fill="#1e293b"/>' +
        '<path d="M18 20 H 168 V 218" fill="none" stroke="#94a3b8" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M18 20 H 168 V 218" fill="none" stroke="#e0f2fe" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M160 218 h16" fill="none" stroke="#475569" stroke-width="6" stroke-linecap="round"/>'
    },
    trough: {
      w: 280, h: 130, label: "水槽",
      outline: "M10 18 h260 v10 H28 v80 h224 v10 H10z",
      paint: '<rect x="8" y="16" width="264" height="104" rx="6" fill="#e0f2fe" stroke="#0369a1" stroke-width="2.2"/>' +
        '<rect x="16" y="40" width="248" height="72" rx="4" fill="#38bdf8" opacity=".42" class="fx-trough-water"/>' +
        '<ellipse cx="140" cy="42" rx="122" ry="8" fill="#7dd3fc" opacity=".55"/>' +
        '<path d="M18 28 v70" stroke="#fff" stroke-opacity=".4" stroke-width="5"/>'
    },
    bottle: {
      w: 100, h: 168, label: "集气瓶",
      outline: "M38 4 h24 v16 h12 v8 H26 v112 a28 18 0 0 0 48 0 V28 H62 V20 H38z",
      paint:         '<path d="M38 4 h24 v16 h12 v8 H26 v112 a28 18 0 0 0 48 0 V28 H62 V20 H38z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.5"/>' +
        '<rect x="36" y="2" width="28" height="10" rx="2" fill="#e2e8f0" stroke="#94a3b8"/>' +
        '<rect class="fx-cover" x="22" y="0" width="56" height="7" rx="1" fill="#e0f2fe" stroke="#64748b" opacity=".9" visibility="hidden"/>' +
        '<path d="M36 36 v110" stroke="#fff" stroke-opacity=".5" stroke-width="5"/>' +
        '<g class="fx-gas" visibility="hidden"><rect x="34" y="70" width="32" height="70" fill="#f8fafc" opacity=".55"/></g>' +
        '<g class="fx-bottle-water" visibility="hidden"><rect x="32" y="130" width="36" height="18" fill="#38bdf8" opacity=".45"/></g>' +
        '<g class="fx-water-rise" visibility="hidden"><rect x="30" y="108" width="40" height="40" fill="#38bdf8" opacity=".5"/><text x="50" y="102" text-anchor="middle" font-size="10" fill="#0f172a" font-weight="700">约1/5</text></g>' +
        '<g class="fx-marks" visibility="hidden">' +
        '<path d="M68 52 h10 M68 70 h10 M68 88 h10 M68 106 h10 M68 124 h10" stroke="#334155" stroke-width="1.4"/>' +
        '</g>'
    },
    bottle_inv: {
      w: 100, h: 168, label: "集气瓶",
      outline: "M26 8 h48 v112 a28 18 0 0 1 -48 0z M38 140 h24 v18 H38z",
      paint: '<path d="M26 8 h48 v112 a28 18 0 0 1 -48 0z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.5"/>' +
        '<path d="M38 140 h24 v16 H62 v8 H38z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.4"/>' +
        '<rect x="36" y="156" width="28" height="10" rx="2" fill="#e2e8f0" stroke="#94a3b8"/>' +
        '<path d="M36 20 v110" stroke="#fff" stroke-opacity=".5" stroke-width="5"/>' +
        '<g class="fx-gas" visibility="hidden"><rect x="34" y="20" width="32" height="70" fill="#f8fafc" opacity=".55"/></g>'
    },
    splint: {
      w: 32, h: 156, label: "木条",
      outline: "M10 8 h12 v140 h-12z",
      paint: '<rect x="11" y="28" width="10" height="120" rx="2" fill="#b45309"/>' +
        '<rect x="12" y="30" width="3" height="110" fill="#fbbf24" opacity=".35"/>' +
        '<ellipse class="fx-splint" cx="16" cy="18" rx="10" ry="12" fill="#fbbf24" opacity=".85"/>'
    },
    candle_beaker: {
      w: 200, h: 230, label: "烧杯",
      outline: "M18 8 h140 l12 8 14 -8 h10 l14 204 H10z",
      paint:
        '<path d="M18 8 h140 l12 8 14 -8 h10 l14 204 H10z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.6"/>' +
        '<path d="M16 8 h164" stroke="#94a3b8" stroke-width="2.6"/>' +
        '<path d="M28 22 v168" stroke="#fff" stroke-opacity=".4" stroke-width="6"/>' +
        '<g class="fx-co2-mid" visibility="hidden">' +
        '<path d="M28 88 h144 l8 112 H22z" fill="#94a3b8" opacity=".28"/>' +
        '<ellipse cx="100" cy="88" rx="72" ry="10" fill="#cbd5e1" opacity=".35"/>' +
        '</g>' +
        '<g class="fx-co2-low" visibility="hidden">' +
        '<path d="M30 148 h140 l6 52 H26z" fill="#64748b" opacity=".32"/>' +
        '<ellipse cx="100" cy="148" rx="70" ry="9" fill="#94a3b8" opacity=".4"/>' +
        '</g>' +
        '<rect x="56" y="150" width="18" height="52" rx="2" fill="#f8fafc" stroke="#d6d3d1"/>' +
        '<rect x="61" y="142" width="8" height="10" fill="#78716c"/>' +
        '<rect x="126" y="78" width="18" height="124" rx="2" fill="#f8fafc" stroke="#d6d3d1"/>' +
        '<rect x="131" y="70" width="8" height="10" fill="#78716c"/>' +
        '<g class="fx-flame-low" visibility="hidden">' +
        '<ellipse cx="65" cy="132" rx="8" ry="14" fill="#f97316"/><ellipse cx="65" cy="134" rx="4" ry="8" fill="#fde68a"/>' +
        '</g>' +
        '<g class="fx-flame-high" visibility="hidden">' +
        '<ellipse cx="135" cy="58" rx="9" ry="16" fill="#f97316"/><ellipse cx="135" cy="60" rx="4" ry="9" fill="#fde68a"/>' +
        '</g>' +
        '<g class="fx-smoke-low" visibility="hidden">' +
        '<ellipse cx="62" cy="128" rx="10" ry="6" fill="#cbd5e1" opacity=".55"/>' +
        '<ellipse cx="70" cy="116" rx="8" ry="5" fill="#e2e8f0" opacity=".45"/>' +
        '</g>' +
        '<g class="fx-smoke-high" visibility="hidden">' +
        '<ellipse cx="132" cy="54" rx="11" ry="6" fill="#cbd5e1" opacity=".55"/>' +
        '<ellipse cx="140" cy="42" rx="8" ry="5" fill="#e2e8f0" opacity=".45"/>' +
        '</g>' +
        '<text x="65" y="222" text-anchor="middle" font-size="13" fill="#334155" font-weight="700">较低处</text>' +
        '<text x="135" y="222" text-anchor="middle" font-size="13" fill="#334155" font-weight="700">较高处</text>'
    },
    beaker: {
      w: 124, h: 146, label: "烧杯",
      outline: "M14 8 h78 l8 6 10 -6 h8 l10 128 H10z",
      paint:         '<path d="M14 8 h78 l8 6 10 -6 h8 l10 128 H10z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.5"/>' +
        '<path d="M12 8 h100" stroke="#94a3b8" stroke-width="2.5"/>' +
        '<path d="M22 22 v100" stroke="#fff" stroke-opacity=".45" stroke-width="6"/>' +
        '<path d="M86 40 h10 M86 58 h10 M86 76 h10" stroke="#94a3b8" stroke-width="1"/>' +
        '<g class="fx-liquid"><path d="M24 78 h76 l4 50 h-84z" fill="#7dd3fc" opacity=".5"/><ellipse cx="62" cy="78" rx="38" ry="6" fill="#bae6fd" opacity=".65"/></g>' +
        '<g class="fx-oxide" visibility="hidden"><ellipse cx="62" cy="118" rx="20" ry="7" fill="#1e293b"/><ellipse cx="54" cy="114" rx="6" ry="4" fill="#334155"/></g>' +
        '<g class="fx-metal" visibility="hidden"><rect x="48" y="96" width="28" height="10" rx="2" fill="#94a3b8"/></g>' +
        '<g class="fx-beaker-bubbles" visibility="hidden"><circle cx="44" cy="110" r="3" fill="#fff" opacity=".75"/><circle cx="62" cy="100" r="2.5" fill="#fff" opacity=".75"/><circle cx="78" cy="114" r="3" fill="#fff" opacity=".7"/></g>'
    },
    dropper: {
      w: 40, h: 132, label: "胶头滴管",
      outline: "M8 8 a12 14 0 0 1 24 0 v16 H22 v88 H18 V24 H8z",
      paint: '<ellipse cx="20" cy="18" rx="12" ry="14" fill="#ef4444"/>' +
        '<ellipse cx="20" cy="12" rx="6" ry="4" fill="#fecaca"/>' +
        '<rect x="16" y="30" width="8" height="88" rx="2" fill="#e0f2fe" stroke="#64748b"/>' +
        '<path d="M18 36 v70" stroke="#fff" stroke-opacity=".5" stroke-width="2"/>' +
        '<circle class="fx-drip" cx="20" cy="126" r="4" fill="#38bdf8" visibility="hidden"/>'
    },
    rod: {
      w: 188, h: 22, label: "玻璃棒",
      outline: "M6 6 h176 v10 h-176z",
      paint: '<rect x="6" y="6" width="176" height="10" rx="5" fill="#e2e8f0" stroke="#94a3b8"/>' +
        '<rect x="10" y="8" width="70" height="3" fill="#fff" opacity=".6"/>'
    },
    clamp: {
      w: 96, h: 168, label: "试管夹",
      outline: "M18 8 h22 v52 h16 v12 h-16 v80 H18 V72 H8 V60 h10z",
      paint: '<rect x="40" y="22" width="12" height="118" rx="4" fill="#1e3a5f"/>' +
        '<rect x="42" y="26" width="4" height="70" fill="#93c5fd" opacity=".35"/>' +
        '<ellipse cx="28" cy="36" rx="18" ry="10" fill="none" stroke="#cbd5e1" stroke-width="6"/>' +
        '<ellipse cx="28" cy="70" rx="16" ry="9" fill="none" stroke="#94a3b8" stroke-width="5"/>' +
        '<rect x="22" y="48" width="10" height="16" rx="2" fill="#9ca3af"/>'
    },
    goggles: {
      w: 120, h: 50, label: "护目镜",
      outline: "M8 12 h104 v26 h-104z",
      paint: '<rect x="8" y="14" width="104" height="22" rx="10" fill="#0f766e"/>' +
        '<ellipse cx="40" cy="25" rx="16" ry="12" fill="#e0f2fe" stroke="#134e4a"/>' +
        '<ellipse cx="80" cy="25" rx="16" ry="12" fill="#e0f2fe" stroke="#134e4a"/>' +
        '<ellipse cx="36" cy="22" rx="5" ry="4" fill="#fff" opacity=".5"/>'
    },
    funnel: {
      w: 110, h: 140, label: "漏斗",
      outline: "M8 8 h94 L64 78 h4 v54 h-22 V78 H16z",
      paint: '<path d="M10 10 h90 L62 80 H48z" fill="url(#g-glass)" stroke="#0284c7" stroke-width="1.5"/>' +
        '<rect x="48" y="78" width="14" height="54" fill="#e0f2fe" stroke="#0284c7"/>' +
        '<path d="M22 18 L55 72" stroke="#fff" stroke-opacity=".45" stroke-width="4"/>' +
        '<g class="fx-filter-paper" visibility="hidden"><path d="M22 16 h66 L58 72 H52z" fill="#f8fafc" opacity=".88" stroke="#cbd5e1"/></g>' +
        '<g class="fx-residue" visibility="hidden"><ellipse cx="55" cy="40" rx="16" ry="8" fill="#a8a29e"/></g>'
    },
    paper: {
      w: 84, h: 84, label: "滤纸",
      outline: "M8 8 h68 v68 h-68z",
      paint: '<rect x="10" y="10" width="64" height="64" rx="3" fill="#fffef5" stroke="#d6d3d1"/>' +
        '<path d="M10 10 L74 74 M74 10 L10 74" stroke="#e7e5e4" stroke-width="1"/>' +
        '<circle cx="42" cy="42" r="22" fill="none" stroke="#d6d3d1"/>'
    },
    dish: {
      w: 128, h: 48, label: "蒸发皿",
      outline: "M12 14 Q64 2 116 14 L108 36 Q64 48 20 36z",
      paint: '<path d="M12 14 Q64 2 116 14 L108 36 Q64 48 20 36z" fill="#e2e8f0" stroke="#64748b" stroke-width="1.6"/>' +
        '<ellipse class="fx-dish-liquid" cx="64" cy="22" rx="42" ry="8" fill="#7dd3fc" opacity=".5"/>' +
        '<g class="fx-crystals" visibility="hidden"><rect x="40" y="18" width="8" height="8" fill="#e0f2fe" transform="rotate(20 44 22)"/><rect x="56" y="16" width="7" height="7" fill="#f8fafc" transform="rotate(35 60 20)"/><rect x="70" y="19" width="8" height="8" fill="#bae6fd" transform="rotate(12 74 23)"/></g>'
    },
    gauze: {
      w: 128, h: 24, label: "陶土网",
      outline: "M6 4 h116 v16 h-116z",
      paint: '<rect x="6" y="4" width="116" height="16" fill="#94a3b8"/>' +
        '<rect x="44" y="4" width="40" height="16" fill="#a8a29e"/>' +
        '<path d="M8 8 h112 M8 16 h112 M20 4 v16 M40 4 v16 M60 4 v16 M80 4 v16 M100 4 v16" stroke="#64748b" stroke-width=".6"/>'
    },
    cell: {
      w: 268, h: 118, label: "水槽",
      outline: "M10 20 h248 v10 H24 v68 h220 v10 H10z",
      paint: '<rect x="8" y="16" width="252" height="90" rx="6" fill="#e0f2fe" stroke="#0369a1" stroke-width="2"/>' +
        '<rect x="16" y="40" width="236" height="58" fill="#38bdf8" opacity=".4"/>' +
        '<rect x="70" y="8" width="8" height="98" fill="#1d4ed8"/>' +
        '<rect x="190" y="8" width="8" height="98" fill="#dc2626"/>' +
        '<text x="74" y="114" text-anchor="middle" fill="#1d4ed8" font-size="11" font-weight="700">−</text>' +
        '<text x="194" y="114" text-anchor="middle" fill="#dc2626" font-size="11" font-weight="700">+</text>'
    },
    power: {
      w: 130, h: 74, label: "电源",
      outline: "M8 10 h114 v54 h-114z",
      paint: '<rect x="8" y="10" width="114" height="54" rx="6" fill="#111827"/>' +
        '<circle cx="36" cy="37" r="10" fill="#dc2626"/><text x="36" y="41" text-anchor="middle" fill="#fff" font-size="12">+</text>' +
        '<circle cx="94" cy="37" r="10" fill="#1d4ed8"/><text x="94" y="41" text-anchor="middle" fill="#fff" font-size="14">−</text>' +
        '<rect x="54" y="18" width="22" height="8" rx="2" fill="#22c55e"/>'
    },
    tubes: {
      w: 156, h: 176, label: "集气管",
      outline: "M20 6 h32 v158 a6 6 0 0 1 -32 0z M104 6 h32 v158 a6 6 0 0 1 -32 0z",
      paint: '<rect x="18" y="8" width="36" height="160" rx="4" fill="url(#g-glass)" stroke="#64748b"/>' +
        '<rect x="102" y="8" width="36" height="160" rx="4" fill="url(#g-glass)" stroke="#64748b"/>' +
        '<g class="fx-h2" visibility="hidden"><rect x="22" y="20" width="28" height="90" fill="#e0f2fe" opacity=".55"/><text x="36" y="16" text-anchor="middle" fill="#0f766e" font-size="11" font-weight="700">H₂</text></g>' +
        '<g class="fx-o2" visibility="hidden"><rect x="106" y="70" width="28" height="40" fill="#e0f2fe" opacity=".55"/><text x="120" y="66" text-anchor="middle" fill="#c2410c" font-size="11" font-weight="700">O₂</text></g>' +
        '<g class="fx-ratio" visibility="hidden"><text x="78" y="50" text-anchor="middle" fill="#0f766e" font-size="14" font-weight="700">H₂ : O₂ ≈ 2 : 1</text></g>'
    },
    balance: {
      w: 188, h: 108, label: "天平",
      outline: "M88 8 h12 v50 h-12z M10 58 h168 v12 h-168z M16 70 h52 v28 h-52z M120 70 h52 v28 h-52z",
      paint: '<rect x="90" y="8" width="8" height="52" fill="#57534e"/>' +
        '<rect x="12" y="56" width="164" height="10" rx="2" fill="#78716c"/>' +
        '<rect x="18" y="70" width="50" height="26" rx="3" fill="#a8a29e"/>' +
        '<rect x="120" y="70" width="50" height="26" rx="3" fill="#a8a29e"/>' +
        '<circle cx="94" cy="14" r="6" fill="#44403c"/>'
    },
    cylinder: {
      w: 58, h: 176, label: "量筒",
      outline: "M16 18 h26 v148 H16z M12 6 h34 v14 H12z",
      paint: '<rect x="16" y="10" width="26" height="156" rx="3" fill="url(#g-glass)" stroke="#0284c7"/>' +
        '<path d="M18 18 v140" stroke="#fff" stroke-opacity=".45" stroke-width="3"/>' +
        '<path d="M36 30 h8 M36 50 h8 M36 70 h8 M36 90 h8 M36 110 h8 M36 130 h8" stroke="#0284c7" stroke-width="1"/>' +
        '<rect x="14" y="6" width="30" height="8" rx="2" fill="#e0f2fe" stroke="#0284c7"/>'
    },
    wire: {
      w: 76, h: 156, label: "铁丝",
      outline: "M34 8 v90 M18 110 q18 28 40 0 q-18 20 -40 0",
      paint: '<path d="M38 8 v88" stroke="#78716c" stroke-width="4"/>' +
        '<path d="M20 108 q18 26 38 0 q-14 18 -38 4 q16 16 36 -2" fill="none" stroke="#a8a29e" stroke-width="3.5"/>'
    },
    cover: {
      w: 96, h: 20, label: "玻璃片",
      outline: "M6 4 h84 v12 h-84z",
      paint: '<rect x="6" y="4" width="84" height="12" rx="2" fill="#e0f2fe" stroke="#64748b" opacity=".85"/>'
    },
    lime_beaker: {
      w: 124, h: 146, label: "石灰水",
      outline: "M14 8 h78 l8 6 10 -6 h8 l10 128 H10z",
      paint:         '<path d="M14 8 h78 l8 6 10 -6 h8 l10 128 H10z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.5"/>' +
        '<path d="M22 22 v100" stroke="#fff" stroke-opacity=".45" stroke-width="6"/>' +
        '<g class="fx-lime-liquid"><path d="M24 78 h76 l4 50 h-84z" fill="#e2e8f0" opacity=".7"/><ellipse cx="62" cy="78" rx="38" ry="6" fill="#f8fafc" opacity=".7"/></g>'
    },
    reagent: {
      w: 72, h: 108, label: "药品",
      outline: "M26 4 h20 v14 h10 v8 H16 v66 a18 14 0 0 0 40 0 V26 H46 V18 H26z",
      paint: '<rect x="24" y="6" width="24" height="16" rx="2" fill="#78716c"/>' +
        '<path d="M18 22 h36 v72 a16 12 0 0 1 -36 0z" fill="#7c3aed" opacity=".8" stroke="#5b21b6"/>' +
        '<rect x="20" y="28" width="8" height="50" fill="#fff" opacity=".25"/>'
    },
    condition_beaker: {
      w: 220, h: 210, label: "烧杯",
      outline: "M18 8 h150 l12 8 16 -8 h12 l16 186 H10z",
      paint:
        '<path d="M18 8 h150 l12 8 16 -8 h12 l16 186 H10z" fill="url(#g-glass)" stroke="#64748b" stroke-width="1.6"/>' +
        '<path d="M28 20 v150" stroke="#fff" stroke-opacity=".4" stroke-width="6"/>' +
        '<g class="fx-hot-water"><path d="M28 88 h164 l8 90 H22z" fill="#f97316" opacity=".28"/><ellipse cx="110" cy="88" rx="82" ry="10" fill="#fdba74" opacity=".45"/></g>' +
        '<rect x="24" y="70" width="172" height="8" rx="1" fill="#b45309"/>' +
        '<g class="fx-wp-air" visibility="hidden"><ellipse cx="58" cy="58" rx="12" ry="8" fill="#f8fafc" stroke="#cbd5e1"/><ellipse class="fx-flame-wp" cx="58" cy="42" rx="8" ry="14" fill="#f97316"/><text x="58" y="84" text-anchor="middle" font-size="11" fill="#0f172a" font-weight="700">白磷</text></g>' +
        '<g class="fx-rp-air" visibility="hidden"><ellipse cx="162" cy="58" rx="12" ry="8" fill="#dc2626"/><text x="162" y="84" text-anchor="middle" font-size="11" fill="#0f172a" font-weight="700">红磷</text></g>' +
        '<g class="fx-wp-water" visibility="hidden"><ellipse cx="110" cy="148" rx="14" ry="8" fill="#f8fafc" stroke="#94a3b8"/><text x="110" y="172" text-anchor="middle" font-size="11" fill="#0f172a" font-weight="700">水中白磷</text></g>' +
        '<g class="fx-wp-o2" visibility="hidden"><circle cx="96" cy="132" r="3" fill="#fff" opacity=".8"/><circle cx="118" cy="124" r="2.5" fill="#fff" opacity=".8"/><ellipse cx="110" cy="118" rx="8" ry="12" fill="#f97316" opacity=".85"/></g>'
    },
    rust_tubes: {
      w: 280, h: 180, label: "对照试管",
      outline: "M12 8 h256 v164 H12z",
      paint:
        '<g transform="translate(18,12)">' +
        '<rect x="18" y="8" width="36" height="120" rx="10" fill="url(#g-glass)" stroke="#64748b"/>' +
        '<rect x="22" y="70" width="28" height="50" fill="#38bdf8" opacity=".35"/>' +
        '<rect x="28" y="88" width="16" height="8" rx="2" fill="#94a3b8"/>' +
        '<g class="fx-rust" visibility="hidden"><rect x="28" y="86" width="16" height="10" rx="2" fill="#b45309"/></g>' +
        '<text x="36" y="150" text-anchor="middle" font-size="11" fill="#0f172a" font-weight="700">水+空气</text>' +
        '</g>' +
        '<g transform="translate(108,12)">' +
        '<rect x="18" y="8" width="36" height="120" rx="10" fill="url(#g-glass)" stroke="#64748b"/>' +
        '<rect x="22" y="70" width="28" height="50" fill="#38bdf8" opacity=".35"/>' +
        '<rect x="22" y="66" width="28" height="8" fill="#ca8a04" opacity=".7"/>' +
        '<rect x="28" y="88" width="16" height="8" rx="2" fill="#94a3b8"/>' +
        '<text x="36" y="150" text-anchor="middle" font-size="11" fill="#0f172a" font-weight="700">油封隔空气</text>' +
        '</g>' +
        '<g transform="translate(198,12)">' +
        '<rect x="18" y="8" width="36" height="120" rx="10" fill="url(#g-glass)" stroke="#64748b"/>' +
        '<ellipse cx="36" cy="28" rx="10" ry="6" fill="#f8fafc"/>' +
        '<rect x="28" y="96" width="16" height="8" rx="2" fill="#94a3b8"/>' +
        '<text x="36" y="150" text-anchor="middle" font-size="11" fill="#0f172a" font-weight="700">干燥剂</text>' +
        '</g>'
    }
  };

  /* 桌面在 CSS 背景 58% 处，固定 viewBox 高 600 → y=348。器材落在桌面上并按课本连成一套装置。 */
  var TABLE = 348;
  var SCENES = {
    prep_oxygen_kmno4: [
      { id: "stand", x: 292, y: TABLE - 240, label: "铁架台" },
      { id: "tube", x: 338, y: 96, r: 80, ox: 32, oy: 100, label: "试管" },
      { id: "lamp", x: 262, y: TABLE - 136, label: "酒精灯" },
      { id: "delivery", x: 452, y: 80, label: "导管" },
      { id: "trough", x: 528, y: TABLE - 130, label: "水槽" },
      { id: "bottle", art: "bottle_inv", x: 608, y: 132, label: "集气瓶" },
      { id: "splint", x: 840, y: TABLE - 156, label: "木条" },
      { id: "reagent", x: 210, y: TABLE - 108, label: "药品" }
    ],
    nh4hco3_decomp: [
      { id: "stand", x: 300, y: TABLE - 240, label: "铁架台" },
      { id: "tube", x: 346, y: 96, r: 80, ox: 32, oy: 100, label: "试管" },
      { id: "lamp", x: 270, y: TABLE - 136, label: "酒精灯" },
      { id: "paper", x: 500, y: 168, label: "试纸" },
      { id: "lime_beaker", x: 560, y: TABLE - 146, label: "石灰水" },
      { id: "reagent", x: 210, y: TABLE - 108, label: "药品" }
    ],
    prep_hydrogen: [
      { id: "stand", x: 292, y: TABLE - 240, label: "铁架台" },
      { id: "tube", x: 338, y: 122, label: "试管" },
      { id: "delivery", art: "delivery_down", x: 356, y: 108, s: 0.72, label: "导管" },
      { id: "trough", x: 400, y: TABLE - 130, label: "水槽" },
      { id: "bottle", art: "bottle_inv", x: 430, y: 140, label: "集气瓶" },
      { id: "splint", x: 820, y: TABLE - 156, label: "木条" },
      { id: "reagent", x: 210, y: TABLE - 108, label: "药品" }
    ],
    prep_co2: [
      { id: "stand", x: 292, y: TABLE - 240, label: "铁架台" },
      { id: "tube", x: 340, y: 122, label: "试管" },
      { id: "delivery", art: "delivery_air", x: 358, y: 110, label: "导管" },
      { id: "bottle", x: 476, y: TABLE - 168, label: "集气瓶" },
      { id: "lime_beaker", x: 600, y: TABLE - 146, label: "石灰水" },
      { id: "splint", x: 760, y: TABLE - 156, label: "木条" },
      { id: "reagent", x: 190, y: TABLE - 108, label: "药品" }
    ],
    iron_in_oxygen: [
      { id: "lamp", x: 300, y: TABLE - 136, label: "酒精灯" },
      { id: "wire", x: 508, y: 92, label: "铁丝" },
      { id: "bottle", x: 490, y: TABLE - 168, label: "集气瓶" },
      { id: "cover", x: 640, y: TABLE - 20, label: "玻璃片" },
      { id: "reagent", x: 210, y: TABLE - 108, label: "药品" }
    ],
    neutralization: [
      { id: "goggles", x: 268, y: TABLE - 50, label: "护目镜" },
      { id: "beaker", x: 456, y: TABLE - 146, label: "烧杯" },
      { id: "dropper", x: 506, y: 96, label: "胶头滴管" },
      { id: "rod", x: 428, y: 248, r: -32, ox: 94, oy: 11, label: "玻璃棒" },
      { id: "reagent", x: 620, y: TABLE - 108, label: "药品" }
    ],
    metal_acid: [
      { id: "goggles", x: 268, y: TABLE - 50, label: "护目镜" },
      { id: "beaker", x: 456, y: TABLE - 146, label: "烧杯" },
      { id: "rod", x: 428, y: 248, r: -32, ox: 94, oy: 11, label: "玻璃棒" },
      { id: "reagent", x: 620, y: TABLE - 108, label: "药品" }
    ],
    solution_prep: [
      { id: "balance", x: 250, y: TABLE - 108, label: "天平" },
      { id: "paper", x: 268, y: TABLE - 108 - 36, label: "称量纸" },
      { id: "cylinder", x: 468, y: TABLE - 176, label: "量筒" },
      { id: "beaker", x: 560, y: TABLE - 146, label: "烧杯" },
      { id: "rod", x: 532, y: 248, r: -28, ox: 94, oy: 11, label: "玻璃棒" },
      { id: "reagent", x: 700, y: TABLE - 108, label: "药品" }
    ],
    electrolysis: [
      { id: "power", x: 268, y: TABLE - 74, label: "电源" },
      { id: "cell", x: 430, y: TABLE - 118, label: "水槽" },
      { id: "tubes", x: 486, y: 78, label: "集气管" },
      { id: "splint", x: 780, y: TABLE - 156, label: "木条" },
      { id: "reagent", x: 210, y: TABLE - 108, label: "水" }
    ],
    filtration: [
      { id: "stand", x: 400, y: TABLE - 240, label: "铁架台" },
      { id: "funnel", x: 438, y: 72, label: "漏斗" },
      { id: "paper", x: 620, y: TABLE - 84, label: "滤纸" },
      { id: "rod", x: 508, y: 92, r: -48, ox: 20, oy: 11, label: "玻璃棒" },
      { id: "beaker", x: 428, y: TABLE - 146, label: "烧杯" },
      { id: "reagent", x: 700, y: TABLE - 108, label: "浊液" }
    ],
    evaporation: [
      { id: "lamp", x: 448, y: TABLE - 136, label: "酒精灯" },
      { id: "stand", art: "tripod", x: 416, y: 226, label: "三脚架" },
      { id: "gauze", x: 438, y: 234, label: "陶土网" },
      { id: "dish", x: 444, y: 212, label: "蒸发皿" },
      { id: "rod", x: 560, y: 208, r: -16, ox: 20, oy: 11, label: "玻璃棒" },
      { id: "reagent", x: 680, y: TABLE - 108, label: "溶液" }
    ],
    co2_candles: [
      { id: "bottle", x: 300, y: TABLE - 168, label: "二氧化碳" },
      { id: "beaker", art: "candle_beaker", x: 500, y: TABLE - 230, label: "烧杯" }
    ],
    metal_oxide_acid: [
      { id: "lamp", x: 428, y: TABLE - 136, label: "酒精灯" },
      { id: "tube", x: 448, y: 58, r: 34, ox: 32, oy: 168, label: "试管" },
      { id: "rod", art: "clamp", x: 512, y: 78, r: -14, label: "试管夹" },
      { id: "reagent", x: 280, y: TABLE - 108, label: "药品" }
    ],
    air_oxygen: [
      { id: "lamp", x: 260, y: TABLE - 136, label: "酒精灯" },
      { id: "wire", x: 468, y: 88, label: "燃烧匙" },
      { id: "bottle", x: 490, y: TABLE - 168, label: "集气瓶" },
      { id: "beaker", x: 640, y: TABLE - 146, label: "烧杯" },
      { id: "reagent", x: 190, y: TABLE - 108, label: "红磷" }
    ],
    combustion_conditions: [
      { id: "beaker", art: "condition_beaker", x: 420, y: TABLE - 210, label: "烧杯" },
      { id: "cover", x: 700, y: TABLE - 20, label: "薄铜片" }
    ],
    iron_rust: [
      { id: "tube", art: "rust_tubes", x: 360, y: TABLE - 180, label: "对照试管" }
    ]
  };
  SCENES.oxygen = SCENES.prep_oxygen_kmno4;
  SCENES.gas_wet = SCENES.prep_hydrogen;
  SCENES.gas_air = SCENES.prep_co2;
  SCENES.burn = SCENES.iron_in_oxygen;
  SCENES.oxide = SCENES.metal_oxide_acid;

  function defsHtml() {
    return '<defs>' +
      '<linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#94a3b8" stop-opacity=".35"/>' +
      '<stop offset=".22" stop-color="#f8fafc" stop-opacity=".18"/>' +
      '<stop offset=".55" stop-color="#bae6fd" stop-opacity=".42"/>' +
      '<stop offset="1" stop-color="#0369a1" stop-opacity=".25"/></linearGradient>' +
      '<filter id="f-soft" x="-20%" y="-20%" width="140%" height="140%">' +
      '<feDropShadow dx="0" dy="3" stdDeviation="2.2" flood-color="#0f172a" flood-opacity=".18"/>' +
      '</filter>' +
      '</defs>';
  }

  function icon(id, size, color) {
    var a = ART[id] || ART.reagent;
    var w = size || 44;
    var h = Math.round(w * a.h / a.w);
    var paint = a.paint;
    if (color && id === "reagent") {
      paint = paint.replace("#7c3aed", color).replace("#5b21b6", color);
    }
    return '<svg xmlns="' + NS + '" viewBox="0 0 ' + a.w + " " + a.h + '" width="' + w + '" height="' + h + '">' + defsHtml() + paint + "</svg>";
  }

  function collectFx(root) {
    root.querySelectorAll("[class^='fx-'], [class*=' fx-']").forEach(function (n) {
      n.classList.forEach(function (c) {
        if (c.indexOf("fx-") === 0) {
          if (!fx[c]) fx[c] = [];
          fx[c].push(n);
        }
      });
    });
  }
  function vis(key, on) {
    (fx[key] || []).forEach(function (n) { n.setAttribute("visibility", on ? "visible" : "hidden"); });
  }

  var sceneExp = "";
  function layout(kind, expId) {
    slots = {}; pieces = {}; fx = {};
    sceneExp = expId || kind || "";
    var list = SCENES[sceneExp] || SCENES[kind] || SCENES.oxygen;
    list.forEach(function (spec) {
      var artId = spec.art || spec.id;
      var a = ART[artId] || ART.beaker;
      var slot = el("g", { "class": "slot", "data-slot": spec.id, transform: tf(spec) });
      slot.innerHTML = '<path class="slot-dash" d="' + a.outline + '" fill="none" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<text class="slot-label" x="' + (a.w / 2) + '" y="' + (a.h + 18) + '" text-anchor="middle">' + (spec.label || a.label) + "</text>";
      slot.style.display = "none";
      slots[spec.id] = slot;
      svg.appendChild(slot);

      var piece = el("g", { "class": "piece", "data-piece": spec.id, transform: tf(spec), filter: "url(#f-soft)" });
      piece.innerHTML = a.paint;
      piece.style.display = "none";
      pieces[spec.id] = { el: piece, spec: spec, art: a };
      svg.appendChild(piece);
      collectFx(piece);
    });
    fx.pop = [el("text", { x: 760, y: 120, "class": "fx-pop", fill: "#dc2626", "font-size": "28", "font-weight": "700", visibility: "hidden" }, "爆鸣！")];
    svg.appendChild(fx.pop[0]);
    var jet = el("path", { d: "M210 128 q20 -28 8 -56", fill: "none", stroke: "#38bdf8", "stroke-width": "6", visibility: "hidden" });
    fx["fx-jet"] = [jet];
    svg.appendChild(jet);
    var sparks = el("g", { visibility: "hidden" },
      '<circle cx="560" cy="120" r="4" fill="#f97316"/><circle cx="580" cy="100" r="3" fill="#fbbf24"/><circle cx="540" cy="90" r="3" fill="#f97316"/>');
    fx["fx-sparks"] = [sparks];
    svg.appendChild(sparks);
    var steam = el("g", { visibility: "hidden" },
      '<ellipse cx="450" cy="140" rx="14" ry="8" fill="#cbd5e1" opacity=".45"/><ellipse cx="470" cy="118" rx="12" ry="7" fill="#e2e8f0" opacity=".4"/>');
    fx["fx-steam"] = [steam];
    svg.appendChild(steam);
  }

  function init(host, sceneKey, expId) {
    host.innerHTML = "";
    svg = el("svg", { id: "bench", viewBox: "0 0 1100 600", preserveAspectRatio: "xMidYMid meet" });
    svg.innerHTML = defsHtml();
    host.appendChild(svg);
    layout(sceneKey || "oxygen", expId || sceneKey);
    refit();
  }

  function refit() {
    if (!svg) return;
    svg.setAttribute("viewBox", "0 0 1100 600");
  }

  function setSelecting(on, needMap) {
    selecting = !!on;
    needed = needMap || {};
    Object.keys(slots).forEach(function (k) {
      slots[k].style.display = selecting && needed[k] ? "" : "none";
      slots[k].classList.toggle("needed", !!(selecting && needed[k]));
    });
    refit();
  }
  function hoverSlot(name) {
    Object.keys(slots).forEach(function (k) {
      slots[k].classList.toggle("hot", k === name);
    });
  }
  function setPiece(id, on) {
    if (!pieces[id]) return;
    pieces[id].el.dataset.placed = on ? "1" : "0";
    if (id === "reagent") {
      pieces[id].el.style.display = "none";
      return;
    }
    pieces[id].el.style.display = on ? "" : "none";
  }
  function applyEffects(st) {
    st = st || {};
    vis("fx-powder", (!!st.powder || !!st.oxide) && st.liquid !== "blue");
    vis("fx-zinc", !!st.zinc);
    vis("fx-marble", !!st.marble);
    vis("fx-acid", !!st.acid || !!st.oxide_acid || st.liquid === "blue");
    vis("fx-cover", !!st.air_collect);
    vis("fx-cotton", !!st.cotton);
    vis("fx-oxide", !!st.oxide && st.liquid !== "blue");
    vis("fx-flame", !!st.flame || !!st.heat);
    vis("fx-gas", (!!st.collected && !st.air_collect) || !!st.co2_fill);
    vis("fx-bottle-water", !!st.bottle_water);
    vis("fx-water-rise", !!st.water_rise);
    vis("fx-marks", !!st.bottle_water || !!st.water_rise);
    vis("fx-hot-water", !!st.hot_water);
    vis("fx-wp-air", !!st.wp_air);
    vis("fx-rp-air", !!st.rp_air);
    vis("fx-wp-water", !!st.wp_water);
    vis("fx-wp-o2", !!st.wp_o2);
    vis("fx-flame-wp", !!st.wp_air && !st.wp_o2 || !!st.flame);
    vis("fx-rust", !!st.rust);
    vis("fx-drip", !!st.dripping);
    vis("fx-metal", !!st.metal);
    vis("fx-beaker-bubbles", !!st.acid_bubbles);
    vis("fx-acid-bubbles", !!st.acid_bubbles || !!st.oxide_bubbles);
    vis("fx-h2", !!st.gases);
    vis("fx-o2", !!st.gases);
    vis("fx-ratio", !!st.ratio);
    vis("fx-filter-paper", !!st.paper);
    vis("fx-residue", !!st.residue);
    vis("fx-crystals", !!st.crystals);
    vis("fx-steam", !!st.heat);
    vis("fx-jet", !!st.jet_flame);
    vis("fx-sparks", !!st.sparks);
    vis("fx-pop", !!st.pop);
    vis("fx-flame-low", !!st.lit && !st.low_out);
    vis("fx-flame-high", !!st.lit && !st.high_out);
    vis("fx-co2-low", !!st.co2_low || !!st.co2_mid);
    vis("fx-co2-mid", !!st.co2_mid);
    vis("fx-smoke-low", !!st.low_out);
    vis("fx-smoke-high", !!st.high_out);
    if (pieces.trough) {
      var shown = pieces.trough.el.dataset.placed === "1" && !st.air_collect;
      pieces.trough.el.style.display = shown ? "" : "none";
    }
    if (pieces.tube) {
      var spec = Object.assign({}, pieces.tube.spec);
      if (st.upright) spec.r = 0;
      else if (st.tilt_up) spec.r = 62;
      else if (st.tilt_down) spec.r = spec.r > 40 ? spec.r : 82;
      pieces.tube.el.setAttribute("transform", tf(spec));
    }
    if (pieces.bottle) {
      var bs = Object.assign({}, pieces.bottle.spec);
      if (st.air_collect) {
        bs.r = 0;
        delete bs.ox;
        delete bs.oy;
      }
      if (st.pouring) {
        bs.r = -50;
        bs.ox = 80;
        bs.oy = 16;
        bs.x = (pieces.bottle.spec.x || 0) + 36;
      }
      pieces.bottle.el.setAttribute("transform", tf(bs));
    }
    (fx["fx-powder"] || []).forEach(function (n) {
      if (!st.oxide) return;
      n.querySelectorAll("[fill]").forEach(function (p) { p.setAttribute("fill", "#1e293b"); });
    });
    (fx["fx-acid"] || []).forEach(function (n) {
      if (st.liquid !== "blue") return;
      n.querySelectorAll("[fill]").forEach(function (p) { p.setAttribute("fill", "#2563eb"); });
    });
    (fx["fx-liquid"] || []).forEach(function (n) {
      var colors = { pink: "#f9a8d4", pale: "#fce7f3", clear: "#7dd3fc", blue: "#2563eb" };
      n.querySelectorAll("[fill]").forEach(function (p) {
        if (p.tagName.toLowerCase() !== "ellipse") p.setAttribute("fill", colors[st.liquid] || colors.clear);
      });
      if (st.filtrate === false) n.setAttribute("visibility", "hidden");
      if (st.filtrate) n.setAttribute("visibility", "visible");
    });
    (fx["fx-lime-liquid"] || []).forEach(function (n) {
      n.querySelectorAll("path").forEach(function (p) {
        p.setAttribute("fill", st.lime_milky ? "#f8fafc" : "#e2e8f0");
      });
    });
    (fx["fx-dish-liquid"] || []).forEach(function (n) {
      n.setAttribute("opacity", st.crystals ? "0.25" : "0.5");
    });
    refit();
  }
  function clientToSvg(clientX, clientY) {
    if (!svg) return { x: 0, y: 0 };
    var ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    var pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  }
  function specCenter(spec, art) {
    var s = spec.s || 1;
    var ox = spec.ox != null ? spec.ox : 0;
    var oy = spec.oy != null ? spec.oy : 0;
    var rad = (spec.r || 0) * Math.PI / 180;
    var lx = art.w * s * 0.5 - ox;
    var ly = art.h * s * 0.5 - oy;
    return {
      x: spec.x + ox + lx * Math.cos(rad) - ly * Math.sin(rad),
      y: spec.y + oy + lx * Math.sin(rad) + ly * Math.cos(rad)
    };
  }
  function snapR(spec, art) {
    var s = spec.s || 1;
    return Math.max(80, Math.max(art.w, art.h) * s * 0.55 + 48);
  }
  function hitSlot(clientX, clientY, preferId) {
    var p = clientToSvg(clientX, clientY);
    if (preferId && slots[preferId] && slots[preferId].style.display !== "none" && pieces[preferId]) {
      var ps = pieces[preferId].spec, pa = pieces[preferId].art;
      var pc = specCenter(ps, pa);
      if (Math.hypot(p.x - pc.x, p.y - pc.y) <= snapR(ps, pa) * 1.2) return preferId;
    }
    var best = "", bestD = 1e9;
    Object.keys(slots).forEach(function (k) {
      if (!slots[k] || slots[k].style.display === "none" || !pieces[k]) return;
      var spec = pieces[k].spec, art = pieces[k].art;
      var c = specCenter(spec, art);
      var d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d <= snapR(spec, art) && d < bestD) { bestD = d; best = k; }
    });
    return best;
  }

  global.Lab2D = {
    init: init, icon: icon, setSelecting: setSelecting, hoverSlot: hoverSlot,
    setPiece: setPiece, applyEffects: applyEffects, hitSlot: hitSlot
  };
})(window);
