class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");

    this.readyCount = 0;
    this.carrying = null;
    this.lastInteractAt = 0;

    this.touch = { left: false, right: false, up: false, down: false };
    this.prevElevY = 0;

    this.startTimeMs = 0;
    this.finished = false;
  }

  create() {
    const W = 1100;

    // 5 stāvu virsmas (kur stāv kājas)
    this.FLOORS_Y = [110, 220, 330, 440, 550];
    this.THICK = 20;

    // Drop “snap” režģis + pret uzkraušanu vienā punktā
    this.DROP_GRID = 26;
    this.DROP_MIN_DIST = 20;
    this.DROP_SEARCH_STEPS = 14;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

    // ======= DEPTH (slāņi) =======
    this.DEPTH = {
      markers: 1,
      platforms: 10,
      elevator: 12,
      bus: 15,
      ext: 60,
      player: 100,
      carry: 110,
      ui: 200,
      touch: 220,
      overlay: 400
    };

    // ===== LIFTS =====
    // (šaurāks lifts, kā jau iepriekš)
    this.elevatorWidth = 80;
    this.elevatorX = 650;

    // Šahtas caurums grīdās: mazliet platāks par liftu, lai nav “ķeršanās”
    this.shaftGapW = this.elevatorWidth + 30;

    // Lifts brauc no 1.stāva (zemākā) līdz mazliet virs 5.stāva
    const topOvershoot = 30;
    this.elevatorMinSurfaceY = this.FLOORS_Y[0] - topOvershoot;

    // Apakšā: NEKĀDA pagraba. Tieši līdz 1.stāva virsmai.
    this.elevatorMaxSurfaceY = this.FLOORS_Y[4];

    this.elevatorSpeed = 60;
    this.elevatorDir = -1;

    // ===== Platformas (statiski stāvi) =====
    this.platforms = this.physics.add.staticGroup();

    // 1. stāvs pilnā platumā (bez cauruma, lai nekrīt zem grīdas)
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // 2–5 stāvs labajā pusē, bet ar ŠAHTAS CAURUMU
    const rightStartX = 520;
    const rightEndX = W; // lai neiet ārā no ekrāna
    const holeL = this.elevatorX - this.shaftGapW / 2;
    const holeR = this.elevatorX + this.shaftGapW / 2;

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      // Kreisais segments (labās puses platformas kreisā daļa līdz caurumam)
      const seg1L = rightStartX;
      const seg1R = Math.min(holeL, rightEndX);

      // Labais segments (no cauruma līdz platformas beigām)
      const seg2L = Math.max(holeR, rightStartX);
      const seg2R = rightEndX;

      if (seg1R - seg1L > 18) this.addPlatform(seg1L, y, seg1R - seg1L, this.THICK);
      if (seg2R - seg2L > 18) this.addPlatform(seg2L, y, seg2R - seg2L, this.THICK);
    }

    // ===== Buss (vizuāli + zona) =====
    this.BUS = { x: 70, y: 455, w: 220, h: 155 };

    const busRect = this.add.rectangle(
      this.BUS.x + this.BUS.w / 2,
      this.BUS.y + this.BUS.h / 2,
      this.BUS.w,
      this.BUS.h,
      0xf2f4f8
    ).setStrokeStyle(4, 0xc7ced8);
    busRect.setDepth(this.DEPTH.bus);

    this.add.text(busRect.x, this.BUS.y + 10, "BUSS", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#0b0f14",
      fontStyle: "bold"
    }).setOrigin(0.5, 0).setDepth(this.DEPTH.bus + 1);

    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // ===== Lifts (kustīga platforma) =====
    const startCenterY = this.elevatorMaxSurfaceY + this.THICK / 2;

    this.elevator = this.add.rectangle(
      this.elevatorX,
      startCenterY,
      this.elevatorWidth,
      this.THICK,
      0x555555
    ).setStrokeStyle(2, 0x1a1f26);
    this.elevator.setDepth(this.DEPTH.elevator);

    this.physics.add.existing(this.elevator);
    this.elevator.body.setAllowGravity(false);
    this.elevator.body.setImmovable(true);
    this.prevElevY = this.elevator.y;

    // ===== Spēlētājs (vienmēr priekšā) =====
    this.player = this.makePlayer(140, this.FLOORS_Y[4]);
    this.player.setDepth(this.DEPTH.player);

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(-14, -54);

    // Kolīzijas
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // ===== Ugunsdzēšamie aparāti + sloti =====
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const SPOTS = [
      { floor: 1, x: 820 }, { floor: 1, x: 980 },
      { floor: 2, x: 760 }, { floor: 2, x: 940 },
      { floor: 3, x: 800 }, { floor: 3, x: 1000 },
      { floor: 0, x: 860 }, { floor: 0, x: 1020 },
      { floor: 4, x: 520 }, { floor: 4, x: 900 }
    ];

    const EXT_H = 44;
    const EXT_FOOT_OFFSET = EXT_H / 2;

    SPOTS.forEach((s) => {
      const surfaceY = this.FLOORS_Y[s.floor];
      const y = surfaceY - EXT_FOOT_OFFSET;

      // Markeri fonā (zem visa)
      const mark = this.add.rectangle(s.x, y, 46, 46, 0xa90f0f)
        .setStrokeStyle(3, 0xff6b6b)
        .setAlpha(0.50)
        .setDepth(this.DEPTH.markers);

      const icon = this.add.text(s.x, y, "🧯", { fontSize: "22px" })
        .setOrigin(0.5)
        .setDepth(this.DEPTH.markers + 1);

      const slot = { x: s.x, y, used: false, mark, icon };
      this.slots.push(slot);

      const ex = this.makeExtinguisher(s.x, y, "NOK");
      ex.setDepth(this.DEPTH.ext);
      ex.setData("state", "NOK");
      ex.setData("held", false);
      ex.setData("slotRef", null); // ja nolikts pareizajā vietā, šeit glabā slotu

      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    this.totalCount = this.slots.length; // 10

    // Kontroles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.createTouchControls();

    // UI: Gatavs X/10 + Taimeris
    this.readyText = this.add.text(14, 12, `Gatavs: 0/${this.totalCount}`, this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.timeText = this.add.text(14, 48, "Laiks: 00:00", this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.hintText = this.add.text(14, 84, "← → kustība | ↑ paņemt | ↓ nolikt", this.uiStyle())
      .setDepth(this.DEPTH.ui);

    // Start time
    this.startTimeMs = this.time.now;
  }

  // ---------------- UI ----------------
  uiStyle() {
    return {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    };
  }

  // ---------------- Platformas ----------------
  addPlatform(xLeft, surfaceY, width, thickness) {
    const r = this.add.rectangle(
      xLeft + width / 2,
      surfaceY + thickness / 2,
      width,
      thickness,
      0x0f5f7a
    ).setStrokeStyle(2, 0x0b0f14);

    r.setDepth(this.DEPTH.platforms);
    this.physics.add.existing(r, true);
    this.platforms.add(r);
  }

  // ---------------- Spēlētājs ----------------
  makePlayer(x, surfaceY) {
    const c = this.add.container(x, surfaceY);

    const body = this.add.rectangle(0, -31, 32, 46, 0x0b0b0b);
    const stripe1 = this.add.rectangle(0, -23, 32, 8, 0x00ff66);
    const stripe2 = this.add.rectangle(0, -7, 32, 6, 0x00ff66);

    const head = this.add.circle(0, -62, 12, 0xffe2b8);
    const hair = this.add.arc(
      0, -66, 13,
      Phaser.Math.DegToRad(200),
      Phaser.Math.DegToRad(-20),
      true,
      0xffd24a
    );

    c.add([body, stripe1, stripe2, head, hair]);
    return c;
  }

  // ---------------- Ugunsdzēšamais aparāts ----------------
  makeExtinguisher(x, y, label) {
    const c = this.add.container(x, y);

    const shell = this.add.rectangle(0, 0, 28, 44, 0xff4040).setStrokeStyle(2, 0x7a0a0a);
    const badge = this.add.rectangle(0, 8, 28, 18, 0x0b0f14).setAlpha(0.9);

    const txt = this.add.text(0, 8, label, {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const okMark = this.add.text(0, -20, "✓", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#00ff66",
      fontStyle: "bold"
    }).setOrigin(0.5);
    okMark.setVisible(false);

    c.add([shell, badge, txt, okMark]);

    this.physics.add.existing(c);
    c.body.setBounce(0);
    c.body.setSize(28, 44);
    c.body.setOffset(-14, -22);

    c.setData("txt", txt);
    c.setData("badge", badge);
    c.setData("okMark", okMark);

    return c;
  }

  setExtState(ext, state) {
    ext.setData("state", state);
    ext.getData("txt").setText(state);

    const badge = ext.getData("badge");
    const txt = ext.getData("txt");
    const okMark = ext.getData("okMark");

    if (state === "OK") {
      badge.setFillStyle(0x00ff66).setAlpha(0.9);
      txt.setColor("#0b0f14");
      okMark.setVisible(true);
    } else {
      badge.setFillStyle(0x0b0f14).setAlpha(0.9);
      txt.setColor("#ffffff");
      okMark.setVisible(false);
    }
  }

  // ---------------- Telefonam bultas ----------------
  createTouchControls() {
    const btnSize = 58;
    const pad = 14;

    const mk = (x, y, label) => {
      const r = this.add.rectangle(x + btnSize / 2, y + btnSize / 2, btnSize, btnSize, 0x111822)
        .setAlpha(0.75).setScrollFactor(0).setDepth(this.DEPTH.touch).setInteractive();
      r.setStrokeStyle(2, 0x2a394a);

      this.add.text(x + btnSize / 2, y + btnSize / 2, label, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#e7edf5"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(this.DEPTH.touch + 1);

      return r;
    };

    const baseY = this.scale.height - pad - btnSize;
    const leftBtn = mk(pad, baseY, "◀");
    const rightBtn = mk(pad + btnSize + 10, baseY, "▶");
    const upBtn = mk(this.scale.width - pad - btnSize * 2 - 10, baseY, "▲");
    const downBtn = mk(this.scale.width - pad - btnSize, baseY, "▼");

    const bind = (btn, key) => {
      btn.on("pointerdown", () => { this.touch[key] = true; btn.setAlpha(1); });
      btn.on("pointerup", () => { this.touch[key] = false; btn.setAlpha(0.75); });
      btn.on("pointerout", () => { this.touch[key] = false; btn.setAlpha(0.75); });
      btn.on("pointercancel", () => { this.touch[key] = false; btn.setAlpha(0.75); });
    };

    bind(leftBtn, "left");
    bind(rightBtn, "right");
    bind(upBtn, "up");
    bind(downBtn, "down");

    this.scale.on("resize", () => this.scene.restart());
  }

  // ---------------- Drop helpers ----------------
  snapToGrid(x) {
    return Math.round(x / this.DROP_GRID) * this.DROP_GRID;
  }

  anyExtinguisherNear(x, y, ignoreExt) {
    const arr = this.extinguishers.getChildren();
    for (const ex of arr) {
      if (!ex.active) continue;
      if (ex === ignoreExt) continue;
      if (ex.getData("held")) continue;

      const d = Phaser.Math.Distance.Between(x, y, ex.x, ex.y);
      if (d < this.DROP_MIN_DIST) return true;
    }
    return false;
  }

  findFreeDropPos(desiredX, desiredY, ex) {
    const baseX = this.snapToGrid(desiredX);
    const y = desiredY;

    for (let i = 0; i <= this.DROP_SEARCH_STEPS; i++) {
      const dx = i === 0 ? 0 : (i * this.DROP_GRID);
      const candidates = i === 0 ? [baseX] : [baseX + dx, baseX - dx];

      for (const x of candidates) {
        const xx = Phaser.Math.Clamp(x, 20, 1100 - 20);
        if (!this.anyExtinguisherNear(xx, y, ex)) return { x: xx, y };
      }
    }
    return { x: Phaser.Math.Clamp(baseX, 20, 1100 - 20), y };
  }

  hopTo(ex, x, y) {
    ex.x = x;
    ex.y = y - 10;
    this.tweens.add({ targets: ex, y, duration: 140, ease: "Quad.easeOut" });
  }

  findSlotUnder(x, y) {
    for (const s of this.slots) {
      const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
      if (d < 28) return s;
    }
    return null;
  }

  // ---------------- Paņem / noliec ----------------
  tryPickup() {
    if (this.finished) return;
    if (this.carrying) return;

    const px = this.player.x;
    const py = this.player.y - 20;

    let best = null;
    let bestD = 1e9;

    this.extinguishers.getChildren().forEach(ex => {
      if (!ex.active) return;
      if (ex.getData("held")) return;

      const d = Phaser.Math.Distance.Between(px, py, ex.x, ex.y);
      if (d < 55 && d < bestD) { best = ex; bestD = d; }
    });

    if (!best) return;

    // Ja aparāts bija pareizajā vietā, paņemot atbrīvojam slotu un samazinām Gatavs
    const slotRef = best.getData("slotRef");
    if (slotRef) {
      slotRef.used = false;
      slotRef.mark.setAlpha(0.50);
      slotRef.icon.setAlpha(1);

      best.setData("slotRef", null);

      this.readyCount = Math.max(0, this.readyCount - 1);
      this.readyText.setText(`Gatavs: ${this.readyCount}/${this.totalCount}`);
    }

    best.setData("held", true);
    best.body.enable = false;
    best.setDepth(this.DEPTH.carry);

    this.carrying = best;
  }

  tryDrop() {
    if (this.finished) return;
    if (!this.carrying) return;

    const ex = this.carrying;

    ex.setData("held", false);
    ex.body.enable = true;
    ex.setDepth(this.DEPTH.ext);

    const desiredX = this.player.x + 26;
    const desiredY = this.player.y - (44 / 2);

    let pos = this.findFreeDropPos(desiredX, desiredY, ex);

    // BUSS: noliekot busā → kļūst OK un “paslīd” dziļāk busā
    const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, pos.x, pos.y);
    if (inBus) {
      this.setExtState(ex, "OK");
      pos = this.findFreeDropPos(pos.x + this.DROP_GRID * 2, pos.y, ex);
      this.hopTo(ex, pos.x, pos.y);
      this.carrying = null;
      return;
    }

    // OK + uz slot marķiera → Gatavs +1, bet tikai ja slots brīvs
    if (ex.getData("state") === "OK") {
      const slot = this.findSlotUnder(pos.x, pos.y);

      if (slot && slot.used) {
        // Aizņemts: aparāts izslīd ārā (bez progresa)
        const slide = this.findFreeDropPos(pos.x + this.DROP_GRID * 2, pos.y, ex);
        this.hopTo(ex, slide.x, slide.y);
        this.carrying = null;
        return;
      }

      if (slot && !slot.used) {
        // Fiksējam vietā
        slot.used = true;
        slot.mark.setAlpha(0.25);
        slot.icon.setAlpha(0.35);

        ex.body.enable = false;
        ex.x = slot.x;
        ex.y = slot.y;
        ex.setData("slotRef", slot);

        this.readyCount += 1;
        this.readyText.setText(`Gatavs: ${this.readyCount}/${this.totalCount}`);

        // Win condition
        if (this.readyCount >= this.totalCount) {
          this.finishGame();
        }

        this.carrying = null;
        return;
      }
    }

    // Parasts nolikums
    this.hopTo(ex, pos.x, pos.y);
    this.carrying = null;
  }

  // ---------------- Finish screen ----------------
  finishGame() {
    if (this.finished) return;
    this.finished = true;

    const elapsedMs = this.time.now - this.startTimeMs;
    const totalSec = Math.floor(elapsedMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;

    // Apturam kustību / fiziku
    this.player.body.setVelocity(0, 0);

    // Overlay
    const w = 1100, h = 650;
    const bg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.72).setDepth(this.DEPTH.overlay);

    this.add.text(w / 2, 250, "Līmenis pabeigts!", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(this.DEPTH.overlay + 1);

    this.add.text(w / 2, 320, `Jūsu laiks: ${mm} min ${ss} sek`, {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#e7edf5"
    }).setOrigin(0.5).setDepth(this.DEPTH.overlay + 1);

    const btn = this.add.rectangle(w / 2, 410, 260, 60, 0x007755)
      .setDepth(this.DEPTH.overlay + 1)
      .setInteractive({ useHandCursor: true });

    this.add.text(w / 2, 410, "Atpakaļ uz Menu", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(this.DEPTH.overlay + 2);

    btn.on("pointerdown", () => {
      // ja tev ir MainMenu aina projektā:
      this.scene.start("MainMenu");
      // ja šobrīd testē tikai Stage1, vari uz laiku nomainīt uz:
      // this.scene.restart();
    });
  }

  // ---------------- Update ----------------
  update(time, delta) {
    // Taimeris
    if (!this.finished) {
      const elapsedMs = time - this.startTimeMs;
      const totalSec = Math.floor(elapsedMs / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      this.timeText.setText(`Laiks: ${mm}:${ss}`);
    }

    // Lifts kustas arī uz leju (šahtas dēļ netraucēs grīdas)
    const dt = delta / 1000;
    const minCenterY = this.elevatorMinSurfaceY + this.THICK / 2;
    const maxCenterY = this.elevatorMaxSurfaceY + this.THICK / 2;

    this.elevator.y += this.elevatorSpeed * dt * this.elevatorDir;

    if (this.elevator.y <= minCenterY) {
      this.elevator.y = minCenterY;
      this.elevatorDir = 1;
    }
    if (this.elevator.y >= maxCenterY) {
      this.elevator.y = maxCenterY;
      this.elevatorDir = -1;
    }

    this.elevator.body.updateFromGameObject();

    const elevDeltaY = this.elevator.y - this.prevElevY;
    this.prevElevY = this.elevator.y;

    // Kustība
    if (!this.finished) {
      const left = this.cursors.left.isDown || this.touch.left;
      const right = this.cursors.right.isDown || this.touch.right;
      const speed = 260;

      if (left) this.player.body.setVelocityX(-speed);
      else if (right) this.player.body.setVelocityX(speed);
      else this.player.body.setVelocityX(0);
    } else {
      this.player.body.setVelocityX(0);
    }

    // Paņem/noliec
    const upJust = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touch.up;
    const downJust = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.touch.down;

    if (upJust && (time - this.lastInteractAt > 140)) {
      this.lastInteractAt = time;
      this.tryPickup();
      this.touch.up = false;
    }

    if (downJust && (time - this.lastInteractAt > 140)) {
      this.lastInteractAt = time;
      this.tryDrop();
      this.touch.down = false;
    }

    // Ja tur rokā — seko spēlētājam un vienmēr priekšā
    if (this.carrying) {
      this.carrying.x = this.player.x + 28;
      this.carrying.y = this.player.y - 30;
      this.carrying.setDepth(this.DEPTH.carry);
    }

    // “Brauc līdzi” liftam
    const playerOnElevator =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (playerOnElevator) {
      this.player.y += elevDeltaY;
      if (this.carrying) this.carrying.y += elevDeltaY;
    }

    // Drošība: nekad neļaujam aiziet zem 1. stāva “loģiskās zonas”
    if (this.player.y > this.FLOORS_Y[4] + 90) {
      this.player.y = this.FLOORS_Y[4] + 90;
      this.player.body.setVelocityY(0);
    }
  }
}
