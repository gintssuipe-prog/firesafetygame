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
  }

  create() {
    const W = this.scale.width;   // 420
    const H = this.scale.height;  // 820

    // ---- Layout: augšā spēles laukums, apakšā pogas ----
    this.controlsH = 190;
    this.playH = H - this.controlsH;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

    // Slāņi
    this.DEPTH = {
      markers: 1,
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

    // ---- Grīdas (5 stāvi) portrait laukā ----
    // sadalām vertikāli vienmērīgi playH robežās
    const topY = 70;
    const bottomY = this.playH - 70;
    this.FLOORS_Y = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      this.FLOORS_Y.push(Phaser.Math.Linear(topY, bottomY, t));
    }
    this.THICK = 18;

    // ---- Platformas ----
    this.platforms = this.physics.add.staticGroup();

    // Apakšējais stāvs (1. stāvs) pilnā platumā
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // Lifts/šahta
    this.elevatorWidth = 70;
    this.elevatorX = Math.round(W * 0.62);
    this.shaftGapW = this.elevatorWidth + 26;

    // 2–5 stāvs: labā zona + caurums šahtai
    const rightStartX = Math.round(W * 0.42);
    const holeL = this.elevatorX - this.shaftGapW / 2;
    const holeR = this.elevatorX + this.shaftGapW / 2;

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];
      // seg1: no rightStartX līdz caurumam
      const seg1W = holeL - rightStartX;
      if (seg1W > 12) this.addPlatform(rightStartX, y, seg1W, this.THICK);

      // seg2: no cauruma līdz labajai malai
      const seg2X = holeR;
      const seg2W = W - holeR;
      if (seg2W > 12) this.addPlatform(seg2X, y, seg2W, this.THICK);
    }

    // ---- Buss (spēles laukumā, pie apakšējā stāva) ----
    this.BUS = { w: Math.round(W * 0.46), h: 110 };
    this.BUS.x = 12;
    this.BUS.y = Math.round(this.FLOORS_Y[4] - this.BUS.h + 10);

    const busRect = this.add.rectangle(
      this.BUS.x + this.BUS.w / 2,
      this.BUS.y + this.BUS.h / 2,
      this.BUS.w,
      this.BUS.h,
      0xf2f4f8
    ).setStrokeStyle(4, 0xc7ced8).setDepth(this.DEPTH.bus);

    this.add.text(busRect.x, this.BUS.y + 8, "BUSS", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#0b0f14",
      fontStyle: "bold"
    }).setOrigin(0.5, 0).setDepth(this.DEPTH.bus + 1);

    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // ---- Lifts (kustīga platforma) ----
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

    // ---- Aparāti + sloti ----
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const spots = this.makeSpotsPortrait(W);
    spots.forEach(s => {
      const y = this.FLOORS_Y[s.floor] - 22;

      const mark = this.add.rectangle(s.x, y, 34, 34, 0xa90f0f)
        .setStrokeStyle(2, 0xff6b6b)
        .setAlpha(0.45)
        .setDepth(this.DEPTH.markers);

      const slot = { x: s.x, y, used: false, mark };
      this.slots.push(slot);

      const ex = this.makeExtinguisher(s.x, y, "NOK");
      ex.setDepth(this.DEPTH.ext);
      ex.setData("state", "NOK");
      ex.setData("held", false);
      ex.setData("slotRef", null);
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

    // ---- Kontroles: apaļas pogas apakšā ----
    this.createPortraitControls();

    // ---- Keyboard (datoram) ----
    this.cursors = this.input.keyboard.createCursorKeys();

    this.startTimeMs = this.time.now;
  }

  update(time, delta) {
    // taimeris
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

    // kustība (keyboard + touch)
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

    // paņem/noliec (keyboard JustDown + touch “one-shot”)
    if (!this.finished) {
      const upPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.consumeTouch("up");
      const downPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.consumeTouch("down");

      if (upPressed) this.tryPickup();
      if (downPressed) this.tryDrop();
    }

    // aparāts rokās — maina pusi
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
    const H = this.scale.height;

    const areaTop = this.playH;
    const areaH = this.controlsH;

    // fons kontroles zonai
    this.add.rectangle(W / 2, areaTop + areaH / 2, W, areaH, 0x081018, 0.95)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.controls);

    // pogas lielas, apaļas
    const R = 46;

    const mkBtn = (cx, cy, label) => {
      const circle = this.add.circle(cx, cy, R, 0x142334, 1)
        .setStrokeStyle(3, 0x2a5a7a)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls + 1)
        .setInteractive({ useHandCursor: true });

      this.add.text(cx, cy, label, {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#e7edf5",
        fontStyle: "bold"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(this.DEPTH.controls + 2);

      return circle;
    };

    // Kreisa puse: ← un ↓
    const leftX = 70;
    const yMid = areaTop + areaH / 2;

    const btnLeft = mkBtn(leftX, yMid - 45, "←");
    const btnDown = mkBtn(leftX, yMid + 45, "↓");

    // Laba puse: → un ↑
    const rightX = W - 70;
    const btnRight = mkBtn(rightX, yMid - 45, "→");
    const btnUp = mkBtn(rightX, yMid + 45, "↑");

    // “Hold” kustībai (← →), “tap” darbībai (↑ ↓)
    const bindHold = (btn, key) => {
      btn.on("pointerdown", () => { this.touch[key] = true; btn.setFillStyle(0x1d3a55, 1); });
      btn.on("pointerup", () => { this.touch[key] = false; btn.setFillStyle(0x142334, 1); });
      btn.on("pointerout", () => { this.touch[key] = false; btn.setFillStyle(0x142334, 1); });
      btn.on("pointercancel", () => { this.touch[key] = false; btn.setFillStyle(0x142334, 1); });
    };

    const bindTap = (btn, key) => {
      btn.on("pointerdown", () => { this.touch[key] = true; btn.setFillStyle(0x1d3a55, 1); });
      btn.on("pointerup", () => { btn.setFillStyle(0x142334, 1); });
      btn.on("pointerout", () => { btn.setFillStyle(0x142334, 1); });
      btn.on("pointercancel", () => { btn.setFillStyle(0x142334, 1); });
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

    // ja bija slotā – atbrīvojam un samazinām “gatavs”
    const slotRef = best.getData("slotRef");
    if (slotRef) {
      slotRef.used = false;
      slotRef.mark.setAlpha(0.45);
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
    if (!this.carrying) return;

    const ex = this.carrying;
    ex.setData("held", false);
    ex.body.enable = true;
    ex.setDepth(this.DEPTH.ext);

    // noliecam pie kājām
    ex.x = this.player.x + 18 * this.facing;
    ex.y = this.player.y - 22;

    // busā -> OK
    if (Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y)) {
      this.setExtState(ex, "OK");
      this.carrying = null;
      return;
    }

    // OK + slot
    if (ex.getData("state") === "OK") {
      const slot = this.findSlotUnder(ex.x, ex.y);
      if (slot && slot.used) {
        // aizņemts -> pastumjam ārā
        ex.x += 22 * this.facing;
        this.carrying = null;
        return;
      }
      if (slot && !slot.used) {
        slot.used = true;
        slot.mark.setAlpha(0.20);

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
    const badge = this.add.rectangle(0, 7, 24, 16, 0x0b0f14).setAlpha(0.9);

    const txt = this.add.text(0, 7, label, {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const okMark = this.add.text(0, -18, "✓", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#00ff66",
      fontStyle: "bold"
    }).setOrigin(0.5);
    okMark.setVisible(false);

    c.add([shell, badge, txt, okMark]);

    this.physics.add.existing(c);
    c.body.setSize(24, 38);
    c.body.setOffset(-12, -19);

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

  makeSpotsPortrait(W) {
    // 10 vietas, pielāgotas šauram ekrānam: divas uz stāvu labajā pusē
    const x1 = Math.round(W * 0.62);
    const x2 = Math.round(W * 0.86);
    return [
      { floor: 4, x: x1 }, { floor: 4, x: x2 },
      { floor: 3, x: x1 }, { floor: 3, x: x2 },
      { floor: 2, x: x1 }, { floor: 2, x: x2 },
      { floor: 1, x: x1 }, { floor: 1, x: x2 },
      { floor: 0, x: x1 }, { floor: 0, x: x2 }
    ];
  }
}
