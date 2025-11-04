export const openOfflineGame = (username: string) => {
  const gameHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Food FPS - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0f1a;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: white;
    }
    .container { text-align: center; }
    canvas { border: 2px solid #1b3444; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
    .hud {
      position: fixed;
      background: rgba(10, 15, 26, 0.8);
      backdrop-filter: blur(8px);
      border: 1px solid #1b3444;
      border-radius: 8px;
      padding: 16px;
    }
    .top-left { top: 16px; left: 16px; }
    .top-right { top: 16px; right: 16px; min-width: 180px; }
    .health-bar {
      width: 100%;
      height: 12px;
      background: #1b3444;
      border-radius: 6px;
      overflow: hidden;
      margin-top: 8px;
    }
    .health-fill {
      height: 100%;
      background: linear-gradient(90deg, #ef4444, #22c55e);
      transition: width 0.3s;
    }
    .hotbar {
      position: fixed;
      bottom: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      background: rgba(10, 15, 26, 0.9);
      backdrop-filter: blur(8px);
      border: 1px solid #1b3444;
      border-radius: 8px;
      padding: 8px;
    }
    .weapon-slot {
      width: 64px;
      height: 64px;
      background: #1b3444;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .weapon-slot:hover { background: #2b4454; }
    .weapon-slot.active { background: #3b82f6; box-shadow: 0 0 12px #3b82f6; }
  </style>
</head>
<body>
  <div class="hud top-left">
    <div style="font-weight: bold; font-size: 18px; margin-bottom: 8px;">Food FPS - Offline</div>
    <div style="font-size: 12px; opacity: 0.7;">Player: ${username}</div>
    <div style="margin-top: 8px; font-size: 12px; line-height: 1.6;">
      <div><span style="color: #3b82f6; font-family: monospace;">WASD</span> move</div>
      <div><span style="color: #3b82f6; font-family: monospace;">Mouse</span> aim</div>
      <div><span style="color: #3b82f6; font-family: monospace;">LMB</span> shoot</div>
      <div><span style="color: #3b82f6; font-family: monospace;">R</span> reload</div>
    </div>
  </div>
  
  <div class="hud top-right">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
      <span style="font-size: 12px; opacity: 0.7;">Health</span>
      <span id="health" style="font-weight: bold; font-size: 18px;">100</span>
    </div>
    <div class="health-bar">
      <div id="healthBar" class="health-fill" style="width: 100%;"></div>
    </div>
    
    <div style="margin-top: 16px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 12px; opacity: 0.7;">Weapon</span>
      <span id="weaponName" style="font-weight: bold; color: #FFB84D;">Pistol</span>
    </div>
    
    <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 12px; opacity: 0.7;">Ammo</span>
      <span id="ammo" style="font-weight: bold; font-size: 18px;">10/10</span>
    </div>
    
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #1b3444;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 12px; opacity: 0.7;">Score</span>
        <span id="score" style="font-weight: bold; font-size: 18px; color: #3b82f6;">0</span>
      </div>
    </div>
  </div>

  <div class="hotbar" id="hotbar"></div>
  
  <canvas id="game" width="960" height="640"></canvas>

  <script>
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const W = 960, H = 640;

    const WEAPONS = {
      pistol: { name: "Pistol", fireRate: 0.18, damage: 40, ammo: 10, maxAmmo: 10, spread: 10, speed: 420, color: "#FFB84D", melee: false },
      shotgun: { name: "Shotgun", fireRate: 0.5, damage: 25, ammo: 6, maxAmmo: 6, spread: 40, speed: 380, color: "#FF6B6B", melee: false },
    };

    let player = {
      x: W/2, y: H/2, r: 14, speed: 180, angle: 0,
      weapon: "pistol", lastShot: -1, hp: 100, maxHp: 100, score: 0,
      ammo: 10, maxAmmo: 10
    };

    let keys = {}, mouse = { x: W/2, y: H/2, down: false };
    let bullets = [], enemyBullets = [], enemies = [], pickups = [], particles = [];
    let time = 0, lastSpawn = 0;

    const rand = (min, max) => Math.random() * (max - min) + min;

    const spawnEnemy = () => {
      const side = Math.floor(rand(0, 4));
      let x, y;
      if (side === 0) { x = rand(-40, W + 40); y = -30; }
      else if (side === 1) { x = rand(-40, W + 40); y = H + 30; }
      else if (side === 2) { x = -30; y = rand(-40, H + 40); }
      else { x = W + 30; y = rand(-40, H + 40); }
      enemies.push({ x, y, r: 16, speed: rand(40, 80), hp: 60, stun: 0, lastShot: -1 });
    };

    const spawnPickup = () => {
      pickups.push({ x: rand(80, W - 80), y: rand(80, H - 80), r: 10, amt: 3, ttl: 20 });
    };

    const spawnParticles = (x, y, color, count = 10) => {
      for (let i = 0; i < count; i++) {
        particles.push({ x, y, vx: rand(-120, 120), vy: rand(-120, 120), life: rand(0.3, 0.9), color });
      }
    };

    const updateHUD = () => {
      document.getElementById('health').textContent = player.hp;
      document.getElementById('healthBar').style.width = (player.hp / player.maxHp * 100) + '%';
      document.getElementById('ammo').textContent = player.ammo + '/' + player.maxAmmo;
      document.getElementById('score').textContent = player.score;
      document.getElementById('weaponName').textContent = WEAPONS[player.weapon].name;
      document.getElementById('weaponName').style.color = WEAPONS[player.weapon].color;
    };

    const shoot = (t) => {
      const w = WEAPONS[player.weapon];
      if (!mouse.down || t - player.lastShot < w.fireRate || player.ammo <= 0) return;
      
      player.lastShot = t;
      player.ammo--;
      updateHUD();

      const bulletsToFire = player.weapon === "shotgun" ? 5 : 1;
      for (let i = 0; i < bulletsToFire; i++) {
        const spread = w.spread * (Math.PI / 180);
        const angle = player.angle + rand(-spread, spread);
        bullets.push({
          x: player.x + Math.cos(player.angle) * player.r * 1.6,
          y: player.y + Math.sin(player.angle) * player.r * 1.6,
          vx: Math.cos(angle) * w.speed,
          vy: Math.sin(angle) * w.speed,
          r: 8, life: 2.5, dmg: w.damage, color: w.color
        });
      }
      spawnParticles(player.x + Math.cos(player.angle) * player.r * 1.6, 
                      player.y + Math.sin(player.angle) * player.r * 1.6, w.color, 6);
    };

    window.addEventListener('keydown', e => {
      keys[e.key.toLowerCase()] = true;
      if (e.key.toLowerCase() === 'r' && player.ammo < player.maxAmmo) {
        player.ammo = player.maxAmmo;
        updateHUD();
      }
    });
    window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * (W / rect.width);
      mouse.y = (e.clientY - rect.top) * (H / rect.height);
    });
    canvas.addEventListener('mousedown', () => mouse.down = true);
    canvas.addEventListener('mouseup', () => mouse.down = false);

    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      time += dt;

      player.angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

      let dx = 0, dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        player.x = Math.max(20, Math.min(W - 20, player.x + (dx / len) * player.speed * dt));
        player.y = Math.max(20, Math.min(H - 20, player.y + (dy / len) * player.speed * dt));
      }

      shoot(time);

      // Update bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0 || b.x < -50 || b.x > W + 50 || b.y < -50 || b.y > H + 50) {
          bullets.splice(i, 1);
          continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          const dx = b.x - e.x, dy = b.y - e.y;
          if (dx * dx + dy * dy <= (b.r + e.r) * (b.r + e.r)) {
            e.hp -= b.dmg;
            e.stun = 0.6;
            spawnParticles(b.x, b.y, "#FFF3D6", 8);
            if (e.hp <= 0) {
              spawnParticles(e.x, e.y, "#FF6B6B", 16);
              player.score += 10;
              updateHUD();
              if (Math.random() < 0.35) pickups.push({ x: e.x, y: e.y, r: 10, amt: 2, ttl: 18 });
              enemies.splice(j, 1);
            }
            bullets.splice(i, 1);
            break;
          }
        }
      }

      // Update enemies
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (e.stun > 0) {
          e.stun = Math.max(0, e.stun - dt);
          continue;
        }
        const vx = player.x - e.x, vy = player.y - e.y;
        const d = Math.hypot(vx, vy);
        if (d > 0) {
          e.x += (vx / d) * e.speed * dt;
          e.y += (vy / d) * e.speed * dt;
        }

        if (d < 350 && time - e.lastShot >= 3.5) {
          e.lastShot = time;
          const ang = Math.atan2(player.y - e.y, player.x - e.x);
          enemyBullets.push({
            x: e.x, y: e.y,
            vx: Math.cos(ang) * 200,
            vy: Math.sin(ang) * 200,
            r: 6, life: 3, dmg: 10
          });
        }
      }

      // Update enemy bullets
      for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const b = enemyBullets[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0) {
          enemyBullets.splice(i, 1);
          continue;
        }

        const dx = b.x - player.x, dy = b.y - player.y;
        if (dx * dx + dy * dy <= (b.r + player.r) * (b.r + player.r)) {
          player.hp -= b.dmg;
          updateHUD();
          spawnParticles(b.x, b.y, "#FF6B6B", 8);
          enemyBullets.splice(i, 1);
        }
      }

      // Update pickups
      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.ttl -= dt;
        if (p.ttl <= 0) {
          pickups.splice(i, 1);
          continue;
        }
        if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 <= (player.r + p.r) ** 2) {
          player.ammo = Math.min(player.maxAmmo, player.ammo + p.amt);
          updateHUD();
          spawnParticles(p.x, p.y, "#A6FFB3", 10);
          pickups.splice(i, 1);
        }
      }

      // Update particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.life -= dt;
        if (p.life <= 0) particles.splice(i, 1);
      }

      // Spawn enemies
      if (time - lastSpawn > 2.0) {
        lastSpawn = time;
        spawnEnemy();
      }

      // Game over
      if (player.hp <= 0) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#fff";
        ctx.font = "48px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W / 2, H / 2 - 20);
        ctx.font = "24px sans-serif";
        ctx.fillText("Score: " + player.score, W / 2, H / 2 + 30);
        return;
      }

      // Draw
      ctx.clearRect(0, 0, W, H);

      // Grid
      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "#1b3444";
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.restore();

      // Draw pickups
      pickups.forEach(p => {
        ctx.save();
        ctx.fillStyle = "#A6FFB3";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Draw bullets
      bullets.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      enemyBullets.forEach(b => {
        ctx.fillStyle = "#FF4444";
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw enemies
      enemies.forEach(e => {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.fillStyle = "#FF6B6B";
        ctx.beginPath();
        ctx.arc(0, 0, e.r, 0, Math.PI * 2);
        ctx.fill();
        const hpW = 28;
        ctx.fillStyle = "#333";
        ctx.fillRect(-hpW / 2, -e.r - 12, hpW, 6);
        ctx.fillStyle = "#FF6B6B";
        ctx.fillRect(-hpW / 2, -e.r - 12, hpW * Math.max(0, e.hp / 60), 6);
        ctx.restore();
      });

      // Draw player
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      ctx.fillStyle = "#FFF3D6";
      ctx.beginPath();
      ctx.arc(0, 0, player.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b2b2b";
      ctx.beginPath();
      ctx.arc(player.r * 0.45, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WEAPONS[player.weapon].color;
      ctx.fillRect(player.r - 2, -6, 18, 12);
      ctx.restore();

      // Draw particles
      particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / 0.9);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.restore();
      });

      // Draw crosshair
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(mouse.x - 8, mouse.y);
      ctx.lineTo(mouse.x + 8, mouse.y);
      ctx.moveTo(mouse.x, mouse.y - 8);
      ctx.lineTo(mouse.x, mouse.y + 8);
      ctx.stroke();
      ctx.restore();

      requestAnimationFrame(loop);
    };

    for (let i = 0; i < 3; i++) spawnEnemy();
    for (let i = 0; i < 2; i++) spawnPickup();
    requestAnimationFrame(loop);
  </script>
</body>
</html>
  `;

  const blob = new Blob([gameHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const newWindow = window.open(url, '_blank');
  
  if (newWindow) {
    newWindow.document.title = 'Food FPS - Offline Mode';
  }
};
