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

    this.facing = 1; // 1 = pa labi, -1 = pa kreisi
  }

  create() {
    const W = 1100;
    const H = 650;

    // 5 stāvu virsmas (kur stāv kājas)
    this.FLOORS_Y = [110, 220, 330, 440, 550];
    this.THICK = 20;

    // Drop “snap”
    this.DROP_GRID = 26;
    this.DROP_MIN_DIST = 20;
    this.DROP_SEARCH_STEPS = 14;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

    // Slāņi
    this.DEPTH = {
      markers: 1,
      platforms: 10,
      elevator: 12,
      bus: 15,
      balloons: 16,
      ext: 60,
      player: 100,
      carry: 110,
      ui: 200,
      touch: 220,
      overlay: 400
    };

    // ==== LIFTS / ŠAHTA ====
    this.elevatorWidth = 80;
    this.elevatorX = 650;
    this.shaftGapW = this.elevatorWidth + 30;

    const topOvershoot = 30;
    this.elevatorMinSurfaceY = this.FLOORS_Y[0] - topOvershoot;
    this.elevatorMaxSurfaceY = this.FLOORS_Y[4];

    this.elevatorSpeed = 60;
    this.elevatorDir = -1;

    // ==== PLATFORMAS ====
    this.platforms = this.physics.add.staticGroup();

    // 1. stāvs pilns
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // 2–5 stāvs ar šahtas caurumu labajā pusē
    const rightStartX = 520;
    const holeL = this.elevatorX - this.shaftGapW / 2;
    const holeR = this.elevatorX + this.shaftGapW / 2;

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      const seg1L = rightStartX;
      const seg1R = holeL;

      const seg2L = holeR;
      const seg2R = W;

      if (seg1R - seg1L > 18) this.addPlatform(seg1L, y, seg1R - seg1L, this.THICK);
      if (seg2R - seg2L > 18) this.addPlatform(seg2L, y, seg2R - seg2L, this.THICK);
    }

    // ==== BUSS (vizuāli + zona) ====
    this.BUS = { x: 70, y: 455, w: 220, h: 155 };

    const busRect = this.add.rectangle(
      this.BUS.x + this.BUS.w / 2,
      this.BUS.y + this.BUS.h / 2,
      this.BUS.w,
      this.BUS.h,
      0xf2f4f8
    ).setStrokeStyle(4, 0xc7ced8).setDepth(this.DEPTH.bus);

    this.add.text(busRect.x, this.BUS.y + 10, "BUSS", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#0b0f14",
      fontStyle: "bold"
    }).setOrigin(0.5, 0).setDepth(this.DEPTH.bus + 1);

    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // ==== “BALONI” placeholder (lai ir vizuāli) ====
    // Kad būs īstās bildes, šos aizvietosim ar sprite.
    const b1 = this.add.circle(this.BUS.x + this.BUS.w + 40, this.BUS.y + 30, 14, 0xff5a7a).setDepth(this.DEPTH.balloons);
    const b2 = this.add.circle(this.BUS.x + this.BUS.w + 60, this.BUS.y + 55, 14, 0x63a6ff).setDepth(this.DEPTH.balloons);
    const b3 = this.add.circle(this.BUS.x + this.BUS.w + 35, this.BUS.y + 75, 14, 0x6dff8a).setDepth(this.DEPTH.balloons);
    this.add.line(0,0, b1.x, b1.y+14, this.BUS.x+this.BUS.w/2, this.BUS.y+this.BUS.h/2, 0xffffff, 0.35).setOrigin(0,0).setDepth(this.DEPTH.balloons);
    this.add.line(0,0, b2.x, b2.y+14, this.BUS.x+this.BUS.w/2, this.BUS.y+this.BUS.h/2, 0xffffff, 0.35).setOrigin(0,0).setDepth(this.DEPTH.balloons);
    this.add.line(0,0, b3.x, b3.y+14, this.BUS.x+this.BUS.w/2, this.BUS.y+this.BUS.h/2, 0xffffff, 0.35).setOrigin(0,0).setDepth(this.DEPTH.balloons);

    // ==== LIFTS platforma ====
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

    // ==== SPĒLĒTĀJS ====
    this.player = this.makePlayer(140, this.FLOORS_Y[4]);
    this.player.setDepth(this.DEPTH.player);

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(-14, -54);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // ==== APARĀTI + SLOTI ====
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
      ex.setData("slotRef", null);

      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    this.totalCount = this.slots.length; // 10

    // ==== KONTROLES ====
    this.cursors = this.input.keyboard.createCursorKeys();

    // ==== UI ====
    this.readyText = this.add.text(14, 12, `Gatavs: 0/${this.totalCount}`, this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.timeText = this.add.text(14, 48, "Laiks: 00:00", this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.startTimeMs = this.time.now;
  }

  // ---------------- UPDATE ----------------
  update(time, delta) {
    // Taimeris
    if (!this.finished) {
      const elapsedMs = time - this.startTimeMs;
      const totalSec = Math.floor(elapsedMs / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      this.timeText.setText(`Laiks: ${mm}:${ss}`);
    }

    // Lifts kustība
    const dt = delta / 1000;
    const minCenterY = this.elevatorMinSurfaceY + this.THICK / 2;
    const maxCenterY = this.elevatorMaxSurfaceY + this.THICK / 2;

    this.elevator.y += this.elevatorSpeed * dt * this.elevatorDir;
    if (this.elevator.y <= minCenterY) { this.elevator.y = minCenterY; this.elevatorDir = 1; }
    if (this.elevator.y >= maxCenterY) { this.elevator.y = maxCenterY; this.elevatorDir = -1; }

    this.elevator.body.updateFromGameObject();
    const elevDeltaY = this.elevator.y - this.prevElevY;
    this.prevElevY = this.elevator.y;

    // Kustība + facing
    if (!this.finished) {
      const speed = 260;
      if (this.cursors.left.isDown) {
        this.player.body.setVelocityX(-speed);
        this.facing = -1;
      } else if (this.cursors.right.isDown) {
        this.player.body.setVelocityX(speed);
        this.facing = 1;
      } else {
        this.player.body.setVelocityX(0);
      }
    } else {
      this.player.body.setVelocityX(0);
    }

    // Paņem / noliec
    if (!this.finished) {
      if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.tryPickup();
      if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.tryDrop();
    }

    // Aparāts rokās — pa kreisi/pa labi
    if (this.carrying) {
      const sideOffset = 28;
      this.carrying.x = this.player.x + sideOffset * this.facing;
      this.carrying.y = this.player.y - 30;
      this.carrying.setDepth(this.DEPTH.carry);
    }

    // Brauc līdzi liftam
    const onElev =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (onElev) {
      this.player.y += elevDeltaY;
      if (this.carrying) this.carrying.y += elevDeltaY;
    }
  }

  // ---------------- Paņem / noliec ----------------
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
      if (d < 55 && d < bestD) { best = ex; bestD = d; }
    });

    if (!best) return;

    // Ja bija pareizi nolikts, atbrīvojam slotu un samazinām Gatavs
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
    if (!this.carrying) return;

    const ex = this.carrying;

    ex.setData("held", false);
    ex.body.enable = true;
    ex.setDepth(this.DEPTH.ext);

    // Noliekam pie kājām
    ex.x = this.player.x + 26;
    ex.y = this.player.y - 22;

    // BUSS -> OK
    if (Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y)) {
      this.setExtState(ex, "OK");
      this.carrying = null;
      return;
    }

    // OK + slots -> Gatavs
    if (ex.getData("state") === "OK") {
      const slot = this.findSlotUnder(ex.x, ex.y);

      if (slot && slot.used) {
        // Aizņemts: pastumjam uz sāniem
        ex.x += this.DROP_GRID * 2;
        this.carrying = null;
        return;
      }

      if (slot && !slot.used) {
        slot.used = true;
        slot.mark.setAlpha(0.25);
        slot.icon.setAlpha(0.35);

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
      if (d < 28) return s;
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

    const w = 1100, h = 650;
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.72).setDepth(this.DEPTH.overlay);

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
  }

  // ---------------- Helpers ----------------
  uiStyle() {
    return {
      fontFamily: "Arial",
      fontSize: "18px",
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
}
