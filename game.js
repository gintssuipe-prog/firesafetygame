(() => {
  const W = 1100;
  const H = 650;
  const ROUND_SECONDS = 60;

  // Grīdu “virsmas” Y (tieši kur stāv kājas)
  const FLOORS_Y = [110, 220, 330, 440, 550]; // 5 stāvi redzami uzreiz
  const PLATFORM_THICK = 20;

  // Lifta ģeometrija
  const ELEVATOR = {
    x: 650,
    w: 140,
    h: 110,
    speed: 55, // px/sec (lēns)
  };

  // Buss apakšā pa kreisi (1. stāvs)
  const BUS = { x: 70, y: 455, w: 220, h: 155 };

  // Aparātu “vietas” (sarkanais kvadrāts) + aparāts sākumā turpat (NOK)
  // y ir uz konkrētā stāva virsmas (FLOORS_Y)
  const SPOTS = [
    // 2. stāvs
    { x: 820, y: FLOORS_Y[1] - 10 },
    { x: 980, y: FLOORS_Y[1] - 10 },

    // 3. stāvs
    { x: 760, y: FLOORS_Y[2] - 10 },
    { x: 940, y: FLOORS_Y[2] - 10 },

    // 4. stāvs
    { x: 800, y: FLOORS_Y[3] - 10 },
    { x: 1000, y: FLOORS_Y[3] - 10 },

    // 5. stāvs
    { x: 860, y: FLOORS_Y[0] - 10 },
    { x: 1020, y: FLOORS_Y[0] - 10 },

    // 1. stāvs (zemāk) – pāris gabali arī te
    { x: 520, y: FLOORS_Y[4] - 10 },
    { x: 900, y: FLOORS_Y[4] - 10 },
  ];

  class Main extends Phaser.Scene {
    constructor() {
      super("main");
      this.score = 0;
      this.timeLeft = ROUND_SECONDS;
      this.carrying = null;
      this.lastInteractAt = 0;
      this.touch = { left:false, right:false, up:false, down:false };
      this.gameOver = false;

      this.elevDir = -1; // -1 uz augšu, +1 uz leju (phaser y ass: uz leju)
      this.prevElevY = null;
      this.onElevatorThisFrame = false;
    }

    create() {
      this.cameras.main.setBackgroundColor("#0b0f14");

      // Fons
      const bg = this.add.graphics();
      bg.fillStyle(0x121a22, 1);
      bg.fillRect(0, 0, W, H);

      // Platformas (stāvi)
      // 1. stāvs: pilna platuma grīda
      // 2–5 stāvs: labā puse (kā tavā shēmā)
      this.platforms = this.physics.add.staticGroup();

      // 1. stāvs (apakšā)
      this.addPlatform(0, FLOORS_Y[4], W, PLATFORM_THICK);

      // pārējie (augšējie) stāvi labajā pusē
      const rightStartX = 520;
      const rightWidth = 640;
      for (let i = 0; i < 4; i++) {
        this.addPlatform(rightStartX, FLOORS_Y[i], rightWidth, PLATFORM_THICK);
      }

      // Buss (balts)
      this.busRect = this.add.rectangle(
        BUS.x + BUS.w/2,
        BUS.y + BUS.h/2,
        BUS.w,
        BUS.h,
        0xf2f4f8
      ).setStrokeStyle(4, 0xc7ced8);

      this.add.text(this.busRect.x, BUS.y + 10, "BUSS", {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#0b0f14"
      }).setOrigin(0.5, 0);

      this.busZone = new Phaser.Geom.Rectangle(BUS.x, BUS.y, BUS.w, BUS.h);

      // Lifts (kustīga platforma)
      this.elevator = this.add.rectangle(ELEVATOR.x, FLOORS_Y[4] - (ELEVATOR.h/2), ELEVATOR.w, ELEVATOR.h, 0x3a3f46)
        .setStrokeStyle(3, 0x1a1f26);

      this.physics.add.existing(this.elevator);
      this.elevator.body.setAllowGravity(false);
      this.elevator.body.setImmovable(true);

      // Aparātu vietas (sarkanie kvadrāti) – VISI ZĪMĒJAS PĀRI aparātiem
      this.slots = [];
      SPOTS.forEach((p) => {
        const base = this.add.rectangle(p.x, p.y, 44, 44, 0xa90f0f)
          .setStrokeStyle(3, 0xff6b6b)
          .setAlpha(0.55)
          .setDepth(40);

        const icon = this.add.text(p.x, p.y, "🧯", { fontSize: "22px" })
          .setOrigin(0.5)
          .setDepth(41);

        this.slots.push({ x: p.x, y: p.y, used: false, base, icon });
      });

      // Aparāti (NOK) – sākumā uz vietām
      this.extinguishers = this.physics.add.group();
      SPOTS.forEach((p) => {
        const ex = this.makeExtinguisher(p.x, p.y, "NOK");
        ex.setData("state", "NOK");     // NOK / OK
        ex.setData("placed", false);    // ielikts pareizi atpakaļ
        ex.setData("held", false);
        this.extinguishers.add(ex);
      });

      // Spēlētājs
      this.player = this.makePlayer(140, FLOORS_Y[4]); // sākums apakšā pie busa
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setSize(28, 54);
      this.player.body.setOffset(-14, -54);

      // Gravitācija (lai krīt, ja “izmetas pa logu”)
      this.physics.world.gravity.y = 900;

      // Kolīzijas
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.extinguishers, this.platforms);

      // Kolīzija ar liftu (un “pārnešana” uz augšu/leju)
      this.physics.add.collider(this.player, this.elevator, () => {
        // ja stāv uz lifta
        if (this.player.body.touching.down && this.elevator.body.touching.up) {
          this.onElevatorThisFrame = true;
        }
      });

      // UI
      this.scoreText = this.add.text(14, 12, "Punkti: 0", this.uiStyle()).setDepth(80);
      this.timerText = this.add.text(14, 48, "Laiks: 60", this.uiStyle()).setDepth(80);
      this.hintText = this.add.text(14, 84, "← → kustība | ↑ paņem | ↓ noliec", this.uiStyle()).setDepth(80);

      // Klaviatūra + mobilās pogas
      this.cursors = this.input.keyboard.createCursorKeys();
      this.createTouchControls();

      // Taimeris
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

      // Lifta sākuma stāvoklis
      this.prevElevY = this.elevator.y;
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

    addPlatform(xLeft, surfaceY, width, thickness) {
      // platformas virsma = surfaceY, bet rectangle centrs ir surfaceY + thickness/2
      const r = this.add.rectangle(xLeft + width/2, surfaceY + thickness/2, width, thickness, 0x0f5f7a)
        .setStrokeStyle(2, 0x0b0f14);
      this.physics.add.existing(r, true);
      this.platforms.add(r);
    }

    makePlayer(x, surfaceY) {
      const c = this.add.container(x, surfaceY);

      const body = this.add.rectangle(0, -31, 32, 46, 0x0b0b0b);
      const stripe1 = this.add.rectangle(0, -23, 32, 8, 0x00ff66);
      const stripe2 = this.add.rectangle(0, -7, 32, 6, 0x00ff66);

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
      c.body.setBounce(0);
      c.body.setCollideWorldBounds(false);
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
          .setDepth(90)
          .setInteractive();
        r.setStrokeStyle(2, 0x2a394a);

        const t = this.add.text(x + btnSize/2, y + btnSize/2, label, {
          fontFamily: "system-ui, Segoe UI, Roboto, Arial",
          fontSize: "20px",
          color: "#e7edf5"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(91);

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
      best.body.enable = false; // rokās = bez fizikas
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

      // noliekam pie kājām
      ex.x = this.player.x + 26;
      ex.y = this.player.y - 10;

      // busā noliekot -> kļūst OK
      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y);
      if (inBus) {
        this.setExtState(ex, "OK");
      }

      // OK + uz slot = punkts + fiksēts
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

    update(time, delta) {
      if (this.gameOver) return;

      // reset lifta “stāv uz lifta” flags
      this.onElevatorThisFrame = false;

      // -------- LIFTS kustība (auto) --------
      const dt = delta / 1000;
      const topY = FLOORS_Y[0] - (ELEVATOR.h / 2);
      const bottomY = FLOORS_Y[4] - (ELEVATOR.h / 2);

      // kustība ar manuālu Y (lai nav jākonfigurē tween)
      let newY = this.elevator.y + (this.elevDir * ELEVATOR.speed * dt);
      if (newY < topY) { newY = topY; this.elevDir = +1; }
      if (newY > bottomY) { newY = bottomY; this.elevDir = -1; }

      // deltaY lifta pārnešanai
      const elevDeltaY = newY - this.elevator.y;

      this.elevator.y = newY;
      this.elevator.body.updateFromGameObject();

      // vizuāli: buss “izceļas” ja esi busā
      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, this.player.x, this.player.y - 10);
      this.busRect.setAlpha(inBus ? 1 : 0.92);

      // -------- Kustība tikai horizontāli --------
      const left  = this.cursors.left.isDown  || this.touch.left;
      const right = this.cursors.right.isDown || this.touch.right;

      const up = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touch.up;
      const down = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.touch.down;

      const speed = 260;
      let vx = 0;
      if (left) vx -= speed;
      if (right) vx += speed;
      this.player.body.setVelocityX(vx);

      // -------- “Paņem/noliec” --------
      const now = time;
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

      // -------- Ja nes aparātu, tas seko pie rokas --------
      if (this.carrying) {
        this.carrying.x = this.player.x + 28;
        this.carrying.y = this.player.y - 30;
      }

      // -------- Lifta “pārnešana” --------
      // Ja stāvi uz lifta, kusties kopā ar to (bez jump)
      // (Arcade engine pats pilnībā neiznes šo, tāpēc piespiežam ar elevDeltaY)
      // Nosacījums: kājas pieskaras kaut kam un spēlētājs atrodas virs lifta zonā
      const playerFeetY = this.player.y;
      const elevatorTopSurface = this.elevator.y - (ELEVATOR.h / 2);

      const onElevatorGeom =
        Math.abs(playerFeetY - elevatorTopSurface) < 6 &&
        Math.abs(this.player.x - this.elevator.x) < (ELEVATOR.w / 2 + 10);

      if (onElevatorGeom && this.player.body.blocked.down) {
        this.player.y += elevDeltaY;
        this.player.body.updateFromGameObject();
      }

      // drošība: neatļaujam izlidot ārpus ekrāna
      this.player.x = Phaser.Math.Clamp(this.player.x, 10, W - 10);
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
