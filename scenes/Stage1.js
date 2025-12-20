// Stage1.js — slīpēta versija pēc bildes prasībām:
// UI (Laiks kreisajā augšā, Gatavs labajā augšā, lielāki fonti)
// Noņemti 2 mazie plauktiņi (šaurie seg1 gabali 2. un 4. stāvā no augšas)
// Pārcelts konkrētais aparāts uz vidējo šauro plauktiņu
// Noņemts © teksts apakšā
// Pievienota EXIT poga pa vidu apakšā (mēģina aizvērt / fallback uz about:blank)

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

    // fons
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

    // ✅ uzģenerējam gradient-tekstūras (vienreiz)
    this.buildGradientTextures();

    // ---- Grīdas (5 stāvi) ----
    const topY = 130;
    const bottomY = this.playH - 35;

    this.FLOORS_Y = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      this.FLOORS_Y.push(Phaser.Math.Linear(topY, bottomY, t));
    }
    this.THICK = 18;

    // ---- Platformas (Image + static body) ----
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

    // šaurā “seg1” centra x (tas ir tas “pavisam šaurais plauktiņš”)
    const seg1W_base = holeL - rightStartX;
    this.NARROW_MID_X = Math.round(rightStartX + seg1W_base / 2);

    // Noņemam 2 konkrētus mazos plauktiņus (šaurais seg1 gabals)
    // i = 0..3 attiecas uz augšējiem 4 stāviem: FLOORS_Y[0..3]
    // Te noņemam i=1 un i=3 (vizuāli: 2. un 4. stāvs no augšas)
    const REMOVE_NARROW_SEG_ON = new Set([1, 3]);

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      // kreisās puses šaurā maliņa
      const leftLedgeX = 26;
      const leftLedgeW = 74;
      this.addPlatform(leftLedgeX, y, leftLedgeW, this.THICK);

      // labā puse ar caurumu šahtai
      const seg1W = holeL - rightStartX;
      if (seg1W > 12 && !REMOVE_NARROW_SEG_ON.has(i)) {
        // ✅ šis ir “mazais zilais plauktiņš” pie šahtas (noņemam izvēlētos)
        this.addPlatform(rightStartX, y, seg1W, this.THICK);
      }

      const seg2X = holeR;
      const seg2W = W - holeR;
      if (seg2W > 12) this.addPlatform(seg2X, y, seg2W, this.THICK);
    }

    // ---- BUSS (gradient Image) ----
    this.BUS = { w: Math.round(W * 0.40), h: 105 };
    this.BUS.x = 0;
    this.BUS.y = Math.round(this.FLOORS_Y[4] - this.BUS.h + 10);

    const busImg = this.add
      .image(this.BUS.x + this.BUS.w / 2, this.BUS.y + this.BUS.h / 2, "tex_bus")
      .setDisplaySize(this.BUS.w, this.BUS.h)
      .setDepth(this.DEPTH.bus);

    this.add
      .text(busImg.x, this.BUS.y + 8, "BUSS", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#0b0f14",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0)
      .setDepth(this.DEPTH.bus + 1);

    // ✅ RITENIS (gradient “riepa” + “disks”)
    const wheelX = this.BUS.x + Math.round(this.BUS.w * 0.55);
    const wantedWheelY = this.BUS.y + this.BUS.h + 16;
    const wheelY = Math.min(this.playH - 12, wantedWheelY);

    this.add.image(wheelX, wheelY, "tex_wheel").setDisplaySize(42, 42).setDepth(this.DEPTH.bus - 2);
    this.add.image(wheelX, wheelY, "tex_wheelHub").setDisplaySize(22, 22).setDepth(this.DEPTH.bus - 1);

    // bus “zona”
    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // 6 vietas busā (bez stroke)
    this.busSlots = [];
    const cols = 3,
      rows = 2;
    const padX = 18,
      padY = 28;
    const cellW = (this.BUS.w - padX * 2) / cols;
    const cellH = (this.BUS.h - padY * 2) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = this.BUS.x + padX + c * cellW + cellW / 2;
        const y = this.BUS.y + padY + r * cellH + cellH / 2;
        this.busSlots.push({ x, y, used: false });
        this.add.rectangle(x, y, 18, 18, 0x0b0f14, 0.12).setDepth(this.DEPTH.bus);
      }
    }

    // ---- LIFTS platforma (gradient Image + dynamic body) ----
    const topOvershoot = 26;
    this.elevatorMinSurfaceY = this.FLOORS_Y[0] - topOvershoot;
    this.elevatorMaxSurfaceY = this.FLOORS_Y[4];

    this.elevatorSpeed = 58;
    this.elevatorDir = -1;

    this.elevator = this.add
      .image(this.elevatorX, this.elevatorMaxSurfaceY + this.THICK / 2, "tex_elevator")
      .setDisplaySize(this.elevatorWidth, this.THICK)
      .setDepth(this.DEPTH.elevator);

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

    spots.forEach((s) => {
      const floorSurfaceY = this.FLOORS_Y[s.floor];
      const extY = floorSurfaceY - 22;

      // uzlīme virs aparāta (bez kontūras)
      const stickerY = extY - 54;
      const sticker = this.add.rectangle(s.x, stickerY, 14, 14, 0xb42020, 0.85).setDepth(this.DEPTH.stickers);

      const slot = { x: s.x, y: extY, sticker, used: false };
      this.slots.push(slot);

      const ex = this.makeExtinguisher(s.x, extY, "NOK");
      ex.setDepth(this.DEPTH.ext);

      ex.setData("held", false);
      ex.setData("slotRef", null);
      ex.setData("inBus", false);
      ex.setData("busIndex", -1);

      this.setExtState(ex, "NOK");
      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    this.totalCount = this.slots.length;

    // ---- UI (bez fona) + lielāki fonti + pārlikts "Gatavs" uz labo augšu ----
    const uiStyle = this.uiStylePlain(); // fontSize jau palielināts funkcijā

    this.timeText = this.add
      .text(12, 10, "Laiks: 00:00", uiStyle)
      .setDepth(this.DEPTH.ui);

    this.readyText = this.add
      .text(W - 12, 10, `Gatavs: 0/${this.totalCount}`, uiStyle)
      .setOrigin(1, 0)
      .setDepth(this.DEPTH.ui);

    // ---- Kontroles (telefons) ----
    this.createPortraitControls();

    // ---- EXIT poga pa vidu kontroles zonā ----
    this.createExitButton();

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

    this.add
      .rectangle(W / 2, areaTop + areaH / 2, W, areaH, 0x081018, 0.95)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.controls);

    const R = 46;

    const mkBtn = (cx, cy, label) => {
      const circle = this.add
        .circle(cx, cy, R, 0x142334, 1)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls + 1)
        .setInteractive({ useHandCursor: true });

      const t = this.add
        .text(cx, cy, label, {
          fontFamily: "Arial",
          fontSize: "26px",
          color: "#e7edf5",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls + 2);

      circle._label = t;
      return circle;
    };

    const leftX = 70;
    const yMid = areaTop + areaH / 2;

    const btnLeft = mkBtn(leftX, yMid - 45, "←");
    const btnDown = mkBtn(leftX, yMid + 45, "↓");

    const righ
