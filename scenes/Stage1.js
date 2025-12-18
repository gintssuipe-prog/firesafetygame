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

    // buss
    this.busStorage = [];
    this.BUS_CAPACITY = 6;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ===== Layout =====
    this.controlsH = 190;
    this.playH = H - this.controlsH;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

    // ===== Depth =====
    this.DEPTH = {
      stickers: 5,
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

    // ===== Floors =====
    const topY = 70;
    const bottomY = this.playH - 70;
    this.FLOORS_Y = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      this.FLOORS_Y.push(Phaser.Math.Linear(topY, bottomY, t));
    }
    this.THICK = 18;

    // ===== Platforms (MĀJA KĀ BIJA) =====
    this.platforms = this.physics.add.staticGroup();

    // apakšējais stāvs pilns
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // lifta šahta labajā pusē
    this.elevatorWidth = 70;
    this.elevatorX = Math.round(W * 0.62);
    this.shaftGapW = this.elevatorWidth + 26;

    const rightStartX = Math.round(W * 0.42);
    const holeL = this.elevatorX - this.shaftGapW / 2;
    const holeR = this.elevatorX + this.shaftGapW / 2;

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      const seg1W = holeL - rightStartX;
      if (seg1W > 12) this.addPlatform(rightStartX, y, seg1W, this.THICK);

      const seg2X = holeR;
      const seg2W = W - holeR;
      if (seg2W > 12) this.addPlatform(seg2X, y, seg2W, this.THICK);
    }

    // ===== BUSS =====
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
      this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h
    );

    // buss slots (6)
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
      }
    }

    // ===== LIFTS =====
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

    // ===== PLAYER =====
    this.player = this.makePlayer(Math.round(W * 0.22), this.FLOORS_Y[4]);
    this.player.setDepth(this.DEPTH.player);

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(-14, -54);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // ===== EXTINGUISHERS + SLOTS =====
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const spots = this.makeSpotsDefault(W);

    spots.forEach(s => {
      const floorY = this.FLOORS_Y[s.floor];
      const extY = floorY - 22;

      const sticker = this.add.rectangle(
        s.x, extY - 24, 14, 14, 0xb42020, 0.85
      ).setStrokeStyle(2, 0xff6b6b).setDepth(this.DEPTH.stickers);

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

    // ===== UI =====
    this.readyText = this.add.text(
      12, 10, `Gatavs: 0/${this.totalCount}`, this.uiStyle()
    ).setDepth(this.DEPTH.ui);

    this.timeText = this.add.text(
      12, 42, "Laiks: 00:00", this.uiStyle()
    ).setDepth(this.DEPTH.ui);

    // ===== Controls =====
    this.createPortraitControls();
    this.cursors = this.input.keyboard.createCursorKeys();

    this.startTimeMs = this.time.now;
  }

  // ===== UPDATE =====
  update(time, delta) {
    if (!this.finished) {
      const sec = Math.floor((time - this.startTimeMs) / 1000);
      const mm = String(Math.floor(sec / 60)).padStart(2, "0");
      const ss = String(sec % 60).padStart(2, "0");
      this.timeText.setText(`Laiks: ${mm}:${ss}`);
    }

    // lifts
    const dt = delta / 1000;
    const minY = this.elevatorMinSurfaceY + this.THICK / 2;
    const maxY = this.elevatorMaxSurfaceY + this.THICK / 2;

    this.elevator.y += this.elevatorSpeed * dt * this.elevatorDir;
    if (this.elevator.y <= minY) { this.elevator.y = minY; this.elevatorDir = 1; }
    if (this.elevator.y >= maxY) { this.elevator.y = maxY; this.elevatorDir = -1; }

    this.elevator.body.updateFromGameObject();
    const elevDY = this.elevator.y - this.prevElevY;
    this.prevElevY = this.elevator.y;

    // kustība
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

    const up = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.consumeTouch("up");
    const down = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.consumeTouch("down");

    if (up) this.tryPickup();
    if (down) this.tryDrop();

    if (this.carrying) {
      this.carrying.x = this.player.x + 24 * this.facing;
      this.carrying.y = this.player.y - 30;
      this.carrying.setDepth(this.DEPTH.carry);
    }

    const onElev =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (onElev) {
      this.player.y += elevDY;
      if (this.carrying) this.carrying.y += elevDY;
    }
  }

  // ===== GAMEPLAY =====
  tryPickup() {
    if (this.carrying) return;

    let best = null, bestD = 999;
    const px = this.player.x;
    const py = this.player.y - 20;

    this.extinguishers.getChildren().forEach(ex => {
      if (ex.getData("held")) return;
      const d = Phaser.Math.Distance.Between(px, py, ex.x, ex.y);
      if (d < 58 && d < bestD) { best = ex; bestD = d; }
    });

    if (!best) return;

    const slot = best.getData("slotRef");
    if (slot) {
      slot.used = false;
      slot.sticker.setFillStyle(0xb42020, 0.85);
      best.setData("slotRef", null);
      this.readyCount--;
      this.readyText.setText(`Gatavs: ${this.readyCount}/${this.totalCount}`);
    }

    best.setData("held", true);
    best.body.enable = false;
    this.carrying = best;
  }

  tryDrop() {
    if (!this.carrying) return;
    const ex = this.carrying;

    ex.setData("held", false);
    ex.body.enable = true;
    ex.x = this.player.x + 18 * this.facing;
    ex.y = this.player.y - 22;

    // BUSS
    if (Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y)) {
      const free = this.busSlots.findIndex(s => !s.used);
      if (free !== -1 && this.busStorage.length < this.BUS_CAPACITY) {
        this.busSlots[free].used = true;
        this.busStorage.push(ex);
        ex.setData("inBus", true);
        ex.setData("busIndex", free);
        this.setExtState(ex, "OK");
        ex.body.enable = false;
        ex.x = this.busSlots[free].x;
        ex.y = this.busSlots[free].y;
        this.carrying = null;
        return;
      }
    }

    // SLOT
    if (ex.getData("state") === "OK") {
      const slot = this.findSlotUnder(ex.x, ex.y);
      if (slot && !slot.used) {
        slot.used = true;
        slot.sticker.setFillStyle(0x2aa84a, 0.95);
        ex.body.enable = false;
        ex.x = slot.x;
        ex.y = slot.y;
        ex.setData("slotRef", slot);
        this.readyCount++;
        this.readyText.setText(`Gatavs: ${this.readyCount}/${this.totalCount}`);
        if (this.readyCount >= this.totalCount) this.finishGame();
        this.carrying = null;
        return;
      }
    }

    this.carrying = null;
  }

  findSlotUnder(x, y) {
    return this.slots.find(s =>
      Phaser.Math.Distance.Between(x, y, s.x, s.y) < 26
    );
  }

  // ===== HELPERS =====
  makeSpotsDefault(W) {
    const xRight = Math.round(W * 0.90);
    const xLeft = Math.round(W * 0.78);

    return [
      { floor: 0, x: xLeft }, { floor: 0, x: xRight },
      { floor: 1, x: xLeft }, { floor: 1, x: xRight },
      { floor: 2, x: xLeft }, { floor: 2, x: xRight },
      { floor: 3, x: xLeft }, { floor: 3, x: xRight },
      { floor: 4, x: xLeft }, { floor: 4, x: xRight }
    ];
  }

  uiStyle() {
    return {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    };
  }

  addPlatform(x, y, w, h) {
    const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x0f5f7a)
      .setStrokeStyle(2, 0x0b0f14)
      .setDepth(this.DEPTH.platforms);
    this.physics.add.existing(r, true);
    this.platforms.add(r);
  }

  makePlayer(x, y) {
    const c = this.add.container(x, y);
    c.add(this.add.rectangle(0, -31, 30, 44, 0x0b0b0b));
    c.add(this.add.rectangle(0, -16, 30, 8, 0x00ff66));
    c.add(this.add.circle(0, -58, 11, 0xffe2b8));
    return c;
  }

  makeExtinguisher(x, y, label) {
    const c = this.add.container(x, y);
    const shell = this.add.rectangle(0, 0, 24, 38, 0xff4040);
    const badge = this.add.rectangle(0, 7, 24, 16, 0x0b0f14);
    const txt = this.add.text(0, 7, label, {
      fontSize: "11px", color: "#fff", fontStyle: "bold"
    }).setOrigin(0.5);
    c.add([shell, badge, txt]);
    this.physics.add.existing(c);
    c.body.setSize(24, 38);
    c.body.setOffset(-12, -19);
    c.setData("txt", txt);
    c.setData("badge", badge);
    return c;
  }

  setExtState(ext, state) {
    ext.setData("state", state);
    ext.getData("txt").setText(state);
    if (state === "OK") {
      ext.getData("badge").setFillStyle(0x00ff66);
      ext.getData("txt").setColor("#0b0f14");
    }
  }

  createPortraitControls() {
    const W = this.scale.width;
    const areaTop = this.playH;
    const areaH = this.controlsH;

    this.add.rectangle(W / 2, areaTop + areaH / 2, W, areaH, 0x081018, 0.95)
      .setDepth(this.DEPTH.controls);

    const mk = (x, y, t) => {
      const c = this.add.circle(x, y, 46, 0x142334)
        .setStrokeStyle(3, 0x2a5a7a)
        .setInteractive()
        .setDepth(this.DEPTH.controls);
      const tx = this.add.text(x, y, t, {
        fontSize: "26px", color: "#e7edf5", fontStyle: "bold"
      }).setOrigin(0.5).setDepth(this.DEPTH.controls + 1);
      c._t = tx;
      return c;
    };

    const y = areaTop + areaH / 2;
    const L = mk(70, y - 45, "←");
    const D = mk(70, y + 45, "↓");
    const R = mk(W - 70, y - 45, "→");
    const U = mk(W - 70, y + 45, "↑");

    const hold = (b, k) => {
      b.on("pointerdown", () => this.touch[k] = true);
      b.on("pointerup", () => this.touch[k] = false);
      b.on("pointerout", () => this.touch[k] = false);
    };

    const tap = (b, k) => {
      b.on("pointerdown", () => this.touch[k] = true);
      b.on("pointerup", () => this.touch[k] = false);
    };

    hold(L, "left"); hold(R, "right");
    tap(U, "up"); tap(D, "down");
  }

  consumeTouch(k) {
    if (this.touch[k]) {
      this.touch[k] = false;
      return true;
    }
    return false;
  }

  finishGame() {
    this.finished = true;
  }
}
