/* 宏观实验台 3D：实验室环境、物理玻璃器材、倒入/搅拌/加热。 */
(function (global) {
  var THREE = global.THREE;
  if (!THREE) { console.error("THREE missing"); return; }

  var renderer, scene, camera, canvas, raycaster, pointer;
  var root, slots = {}, pieces = {}, fx = {};
  var yaw = 0.42, pitch = 0.38, dist = 4.4;
  var lookY = 1.18, orbiting = false, lastX = 0, lastY = 0;
  var selecting = false, needed = {};
  var clock = { t: 0 };
  var pour = { on: false, t: 0, color: 0x38bdf8 };
  var mix = { on: false, t: 0 };
  var pops = [];

  function mat(color, opts) {
    opts = opts || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: opts.roughness != null ? opts.roughness : 0.45,
      metalness: opts.metalness || 0,
      transparent: !!opts.transparent,
      opacity: opts.opacity != null ? opts.opacity : 1,
      emissive: opts.emissive || 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0,
      side: opts.side || THREE.FrontSide
    });
  }
  function glass(tint) {
    return new THREE.MeshPhysicalMaterial({
      color: tint || 0xd4eefc,
      metalness: 0,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.42,
      ior: 1.5,
      transparent: true,
      opacity: 1,
      envMapIntensity: 1.35,
      clearcoat: 0.55,
      clearcoatRoughness: 0.08
    });
  }
  function liquidMat(color) {
    return new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.12,
      metalness: 0,
      transparent: true,
      opacity: 0.78,
      transmission: 0.28,
      thickness: 0.18
    });
  }
  function add(parent, mesh, x, y, z) {
    mesh.position.set(x || 0, y || 0, z || 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function cyl(rTop, rBot, h, matl, seg) {
    return new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg || 32), matl);
  }
  function box(w, h, d, matl) {
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matl);
  }
  function sph(r, matl, w, h) {
    return new THREE.Mesh(new THREE.SphereGeometry(r, w || 24, h || 16), matl);
  }
  function lathe(pairs, matl, seg) {
    var pts = pairs.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    return new THREE.Mesh(new THREE.LatheGeometry(pts, seg || 36), matl);
  }
  function hexCss(c) {
    return "#" + ("000000" + ((c >>> 0) & 0xffffff).toString(16)).slice(-6);
  }
  function parseColor(v) {
    if (v == null) return 0x38bdf8;
    if (typeof v === "number") return v;
    return new THREE.Color(v).getHex();
  }
  function labelSprite(text, color) {
    var c = document.createElement("canvas");
    c.width = 512; c.height = 128;
    var g = c.getContext("2d");
    g.clearRect(0, 0, 512, 128);
    g.font = "700 44px 'Noto Sans SC','PingFang SC',sans-serif";
    g.fillStyle = "rgba(8,14,24,.55)";
    var w = Math.min(480, g.measureText(text).width + 48);
    roundRect(g, (512 - w) / 2, 28, w, 72, 18);
    g.fill();
    g.fillStyle = color || "#e8fffb";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 64);
    var tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    spr.scale.set(0.78, 0.2, 1);
    return spr;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function bottleLabel(title, color) {
    var c = document.createElement("canvas");
    c.width = 256; c.height = 256;
    var g = c.getContext("2d");
    g.fillStyle = "#f7f4ea";
    g.fillRect(0, 0, 256, 256);
    g.fillStyle = hexCss(color || 0x0f766e);
    g.fillRect(0, 0, 256, 18);
    g.fillRect(0, 238, 256, 18);
    g.fillStyle = "#1f2937";
    g.font = "700 36px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    wrapText(g, title || "试剂", 128, 128, 210, 40);
    var tex = new THREE.CanvasTexture(c);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
  }
  function wrapText(g, text, x, y, maxW, lh) {
    var line = "", lines = [], i;
    for (i = 0; i < text.length; i++) {
      var t = line + text[i];
      if (g.measureText(t).width > maxW && line) { lines.push(line); line = text[i]; }
      else line = t;
    }
    if (line) lines.push(line);
    var start = y - (lines.length - 1) * lh / 2;
    lines.forEach(function (ln, n) { g.fillText(ln, x, start + n * lh); });
  }

  function makeSlot(name, title, x, y, z, color) {
    var g = new THREE.Group();
    var col = color || 0x2dd4bf;
    var ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.012, 10, 40),
      mat(col, { emissive: col, emissiveIntensity: 0.55, roughness: 0.25, transparent: true, opacity: 0.95 })
    );
    ring.rotation.x = Math.PI / 2;
    var pad = new THREE.Mesh(
      new THREE.CircleGeometry(0.16, 32),
      mat(col, { transparent: true, opacity: 0.16 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.012;
    var diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.055),
      mat(col, { emissive: col, emissiveIntensity: 0.9, roughness: 0.2 })
    );
    diamond.position.y = 0.52;
    var hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.7, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.position.y = 0.3;
    var lab = labelSprite(title, "#ecfeff");
    lab.position.set(0, 0.68, 0);
    g.add(ring, pad, diamond, hit, lab);
    g.position.set(x, y, z);
    g.userData = { slot: name, bob: Math.random() * 6, diamond: diamond, ring: ring };
    g.traverse(function (o) { o.userData.slot = name; });
    slots[name] = g;
    root.add(g);
    return g;
  }

  function pieceGroup(id, builder, x, y, z) {
    var g = new THREE.Group();
    builder(g);
    g.position.set(x, y, z);
    g.visible = false;
    g.userData = g.userData || {};
    g.userData.baseY = y;
    pieces[id] = g;
    root.add(g);
    return g;
  }

  function buildStand(g) {
    var iron = mat(0x4b5563, { metalness: 0.72, roughness: 0.32 });
    add(g, cyl(0.17, 0.2, 0.05, iron), 0, 0.03, 0);
    add(g, cyl(0.028, 0.028, 0.78, iron), 0, 0.42, 0);
    add(g, box(0.5, 0.035, 0.045, iron), 0.22, 0.42, 0);
    add(g, box(0.055, 0.09, 0.09, iron), 0.46, 0.42, 0);
  }
  function buildTube(g, tilt) {
    var body = lathe([
      [0, 0.02], [0.05, 0.02], [0.056, 0.08], [0.056, 0.5], [0.062, 0.52], [0.04, 0.53]
    ], glass(0xcfefff), 40);
    add(g, body, 0, 0, 0);
    var highlight = cyl(0.01, 0.01, 0.38, mat(0xffffff, { transparent: true, opacity: 0.18 }), 8);
    highlight.castShadow = false;
    add(g, highlight, -0.032, 0.28, 0.02);
    var powder = sph(0.042, mat(0x1e293b, { roughness: 0.8 }), 12, 10);
    powder.scale.set(1, 0.45, 1);
    fx.powder = add(g, powder, 0, 0.08, 0);
    var zinc = box(0.05, 0.028, 0.036, mat(0xa8b0bb, { metalness: 0.55, roughness: 0.35 }));
    fx.zinc = add(g, zinc, 0.01, 0.09, 0);
    var marble = sph(0.024, mat(0xf8fafc, { roughness: 0.45 }));
    fx.marble = add(g, marble, -0.01, 0.085, 0.01);
    var acid = cyl(0.048, 0.05, 0.18, liquidMat(0x38bdf8), 28);
    fx.acid = add(g, acid, 0, 0.16, 0);
    fx.tubeBubbles = [];
    for (var i = 0; i < 10; i++) {
      var b = sph(0.008 + Math.random() * 0.006, mat(0xffffff, { transparent: true, opacity: 0.7 }), 8, 6);
      b.visible = false;
      fx.tubeBubbles.push(add(g, b, (Math.random() - 0.5) * 0.06, 0.12 + Math.random() * 0.12, (Math.random() - 0.5) * 0.06));
    }
    powder.visible = zinc.visible = marble.visible = acid.visible = false;
    fx.cotton = add(g, sph(0.032, mat(0xf8fafc, { roughness: 0.85 })), 0, 0.5, 0);
    fx.cotton.visible = false;
    if (tilt) g.rotation.z = tilt;
    fx.tube = g;
  }
  function buildLamp(g) {
    var ceramic = lathe([
      [0, 0], [0.1, 0], [0.11, 0.04], [0.09, 0.2], [0.07, 0.22], [0.05, 0.23]
    ], mat(0xc2410c, { roughness: 0.42 }), 32);
    add(g, ceramic, 0, 0, 0);
    add(g, cyl(0.038, 0.04, 0.05, mat(0x57534e, { metalness: 0.4, roughness: 0.45 })), 0, 0.25, 0);
    add(g, cyl(0.012, 0.014, 0.05, mat(0xe7e5e4, { roughness: 0.7 })), 0, 0.29, 0);
    var outer = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.16, 18),
      mat(0xff6a12, { emissive: 0xff4d00, emissiveIntensity: 1.4, transparent: true, opacity: 0.88 })
    );
    var inner = new THREE.Mesh(
      new THREE.ConeGeometry(0.02, 0.1, 12),
      mat(0xfff4c2, { emissive: 0xffe08a, emissiveIntensity: 2, transparent: true, opacity: 0.95 })
    );
    fx.flame = add(g, outer, 0, 0.38, 0);
    fx.flameInner = add(g, inner, 0, 0.36, 0);
    var light = new THREE.PointLight(0xff8a3d, 0, 3.2);
    light.position.set(0, 0.42, 0);
    light.castShadow = false;
    g.add(light);
    fx.flameLight = light;
    outer.visible = inner.visible = false;
  }
  function buildClamp(g) {
    var steel = mat(0xb8c0cc, { metalness: 0.78, roughness: 0.22 });
    var grip = mat(0x1e3a5f, { roughness: 0.38, metalness: 0.15 });
    var handle = cyl(0.016, 0.018, 0.42, grip, 12);
    handle.rotation.z = 1.12;
    add(g, handle, 0.18, 0.32, 0);
    add(g, box(0.04, 0.03, 0.03, steel), 0.02, 0.34, 0);
    [[0.28, 0.07], [0.18, 0.062]].forEach(function (p) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(p[1], 0.009, 8, 24), steel);
      ring.rotation.y = Math.PI / 2;
      add(g, ring, 0, p[0], 0);
    });
    add(g, box(0.012, 0.12, 0.012, steel), 0.07, 0.23, 0);
  }
  function buildDeliveryPath(g, pts) {
    var glassMat = glass(0xc7e8fb);
    for (var i = 0; i < pts.length - 1; i++) {
      var a = new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2]);
      var b = new THREE.Vector3(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);
      var dir = b.clone().sub(a);
      var len = dir.length();
      if (len < 0.001) continue;
      var mesh = cyl(0.015, 0.015, len, glassMat, 10);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      mesh.position.copy(a).add(b).multiplyScalar(0.5);
      mesh.castShadow = true;
      g.add(mesh);
      add(g, sph(0.018, glassMat, 10, 8), b.x, b.y, b.z);
    }
  }
  /* 导管画在世界坐标：起点塞进试管口，终点伸进集气瓶（瓶底或倒扣瓶内）。 */
  function hose(worldPts) {
    return function (g) {
      var o = worldPts[0];
      var pts = worldPts.map(function (p) {
        return [p[0] - o[0], p[1] - o[1], p[2] - o[2]];
      });
      add(g, sph(0.05, mat(0x7c2d12, { roughness: 0.72 })), 0, 0, 0);
      buildDeliveryPath(g, pts);
    };
  }
  function buildTrough(g) {
    var wall = mat(0x0369a1, { roughness: 0.38, metalness: 0.08 });
    add(g, box(1.15, 0.05, 0.62, wall), 0, 0.03, 0);
    add(g, box(1.15, 0.22, 0.04, wall), 0, 0.14, 0.29);
    add(g, box(1.15, 0.22, 0.04, wall), 0, 0.14, -0.29);
    add(g, box(0.04, 0.22, 0.62, wall), 0.555, 0.14, 0);
    add(g, box(0.04, 0.22, 0.62, wall), -0.555, 0.14, 0);
    fx.troughWater = add(g, box(1.05, 0.1, 0.52, liquidMat(0x38bdf8)), 0, 0.12, 0);
  }
  function buildBottle(g) {
    add(g, lathe([[0, 0], [0.12, 0], [0.13, 0.04], [0.12, 0.32], [0.05, 0.36], [0.045, 0.46]], glass(0xdbeafe), 32), 0, 0, 0);
    fx.gas = add(g, cyl(0.1, 0.1, 0.1, mat(0xf8fafc, { transparent: true, opacity: 0.5 }), 16), 0, 0.26, 0);
    fx.bottleWater = add(g, cyl(0.11, 0.12, 0.05, liquidMat(0x38bdf8), 16), 0, 0.1, 0);
    fx.gas.visible = fx.bottleWater.visible = false;
    fx.bottle = g;
  }
  function buildInvBottle(g) {
    /* 口朝下：瓶颈在水面下，瓶身倒立露出水面。 */
    add(g, lathe([[0.045, 0], [0.05, 0.08], [0.12, 0.14], [0.13, 0.18], [0.12, 0.5], [0, 0.52]], glass(0xdbeafe), 32), 0, 0, 0);
    fx.gas = add(g, cyl(0.1, 0.1, 0.14, mat(0xf8fafc, { transparent: true, opacity: 0.5 }), 16), 0, 0.34, 0);
    fx.bottleWater = add(g, cyl(0.048, 0.05, 0.04, liquidMat(0x38bdf8), 16), 0, 0.04, 0);
    fx.gas.visible = fx.bottleWater.visible = false;
    fx.bottle = g;
  }
  function buildSplint(g) {
    add(g, box(0.022, 0.34, 0.022, mat(0xb45309, { roughness: 0.7 })), 0, 0.2, 0);
    fx.splintGlow = add(g, sph(0.038, mat(0xfbbf24, { emissive: 0xf59e0b, emissiveIntensity: 0.55 })), 0, 0.4, 0);
  }
  function buildBeaker(g) {
    add(g, lathe([[0.16, 0], [0.18, 0.02], [0.19, 0.36], [0.205, 0.38], [0.17, 0.38]], glass(0xd4eefc), 40), 0, 0, 0);
    var spout = box(0.06, 0.03, 0.04, glass(0xd4eefc));
    spout.rotation.z = -0.4;
    add(g, spout, 0.19, 0.37, 0);
    fx.liquid = add(g, cyl(0.165, 0.155, 0.14, liquidMat(0x7dd3fc), 28), 0, 0.12, 0);
    fx.metal = add(g, box(0.08, 0.028, 0.05, mat(0x94a3b8, { metalness: 0.55 })), 0, 0.14, 0);
    fx.metal.visible = false;
    fx.beakerBubbles = [];
    for (var i = 0; i < 12; i++) {
      var b = sph(0.01 + Math.random() * 0.008, mat(0xffffff, { transparent: true, opacity: 0.7 }), 8, 6);
      b.visible = false;
      fx.beakerBubbles.push(add(g, b, (Math.random() - 0.5) * 0.14, 0.1 + Math.random() * 0.1, (Math.random() - 0.5) * 0.14));
    }
  }
  function buildDropper(g) {
    add(g, sph(0.048, mat(0xef4444, { roughness: 0.45 })), 0, 0.24, 0);
    add(g, cyl(0.014, 0.014, 0.2, glass(0xe0f2fe), 14), 0, 0.1, 0);
    fx.drip = add(g, sph(0.014, liquidMat(0x38bdf8)), 0, 0, 0);
    fx.drip.visible = false;
  }
  function buildRod(g) {
    var m = cyl(0.011, 0.011, 0.46, glass(0xf1f5f9), 12);
    m.rotation.z = 0.42;
    add(g, m, 0.1, 0.24, 0);
  }
  function buildGoggles(g) {
    add(g, box(0.3, 0.07, 0.07, mat(0x134e4a, { roughness: 0.4 })), 0, 0.18, 0);
    add(g, sph(0.046, glass(0xffffff)), -0.07, 0.18, 0.03);
    add(g, sph(0.046, glass(0xffffff)), 0.07, 0.18, 0.03);
  }
  function buildFunnel(g) {
    var bowl = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 28, 1, true), glass(0xdbeafe));
    bowl.rotation.x = Math.PI;
    add(g, bowl, 0, 0.42, 0);
    add(g, cyl(0.024, 0.024, 0.18, glass(0xbae6fd), 16), 0, 0.22, 0);
    var paper = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.16, 18, 1, true), mat(0xf8fafc, { transparent: true, opacity: 0.88 }));
    paper.rotation.x = Math.PI;
    fx.filterPaper = add(g, paper, 0, 0.44, 0);
    fx.residue = add(g, sph(0.05, mat(0xa8a29e, { roughness: 0.8 })), 0, 0.46, 0);
    fx.filterPaper.visible = fx.residue.visible = false;
  }
  function buildPaper(g) {
    add(g, box(0.16, 0.004, 0.22, mat(0xfffbeb, { roughness: 0.9 })), 0, 0.02, 0);
  }
  function buildDish(g) {
    add(g, lathe([[0.08, 0], [0.2, 0.02], [0.18, 0.06], [0.12, 0.07]], mat(0xcbd5e1, { roughness: 0.35, metalness: 0.15 }), 28), 0, 0, 0);
    fx.dishLiquid = add(g, cyl(0.15, 0.14, 0.022, liquidMat(0x7dd3fc), 20), 0, 0.04, 0);
    fx.crystals = new THREE.Group();
    for (var i = 0; i < 7; i++) {
      var c = box(0.028, 0.022, 0.028, mat(0xe0f2fe, { roughness: 0.25 }));
      c.position.set((i % 3 - 1) * 0.05, 0.055, (i < 3 ? -0.035 : 0.035));
      c.rotation.y = i * 0.7;
      fx.crystals.add(c);
    }
    fx.crystals.visible = false;
    g.add(fx.crystals);
  }
  function buildGauze(g) {
    add(g, box(0.42, 0.016, 0.42, mat(0x94a3b8, { metalness: 0.45, roughness: 0.55 })), 0, 0.02, 0);
  }
  function buildCell(g) {
    add(g, box(1.4, 0.28, 0.7, liquidMat(0x38bdf8)), 0, 0.16, 0);
    add(g, box(1.42, 0.04, 0.72, mat(0x0369a1)), 0, 0.02, 0);
    add(g, box(0.04, 0.28, 0.04, mat(0x1d4ed8, { metalness: 0.6 })), -0.35, 0.2, 0);
    add(g, box(0.04, 0.28, 0.04, mat(0xdc2626, { metalness: 0.6 })), 0.35, 0.2, 0);
  }
  function buildPower(g) {
    add(g, box(0.38, 0.16, 0.22, mat(0x111827, { roughness: 0.38 })), 0, 0.2, 0);
    add(g, sph(0.028, mat(0xdc2626, { roughness: 0.3 })), -0.12, 0.22, 0.12);
    add(g, sph(0.028, mat(0x1d4ed8, { roughness: 0.3 })), 0.12, 0.22, 0.12);
    var pos = labelSprite("+", "#fecaca");
    pos.scale.set(0.28, 0.08, 1);
    pos.position.set(-0.12, 0.34, 0.14);
    var neg = labelSprite("−", "#bfdbfe");
    neg.scale.set(0.28, 0.08, 1);
    neg.position.set(0.12, 0.34, 0.14);
    g.add(pos, neg);
  }
  function buildTubes(g) {
    add(g, cyl(0.055, 0.055, 0.3, glass(0xdbeafe), 20), -0.35, 0.44, 0);
    add(g, cyl(0.055, 0.055, 0.3, glass(0xdbeafe), 20), 0.35, 0.44, 0);
    fx.h2gas = add(g, cyl(0.042, 0.042, 0.18, mat(0xe0f2fe, { transparent: true, opacity: 0.55 }), 16), -0.35, 0.48, 0);
    fx.o2gas = add(g, cyl(0.042, 0.042, 0.09, mat(0xffedd5, { transparent: true, opacity: 0.55 }), 16), 0.35, 0.40, 0);
    fx.h2gas.visible = fx.o2gas.visible = false;
    fx.h2 = labelSprite("− H₂", "#99f6e4"); fx.o2 = labelSprite("+ O₂", "#fdba74");
    fx.h2.position.set(-0.35, 0.68, 0.08); fx.o2.position.set(0.35, 0.68, 0.08);
    fx.h2.visible = fx.o2.visible = false;
    g.add(fx.h2, fx.o2);
    fx.ratio = labelSprite("H₂ : O₂ ≈ 2 : 1", "#99f6e4");
    fx.ratio.scale.set(1.2, 0.22, 1);
    fx.ratio.position.set(0, 0.1, 0.45);
    fx.ratio.visible = false;
    g.add(fx.ratio);
  }
  function buildBalance(g) {
    add(g, box(0.44, 0.035, 0.16, mat(0x78716c, { metalness: 0.4 })), 0, 0.08, 0);
    add(g, box(0.035, 0.16, 0.035, mat(0x57534e)), 0, 0.16, 0);
    add(g, cyl(0.08, 0.08, 0.018, mat(0xa8a29e, { metalness: 0.5 }), 20), -0.16, 0.1, 0);
    add(g, cyl(0.08, 0.08, 0.018, mat(0xa8a29e, { metalness: 0.5 }), 20), 0.16, 0.1, 0);
  }
  function buildCylinder(g) {
    add(g, lathe([[0.07, 0], [0.072, 0.4], [0.08, 0.42], [0.05, 0.43]], glass(0xdbeafe), 28), 0, 0, 0);
  }
  function buildReagent(g, color, title) {
    var col = color || 0x7c3aed;
    add(g, lathe([[0, 0], [0.055, 0], [0.06, 0.03], [0.05, 0.18], [0.028, 0.22], [0.026, 0.26]], glass(0xe8f4ff), 28), 0, 0, 0);
    var fill = cyl(0.045, 0.048, 0.12, liquidMat(col), 20);
    add(g, fill, 0, 0.08, 0);
    add(g, cyl(0.03, 0.03, 0.04, mat(0x44403c, { roughness: 0.5 })), 0, 0.27, 0);
    var lab = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), bottleLabel(title || "药品", col));
    lab.position.set(0, 0.1, 0.056);
    g.add(lab);
  }
  function buildWire(g) {
    var curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.02, 0), new THREE.Vector3(-0.02, 0.12, 0.04),
      new THREE.Vector3(0.04, 0.04, -0.03), new THREE.Vector3(0.1, 0.14, 0.02)
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.011, 8, false), mat(0x94a3b8, { metalness: 0.75 })));
  }
  function buildCover(g) {
    add(g, cyl(0.14, 0.14, 0.016, glass(0xe2e8f0), 24), 0, 0.02, 0);
  }
  function buildCandleBeaker(g) {
    add(g, lathe([[0.22, 0], [0.24, 0.02], [0.27, 0.52], [0.29, 0.54], [0.24, 0.54]], glass(0xd4eefc), 40), 0, 0, 0);
    function candle(x, h, flameKey) {
      add(g, cyl(0.032, 0.034, h, mat(0xf8fafc, { roughness: 0.7 }), 12), x, h / 2 + 0.02, 0);
      add(g, cyl(0.004, 0.004, 0.028, mat(0x44403c), 6), x, h + 0.03, 0);
      var flame = add(g, sph(0.024, mat(0xf97316, { emissive: 0xea580c, emissiveIntensity: 0.85 })), x, h + 0.07, 0);
      var inner = add(g, sph(0.012, mat(0xfde68a, { emissive: 0xfacc15, emissiveIntensity: 0.9 })), x, h + 0.065, 0);
      flame.visible = inner.visible = false;
      fx[flameKey] = flame;
      fx[flameKey + "Inner"] = inner;
    }
    candle(-0.09, 0.16, "flameLow");
    candle(0.1, 0.32, "flameHigh");
    fx.co2Low = add(g, cyl(0.24, 0.23, 0.12, mat(0x64748b, { transparent: true, opacity: 0.32 }), 20), 0, 0.08, 0);
    fx.co2Mid = add(g, cyl(0.24, 0.23, 0.26, mat(0x94a3b8, { transparent: true, opacity: 0.28 }), 20), 0, 0.16, 0);
    fx.co2Low.visible = fx.co2Mid.visible = false;
    var lo = labelSprite("较低处", "#334155");
    lo.scale.set(0.42, 0.1, 1);
    lo.position.set(-0.09, 0.04, 0.28);
    var hi = labelSprite("较高处", "#334155");
    hi.scale.set(0.42, 0.1, 1);
    hi.position.set(0.1, 0.04, 0.28);
    g.add(lo, hi);
  }
  function buildConditionBeaker(g) {
    add(g, lathe([[0.22, 0], [0.24, 0.02], [0.27, 0.52], [0.29, 0.54], [0.24, 0.54]], glass(0xd4eefc), 40), 0, 0, 0);
    fx.hotWater = add(g, cyl(0.24, 0.23, 0.28, liquidMat(0xfb923c), 20), 0, 0.16, 0);
    add(g, box(0.5, 0.012, 0.28, mat(0xb45309, { metalness: 0.45 })), 0, 0.34, 0);
    fx.wpAir = add(g, sph(0.03, mat(0xf8fafc)), -0.12, 0.38, 0);
    fx.flameWp = add(g, sph(0.022, mat(0xf97316, { emissive: 0xea580c, emissiveIntensity: 0.85 })), -0.12, 0.44, 0);
    fx.rpAir = add(g, sph(0.03, mat(0xdc2626)), 0.12, 0.38, 0);
    fx.wpWater = add(g, sph(0.028, mat(0xf8fafc)), 0, 0.12, 0);
    fx.wpO2 = add(g, sph(0.02, mat(0xf97316, { emissive: 0xea580c, emissiveIntensity: 0.7 })), 0, 0.2, 0);
    fx.hotWater.visible = fx.wpAir.visible = fx.flameWp.visible = fx.rpAir.visible = fx.wpWater.visible = fx.wpO2.visible = false;
  }
  function buildRustTubes(g) {
    function tube(x, label, withWater, oil, dry) {
      add(g, cyl(0.05, 0.05, 0.42, glass(0xdbeafe), 20), x, 0.22, 0);
      if (withWater) add(g, cyl(0.04, 0.04, 0.16, liquidMat(0x38bdf8), 16), x, 0.1, 0);
      if (oil) add(g, cyl(0.04, 0.04, 0.03, liquidMat(0xca8a04), 16), x, 0.2, 0);
      if (dry) add(g, sph(0.028, mat(0xf8fafc)), x, 0.34, 0);
      var nail = add(g, box(0.018, 0.12, 0.018, mat(0x94a3b8, { metalness: 0.55 })), x, 0.12, 0);
      if (label === "水+空气") fx.rustNail = nail;
      var t = labelSprite(label, "#334155");
      t.scale.set(0.5, 0.12, 1);
      t.position.set(x, 0.02, 0.12);
      g.add(t);
    }
    tube(-0.28, "水+空气", true, false, false);
    tube(0, "油封隔空气", true, true, false);
    tube(0.28, "干燥剂", false, false, true);
  }

  function buildLime(g) {
    add(g, lathe([[0.14, 0], [0.16, 0.02], [0.17, 0.30], [0.19, 0.32], [0.15, 0.32]], glass(0xd4eefc), 40), 0, 0, 0);
    var spout = box(0.055, 0.024, 0.036, glass(0xd4eefc));
    spout.rotation.z = -0.4;
    add(g, spout, 0.175, 0.31, 0);
    fx.limeLiquid = add(g, cyl(0.148, 0.138, 0.12, liquidMat(0xe8f1f8), 20), 0, 0.1, 0);
  }

  function tileFloor() {
    var geo = new THREE.PlaneGeometry(18, 18, 18, 18);
    var pos = geo.attributes.position;
    var colors = [];
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i), y = pos.getY(i);
      var odd = (Math.floor(x + 9) + Math.floor(y + 9)) % 2;
      var c = odd ? 0.16 : 0.13;
      colors.push(c, c + 0.01, c + 0.03);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      vertexColors: true, roughness: 0.88, metalness: 0.04
    }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    return mesh;
  }

  function buildRoom() {
    root = new THREE.Group();
    scene.add(root);
    add(root, tileFloor(), 0, 0, 0);
    var wall = mat(0xd7e3ee, { roughness: 0.9 });
    add(root, box(14, 5.2, 0.12, wall), 0, 2.5, -3.4);
    add(root, box(0.12, 5.2, 8, wall), -5.4, 2.5, 0);
    add(root, box(0.12, 5.2, 8, wall), 5.4, 2.5, 0);
    var win = box(2.6, 1.55, 0.04, mat(0x9ecfff, { roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.55 }));
    add(root, win, 1.5, 2.85, -3.33);
    add(root, box(2.76, 0.06, 0.08, mat(0xf8fafc)), 1.5, 3.64, -3.32);
    add(root, box(2.76, 0.06, 0.08, mat(0xf8fafc)), 1.5, 2.06, -3.32);
    var cabinet = mat(0x3f4a57, { roughness: 0.48, metalness: 0.12 });
    add(root, box(3.4, 1.7, 0.42, cabinet), -2.6, 2.55, -3.12);
    add(root, box(1.5, 0.62, 0.03, glass(0xcfe8ff)), -3.35, 2.7, -2.9);
    add(root, box(1.5, 0.62, 0.03, glass(0xcfe8ff)), -1.85, 2.7, -2.9);
    [[-3.4, 0x7c3aed], [-3.05, 0x16a34a], [-2.7, 0xdc2626], [-2.35, 0x0284c7], [-2.0, 0xd97706]].forEach(function (b) {
      add(root, cyl(0.045, 0.05, 0.16 + Math.random() * 0.06, mat(b[1], { roughness: 0.35 })), b[0], 2.05, -2.88);
    });
    var epoxy = mat(0x2c333d, { roughness: 0.42, metalness: 0.08 });
    add(root, box(5.4, 0.12, 2.2, epoxy), 0, 0.98, 0.05);
    add(root, box(5.5, 0.06, 0.08, mat(0x1c2128, { roughness: 0.5 })), 0, 0.92, 1.14);
    var oak = mat(0x6b4a2b, { roughness: 0.62 });
    [[-2.4, 0.9], [2.4, 0.9], [-2.4, -0.8], [2.4, -0.8]].forEach(function (p) {
      add(root, box(0.12, 0.92, 0.12, oak), p[0], 0.46, p[1]);
    });
    add(root, box(5.3, 0.7, 2.05, mat(0x3b2a1a, { roughness: 0.7 })), 0, 0.35, 0.05);
    var led = box(3.2, 0.03, 0.06, mat(0xf8fafc, { emissive: 0xf1f5ff, emissiveIntensity: 1.4 }));
    add(root, led, -2.4, 3.38, -2.88);
    add(root, cyl(0.05, 0.05, 0.08, mat(0x94a3b8, { metalness: 0.6 })), 2.25, 1.08, 0.9);
    add(root, cyl(0.012, 0.012, 0.12, mat(0xcbd5e1, { metalness: 0.7 })), 2.25, 1.18, 0.9);
  }

  function makeFx(kind) {
    fx.bubbles = [];
    for (var i = 0; i < 12; i++) {
      var b = sph(0.014, mat(0xffffff, { transparent: true, opacity: 0.75 }), 8, 6);
      b.visible = false;
      fx.bubbles.push(add(root, b, 1.0, 1.2, 0.2));
    }
    fx.sparks = [];
    for (i = 0; i < 8; i++) {
      var s = sph(0.012, mat(0xf97316, { emissive: 0xf97316, emissiveIntensity: 0.9 }), 8, 6);
      s.visible = false;
      fx.sparks.push(add(root, s, 1.1, 1.4, 0));
    }
    fx.jet = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 10), mat(0x38bdf8, { emissive: 0x38bdf8, emissiveIntensity: 0.6 }));
    fx.jet.position.set(-0.55, 1.45, 0.1);
    fx.jet.visible = false;
    root.add(fx.jet);
    fx.pop = labelSprite("爆鸣！", "#fecaca");
    fx.pop.scale.set(0.95, 0.28, 1);
    fx.pop.position.set(1.6, 1.7, -0.2);
    fx.pop.visible = false;
    root.add(fx.pop);
    if (kind === "evaporation") {
      fx.steam = [];
      for (i = 0; i < 8; i++) {
        var st = sph(0.03, mat(0xcbd5e1, { transparent: true, opacity: 0.32 }), 8, 6);
        st.visible = false;
        fx.steam.push(add(root, st, (i - 3) * 0.05, 1.5, 0.05));
      }
    }
    fx.stream = cyl(0.012, 0.008, 0.32, liquidMat(0x7dd3fc), 10);
    fx.stream.visible = false;
    root.add(fx.stream);
    fx.pourer = new THREE.Group();
    buildReagent(fx.pourer, 0x38bdf8, "加入");
    fx.pourer.visible = false;
    root.add(fx.pourer);
  }

  function layout(kind, expId) {
    var y = 1.05;
    var id = expId || kind || "oxygen";
    function S(name, title, x, z, c) { makeSlot(name, title, x, y, z, c || 0x2dd4bf); }
    function placeHose(hid, pts) {
      var o = pts[0];
      var mid = pts[Math.floor(pts.length / 2)];
      S(hid, "导管", mid[0], mid[2], 0x94a3b8);
      pieceGroup(hid, hose(pts), o[0], o[1], o[2]);
    }
    function invertBottle(g) {
      buildInvBottle(g);
    }
    function tiltTube(angle) {
      return function (g) {
        buildTube(g, angle);
        g.userData.tilt0 = angle;
      };
    }
    var L = {
      prep_oxygen_kmno4: function () {
        /* 固体加热：灯在闭口端下，试管口略向下，导管通入水槽倒扣集气瓶。 */
        var sx = -1.65, sz = 0;
        var clampX = sx + 0.46, clampY = y + 0.42;
        var tilt = -1.55;
        var tx = clampX - 0.28, ty = clampY - 0.006, tz = sz;
        var mouth = [tx + 0.53, ty + 0.011, tz];
        var troughX = 0.22, troughZ = 0.08;
        fx.collectAt = { x: troughX, y: 1.18, z: troughZ };
        S("stand", "铁架台", sx, sz);
        S("tube", "试管", tx, tz, 0x38bdf8);
        S("lamp", "酒精灯", tx + 0.02, 0.08, 0xf59e0b);
        S("trough", "水槽", troughX, 0.22, 0x0ea5e9);
        S("bottle", "集气瓶", troughX, -0.2, 0x38bdf8);
        S("splint", "木条", 1.45, -0.28, 0xf59e0b);
        S("reagent", "药品", sx, -0.38, 0xa78bfa);
        pieceGroup("stand", buildStand, sx, y, sz);
        pieceGroup("tube", tiltTube(tilt), tx, ty, tz);
        pieceGroup("lamp", buildLamp, tx + 0.02, y, 0.08);
        placeHose("delivery", [
          mouth,
          [mouth[0] + 0.42, mouth[1] - 0.02, 0.04],
          [troughX, 1.38, troughZ],
          [troughX, 1.18, troughZ]
        ]);
        pieceGroup("trough", buildTrough, troughX, y, troughZ);
        pieceGroup("bottle", invertBottle, troughX, y + 0.12, troughZ);
        pieceGroup("splint", buildSplint, 1.45, y, -0.28);
      },
      nh4hco3_decomp: function () {
        var sx = -1.45, sz = 0;
        var clampX = sx + 0.46, clampY = y + 0.42;
        var tilt = -1.55;
        var tx = clampX - 0.28, ty = clampY - 0.006, tz = sz;
        var mouth = [tx + 0.53, ty + 0.011, tz];
        S("stand", "铁架台", sx, sz);
        S("tube", "试管", tx, tz, 0x38bdf8);
        S("lamp", "酒精灯", tx + 0.02, 0.08, 0xf59e0b);
        S("paper", "试纸", mouth[0] + 0.08, -0.12, 0xf87171);
        S("lime_beaker", "石灰水", mouth[0] + 0.38, 0.08, 0x94a3b8);
        S("reagent", "药品", sx, -0.38, 0xa78bfa);
        pieceGroup("stand", buildStand, sx, y, sz);
        pieceGroup("tube", tiltTube(tilt), tx, ty, tz);
        pieceGroup("lamp", buildLamp, tx + 0.02, y, 0.08);
        pieceGroup("paper", buildPaper, mouth[0] + 0.08, y + 0.08, -0.12);
        pieceGroup("lime_beaker", buildLime, mouth[0] + 0.38, y, 0.08);
      },
      prep_hydrogen: function () {
        /* 固液不加热：试管直立夹在铁架台，导管通入水槽倒扣集气瓶。 */
        var sx = -1.55, sz = 0;
        var tubeX = sx + 0.46;
        var mouth = [tubeX, y + 0.53, sz];
        var troughX = 0.22, troughZ = 0.08;
        fx.collectAt = { x: troughX, y: 1.18, z: troughZ };
        S("stand", "铁架台", sx, sz);
        S("tube", "试管", tubeX, sz, 0x38bdf8);
        S("trough", "水槽", troughX, 0.22, 0x0ea5e9);
        S("bottle", "集气瓶", troughX, -0.2, 0x38bdf8);
        S("splint", "木条", 1.4, -0.28, 0xf59e0b);
        S("reagent", "药品", sx, -0.38, 0xa78bfa);
        pieceGroup("stand", buildStand, sx, y, sz);
        pieceGroup("tube", tiltTube(0), tubeX, y, sz);
        placeHose("delivery", [
          mouth,
          [mouth[0] + 0.45, mouth[1], 0.04],
          [troughX, 1.38, troughZ],
          [troughX, 1.18, troughZ]
        ]);
        pieceGroup("trough", buildTrough, troughX, y, troughZ);
        pieceGroup("bottle", invertBottle, troughX, y + 0.12, troughZ);
        pieceGroup("splint", buildSplint, 1.4, y, -0.28);
      },
      prep_co2: function () {
        /* 向上排空气：试管直立，导管伸入正放集气瓶底部，瓶口盖玻璃片，石灰水烧杯在右侧。 */
        var sx = -1.55, sz = 0;
        var tubeX = sx + 0.46;
        var mouth = [tubeX, y + 0.53, sz];
        var bx = -0.08, bz = 0.04;
        fx.collectAt = { x: bx, y: y + 0.06, z: bz };
        S("stand", "铁架台", sx, sz);
        S("tube", "试管", tubeX, sz, 0x38bdf8);
        S("bottle", "集气瓶", bx, bz, 0x38bdf8);
        S("lime_beaker", "石灰水", bx + 0.78, 0.12, 0x94a3b8);
        S("splint", "木条", 1.42, -0.28, 0xf59e0b);
        S("reagent", "药品", sx, -0.38, 0xa78bfa);
        pieceGroup("stand", buildStand, sx, y, sz);
        pieceGroup("tube", tiltTube(0), tubeX, y, sz);
        placeHose("delivery", [
          mouth,
          [mouth[0] + 0.22, mouth[1], 0.02],
          [bx, mouth[1] - 0.04, bz],
          [bx, y + 0.06, bz]
        ]);
        pieceGroup("bottle", function (g) {
          buildBottle(g);
          add(g, cyl(0.13, 0.13, 0.014, glass(0xe2e8f0), 24), 0, 0.47, 0);
        }, bx, y, bz);
        pieceGroup("lime_beaker", buildLime, bx + 0.78, y, 0.12);
        pieceGroup("splint", buildSplint, 1.42, y, -0.28);
      },
      iron_in_oxygen: function () {
        S("lamp", "酒精灯", -0.95, 0.1, 0xf59e0b);
        S("wire", "铁丝", 0.05, -0.22, 0xfb7185);
        S("bottle", "集气瓶", 0.05, 0.08, 0x38bdf8);
        S("cover", "玻璃片", 0.72, -0.18, 0xcbd5e1);
        S("reagent", "药品", -0.95, -0.35, 0xa78bfa);
        pieceGroup("lamp", buildLamp, -0.95, y, 0.1);
        pieceGroup("bottle", buildBottle, 0.05, y, 0.06);
        pieceGroup("wire", buildWire, 0.05, y + 0.12, 0.06);
        pieceGroup("cover", buildCover, 0.72, y, -0.18);
        fx.collectAt = { x: 0.05, y: 1.4, z: 0.06 };
      },
      neutralization: function () {
        S("goggles", "护目镜", -1.25, -0.18);
        S("beaker", "烧杯", 0, 0.08);
        S("dropper", "胶头滴管", 0, -0.22, 0xf87171);
        S("rod", "玻璃棒", 0.32, 0.1, 0x94a3b8);
        S("reagent", "药品", 0.85, -0.22, 0xa78bfa);
        pieceGroup("goggles", buildGoggles, -1.25, y, -0.18);
        pieceGroup("beaker", buildBeaker, 0, y, 0.06);
        pieceGroup("dropper", buildDropper, 0, y + 0.32, 0.06);
        pieceGroup("rod", buildRod, 0.16, y, 0.08);
      },
      metal_acid: function () {
        S("goggles", "护目镜", -1.25, -0.18);
        S("beaker", "烧杯", 0, 0.06);
        S("rod", "玻璃棒", 0.18, 0.08, 0x94a3b8);
        S("reagent", "药品", 0.85, -0.22, 0xa78bfa);
        pieceGroup("goggles", buildGoggles, -1.25, y, -0.18);
        pieceGroup("beaker", buildBeaker, 0, y, 0.06);
        pieceGroup("rod", buildRod, 0.16, y, 0.08);
      },
      solution_prep: function () {
        S("balance", "天平", -1.25, 0.1, 0xf59e0b);
        S("paper", "称量纸", -1.38, 0.1, 0xcbd5e1);
        S("cylinder", "量筒", 0.55, 0.1, 0x38bdf8);
        S("beaker", "烧杯", 0, 0.06);
        S("rod", "玻璃棒", 0.18, 0.08, 0x94a3b8);
        S("reagent", "药品", 1.1, -0.22, 0xa78bfa);
        pieceGroup("balance", buildBalance, -1.25, y, 0.1);
        pieceGroup("paper", buildPaper, -1.38, y + 0.12, 0.1);
        pieceGroup("cylinder", buildCylinder, 0.55, y, 0.1);
        pieceGroup("beaker", buildBeaker, 0, y, 0.06);
        pieceGroup("rod", buildRod, 0.16, y, 0.08);
      },
      electrolysis: function () {
        S("cell", "水槽", 0.2, 0.16, 0x0ea5e9);
        S("power", "电源", -1.35, 0.08, 0xf59e0b);
        S("tubes", "集气管", 0.2, -0.2, 0x38bdf8);
        S("splint", "木条", 1.45, -0.28, 0xf59e0b);
        S("reagent", "水", 0.2, -0.4, 0xa78bfa);
        pieceGroup("cell", buildCell, 0.2, y, 0.08);
        pieceGroup("power", buildPower, -1.35, y, 0.08);
        pieceGroup("tubes", buildTubes, 0.2, y, 0.08);
        pieceGroup("splint", buildSplint, 1.45, y, -0.28);
      },
      filtration: function () {
        var sx = -0.35, sz = 0;
        var fx_ = sx + 0.46;
        S("stand", "铁架台", sx, sz);
        S("funnel", "漏斗", fx_, -0.2, 0x38bdf8);
        S("paper", "滤纸", 0.95, -0.22, 0xcbd5e1);
        S("beaker", "烧杯", fx_, 0.22, 0x94a3b8);
        S("rod", "玻璃棒", fx_ + 0.12, -0.12, 0x94a3b8);
        S("reagent", "浊液", 0.95, 0.12, 0xa78bfa);
        pieceGroup("stand", buildStand, sx, y, sz);
        pieceGroup("funnel", buildFunnel, fx_, y, sz);
        pieceGroup("paper", buildPaper, 0.95, y, -0.22);
        pieceGroup("beaker", function (g) { buildBeaker(g); fx.filtrate = fx.liquid; }, fx_, y, sz);
        pieceGroup("rod", buildRod, fx_ - 0.08, y + 0.28, -0.06);
      },
      evaporation: function () {
        S("stand", "三脚架", 0, 0.06, 0x94a3b8);
        S("gauze", "陶土网", 0, 0.06, 0xcbd5e1);
        S("dish", "蒸发皿", 0, 0.06, 0x38bdf8);
        S("lamp", "酒精灯", 0, 0.06, 0xf59e0b);
        S("rod", "玻璃棒", 0.38, -0.06, 0x94a3b8);
        S("reagent", "溶液", 1.05, -0.18, 0xa78bfa);
        pieceGroup("lamp", buildLamp, 0, y, 0.06);
        pieceGroup("stand", function (g) {
          add(g, box(0.7, 0.035, 0.035, mat(0x64748b, { metalness: 0.55 })), 0, 0.32, 0.16);
          add(g, box(0.035, 0.32, 0.035, mat(0x475569, { metalness: 0.55 })), -0.28, 0.16, 0.16);
          add(g, box(0.035, 0.32, 0.035, mat(0x475569, { metalness: 0.55 })), 0.28, 0.16, 0.16);
          add(g, box(0.035, 0.32, 0.035, mat(0x475569, { metalness: 0.55 })), 0, 0.16, -0.2);
        }, 0, y, 0.06);
        pieceGroup("gauze", buildGauze, 0, y + 0.34, 0.06);
        pieceGroup("dish", buildDish, 0, y + 0.37, 0.06);
        pieceGroup("rod", buildRod, 0.38, y + 0.32, -0.06);
      },
      metal_oxide_acid: function () {
        var tilt = -0.55;
        var tx = 0.02, ty = y + 0.12, tz = 0.06;
        S("tube", "试管", tx, tz, 0x38bdf8);
        S("lamp", "酒精灯", tx - 0.35, 0.22, 0xf59e0b);
        S("rod", "试管夹", tx + 0.35, -0.18, 0x94a3b8);
        S("reagent", "药品", -0.95, 0.08, 0xa78bfa);
        pieceGroup("lamp", buildLamp, tx, y, tz);
        pieceGroup("tube", tiltTube(tilt), tx, ty, tz);
        pieceGroup("rod", buildClamp, tx + 0.15, ty + 0.24, tz);
      },
      co2_candles: function () {
        S("bottle", "二氧化碳", -0.95, 0.08, 0x64748b);
        S("beaker", "烧杯", 0.35, 0.08, 0x38bdf8);
        pieceGroup("bottle", buildBottle, -0.95, y, 0.08);
        pieceGroup("beaker", buildCandleBeaker, 0.35, y, 0.08);
      },
      air_oxygen: function () {
        S("lamp", "酒精灯", -1.05, 0.1, 0xf59e0b);
        S("wire", "燃烧匙", 0.02, -0.22, 0xfb7185);
        S("bottle", "集气瓶", 0.02, 0.08, 0x38bdf8);
        S("beaker", "烧杯", 0.85, 0.1, 0x0ea5e9);
        S("reagent", "红磷", -1.05, -0.35, 0xa78bfa);
        pieceGroup("lamp", buildLamp, -1.05, y, 0.1);
        pieceGroup("bottle", buildBottle, 0.02, y, 0.06);
        pieceGroup("wire", buildWire, 0.02, y + 0.12, 0.06);
        pieceGroup("beaker", buildBeaker, 0.85, y, 0.08);
        fx.collectAt = { x: 0.02, y: 1.4, z: 0.06 };
      },
      combustion_conditions: function () {
        S("beaker", "烧杯", 0.05, 0.08, 0x38bdf8);
        S("cover", "薄铜片", 0.05, -0.18, 0xb45309);
        pieceGroup("beaker", buildConditionBeaker, 0.05, y, 0.08);
        pieceGroup("cover", buildCover, 0.72, y, -0.18);
      },
      iron_rust: function () {
        S("tube", "对照试管", 0, 0.06, 0x38bdf8);
        pieceGroup("tube", buildRustTubes, 0, y, 0.06);
      }
    };
    L.oxygen = L.prep_oxygen_kmno4;
    L.gas_wet = L.prep_hydrogen;
    L.gas_air = L.prep_co2;
    L.burn = L.iron_in_oxygen;
    L.oxide = L.metal_oxide_acid;
    (L[id] || L[kind] || L.prep_oxygen_kmno4)();
    makeFx(kind);
  }

  function setupEnv() {
    var g = new THREE.PMREMGenerator(renderer);
    var s = new THREE.Scene();
    s.add(new THREE.HemisphereLight(0xb9dcff, 0x3a2a18, 1.15));
    s.add(new THREE.Mesh(
      new THREE.SphereGeometry(10, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0x7eadd0, side: THREE.BackSide })
    ));
    var fl = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0x2a241c }));
    fl.rotation.x = Math.PI / 2;
    s.add(fl);
    scene.environment = g.fromScene(s, 0.04).texture;
    g.dispose();
  }

  function updateCamera() {
    pitch = Math.max(0.16, Math.min(1.12, pitch));
    camera.position.set(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      lookY + Math.sin(pitch) * dist * 0.72,
      Math.cos(yaw) * Math.cos(pitch) * dist
    );
    camera.lookAt(0, lookY, 0.05);
  }

  function tick(now) {
    requestAnimationFrame(tick);
    clock.t = now;
    Object.keys(slots).forEach(function (k) {
      var s = slots[k];
      if (!s.visible) return;
      var bob = 0.52 + Math.sin(now * 0.003 + s.userData.bob) * 0.05;
      if (s.userData.diamond) s.userData.diamond.position.y = bob;
      if (s.userData.ring) s.userData.ring.rotation.z = now * 0.001;
    });
    if (fx.flame && fx.flame.visible) {
      var flick = 0.88 + Math.sin(now * 0.021) * 0.16 + Math.sin(now * 0.053) * 0.08;
      fx.flame.scale.set(0.92 + Math.sin(now * 0.04) * 0.08, flick, 1);
      if (fx.flameInner) fx.flameInner.scale.y = 0.9 + Math.sin(now * 0.03) * 0.12;
      if (fx.flameLight) fx.flameLight.intensity = 1.6 + Math.sin(now * 0.03) * 0.45;
    }
    var cx = (fx.collectAt && fx.collectAt.x) || 0.4;
    var cy0 = (fx.collectAt && fx.collectAt.y) || 1.16;
    var cz = (fx.collectAt && fx.collectAt.z) || 0.08;
    (fx.bubbles || []).forEach(function (b, i) {
      if (!b.visible) return;
      b.position.y += 0.006;
      if (b.position.y > cy0 + 0.42) b.position.y = cy0;
      b.position.x = cx + Math.sin(now * 0.01 + i) * 0.04;
      b.position.z = cz;
    });
    (fx.beakerBubbles || []).concat(fx.tubeBubbles || []).forEach(function (b, i) {
      if (!b.visible) return;
      b.position.y += 0.004;
      if (b.position.y > 0.32) b.position.y = 0.1;
    });
    (fx.steam || []).forEach(function (s, i) {
      if (!s.visible) return;
      s.position.y += 0.004;
      if (s.position.y > 1.95) s.position.y = 1.45;
      s.material.opacity = 0.18 + Math.sin(now * 0.01 + i) * 0.1;
    });
    (fx.sparks || []).forEach(function (s, i) {
      if (!s.visible) return;
      s.position.x = cx + Math.sin(now * 0.02 + i) * 0.08;
      s.position.y = cy0 + 0.18 + Math.cos(now * 0.03 + i) * 0.1;
      s.position.z = cz;
    });
    if (pour.on) tickPour(0.016);
    if (mix.on) tickMix(0.016);
    for (var i = pops.length - 1; i >= 0; i--) {
      pops[i].t += 0.05;
      var k = Math.min(1, pops[i].t);
      var s = 1 - Math.pow(1 - k, 3);
      pops[i].obj.scale.setScalar(0.2 + 0.8 * s);
      if (k >= 1) pops.splice(i, 1);
    }
    renderer.render(scene, camera);
  }
  function tickPour(dt) {
    pour.t += dt;
    var bottle = fx.pourer;
    if (!bottle) { pour.on = false; return; }
    bottle.visible = true;
    var target = pieces.tube || pieces.beaker || pieces.dish;
    var tx = target ? target.position.x - 0.38 : -0.4;
    var ty = target ? target.position.y + 0.42 : 1.45;
    var tz = target ? target.position.z : 0.1;
    bottle.position.set(tx, ty, tz);
    if (pour.t < 0.35) bottle.rotation.z = -pour.t * 2.2;
    else if (pour.t < 1.15) {
      bottle.rotation.z = -0.77;
      if (fx.stream) {
        fx.stream.visible = true;
        fx.stream.material.color.setHex(pour.color);
        fx.stream.position.set(tx + 0.18, ty - 0.18, tz);
      }
      var liq = fx.acid || fx.liquid;
      if (liq) {
        liq.visible = true;
        liq.scale.y = Math.min(1, 0.35 + pour.t * 0.6);
      }
    } else {
      if (fx.stream) fx.stream.visible = false;
      bottle.rotation.z += (0 - bottle.rotation.z) * 0.12;
      if (pour.t > 1.7) {
        bottle.visible = false;
        bottle.rotation.z = 0;
        pour.on = false;
      }
    }
  }
  function tickMix(dt) {
    mix.t += dt;
    var rod = pieces.rod;
    if (rod && rod.visible) rod.rotation.y = Math.sin(mix.t * 14) * 0.55;
    var liq = fx.liquid || fx.acid;
    if (liq) liq.rotation.y += 0.08;
    if (mix.t > 1.25) {
      mix.on = false;
      if (rod) rod.rotation.y = 0;
    }
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    orbiting = true;
    lastX = e.clientX; lastY = e.clientY;
  }
  function onPointerMove(e) {
    if (!orbiting) return;
    yaw -= (e.clientX - lastX) * 0.0055;
    pitch -= (e.clientY - lastY) * 0.0045;
    lastX = e.clientX; lastY = e.clientY;
    updateCamera();
  }
  function onPointerUp() { orbiting = false; }
  function onWheel(e) {
    dist = Math.max(2.8, Math.min(7.2, dist + e.deltaY * 0.0035));
    updateCamera();
  }

  function init(el, sceneKey, expId) {
    canvas = el;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x8fb7d4);
    scene.fog = new THREE.Fog(0x8fb7d4, 9, 18);
    camera = new THREE.PerspectiveCamera(38, 1, 0.08, 40);
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();
    setupEnv();
    scene.add(new THREE.HemisphereLight(0xeaf4ff, 0x4a3720, 0.7));
    var sun = new THREE.DirectionalLight(0xfff6e8, 1.35);
    sun.position.set(4.2, 7.2, 3.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 18;
    sun.shadow.camera.left = -5;
    sun.shadow.camera.right = 5;
    sun.shadow.camera.top = 5;
    sun.shadow.camera.bottom = -5;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    var fill = new THREE.PointLight(0x9ecbff, 0.35, 12);
    fill.position.set(-3, 3.2, 2);
    scene.add(fill);
    buildRoom();
    layout(sceneKey || "oxygen", expId);
    updateCamera();
    resize();
    canvas.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    requestAnimationFrame(tick);
  }

  function resize() {
    if (!canvas || !renderer) return;
    var w = canvas.clientWidth || 640;
    var h = canvas.clientHeight || 380;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }

  function setSelecting(on, needMap) {
    selecting = !!on;
    needed = needMap || {};
    Object.keys(slots).forEach(function (k) {
      slots[k].visible = selecting && !!needed[k];
    });
  }
  function setPiece(id, on) {
    if (!pieces[id]) return;
    if (id === "reagent") {
      pieces[id].visible = false;
      return;
    }
    var show = !!on;
    if (show) {
      pieces[id].visible = true;
      pieces[id].scale.setScalar(1);
    } else {
      pieces[id].visible = false;
    }
  }
  function applyEffects(st) {
    st = st || {};
    if (fx.powder) fx.powder.visible = (!!st.powder || !!st.oxide) && st.liquid !== "blue";
    if (fx.zinc) fx.zinc.visible = !!st.zinc;
    if (fx.marble) fx.marble.visible = !!st.marble;
    if (fx.cotton) fx.cotton.visible = !!st.cotton;
    if (fx.acid) {
      fx.acid.visible = !!st.acid || !!st.oxide_acid || st.liquid === "blue";
      if (st.liquid === "blue") fx.acid.material.color.setHex(0x2563eb);
    }
    var lit = !!st.flame || !!st.heat;
    if (fx.flame) fx.flame.visible = lit;
    if (fx.flameInner) fx.flameInner.visible = lit;
    if (fx.flameLight) fx.flameLight.intensity = lit ? 1.6 : 0;
    (fx.bubbles || []).forEach(function (b) { b.visible = !!st.bubbles; });
    (fx.tubeBubbles || []).forEach(function (b) { b.visible = !!st.acid_bubbles || !!st.oxide_bubbles || !!st.bubbles; });
    if (fx.gas) fx.gas.visible = (!!st.collected && !st.air_collect) || !!st.co2_fill;
    if (fx.flameLow) fx.flameLow.visible = !!st.lit && !st.low_out;
    if (fx.flameLowInner) fx.flameLowInner.visible = !!st.lit && !st.low_out;
    if (fx.flameHigh) fx.flameHigh.visible = !!st.lit && !st.high_out;
    if (fx.flameHighInner) fx.flameHighInner.visible = !!st.lit && !st.high_out;
    if (fx.co2Low) fx.co2Low.visible = !!st.co2_low || !!st.co2_mid;
    if (fx.co2Mid) fx.co2Mid.visible = !!st.co2_mid;
    if (pieces.bottle && st.pouring) pieces.bottle.rotation.z = -0.72;
    else if (pieces.bottle) pieces.bottle.rotation.z = 0;
    if (fx.bottleWater) {
      fx.bottleWater.visible = !!st.bottle_water || !!st.water_rise;
      if (st.water_rise) fx.bottleWater.scale.set(1, 2.4, 1);
      else fx.bottleWater.scale.set(1, 1, 1);
    }
    if (fx.hotWater) fx.hotWater.visible = !!st.hot_water;
    if (fx.wpAir) fx.wpAir.visible = !!st.wp_air;
    if (fx.flameWp) fx.flameWp.visible = !!st.wp_air;
    if (fx.rpAir) fx.rpAir.visible = !!st.rp_air;
    if (fx.wpWater) fx.wpWater.visible = !!st.wp_water;
    if (fx.wpO2) fx.wpO2.visible = !!st.wp_o2;
    if (fx.rustNail && st.rust) fx.rustNail.material.color.setHex(0xb45309);
    if (fx.troughWater && pieces.trough) pieces.trough.visible = pieces.trough.visible && !st.air_collect;
    if (fx.pop) fx.pop.visible = !!st.pop;
    if (fx.jet) fx.jet.visible = !!st.jet_flame;
    (fx.sparks || []).forEach(function (s) { s.visible = !!st.sparks; });
    if (fx.tube) {
      var rot = st.upright ? 0 : (st.tilt_up ? 0.28 : (typeof fx.tube.userData.tilt0 === "number" ? fx.tube.userData.tilt0 : -0.28));
      if (st.upright || st.tilt_up || st.tilt_down) fx.tube.rotation.z = rot;
    }
    if (fx.liquid) {
      var colors = { pink: 0xf9a8d4, pale: 0xfce7f3, clear: 0x7dd3fc, blue: 0x2563eb };
      fx.liquid.material.color.setHex(colors[st.liquid] || colors.clear);
      if (st.filtrate === false) fx.liquid.visible = false;
      if (st.filtrate) fx.liquid.visible = true;
    }
    if (fx.drip) fx.drip.visible = !!st.dripping;
    if (fx.metal) fx.metal.visible = !!st.metal;
    (fx.beakerBubbles || []).forEach(function (b) { b.visible = !!st.acid_bubbles; });
    if (fx.h2) fx.h2.visible = !!st.gases;
    if (fx.o2) fx.o2.visible = !!st.gases;
    if (fx.h2gas) fx.h2gas.visible = !!st.gases;
    if (fx.o2gas) fx.o2gas.visible = !!st.gases;
    if (fx.ratio) fx.ratio.visible = !!st.ratio;
    if (fx.filterPaper) fx.filterPaper.visible = !!st.paper;
    if (fx.residue) fx.residue.visible = !!st.residue;
    if (fx.limeLiquid) fx.limeLiquid.material.color.setHex(st.lime_milky ? 0xf8fafc : 0xe0f2fe);
    if (fx.crystals) fx.crystals.visible = !!st.crystals;
    if (fx.dishLiquid) fx.dishLiquid.material.opacity = st.crystals ? 0.25 : 0.55;
    (fx.steam || []).forEach(function (s) { s.visible = !!st.heat; });
  }
  function hoverSlot(name) {
    Object.keys(slots).forEach(function (k) {
      var s = slots[k];
      var hot = k === name;
      if (s.userData.diamond) s.userData.diamond.scale.setScalar(hot ? 1.35 : 1);
    });
  }
  function hitSlot(clientX, clientY) {
    if (!canvas) return "";
    var r = canvas.getBoundingClientRect();
    pointer.x = ((clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    var list = [];
    Object.keys(slots).forEach(function (k) {
      if (slots[k].visible) slots[k].traverse(function (o) { if (o.isMesh) list.push(o); });
    });
    var hits = raycaster.intersectObjects(list, false);
    return hits.length && hits[0].object.userData.slot ? hits[0].object.userData.slot : "";
  }
  function playPour(color) {
    pour.on = true;
    pour.t = 0;
    pour.color = parseColor(color);
    if (fx.pourer) fx.pourer.visible = true;
  }
  function playMix() {
    mix.on = true;
    mix.t = 0;
  }
  function playPlace(id) {
    if (pieces[id]) setPiece(id, true);
  }
  function resetView() {
    yaw = 0.42; pitch = 0.38; dist = 4.4;
    updateCamera();
  }

  global.Lab3D = {
    init: init, resize: resize, setSelecting: setSelecting,
    setPiece: setPiece, applyEffects: applyEffects, hitSlot: hitSlot, hoverSlot: hoverSlot,
    playPour: playPour, playMix: playMix, playPlace: playPlace, resetView: resetView
  };
})(window);
