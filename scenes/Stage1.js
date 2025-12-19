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

    // ✅ gradient-tekstūras + pogu tekstūras
    this.buildGradientTextures();
    this.buildControlTextures();

    // ---- Grīdas (5 stāvi) ----
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
    this.add.image(wheelX, wheelY, "tex_wheelHub").setDisplaySize(28, 28).setDepth(this.DEPTH.bus - 1);

    // bus “zona”
    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // 6 vietas busā
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

    // ---- LIFTS platforma ----
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

    // ---- Aparāti + sloti ----
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const spots = this.makeSpotsPortrait(W);

    spots.forEach((s) => {
      const floorSurfaceY = this.FLOORS_Y[s.floor];
      const extY = floorSurfaceY - 22;

      // uzlīme virs aparāta
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

    // ---- UI ----
    this.readyText = this.add.text(12, 10, `Gatavs: 0/${this.totalCount}`, this.uiStyle()).setDepth(this.DEPTH.ui);
    this.timeText = this.add.text(12, 42, "Laiks: 00:00", this.uiStyle()).setDepth(this.DEPTH.ui);

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

    // panelis
    this.add
      .rectangle(W / 2, areaTop + areaH / 2, W, areaH, 0x081018, 0.95)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.controls);

    // pogu izmēri (kā bildē)
    const bw = 150;
    const bh = 86;

    const leftCX = 110;
    const rightCX = W - 110;

    const topY = areaTop + 52;
    const bottomY = areaTop + 138;

    // helper: izveido 3D podziņu (shadow + face + saturs)
    const mk3DBtn = (cx, cy) => {
      const cont = this.add.container(cx, cy).setScrollFactor(0).setDepth(this.DEPTH.controls + 2);
      cont.setSize(bw, bh);

      const shadow = this.add.image(0, 6, "tex_btnShadow").setDisplaySize(bw, bh).setAlpha(0.65);
      const face = this.add.image(0, 0, "tex_btnFace").setDisplaySize(bw, bh);

      cont.add([shadow, face]);

      // Interactive laukums (pats konteiners)
      cont.setInteractive(new Phaser.Geom.Rectangle(-bw / 2, -bh / 2, bw, bh), Phaser.Geom.Rectangle.Contains);

      cont._shadow = shadow;
      cont._face = face;
      cont._pressed = false;

      const pressIn = () => {
        if (cont._pressed) return;
        cont._pressed = true;

        cont._face.setTexture("tex_btnFacePressed");
        cont._shadow.setAlpha(0.35);

        this.tweens.add({
          targets: cont,
          y: cy + 5,
          scaleX: 0.985,
          scaleY: 0.985,
          duration: 70
        });
      };

      const pressOut = () => {
        if (!cont._pressed) return;
        cont._pressed = false;

        cont._face.setTexture("tex_btnFace");
        cont._shadow.setAlpha(0.65);

        this.tweens.add({
          targets: cont,
          y: cy,
          scaleX: 1,
          scaleY: 1,
          duration: 90
        });
      };

      cont._pressIn = pressIn;
      cont._pressOut = pressOut;

      return cont;
    };

    // helper: bultiņa ar “outline” (kā bildē)
    const mkArrowText = (x, y, s) => {
      return this.add
        .text(x, y, s, {
          fontFamily: "Arial",
          fontSize: "44px",
          color: "#1f2a33",
          fontStyle: "bold",
          stroke: "#0b1a22",
          strokeThickness: 5
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls + 4);
    };

    const mkLabel = (x, y, s) => {
      return this.add
        .text(x, y, s, {
          fontFamily: "Arial",
          fontSize: "34px",
          color: "#ffffff",
          fontStyle: "normal"
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls + 4);
    };

    // --- LEFT TOP (←) ---
    const btnLeft = mk3DBtn(leftCX, topY);
    const leftArrow = mkArrowText(leftCX, topY, "←");

    // --- LEFT BOTTOM (↓ + NOLIEC) ---
    const btnDown = mk3DBtn(leftCX, bottomY);
    const downArrow = mkArrowText(leftCX, bottomY - 20, "↓").setFontSize(40);
    const downLabel = mkLabel(leftCX, bottomY + 10, "NOLIEC").setFontSize(34);

    // --- RIGHT TOP (→) ---
    const btnRight = mk3DBtn(rightCX, topY);
    const rightArrow = mkArrowText(rightCX, topY, "→");

    // --- RIGHT BOTTOM (PACEL + ↑) ---
    const btnUp = mk3DBtn(rightCX, bottomY);
    const upLabel = mkLabel(rightCX, bottomY - 10, "PACEL").setFontSize(34);
    const upArrow = mkArrowText(rightCX, bottomY + 20, "↑").setFontSize(40);

    // lai saturs spiežoties iet līdzi konteineram:
    btnLeft.add(leftArrow);
    btnDown.add(downArrow);
    btnDown.add(downLabel);
    btnRight.add(rightArrow);
    btnUp.add(upLabel);
    btnUp.add(upArrow);

    const bindHold = (btn, key) => {
      btn.on("pointerdown", () => {
        this.touch[key] = true;
        btn._pressIn();
      });
      btn.on("pointerup", () => {
        this.touch[key] = false;
        btn._pressOut();
      });
      btn.on("pointerout", () => {
        this.touch[key] = false;
        btn._pressOut();
      });
      btn.on("pointercancel", () => {
        this.touch[key] = false;
        btn._pressOut();
      });
    };

    const bindTap = (btn, key) => {
      btn.on("pointerdown", () => {
        this.touch[key] = true;
        btn._pressIn();
      });
      btn.on("pointerup", () => {
        btn._pressOut();
      });
      btn.on("pointerout", () => {
        btn._pressOut();
      });
      btn.on("pointercancel", () => {
        btn._pressOut();
      });
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

    this.extinguishers.getChildren().forEach((ex) => {
      if (!ex.active) return;
      if (ex.getData("held")) return;

      const d = Phaser.Math.Distance.Between(px, py, ex.x, ex.y);
      if (d < 58 && d < bestD) {
        best = ex;
        bestD = d;
      }
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
      this.busStorage = this.busStorage.filter((x) => x !== best);
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
      const freeIndex = this.busSlots.findIndex((s) => !s.used);

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

    this.add
      .text(W / 2, 260, "Līmenis pabeigts!", {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(this.DEPTH.overlay + 1);

    this.add
      .text(W / 2, 320, `Jūsu laiks: ${mm} min ${ss} sek`, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#e7edf5"
      })
      .setOrigin(0.5)
      .setDepth(this.DEPTH.overlay + 1);
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
    const img = this.add
      .image(xLeft + width / 2, surfaceY + thickness / 2, "tex_platform")
      .setDisplaySize(width, thickness)
      .setDepth(this.DEPTH.platforms);

    this.physics.add.existing(img, true);
    this.platforms.add(img);
  }

  makePlayer(x, surfaceY) {
    const c = this.add.container(x, surfaceY);

    const body = this.add.image(0, -31, "tex_playerBody").setDisplaySize(30, 44);
    const stripe = this.add.rectangle(0, -16, 30, 8, 0x00ff66, 1);
    const head = this.add.image(0, -58, "tex_head").setDisplaySize(22, 22);

    c.add([body, stripe, head]);
    return c;
  }

  makeExtinguisher(x, y, label) {
    const c = this.add.container(x, y);

    const shell = this.add.image(0, 0, "tex_extShell").setDisplaySize(24, 38);

    // pelēkā virsdaļa/šļūtene ar gradientu (3D)
    const hose = this.add.image(0, -26, "tex_extHose").setDisplaySize(36, 10);
    hose.setRotation(Phaser.Math.DegToRad(-18));

    // šļūtenes gals/nozzle (melns ar gradientu)
    const nozzleTip = this.add.image(18, -32, "tex_extNozzle").setDisplaySize(14, 8);
    nozzleTip.setRotation(Phaser.Math.DegToRad(-18));

    const handleBase = this.add.rectangle(-4, -22, 16, 10, 0x7f8b96, 1);

    // badge
    const badge = this.add.rectangle(0, 7, 24, 16, 0x0b0f14, 0.9);

    const txt = this.add
      .text(0, 7, label, {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    c.add([shell, hose, nozzleTip, handleBase, badge, txt]);

    this.physics.add.existing(c);
    c.body.setSize(24, 38);
    c.body.setOffset(-12, -19);

    c.setData("txt", txt);
    c.setData("badge", badge);

    this.setExtState(c, "NOK");
    return c;
  }

  setExtState(ext, state) {
    ext.setData("state", state);
    ext.getData("txt").setText(state);

    const badge = ext.getData("badge");
    const txt = ext.getData("txt");

    txt.setColor("#ffffff");

    if (state === "OK") {
      badge.setFillStyle(0x0a8f3f);
      badge.setAlpha(0.95);
    } else {
      badge.setAlpha(0);
      badge.setFillStyle(0xff4040);
    }
  }

  makeSpotsPortrait(W) {
    const xLeft = 62;
    const xLeftTop = 180;
    const xRight = Math.round(W * 0.9);
    const xTopExtra = Math.round(W * 0.8);

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

  // ---------------- Gradient textures (fake 3D) ----------------
  buildGradientTextures() {
    const ensure = (key, w, h, painter) => {
      if (this.textures.exists(key)) return;
      const tx = this.textures.createCanvas(key, w, h);
      const ctx = tx.getContext();
      painter(ctx, w, h);
      tx.refresh();
    };

    ensure("tex_platform", 64, 16, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "#1a8fb3");
      g.addColorStop(0.45, "#0f5f7a");
      g.addColorStop(0.7, "#0c465a");
      g.addColorStop(1.0, "#083343");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    ensure("tex_elevator", 64, 16, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "#8b949e");
      g.addColorStop(0.5, "#5b636b");
      g.addColorStop(1.0, "#2d333b");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    ensure("tex_bus", 128, 64, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "#ffffff");
      g.addColorStop(0.35, "#eef3f8");
      g.addColorStop(0.68, "#d0d9e4");
      g.addColorStop(1.0, "#94a2b4");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      const g2 = ctx.createLinearGradient(0, 0, w, 0);
      g2.addColorStop(0.0, "rgba(255,255,255,0)");
      g2.addColorStop(0.5, "rgba(255,255,255,0.35)");
      g2.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, Math.round(h * 0.22), w, Math.round(h * 0.22));
    });

    ensure("tex_playerBody", 32, 48, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0.0, "#050607");
      g.addColorStop(0.55, "#23272b");
      g.addColorStop(1.0, "#050607");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    ensure("tex_head", 32, 32, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2,
        cy = h / 2;
      const rg = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, 16);
      rg.addColorStop(0.0, "#fff4dd");
      rg.addColorStop(0.45, "#ffe2b8");
      rg.addColorStop(1.0, "#caa27c");

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });

    ensure("tex_extShell", 32, 48, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0.0, "#8e0a0a");
      g.addColorStop(0.35, "#ff2b2b");
      g.addColorStop(0.55, "#ff5a5a");
      g.addColorStop(1.0, "#8e0a0a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    });

    ensure("tex_extHose", 64, 16, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0.0, "#2c333b");
      g.addColorStop(0.25, "#aab6c2");
      g.addColorStop(0.5, "#d9e0e7");
      g.addColorStop(0.75, "#7c8793");
      g.addColorStop(1.0, "#1c232b");
      ctx.fillStyle = g;
      ctx.fillRect(2, 5, w - 4, 6);

      const g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0.0, "rgba(255,255,255,0)");
      g2.addColorStop(0.5, "rgba(255,255,255,0.22)");
      g2.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(2, 4, w - 4, 8);
    });

    ensure("tex_extNozzle", 32, 16, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0.0, "#0a0a0a");
      g.addColorStop(0.4, "#2a2a2a");
      g.addColorStop(0.7, "#141414");
      g.addColorStop(1.0, "#050505");
      ctx.fillStyle = g;

      const x = 4,
        y = 4,
        rw = w - 8,
        rh = h - 8;
      ctx.fillRect(x, y, rw, rh);

      const g2 = ctx.createLinearGradient(0, 0, 0, h);
      g2.addColorStop(0.0, "rgba(255,255,255,0.18)");
      g2.addColorStop(0.5, "rgba(255,255,255,0)");
      g2.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = g2;
      ctx.fillRect(x, y, rw, rh);
    });

    ensure("tex_wheel", 64, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2,
        cy = h / 2;
      const rg = ctx.createRadialGradient(cx - 8, cy - 8, 6, cx, cy, 30);
      rg.addColorStop(0.0, "#4a4a4a");
      rg.addColorStop(0.6, "#1a1a1a");
      rg.addColorStop(1.0, "#050505");

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });

    ensure("tex_wheelHub", 64, 64, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2,
        cy = h / 2;

      const rg = ctx.createRadialGradient(cx - 6, cy - 6, 4, cx, cy, 22);
      rg.addColorStop(0.0, "#ffffff");
      rg.addColorStop(0.55, "#bcbcbc");
      rg.addColorStop(1.0, "#3a3a3a");

      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    });
  }

  // ---------------- Control textures (3D buttons) ----------------
  buildControlTextures() {
    const ensure = (key, w, h, painter) => {
      if (this.textures.exists(key)) return;
      const tx = this.textures.createCanvas(key, w, h);
      const ctx = tx.getContext();
      painter(ctx, w, h);
      tx.refresh();
    };

    const roundRect = (ctx, x, y, w, h, r) => {
      const rr = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    };

    // Shadow (tumšs, mīksts)
    ensure("tex_btnShadow", 320, 200, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      roundRect(ctx, 18, 18, w - 36, h - 36, 44);
      ctx.fill();
    });

    // Face (normāls)
    ensure("tex_btnFace", 320, 200, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);

      // pamatkrāsa + gradients
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "#1c6c8b");
      g.addColorStop(0.45, "#15617e");
      g.addColorStop(1.0, "#0f4f66");

      ctx.fillStyle = g;
      roundRect(ctx, 10, 10, w - 20, h - 20, 46);
      ctx.fill();

      // tumšāka “mala” (ļoti subtila)
      ctx.fillStyle = "rgba(6,22,30,0.35)";
      roundRect(ctx, 10, 10, w - 20, h - 20, 46);
      ctx.fill("evenodd");
    });

    // Face (pressed) – nedaudz tumšāks + mazāk spīduma
    ensure("tex_btnFacePressed", 320, 200, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);

      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0.0, "#155a74");
      g.addColorStop(0.55, "#124f66");
      g.addColorStop(1.0, "#0d3f52");

      ctx.fillStyle = g;
      roundRect(ctx, 10, 10, w - 20, h - 20, 46);
      ctx.fill();
    });
  }
}
