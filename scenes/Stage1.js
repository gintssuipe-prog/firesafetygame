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

    this.FLOORS_Y = [110, 220, 330, 440, 550];
    this.THICK = 20;

    this.DROP_GRID = 26;
    this.DROP_MIN_DIST = 20;
    this.DROP_SEARCH_STEPS = 14;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

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

    // ==== LIFTS ====
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

    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

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

    // ==== BUSS ====
    this.BUS = { x: 70, y: 455, w: 220, h: 155 };
    const busRect = this.add.rectangle(
      this.BUS.x + this.BUS.w / 2,
      this.BUS.y + this.BUS.h / 2,
      this.BUS.w,
      this.BUS.h,
      0xf2f4f8
    ).setStrokeStyle(4, 0xc7ced8).setDepth(this.DEPTH.bus);

    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // ==== LIFTS OBJEKTS ====
    this.elevator = this.add.rectangle(
      this.elevatorX,
      this.elevatorMaxSurfaceY + this.THICK / 2,
      this.elevatorWidth,
      this.THICK,
      0x555555
    ).setDepth(this.DEPTH.elevator);

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

    // ==== UGUNSDZĒŠAMIE APARĀTI ====
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const SPOTS = [
      { floor: 1, x: 820 }, { floor: 1, x: 980 },
      { floor: 2, x: 760 }, { floor: 2, x: 940 },
      { floor: 3, x: 800 }, { floor: 3, x: 1000 },
      { floor: 0, x: 860 }, { floor: 0, x: 1020 },
      { floor: 4, x: 520 }, { floor: 4, x: 900 }
    ];

    SPOTS.forEach(s => {
      const y = this.FLOORS_Y[s.floor] - 22;

      const slot = { x: s.x, y, used: false };
      this.slots.push(slot);

      const ex = this.makeExtinguisher(s.x, y, "NOK");
      ex.setDepth(this.DEPTH.ext);
      ex.setData("state", "NOK");
      ex.setData("slotRef", null);

      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    this.totalCount = this.slots.length;

    // ==== KONTROLES ====
    this.cursors = this.input.keyboard.createCursorKeys();

    // ==== UI ====
    this.readyText = this.add.text(14, 12, `Gatavs: 0/${this.totalCount}`, this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.timeText = this.add.text(14, 48, "Laiks: 00:00", this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.startTimeMs = this.time.now;
  }

  // ===== UPDATE =====
  update(time, delta) {
    if (!this.finished) {
      const elapsed = Math.floor((time - this.startTimeMs) / 1000);
      const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
      const ss = String(elapsed % 60).padStart(2, "0");
      this.timeText.setText(`Laiks: ${mm}:${ss}`);
    }

    // LIFTS
    const dt = delta / 1000;
    const minY = this.elevatorMinSurfaceY + this.THICK / 2;
    const maxY = this.elevatorMaxSurfaceY + this.THICK / 2;

    this.elevator.y += this.elevatorSpeed * dt * this.elevatorDir;
    if (this.elevator.y <= minY) { this.elevator.y = minY; this.elevatorDir = 1; }
    if (this.elevator.y >= maxY) { this.elevator.y = maxY; this.elevatorDir = -1; }

    this.elevator.body.updateFromGameObject();
    const elevDeltaY = this.elevator.y - this.prevElevY;
    this.prevElevY = this.elevator.y;

    // KUSTĪBA
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

    // APARĀTS ROKĀS (kreisā / labā puse)
    if (this.carrying) {
      const sideOffset = 28;
      this.carrying.x = this.player.x + sideOffset * this.facing;
      this.carrying.y = this.player.y - 30;
      this.carrying.setDepth(this.DEPTH.carry);
    }

    // BRAUC LĪDZI LIFTAM
    const onElev =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (onElev) {
      this.player.y += elevDeltaY;
      if (this.carrying) this.carrying.y += elevDeltaY;
    }
  }

  // ===== PALĪGFUNKCIJAS =====
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
    );
    r.setDepth(this.DEPTH.platforms);
    this.physics.add.existing(r, true);
    this.platforms.add(r);
  }

  makePlayer(x, surfaceY) {
    const c = this.add.container(x, surfaceY);
    c.add([
      this.add.rectangle(0, -31, 32, 46, 0x0b0b0b),
      this.add.rectangle(0, -23, 32, 8, 0x00ff66),
      this.add.rectangle(0, -7, 32, 6, 0x00ff66),
      this.add.circle(0, -62, 12, 0xffe2b8)
    ]);
    return c;
  }

  makeExtinguisher(x, y, label) {
    const c = this.add.container(x, y);
    c.add([
      this.add.rectangle(0, 0, 28, 44, 0xff4040),
      this.add.text(0, 8, label, { fontSize: "12px", color: "#fff" }).setOrigin(0.5)
    ]);
    this.physics.add.existing(c);
    c.body.setSize(28, 44);
    c.body.setOffset(-14, -22);
    return c;
  }
}
