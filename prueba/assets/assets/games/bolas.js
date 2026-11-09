/* 7.3 · Bolas de golf de la racha: textura (la misma del golf 3D) y miniatura redonda en 3D para menús y minigolf.
   TQBalls.icon(id, px) → canvas con la bola · TQBalls.skin(g, w, h, id) → textura equirectangular. */
(function (root) {
  function ballSkin(g, w, hh, skin) {
    g.fillStyle = '#FBFBFA'; g.fillRect(0, 0, w, hh);
    if (skin === 'futbol') { // 7.3: balón de verdad: 12 pentágonos negros (vértices de un icosaedro) y costuras de los hexágonos
      const V = [[90, 0], [-90, 0]]; for (let k = 0; k < 5; k++) { V.push([26.57, k * 72]); V.push([-26.57, k * 72 + 36]); }
      const P = (lat, lon) => [((lon / 360) % 1 + 1) % 1 * w, (0.5 - lat / 180) * hh];
      g.strokeStyle = 'rgba(34,50,79,.45)'; g.lineWidth = 2.4;
      for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) { const [a1, o1] = V[i], [a2, o2] = V[j]; const ca = Math.sin(a1 * Math.PI / 180) * Math.sin(a2 * Math.PI / 180) + Math.cos(a1 * Math.PI / 180) * Math.cos(a2 * Math.PI / 180) * Math.cos((o1 - o2) * Math.PI / 180); if (ca < 0.42 || ca > 0.5) continue;
        g.beginPath(); for (let t = 0; t <= 1.0001; t += 0.05) { const la = a1 + (a2 - a1) * t; let dO = o2 - o1; if (dO > 180) dO -= 360; if (dO < -180) dO += 360; const [x, y] = P(la, o1 + dO * t); t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.fillStyle = '#22324F'; for (const [lat, lon] of V) { const [cx, cy] = P(lat, lon), sx = Math.min(4, 1 / Math.max(0.25, Math.cos(lat * Math.PI / 180))), r = 28; for (const dx of [-w, 0, w]) { g.beginPath(); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; g.lineTo(cx + dx + r * Math.cos(a) * sx, cy + r * Math.sin(a)); } g.closePath(); g.fill(); } if (Math.abs(lat) > 80) { g.fillRect(0, lat > 0 ? 0 : hh - 16, w, 16); } } }
    else if (skin === 'espana') { g.fillStyle = '#C8102E'; g.fillRect(0, 0, w, hh * 0.25); g.fillRect(0, hh * 0.75, w, hh * 0.25); g.fillStyle = '#FFC400'; g.fillRect(0, hh * 0.25, w, hh * 0.5); }
    else if (skin === 'arcoiris') { ['#FF6B7A', '#FFB347', '#FFE45C', '#7FD98A', '#5FB8FF', '#A98BFF'].forEach((c, i) => { g.fillStyle = c; g.fillRect(0, (i / 6) * hh, w, hh / 6 + 1); }); }
    else if (skin === 'galaxia') { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#1B1F4B'); gr.addColorStop(0.5, '#4B2A86'); gr.addColorStop(1, '#16233F'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${0.4 + Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * hh, Math.random() * 2.2, 0, 7); g.fill(); } }
    else if (skin === 'tiny') { g.fillStyle = '#DFF3FF'; g.fillRect(0, 0, w, hh); g.fillStyle = '#22324F'; [[0.25, 0.47], [0.31, 0.47]].forEach(([u, v]) => { g.beginPath(); g.ellipse(u * w, v * hh, 7, 10, 0, 0, 7); g.fill(); }); g.strokeStyle = '#22324F'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(0.255 * w, 0.58 * hh); g.quadraticCurveTo(0.28 * w, 0.64 * hh, 0.305 * w, 0.58 * hh); g.stroke(); g.fillStyle = 'rgba(255,143,192,.8)'; [[0.22, 0.56], [0.34, 0.56]].forEach(([u, v]) => { g.beginPath(); g.ellipse(u * w, v * hh, 9, 6, 0, 0, 7); g.fill(); }); }
    const dark = skin === 'galaxia' || skin === 'futbol';
    for (let j = 0; j < 16; j++) { const lat = ((j + 0.5) / 16 - 0.5) * Math.PI, nI = Math.max(5, Math.round(34 * Math.cos(lat))), y = (j + 0.5) * (hh / 16), r = 5.6;
      for (let i = 0; i < nI; i++) { const x = ((i + (j % 2) * 0.5) / nI) * w, sx = Math.min(3, 1 / Math.max(0.2, Math.cos(lat)));
        g.save(); g.translate(x, y); g.scale(sx, 1); const gr = g.createRadialGradient(-0.7, -0.7, 0.2, 0, 0, r); gr.addColorStop(0, dark ? 'rgba(0,0,0,.35)' : 'rgba(105,116,134,.55)'); gr.addColorStop(0.7, dark ? 'rgba(0,0,0,.18)' : 'rgba(168,177,190,.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.arc(1.6, 1.6, 1.6, 0, 7); g.fill(); g.restore(); } }
    if (skin === 'clasica') { g.fillStyle = '#FF5A6E'; g.beginPath(); g.arc(w * 0.62, hh / 2, 8, 0, 7); g.fill(); } // 7.3: sin la línea azul (solo un puntito para ver que gira)
  }
  const U0 = { clasica: 0.62, tiny: 0.28 }, cache = {};
  function icon(skin, px) {
    const k = skin + ':' + px; if (cache[k]) return cache[k];
    const T = document.createElement('canvas'); T.width = 512; T.height = 256; const tg = T.getContext('2d'); ballSkin(tg, 512, 256, skin); const td = tg.getImageData(0, 0, 512, 256).data;
    const c = document.createElement('canvas'); c.width = c.height = px; const g = c.getContext('2d'), im = g.createImageData(px, px), r = px / 2, u0 = U0[skin] ?? 0.5;
    const L = [-0.45, -0.6, 0.66], ll = Math.hypot(...L); L[0] /= ll; L[1] /= ll; L[2] /= ll;
    for (let y = 0; y < px; y++) for (let x = 0; x < px; x++) {
      const nx = (x + 0.5 - r) / r, ny = (y + 0.5 - r) / r, d = nx * nx + ny * ny; if (d > 1) continue; const nz = Math.sqrt(1 - d);
      let u = (u0 + Math.atan2(nx, nz) / (2 * Math.PI)) % 1; if (u < 0) u += 1; const v = 0.5 + Math.asin(ny) / Math.PI;
      const ti = (Math.min(255, Math.floor(v * 256)) * 512 + Math.min(511, Math.floor(u * 512))) * 4;
      const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), sh = 0.5 + 0.62 * dif, sp = Math.pow(Math.max(0, 2 * dif * nz - L[2]), 24) * 120;
      const o = (y * px + x) * 4; im.data[o] = Math.min(255, td[ti] * sh + sp); im.data[o + 1] = Math.min(255, td[ti + 1] * sh + sp); im.data[o + 2] = Math.min(255, td[ti + 2] * sh + sp);
      im.data[o + 3] = Math.max(0, Math.min(255, (1 - Math.sqrt(d)) * r * 1.6 * 255)); }
    g.putImageData(im, 0, 0); cache[k] = c; return c;
  }
  root.TQBalls = { skin: ballSkin, icon, list: ['clasica', 'futbol', 'espana', 'arcoiris', 'galaxia', 'tiny'] };
})(window);
