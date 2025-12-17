(() => {
  const W = 1100;
  const H = 650;
  const ROUND_SECONDS = 60;

  const LEVEL = {
    floorY: 520,
    bus: { x: 70, y: 420, w: 220, h: 160 },

    extinguishers: [
      { x: 420, y: 500 }, { x: 520, y: 500 }, { x: 650, y: 500 },
      { x: 780, y: 500 }, { x: 900, y: 500 }, { x: 980, y: 500 }
    ],

    slots: [
      { x: 460, y: 500 }, { x: 580, y: 500 }, { x: 700, y: 500 },
      { x: 820, y: 500 }, { x: 940, y: 500 }
    ],

    walls: [
      { x: 340, y: 360, w: 20, h: 200 },
      { x: 620, y: 360, w: 20, h: 200 },
      { x: 860, y: 360, w: 20, h: 200 },
      { x: 340, y: 300, w: 300, h: 20 },
      { x: 640, y: 260, w: 240, h: 20 },
      { x: 880, y: 300, w: 180, h: 20 }
    ]
  };

  class Main extends Phaser.Scene {
    constructor() {
      super("main");
      this.score = 0;
      this.timeLeft = ROUND_SECONDS;
      this.carrying = null;
      this.lastInteractAt = 0;
      this.touch = { left:false, right:false, up:false, down:false };
      this.gameOver = false;
    }

    create() {
      this.cameras.main.setBackgroundColor("#0b0f14");

      // fons
      const bg = this.add.graphics();
      bg.fillStyle(0x121a22, 1);
      bg.fillRect(0, 0, W, H);

      // grīda
      const floor = this.add.rectangle(W/2, LEVEL.floorY + 40, W, 120, 0x1a2430);
      this.physics.add.existing(floor, true);

      // buss
      this.busRect = this.add.rectangle(
        LEVEL.bus.x + LEVEL.bus.w/2,
        LEVEL.bus.y + LEVEL.bus.h/2,
        LEVEL.bus.w,
        LEVEL.bus.h,
        0xf2f4f8
      ).setStrokeStyle(4, 0xc7ced8);

      this.add.text(this.busRect.x, LEVEL.bus.y + 10, "BUSS", {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#0b0f14"
      }).setOrigin(0.5, 0);

      this.busZone = new Phaser.Geom.Rectangle(LEVEL.bus.x, LEVEL.bus.y, LEVEL.bus.w, LEVEL.bus.h);

      // sienas
      this.walls = this.physics.add.staticGroup();
      LEVEL.walls.forEach(w => {
        const r = this.add.rectangle(w.x + w.w/2, w.y + w.h/2, w.w, w.h, 0x2a394a);
        r.setStrokeStyle(2, 0x0b0f14);
        this.physics.add.existing(r, true);
        this.walls.add(r);
      });

      // sloti (sarkanie kvadrāti)
      this.slots = [];
      LEVEL.slots.forEach(s => {
        const base = this.add.rectangle(s.x, s.y, 44, 44, 0xa90f0f).setStrokeStyle(3, 0xff6b6b);
        const icon = this.add.text(s.x, s.y, "🧯", { fontSize: "22px" }).setOrigin(0.5);
        this.slots.push({ x: s.x, y: s.y, used: false, base, icon });
      });

      // aparāti (NOK)
      this.extinguishers = this.physics.add.group({ allowGravity: false });
      LEVEL.extinguishers.forEach(p => {
        const ex = this.makeExtinguisher(p.x, p.y, "NOK");
        ex.setData("state", "NOK");
        ex.setData("placed", false);
        this.extinguishers.add(ex);
      });

      // spēlētājs
      this.player = this.makePlayer(120, LEVEL.floorY);
      this.physics.add.existing(this.player);
      this.player.body.setAllowGravity(false);
      this.player.body.setSize(28, 54);
      this.player.body.setOffset(-14, -54);
      this.player.body.setCollideWorldBounds(true);

      // kolīzijas
      this.physics.add.collider(this.player, floor);
      this.physics.add.collider(this.player, this.walls);
      this.physics.add.collider(this.extinguishers, floor);

      // UI
      this.scoreText = this.add.text(14, 12, "Punkti: 0", this.uiStyle()).setDepth(50);
      this.timerText = this.add.text(14, 48, "Laiks: 60", this.uiStyle()).setDepth(50);
      this.hintText = this.add.text(14, 84, "← → kustība | ↑ paņem | ↓ noliec", this.uiStyle()).setDepth(50);

      // klaviatūra
      this.cursors = this.input.keyboard.createCursorKeys();

      // mobilās pogas
      this.createTouchControls();

      // taimeris
      this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          if (this.gameOver) return;
          this.timeLeft -= 1;
          this.timerText.setText(`Laiks: ${this.timeLeft}`);
          if (this.timeLeft <= 0) this.endGame();
        }
      });
    }

    uiStyle() {
      return {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#e7edf5",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 10, y: 6 }
      };
    }

    makePlayer(x, y) {
      const c = this.add.container(x, y);

      // melns ķermenis + koši zaļas joslas
      const body = this.add.rectangle(0, -31, 32, 46, 0x0b0b0b);
      const stripe1 = this.add.rectangle(0, -23, 32, 8, 0x00ff66);
      const stripe2 = this.add.rectangle(0, -7, 32, 6, 0x00ff66);

      // galva + blondi mati
      const head = this.add.circle(0, -62, 12, 0xffe2b8);
      const hair = this.add.arc(0, -66, 13, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(-20), true, 0xffd24a);

      c.add([body, stripe1, stripe2, head, hair]);
      return c;
    }

    makeExtinguisher(x, y, label) {
      const c = this.add.container(x, y);

      const shell = this.add.rectangle(0, 0, 28, 44, 0xff4040).setStrokeStyle(2, 0x7a0a0a);
      const badge = this.add.rectangle(0, 8, 28, 18, 0x0b0f14).setAlpha(0.9);
      const txt = this.add.text(0, 8, label, {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "700"
      }).setOrigin(0.5);

      c.add([shell, badge, txt]);

      this.physics.add.existing(c);
      c.body.setAllowGravity(false);
      c.body.setSize(28, 44);
      c.body.setOffset(-14, -22);

      c.setData("txt", txt);
      c.setData("shell", shell);
      c.setData("badge", badge);
      return c;
    }

    setExtState(ext, state) {
      ext.setData("state", state);
      ext.getData("txt").setText(state);

      const shell = ext.getData("shell");
      const badge = ext.getData("badge");
      const txt = ext.getData("txt");

      if (state === "OK") {
        badge.setFillStyle(0x00ff66).setAlpha(0.9);
        txt.setColor("#0b0f14");
        shell.setFillStyle(0xff5a5a);
      } else {
        badge.setFillStyle(0x0b0f14).setAlpha(0.9);
        txt.setColor("#ffffff");
        shell.setFillStyle(0xff4040);
      }
    }

    createTouchControls() {
      const btnSize = 58;
      const pad = 14;

      const mk = (x, y, label) => {
        const r = this.add.rectangle(x + btnSize/2, y + btnSize/2, btnSize, btnSize, 0x111822)
          .setAlpha(0.75)
          .setScrollFactor(0)
          .setDepth(60)
          .setInteractive();
        r.setStrokeStyle(2, 0x2a394a);

        const t = this.add.text(x + btnSize/2, y + btnSize/2, label, {
          fontFamily: "system-ui, Segoe UI, Roboto, Arial",
          fontSize: "20px",
          color: "#e7edf5"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(61);

        return { r, t };
      };

      const baseY = this.scale.height - pad - btnSize;
      const left  = mk(pad, baseY, "◀");
      const right = mk(pad + btnSize + 10, baseY, "▶");
      const up    = mk(this.scale.width - pad - btnSize*2 - 10, baseY, "▲");
      const down  = mk(this.scale.width - pad - btnSize, baseY, "▼");

      const bind = (btn, key) => {
        btn.r.on("pointerdown", () => { this.touch[key] = true; btn.r.setAlpha(1); });
        btn.r.on("pointerup",   () => { this.touch[key] = false; btn.r.setAlpha(0.75); });
        btn.r.on("pointerout",  () => { this.touch[key] = false; btn.r.setAlpha(0.75); });
        btn.r.on("pointercancel", () => { this.touch[key] = false; btn.r.setAlpha(0.75); });
      };

      bind(left, "left");
      bind(right, "right");
      bind(up, "up");
      bind(down, "down");

      this.scale.on("resize", () => this.scene.restart());
    }

    tryPickup() {
      if (this.carrying) return;

      const px = this.player.x;
      const py = this.player.y - 20;

      let best = null;
      let bestD = 1e9;

      this.extinguishers.getChildren().forEach(ex => {
        if (!ex.active) return;
        if (ex.getData("held")) return;
        if (ex.getData("placed")) return;

        const d = Phaser.Math.Distance.Between(px, py, ex.x, ex.y);
        if (d < 55 && d < bestD) { best = ex; bestD = d; }
      });

      if (!best) return;

      best.setData("held", true);
      best.body.enable = false;
      this.carrying = best;
      this.hintText.setText("Nes aparātu: ↓ noliec | Busā noliekot kļūs OK");
    }

    findSlotUnder(x, y) {
      for (const s of this.slots) {
        const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
        if (d < 28) return s;
      }
      return null;
    }

    tryDrop() {
      if (!this.carrying) return;

      const ex = this.carrying;
      ex.setData("held", false);
      ex.body.enable = true;

      ex.x = this.player.x + 26;
      ex.y = LEVEL.floorY - 12;

      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y);
      if (inBus) {
        this.setExtState(ex, "OK");
      }

      if (ex.getData("state") === "OK" && !ex.getData("placed")) {
        const slot = this.findSlotUnder(ex.x, ex.y);
        if (slot) {
          ex.setData("placed", true);
          ex.body.enable = false;
          ex.x = slot.x;
          ex.y = slot.y;

          this.score += 1;
          this.scoreText.setText(`Punkti: ${this.score}`);
        }
      }

      this.carrying = null;
      this.hintText.setText("← → kustība | ↑ paņem | ↓ noliec");
    }

    endGame() {
      this.gameOver = true;
      this.player.body.setVelocity(0, 0);

      this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.6).setDepth(200);
      this.add.text(W/2, H/2 - 60, "Laiks beidzies!", {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "42px",
        color: "#ffffff"
      }).setOrigin(0.5).setDepth(201);

      this.add.text(W/2, H/2 - 10, `Tavi punkti: ${this.score}`, {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "26px",
        color: "#e7edf5"
      }).setOrigin(0.5).setDepth(201);

      const name = (prompt("Ievadi savu vārdu (tops saglabājas šajā pārlūkā):", "") || "").trim().slice(0, 24) || "Anonīms";
      this.saveScore(name, this.score);

      const table = this.getScores().slice(0, 10);
      const lines = table.map((r, i) => `${String(i+1).padStart(2," ")}. ${r.name} — ${r.score}`).join("\n");

      this.add.text(W/2, H/2 + 80, `TOP 10 (lokāli)\n${lines}\n\nPārlādē lapu, lai spēlētu vēlreiz.`, {
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: "16px",
        color: "#e7edf5",
        align: "center"
      }).setOrigin(0.5).setDepth(201);
    }

    getScores() {
      try {
        const raw = localStorage.getItem("aplink_firegame_scores");
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    saveScore(name, score) {
      const rows = this.getScores();
      rows.push({ name, score, at: Date.now() });
      rows.sort((a, b) => b.score - a.score || a.at - b.at);
      localStorage.setItem("aplink_firegame_scores", JSON.stringify(rows.slice(0, 50)));
    }

    update() {
      if (this.gameOver) return;

      const left  = this.cursors.left.isDown  || this.touch.left;
      const right = this.cursors.right.isDown || this.touch.right;

      const up = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touch.up;
      const down = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.touch.down;

      const speed = 240;
      let vx = 0;
      if (left) vx -= speed;
      if (right) vx += speed;

      this.player.body.setVelocity(vx, 0);
      this.player.y = LEVEL.floorY;

      if (this.carrying) {
        this.carrying.x = this.player.x + 28;
        this.carrying.y = this.player.y - 30;
      }

      const now = this.time.now;
      if (up && now - this.lastInteractAt > 140) {
        this.lastInteractAt = now;
        this.tryPickup();
        this.touch.up = false;
      }
      if (down && now - this.lastInteractAt > 140) {
        this.lastInteractAt = now;
        this.tryDrop();
        this.touch.down = false;
      }

      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, this.player.x, this.player.y - 10);
      this.busRect.setAlpha(inBus ? 1 : 0.92);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [Main],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
})();

