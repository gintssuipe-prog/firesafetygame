class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");

    this.carrying = null;
    this.readyCount = 0;
    this.totalCount = 10;

    this.touch = { left: false, right: false, up: false, down: false };

    this.facing = 1; // 1=pa labi, -1=pa kreisi
    this.startTimeMs = 0;
    this.finished = false;
    this.prevElevY = 0;

    // buss
    this.busStorage = [];
    this.BUS_CAPACITY = 6;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ---- Layout: augšā spēles laukums, apakšā pogas ----
    this.controlsH = 190;
    this.playH = H - this.controlsH;

    // fons (zilgans, nedaudz gaišāks)
    this.cameras.main.setBackgroundColor("#101a24");

    this.physics.world.gravity.y = 900;

    // Slāņi
    this.DEPTH = {
      stickers: 2,
      platforms: 10,
      elevator: 12,
      bus: 15,
      ext: 60,
      player: 100,
      carry: 110,
      ui: 200,
      controls: 300,
      overlay: 400
    };

    // ---- Grīdas (5 stāvi) ----
    // Pārbīdam spēli uz leju + samazinām “pagrabstāvu”
    const topY = 130;
    const bottomY = this.playH - 35;

    this.FLOORS_Y = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      this.FLOORS_Y.push(Phaser.Math.Linear(topY, bottomY, t));
    }
    this.THICK = 18;

    // ---- Platformas ----
    this.platforms = this.physics.add.staticGroup();

    // 1. stāvs pilnā platumā
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // Lifts/šahta
    this.elevatorWidth = 70;
    this.elevatorX = Math.round(W * 0.62);
    this.shaftGapW = this.elevatorWidth + 26;

    // 2–5 stāvs ar šahtas caurumu labajā pusē
    const rightStartX = Math.round(W * 0.42);
    const holeL = this.elevatorX - this.shaftGapW / 2;
    const holeR = this.elevatorX + this.shaftGapW / 2;

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      // kreisās puses šaurā maliņa
      const leftLedgeX = 26;
      const leftLedgeW = 74;
      this.addPlatform(leftLedgeX, y, leftLedgeW, this.THICK);

      // labā puse ar caurumu šahtai
      const seg1W = holeL - rightStartX;
      if (seg1W > 12) this.addPlatform(rightStartX, y, seg1W, this.THICK);

      const seg2X = holeR;
      const seg2W = W - holeR;
      if (seg2W > 12) this.addPlatform(seg2X, y, seg2W, this.THICK);
    }

    // ---- BUSS ----
    this.BUS = { w: Math.round(W * 0.40), h: 105 };
    this.BUS.x = 0; // pie pašas malas
    this.BUS.y = Math.round(this.FLOORS_Y[4] - this.BUS.h + 10);

    const busRect = this.add.rectangle(
      this.BUS.x + this.BUS.w / 2,
      this.BUS.y + this.BUS.h / 2,
      this.BUS.w,
      this.BUS.h,
      0xe9edf2
    ).setStrokeStyle(4, 0xc7ced8).setDepth(this.DEPTH.bus);

    // BUSS uzraksts
    this.add.text(busRect.x, this.BUS.y + 8, "BUSS", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#0b0f14",
      fontStyle: "bold"
    }).setOrigin(0.5, 0).setDepth(this.DEPTH.bus + 1);

    // ✅ RITENIS (aizmugures) — NOLAISTS ZEMĀK
    const wheelX = this.BUS.x + Math.round(this.BUS.w * 0.55);

    const wantedWheelY = this.BUS.y + this.BUS.h + 16;
    const wheelY = Math.min(this.playH - 12, wantedWheelY);

    // riepa (zem korpusa)
    this.add.circle(wheelX, wheelY, 20, 0x1a1a1a, 1)
      .setStrokeStyle(3, 0x3a3a3a, 1)
      .setDepth(this.DEPTH.bus - 2);

    // disks
    this.add.circle(wheelX, wheelY, 10, 0x8a8a8a, 1)
      .setStrokeStyle(2, 0x2a2a2a, 1)
      .setDepth(this.DEPTH.bus - 1);

    // bus “zona”
    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // 6 vietas busā
    this.busSlots = [];
    const cols = 3, rows = 2;
    const padX = 18, padY = 28;
    const cellW = (this.BUS.w - padX * 2) / cols;
    const cellH = (this.BUS.h - padY * 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = this.BUS.x + padX + c * cellW + cellW / 2;
        const y = this.BUS.y + padY + r * cellH + cellH / 2;
        this.busSlots.push({ x, y, used: false });
        this.add.rectangle(x, y, 18, 18, 0x0b0f14, 0.08)
          .setStrokeStyle(1, 0x0b0f14, 0.18)
          .setDepth(this.DEPTH.bus);
      }
    }

    // ---- LIFTS platforma ----
    const topOvershoot = 26;
    this.elevatorMinSurfaceY = this.FLOORS_Y[0] - topOvershoot;
    this.elevatorMaxSurfaceY = this.FLOORS_Y[4];

    this.elevatorSpeed = 58;
    this.elevatorDir = -1;

    this.elevator = this.add.rectangle(
      this.elevatorX,
      this.elevatorMaxSurfaceY + this.THICK / 2,
      this.elevatorWidth,
      this.THICK,
      0x555555
    ).setStrokeStyle(2, 0x1a1f26).setDepth(this.DEPTH.elevator);

    this.physics.add.existing(this.elevator);
    this.elevator.body.setAllowGravity(false);
    this.elevator.body.setImmovable(true);
    this.prevElevY = this.elevator.y;

    // ---- Spēlētājs ----
    this.player = this.makePlayer(Math.round(W * 0.22), this.FLOORS_Y[4]);
    this.player.setDepth(this.DEPTH.player);

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(-14, -54);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // ---- Aparāti + “uzlīmju” sloti ----
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const spots = this.makeSpotsPortrait(W);

    spots.forEach(s => {
      const floorSurfaceY = this.FLOORS_Y[s.floor];
      const extY = floorSurfaceY - 22;

      // uzlīme virs aparāta
      const stickerY = extY - 54;

      const sticker = this.add.rectangle(s.x, stickerY, 14, 14, 0xb42020, 0.85)
        .setStrokeStyle(2, 0xff6b6b, 0.9)
        .setDepth(this.DEPTH.stickers);

      const slot = { x: s.x, y: extY, sticker, used: false };
      this.slots.push(slot);

      const ex = this.makeExtinguisher(s.x, extY, "NOK");
      ex.setDepth(this.DEPTH.ext);

      // dati
      ex.setData("held", false);
      ex.setData("slotRef", null);
      ex.setData("inBus", false);
      ex.setData("busIndex", -1);

      // ✅ ŠIS IR GALVENAIS LABOJUMS:
      // uzreiz uzliek NOK STILU (sarkans fons + balts teksts)
      this.setExtState(ex, "NOK");

      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    this.totalCount = this.slots.length;

    // ---- UI ----
    this.readyText = this.add.text(12, 10, `Gatavs: 0/${this.totalCount}`, this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.timeText = this.add.text(12, 42, "Laiks: 00:00", this.uiStyle())
      .setDepth(this.DEPTH.ui);

    // ---- Kontroles (telefons) ----
    this.createPortraitControls();

    // ---- Keyboard ----
    this.cursors = this.input.keyboard.createCursorKeys();

    this.startTimeMs = this.time.now;
  }

  update(time, delta) {
    if (!this.finished) {
      const totalSec = Math.floor((time - this.startTimeMs) / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      this.timeText.setText(`Laiks: ${mm}:${ss}`);
    }

    // lifts
    const dt = delta / 1000;
    const minCenterY = this.elevatorMinSurfaceY + this.THICK / 2;
    const maxCenterY = this.elevatorMaxSurfaceY + this.THICK / 2;

    this.elevator.y += this.elevatorSpeed * dt * this.elevatorDir;
    if (this.elevator.y <= minCenterY) { this.elevator.y = minCenterY; this.elevatorDir = 1; }
    if (this.elevator.y >= maxCenterY) { this.elevator.y = maxCenterY; this.elevatorDir = -1; }

    this.elevator.body.updateFromGameObject();
    const elevDeltaY = this.elevator.y - this.prevElevY;
    this.prevElevY = this.elevator.y;

    // kustība
    if (!this.finished) {
      const left = this.cursors.left.isDown || this.touch.left;
      const right = this.cursors.right.isDown || this.touch.right;
      const speed = 230;

      if (left) {
        this.player.body.setVelocityX(-speed);
        this.facing = -1;
      } else if (right) {
        this.player.body.setVelocityX(speed);
        this.facing = 1;
      } else {
        this.player.body.setVelocityX(0);
      }
    } else {
      this.player.body.setVelocityX(0);
    }

    // paņem/noliec
    if (!this.finished) {
      const upPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.consumeTouch("up");
      const downPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.consumeTouch("down");

      if (upPressed) this.tryPickup();
      if (downPressed) this.tryDrop();
    }

    // aparāts rokās
    if (this.carrying) {
      const sideOffset = 24;
      this.carrying.x = this.player.x + sideOffset * this.facing;
      this.carrying.y = this.player.y - 30;
      this.carrying.setDepth(this.DEPTH.carry);
    }

    // brauc līdzi liftam
    const onElev =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (onElev) {
      this.player.y += elevDeltaY;
      if (this.carrying) this.carrying.y += elevDeltaY;
    }
  }

  // ---------------- Controls helpers ----------------
  consumeTouch(key) {
    if (this.touch[key]) {
      this.touch[key] = false;
      return true;
    }
    return false;
  }

  createPortraitControls() {
    const W = this.scale.width;
    const areaTop = this.playH;
    const areaH = this.controlsH;

    this.add.rectangle(W / 2, areaTop + areaH / 2, W, areaH, 0x081018, 0.95)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.controls);

    const R = 46;

    const mkBtn = (cx, cy, label) => {
      const circle = this.add.circle(cx, cy, R, 0x142334, 1)
        .setStrokeStyle(3, 0x2a5a7a)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls + 1)
        .setInteractive({ useHandCursor: true });

      const t = this.add.text(cx, cy, label, {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#e7edf5",
        fontStyle: "bold"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(this.DEPTH.controls + 2);

      circle._label = t;
      return circle;
    };

    const leftX = 70;
    const yMid = areaTop + areaH / 2;

    const btnLeft = mkBtn(leftX, yMid - 45, "←");
    const btnDown = mkBtn(leftX, yMid + 45, "↓");

    const rightX = W - 70;
    const btnRight = mkBtn(rightX, yMid - 45, "→");
    const btnUp = mkBtn(rightX, yMid + 45, "↑");

    const pressIn = (btn) => {
      btn.setFillStyle(0x1d3a55, 1);
      this.tweens.add({ targets: [btn, btn._label], scaleX: 0.96, scaleY: 0.96, duration: 60 });
    };
    const pressOut = (btn) => {
      btn.setFillStyle(0x142334, 1);
      this.tweens.add({ targets: [btn, btn._label], scaleX: 1.0, scaleY: 1.0, duration: 80 });
    };

    const bindHold = (btn, key) => {
      btn.on("pointerdown", () => { this.touch[key] = true; pressIn(btn); });
      btn.on("pointerup", () => { this.touch[key] = false; pressOut(btn); });
      btn.on("pointerout", () => { this.touch[key] = false; pressOut(btn); });
      btn.on("pointercancel", () => { this.touch[key] = false; pressOut(btn); });
    };

    const bindTap = (btn, key) => {
      btn.on("pointerdown", () => { this.touch[key] = true; pressIn(btn); });
      btn.on("pointerup", () => { pressOut(btn); });
      btn.on("pointerout", () => { pressOut(btn); });
      btn.on("pointercancel", () => { pressOut(btn); });
    };

    bindHold(btnLeft, "left");
    bindHold(btnRight, "right");
    bindTap(btnUp, "up");
    bindTap(btnDown, "down");
  }

  // ---------------- Gameplay: pickup/drop ----------------
  tryPickup() {
    if (this.carrying) return;

    const px = this.player.x;
    const py = this.player.y - 20;

    let best = null;
    let bestD = 1e9;

    this.extinguishers.getChildren().forEach(ex => {
      if (!ex.active) return;
      if (ex.getData("held")) return;

      const d = Phaser.Math.Distance.Between(px, py, ex.x, ex.y);
      if (d < 58 && d < bestD) { best = ex; bestD = d; }
    });

    if (!best) return;

    const slotRef = best.getData("slotRef");
    if (slotRef) {
      slotRef.used = false;
      slotRef.sticker.setFillStyle(0xb42020, 0.85);
      best.setData("slotRef", null);

      this.readyCount = Math.max(0, this.readyCount - 1);
      this.readyText.setText(`Gatavs: ${this.readyCount}/${this.totalCount}`);
    }

    if (best.getData("inBus")) {
      const idx = best.getData("busIndex");
      if (idx >= 0 && this.busSlots[idx]) this.busSlots[idx].used = false;
      best.setData("inBus", false);
      best.setData("busIndex", -1);
      this.busStorage = this.busStorage.filter(x => x !== best);
    }

    best.setData("held", true);
    best.body.enable = false;
    best.setDepth(this.DEPTH.carry);
    this.carrying = best;
  }

  tryDrop() {
    if (!this.carrying) return;

    const ex = this.carrying;
    ex.setData("held", false);
    ex.body.enable = true;
    ex.setDepth(this.DEPTH.ext);

    ex.x = this.player.x + 18 * this.facing;
    ex.y = this.player.y - 22;

    // BUSS
    if (Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y)) {
      const freeIndex = this.busSlots.findIndex(s => !s.used);

      if (freeIndex === -1 || this.busStorage.length >= this.BUS_CAPACITY) {
        ex.body.enable = true;
        ex.body.setVelocity(0, 0);

        const groundY = this.FLOORS_Y[4] - 22;
        ex.x = Math.min(this.scale.width - 18, this.busZone.right + 24);
        ex.y = groundY;

        this.carrying = null;
        return;
      }

      this.busSlots[freeIndex].used = true;
      this.busStorage.push(ex);

      ex.setData("inBus", true);
      ex.setData("busIndex", freeIndex);

      this.setExtState(ex, "OK");

      ex.body.enable = false;
      ex.x = this.busSlots[freeIndex].x;
      ex.y = this.busSlots[freeIndex].y;

      this.carrying = null;
      return;
    }

    // OK + slots
    if (ex.getData("state") === "OK") {
      const slot = this.findSlotUnder(ex.x, ex.y);

      if (slot && slot.used) {
        ex.x += 22 * this.facing;
        this.carrying = null;
        return;
      }

      if (slot && !slot.used) {
        slot.used = true;
        slot.sticker.setFillStyle(0x2aa84a, 0.95);

        ex.body.enable = false;
        ex.x = slot.x;
        ex.y = slot.y;
        ex.setData("slotRef", slot);

        this.readyCount += 1;
        this.readyText.setText(`Gatavs: ${this.readyCount}/${this.totalCount}`);

        if (this.readyCount >= this.totalCount) {
          this.finishGame();
        }

        this.carrying = null;
        return;
      }
    }

    this.carrying = null;
  }

  findSlotUnder(x, y) {
    for (const s of this.slots) {
      const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
      if (d < 26) return s;
    }
    return null;
  }

  finishGame() {
    if (this.finished) return;
    this.finished = true;

    const elapsedMs = this.time.now - this.startTimeMs;
    const totalSec = Math.floor(elapsedMs / 1000);
    const mm = Math.floor(totalSec / 60);
    const ss = totalSec % 60;

    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setDepth(this.DEPTH.overlay);

    this.add.text(W / 2, 260, "Līmenis pabeigts!", {
      fontFamily: "Arial",
      fontSize: "34px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setDepth(this.DEPTH.overlay + 1);

    this.add.text(W / 2, 320, `Jūsu laiks: ${mm} min ${ss} sek`, {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#e7edf5"
    }).setOrigin(0.5).setDepth(this.DEPTH.overlay + 1);
  }

  // ---------------- Drawing helpers ----------------
  uiStyle() {
    return {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    };
  }

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

  makePlayer(x, surfaceY) {
    const c = this.add.container(x, surfaceY);

    const body = this.add.rectangle(0, -31, 30, 44, 0x0b0b0b);
    const stripe = this.add.rectangle(0, -16, 30, 8, 0x00ff66);
    const head = this.add.circle(0, -58, 11, 0xffe2b8);

    c.add([body, stripe, head]);
    return c;
  }

  makeExtinguisher(x, y, label) {
    const c = this.add.container(x, y);

    const shell = this.add.rectangle(0, 0, 24, 38, 0xff4040).setStrokeStyle(2, 0x7a0a0a);

    // pelēks rokturis + slīps uzgalis
    const handleBase = this.add.rectangle(0, -24, 16, 10, 0x9aa6b2).setStrokeStyle(2, 0x3a4550);
    const nozzle = this.add.rectangle(10, -28, 20, 7, 0x9aa6b2).setStrokeStyle(2, 0x3a4550);
    nozzle.setRotation(Phaser.Math.DegToRad(-20));

    // badge (krāsu uzliek setExtState)
    const badge = this.add.rectangle(0, 7, 24, 16, 0x0b0f14).setAlpha(0.9);

    const txt = this.add.text(0, 7, label, {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    c.add([shell, handleBase, nozzle, badge, txt]);

    this.physics.add.existing(c);
    c.body.setSize(24, 38);
    c.body.setOffset(-12, -19);

    c.setData("txt", txt);
    c.setData("badge", badge);

    return c;
  }

  // ✅ NOK: sarkans fons + balts teksts (OK: zaļš fons + tumšs teksts)
  setExtState(ext, state) {
    ext.setData("state", state);
    ext.getData("txt").setText(state);

    const badge = ext.getData("badge");
    const txt = ext.getData("txt");

    if (state === "OK") {
      badge.setFillStyle(0x00ff66).setAlpha(0.9);
      txt.setColor("#0b0f14");
    } else {
      badge.setFillStyle(0xff4040).setAlpha(0.95); // sarkans fons NOK
      txt.setColor("#ffffff");
    }
  }

  makeSpotsPortrait(W) {
    const xLeft = 62;
    const xLeftTop = 180;
    const xRight = Math.round(W * 0.90);
    const xTopExtra = Math.round(W * 0.80);

    return [
      { floor: 0, x: xLeftTop },
      { floor: 0, x: xRight },
      { floor: 0, x: xTopExtra },

      { floor: 1, x: xLeft },
      { floor: 1, x: xRight },

      { floor: 2, x: xLeft },
      { floor: 2, x: xRight },

      { floor: 3, x: xLeft },
      { floor: 3, x: xRight },

      { floor: 4, x: xRight }
    ];
  }
}
