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
    const W = this.scale.width;   // 420
    const H = this.scale.height;  // 820

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

      // kreisās puses šaurā maliņa: maza platforma katrā stāvā
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

    // ---- BUSS (īsāks, vairāk pa kreisi; kapacitāte 6) ----
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

    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // 6 vietas busā (vizuāli + “snap”)
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

    //
