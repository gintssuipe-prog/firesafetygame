class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");

    this.carrying = null;
    this.readyCount = 0;
    this.totalCount = 10;

    this.touch = { left: false, right: false, up: false, down: false };
    this.facing = 1;

    this.startTimeMs = 0;
    this.finished = false;

    this.prevElevY = 0;

    this.busStorage = [];
    this.BUS_CAPACITY = 6;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.controlsH = 190;
    this.playH = H - this.controlsH;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

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

    /* --------- FLOORS --------- */
    const topY = 70;
    const bottomY = this.playH - 70;
    this.FLOORS_Y = [];
    for (let i = 0; i < 5; i++) {
      this.FLOORS_Y.push(Phaser.Math.Linear(topY, bottomY, i / 4));
    }
    this.THICK = 18;

    this.platforms = this.physics.add.staticGroup();

    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    this.elevatorWidth = 70;
    this.elevatorX = Math.round(W * 0.62);
    this.shaftGapW = this.elevatorWidth + 26;

    const holeL = this.elevatorX - this.shaftGapW / 2;
    const holeR = this.elevatorX + this.shaftGapW / 2;
    const rightStartX = Math.round(W * 0.42);

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      this.addPlatform(26, y, 74, this.THICK);

      const seg1W = holeL - rightStartX;
      if (seg1W > 12) this.addPlatform(rightStartX, y, seg1W, this.THICK);

      const seg2W = W - holeR;
      if (seg2W > 12) this.addPlatform(holeR, y, seg2W, this.THICK);
    }

    /* --------- BUS --------- */
    this.BUS = { w: Math.round(W * 0.40), h: 105 };
    this.BUS.x = 8;
    this.BUS.y = Math.round(this.FLOORS_Y[4] - this.BUS.h + 10);

    const busRect = this.add.rectangle(
      this.BUS.x + this.BUS.w / 2,
      this.BUS.y + this.BUS.h / 2,
      this.BUS.w,
      this.BUS.h,
      0xe9edf2
    ).setStrokeStyle(4, 0xc7ced8).setDepth(this.DEPTH.bus);

    this.add.text(busRect.x, this.BUS.y + 8, "BUSS", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#0b0f14",
      fontStyle: "bold"
    }).setOrigin(0.5, 0).setDepth(this.DEPTH.bus + 1);

    this.busZone = new Phaser.Geom.Rectangle(
      this.BUS.x,
      this.BUS.y,
      this.BUS.w,
      this.BUS.h
    );

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

    /* --------- ELEVATOR --------- */
    this.elevatorMinSurfaceY = this.FLOORS_Y[0] - 26;
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

    /* --------- PLAYER --------- */
    this.player = this.makePlayer(Math.round(W * 0.22), this.FLOORS_Y[4]);
    this.player.setDepth(this.DEPTH.player);

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(-14, -54);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    /* --------- EXTINGUISHERS --------- */
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const spots = this.makeSpotsPortrait(W);

    spots.forEach(s => {
      const extY = this.FLOORS_Y[s.floor] - 22;
      const stickerY = extY - 24;

      const sticker = this.add.rectangle(
        s.x, stickerY, 14, 14, 0xb42020, 0.85
      ).setStrokeStyle(2, 0xff6b6b, 0.9)
       .setDepth(this.DEPTH.stickers);

      const slot = { x: s.x, y: extY, sticker, used: false };
      this.slots.push(slot);

      const ex = this.makeExtinguisher(s.x, extY, "NOK");
      ex.setDepth(this.DEPTH.ext);
      ex.setData("state", "NOK");
      ex.setData("held", false);
      ex.setData("slotRef", null);
      ex.setData("inBus", false);
      ex.setData("busIndex", -1);

      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    this.totalCount = this.slots.length;

    /* --------- UI --------- */
    this.readyText = this.add.text(12, 10, `Gatavs: 0/${this.totalCount}`, this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.timeText = this.add.text(12, 42, "Laiks: 00:00", this.uiStyle())
      .setDepth(this.DEPTH.ui);

    this.createPortraitControls();
    this.cursors = this.input.keyboard.createCursorKeys();

    this.startTimeMs = this.time.now;
  }

  /* --------- SPOTS (KORIĢĒTA AUGŠA) --------- */
  makeSpotsPortrait(W) {
    const xLeft = 62;
    const xRight = Math.round(W * 0.90);

    // 👇 PABĪDĪTS VĒL PA LABI (lai nav zem UI)
    const xTopShifted = Math.round(W * 0.43);

    return [
      { floor: 0, x: xTopShifted },
      { floor: 0, x: xRight },
      { floor: 0, x: Math.round(W * 0.80) },

      { floor: 1, x: xLeft },
      { floor: 1, x: xRight },

      { floor: 2, x: xLeft },
      { floor: 2, x: xRight },

      { floor: 3, x: xLeft },
      { floor: 3, x: xRight },

      { floor: 4, x: xRight }
    ];
  }

  /* --------- HELPERS --------- */
  uiStyle() {
    return {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    };
  }

  addPlatform(xLeft, y, w, h) {
    const r = this.add.rectangle(xLeft + w / 2, y + h / 2, w, h, 0x0f5f7a)
      .setStrokeStyle(2, 0x0b0f14)
      .setDepth(this.DEPTH.platforms);
    this.physics.add.existing(r, true);
    this.platforms.add(r);
  }

  makePlayer(x, y) {
    const c = this.add.container(x, y);
    c.add([
      this.add.rectangle(0, -31, 30, 44, 0x0b0b0b),
      this.add.rectangle(0, -16, 30, 8, 0x00ff66),
      this.add.circle(0, -58, 11, 0xffe2b8)
    ]);
    return c;
  }

  makeExtinguisher(x, y, label) {
    const c = this.add.container(x, y);
    const shell = this.add.rectangle(0, 0, 24, 38, 0xff4040)
      .setStrokeStyle(2, 0x7a0a0a);
    const badge = this.add.rectangle(0, 7, 24, 16, 0x0b0f14).setAlpha(0.9);
    const txt = this.add.text(0, 7, label, {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    c.add([shell, badge, txt]);

    this.physics.add.existing(c);
    c.body.setSize(24, 38);
    c.body.setOffset(-12, -19);

    c.setData("txt", txt);
    c.setData("badge", badge);
    return c;
  }
}
