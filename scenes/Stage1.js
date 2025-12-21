// izvilkts no kapa, resnas kājas, kantaina gaiša cepure
// Stage1.js — stabila versija (ROLLBACK) + cilvēciņam vektoru...pure/rokas/kājas + kāju “tipināšana”  kantaina cepure aizgaaja
// ✅ Saglabāts: stabilais “plikpauris” + plakanais buss (tex_bus kā vakardien)
// ✅ Cepure: 2 taisnstūri (kronis + nags), vektors, tumša (ne pilnīgi melna), tuvāk galvai
// ✅ Rokas: šaurāki trīsstūri
// ✅ Kājas: kluči ar tipināšanas animāciju skrienot

class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");

    this.carrying = null;
    this.readyCount = 0;
    this.totalCount = 10;

    this.touch = { left: false, right: false, up: false, down: false };

    // anim
    this.runT = 0; // “tipināšanas” fāze
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ---- Layout: augšā spēles laukums, apakšā pogas ----
    this.controlsH = 190;
    this.playH = H - this.controlsH;

    // fons
    this.cameras.main.setBackgroundColor("#101a24");

    // --- SFX (skaņas) ---
    // Ieliec failus šeit:
    //   assets/audio/pickup.mp3
    //   assets/audio/drop.mp3
    // Ja nosaukumi atšķiras – nomaini ceļus zemāk.
    this.sfx = this.sfx || {};

    const needPickup = !this.cache.audio.exists("sfx_pickup");
    const needDrop = !this.cache.audio.exists("sfx_drop");

    if (needPickup) this.load.audio("sfx_pickup", "assets/audio/pickup.mp3");
    if (needDrop) this.load.audio("sfx_drop", "assets/audio/drop.mp3");

    const makeSfx = () => {
      // Audio var nesākties līdz pirmajai lietotāja darbībai – tas ir ok.
      if (!this.sfx.pickup && this.cache.audio.exists("sfx_pickup")) {
        this.sfx.pickup = this.sound.add("sfx_pickup", { volume: 0.8 });
      }
      if (!this.sfx.drop && this.cache.audio.exists("sfx_drop")) {
        this.sfx.drop = this.sound.add("sfx_drop", { volume: 0.8 });
      }
    };

    if (needPickup || needDrop) {
      this.load.once("complete", makeSfx);
      this.load.start();
    } else {
      makeSfx();
    }

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

    // ---- Gravitācija ----
    this.physics.world.gravity.y = 900;

    // ---- Pasaule robežas (tikai spēles laukums) ----
    this.physics.world.setBounds(0, 0, W, this.playH);
    this.cameras.main.setBounds(0, 0, W, this.playH);

    // ---- Grīda + platformas ----
    this.THICK = 18;
    this.FLOORS_Y = [
      Math.round(this.playH * 0.20),
      Math.round(this.playH * 0.35),
      Math.round(this.playH * 0.50),
      Math.round(this.playH * 0.65),
      Math.round(this.playH * 0.86)
    ];

    // platformu grupa
    this.platforms = this.physics.add.staticGroup();

    // ārējā “grīda” (apakšējā)
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // iekšējie stāvi ar šahtām
    const holeW = 92;
    const holeX = Math.round(W * 0.20);

    // vietām noņemam šauro segmentu (lai būtu “tīrāk”)
    const REMOVE_NARROW_SEG_ON = new Set([2]);

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];
      const holeL = holeX;
      const holeR = holeX + holeW;

      // kreisais gabals
      if (holeL > 12) this.addPlatform(0, y, holeL, this.THICK);

      // labais gabals, ar “mazo” segmentu
      const rightStartX = holeR;

      const seg1W = holeL - rightStartX;
      if (seg1W > 12 && !REMOVE_NARROW_SEG_ON.has(i)) {
        // “mazais zilais plauktiņš” pie šahtas (noņemam izvēlētos)
        this.addPlatform(rightStartX, y, seg1W, this.THICK);
      }

      const seg2X = holeR;
      const seg2W = W - holeR;
      if (seg2W > 12) this.addPlatform(seg2X, y, seg2W, this.THICK);
    }

    // ---- BUSS (ROLLBACK: vakardienas stabilais gradients) ----
    this.BUS = { w: Math.round(W * 0.40), h: 105 };
    this.BUS.x = 0;
    this.BUS.y = Math.round(this.FLOORS_Y[4] - this.BUS.h + 10);

    // zona, kur “krāmēt busā”
    this.busZone = new Phaser.Geom.Rectangle(
      this.BUS.x + 10,
      this.BUS.y + 10,
      this.BUS.w - 20,
      this.BUS.h - 20
    );

    // buss kā sprite no ģenerētas tekstūras
    this.bus = this.add
      .image(this.BUS.x + this.BUS.w / 2, this.BUS.y + this.BUS.h / 2, "tex_bus")
      .setDepth(this.DEPTH.bus);

    // busa slots (iekšā)
    this.BUS_CAPACITY = 6;
    this.busSlots = [];
    this.busStorage = [];

    const padX = 18;
    const padY = 18;
    const cols = 3;
    const rows = 2;
    const cellW = (this.busZone.width - padX * 2) / cols;
    const cellH = (this.busZone.height - padY * 2) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = this.busZone.x + padX + cellW * (c + 0.5);
        const y = this.busZone.y + padY + cellH * (r + 0.5);
        this.busSlots.push({ x, y, used: false });
      }
    }

    // ---- Šahta (lifts) ----
    this.shaftX = holeX + holeW / 2;

    // elevator platforma (kustīga)
    this.elevator = this.add
      .rectangle(this.shaftX, this.FLOORS_Y[4] - 44, holeW - 10, 14, 0x3a546f)
      .setDepth(this.DEPTH.elevator);

    this.physics.add.existing(this.elevator, true);
    this.elevator.body.setSize(holeW - 10, 14);

    // kustības parametri
    this.elevatorFloor = 4;
    this.elevatorMoving = false;

    // ---- Spēlētājs (cilvēciņš) ----
    this.player = this.add.container(Math.round(W * 0.55), this.FLOORS_Y[4] - 60);
    this.player.setDepth(this.DEPTH.player);

    // ķermenis no vektoriem / tekstūrām
    this.buildPlayerVisual();

    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setBounce(0);
    this.player.body.setSize(26, 44);
    this.player.body.setOffset(-13, -44);

    // virziens
    this.facing = 1;

    // ---- Ugunsdzēšamie ----
    this.extinguishers = this.physics.add.group();

    // izkaisām 10 gab.
    const spawnPoints = [
      { x: Math.round(W * 0.55), y: this.FLOORS_Y[4] - 40 },
      { x: Math.round(W * 0.70), y: this.FLOORS_Y[4] - 40 },
      { x: Math.round(W * 0.85), y: this.FLOORS_Y[4] - 40 },

      { x: Math.round(W * 0.55), y: this.FLOORS_Y[3] - 40 },
      { x: Math.round(W * 0.75), y: this.FLOORS_Y[3] - 40 },

      { x: Math.round(W * 0.55), y: this.FLOORS_Y[2] - 40 },
      { x: Math.round(W * 0.80), y: this.FLOORS_Y[2] - 40 },

      { x: Math.round(W * 0.55), y: this.FLOORS_Y[1] - 40 },
      { x: Math.round(W * 0.78), y: this.FLOORS_Y[1] - 40 },

      { x: Math.round(W * 0.55), y: this.FLOORS_Y[0] - 40 }
    ];

    for (let i = 0; i < this.totalCount; i++) {
      const p = spawnPoints[i % spawnPoints.length];

      const ex = this.add.image(p.x, p.y, "tex_ext_ok").setDepth(this.DEPTH.ext);
      this.physics.add.existing(ex);
      ex.body.setCollideWorldBounds(true);
      ex.body.setBounce(0);
      ex.body.setSize(18, 34);
      ex.body.setOffset(-9, -17);

      ex.setData("held", false);
      ex.setData("slotRef", null);
      ex.setData("inBus", false);
      ex.setData("busIndex", -1);

      // stāvoklis (OK / BAD)
      this.setExtState(ex, "BAD");

      this.extinguishers.add(ex);
    }

    // ---- Slotu vietas (pareizās vietas) ----
    this.slots = [];
    const slotY = this.FLOORS_Y[0] - 42;
    const slotX0 = Math.round(W * 0.62);
    const slotGap = 32;

    for (let i = 0; i < this.totalCount; i++) {
      const x = slotX0 + (i % 6) * slotGap;
      const y = slotY + Math.floor(i / 6) * 44;

      const s = this.add.image(x, y, "tex_slot").setDepth(this.DEPTH.stickers);
      s.setAlpha(0.85);
      s.used = false;
      this.slots.push(s);
    }

    // ---- Sadursmes ----
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    // ---- Input ----
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S
    });

    // ---- UI apakšā ----
    const uiY = this.playH;

    this.add
      .rectangle(W / 2, uiY + this.controlsH / 2, W, this.controlsH, 0x0c121a)
      .setDepth(this.DEPTH.ui);

    // HUD augšā
    this.readyText = this.add
      .text(16, 12, `Gatavs: ${this.readyCount}/${this.totalCount}`, this.uiStylePlain())
      .setDepth(this.DEPTH.ui);

    // POGAS (touch)
    const btnY = uiY + 60;
    this.makeTouchButtons(W, btnY);

    // Pamācība
    this.helpText = this.add
      .text(
        16,
        uiY + 118,
        "W: pacelt/paņemt (lifts uz augšu)\nS: nolikt (lifts uz leju)\nA/D: kustība\nSavāc un saliec ugunsdzēšamos pareizajās vietās!",
        this.uiStyleSmall()
      )
      .setDepth(this.DEPTH.ui);

    // EXIT poga (kā bija)
    this.makeExitButton(W, uiY);

    // ---- Elevator vadība (kustība starp stāviem) ----
    this.input.keyboard.on("keydown-W", () => {
      // W = pacelt / lifts uz augšu, bet spēlē: pickup
      this.tryPickup();
    });

    this.input.keyboard.on("keydown-S", () => {
      // S = nolikt
      this.tryDrop();
    });
  }

  update(time, delta) {
    const W = this.scale.width;

    // touch stāvokļi
    const leftPressed = this.keys.left.isDown || this.touch.left;
    const rightPressed = this.keys.right.isDown || this.touch.right;
    const upPressed = Phaser.Input.Keyboard.JustDown(this.keys.up) || this.touch.up;
    const downPressed = Phaser.Input.Keyboard.JustDown(this.keys.down) || this.touch.down;

    // reset “one-shot” touch pogām
    this.touch.up = false;
    this.touch.down = false;

    const speed = 220;

    if (leftPressed) {
      this.player.body.setVelocityX(-speed);
      this.facing = -1;
    } else if (rightPressed) {
      this.player.body.setVelocityX(speed);
      this.facing = 1;
    } else {
      this.player.body.setVelocityX(0);
    }

    // “tipināšana” skrienot
    const moving = Math.abs(this.player.body.velocity.x) > 10;
    if (moving) {
      this.runT += delta * 0.02;
    } else {
      this.runT = 0;
    }
    this.applyLegAnim(moving);

    // W/S pickup/drop
    if (upPressed) this.tryPickup();
    if (downPressed) this.tryDrop();

    // ja nesam, turam līdzi
    if (this.carrying) {
      this.carrying.x = this.player.x + 18 * this.facing;
      this.carrying.y = this.player.y - 22;
    }

    // elevator ķermenis jāseko
    if (this.elevator && this.elevator.body) {
      this.elevator.body.position.x = this.elevator.x - this.elevator.width / 2;
      this.elevator.body.position.y = this.elevator.y - this.elevator.height / 2;
    }
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
      if (d < bestD) {
        bestD = d;
        best = ex;
      }
    });

    if (!best) return;
    if (bestD > 70) return;

    // ja bija slotā, atbrīvo slotu
    const slot = best.getData("slotRef");
    if (slot) {
      slot.used = false;
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

    // skaņa: paņem
    this.sfx?.pickup?.play();
  }

  tryDrop() {
    if (!this.carrying) return;

    // skaņa: noliek
    this.sfx?.drop?.play();

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

    // SLOTI (pareizās vietas)
    const hitSlot = this.slots.find((s) => {
      if (s.used) return false;
      const d = Phaser.Math.Distance.Between(ex.x, ex.y, s.x, s.y);
      return d < 28;
    });

    if (hitSlot) {
      hitSlot.used = true;

      ex.setData("slotRef", hitSlot);
      this.setExtState(ex, "OK");

      ex.body.enable = false;
      ex.x = hitSlot.x;
      ex.y = hitSlot.y;

      this.readyCount += 1;
      this.readyText.setText(`Gatavs: ${this.readyCount}/${this.totalCount}`);

      if (this.readyCount >= this.totalCount) {
        this.finishGame();
      }

      this.carrying = null;
      return;
    }

    // citādi vienkārši nomet
    ex.body.enable = true;
    ex.body.setVelocity(0, 0);

    this.carrying = null;
  }

  // ----------------- UI / Buttons -----------------
  makeTouchButtons(W, btnY) {
    const mkBtn = (x, label, onDown, onUp) => {
      const btn = this.add.container(x, btnY).setDepth(this.DEPTH.controls);
      const bg = this.add.rectangle(0, 0, 110, 60, 0x223141).setStrokeStyle(2, 0x3a536b);
      const tx = this.add.text(-12, -14, label, {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#dbe7f3"
      });

      btn.add([bg, tx]);
      btn.setSize(110, 60);
      btn.setInteractive(new Phaser.Geom.Rectangle(-55, -30, 110, 60), Phaser.Geom.Rectangle.Contains);

      btn.on("pointerdown", () => onDown && onDown());
      btn.on("pointerup", () => onUp && onUp());
      btn.on("pointerout", () => onUp && onUp());

      return btn;
    };

    mkBtn(70, "←", () => (this.touch.left = true), () => (this.touch.left = false));
    mkBtn(200, "→", () => (this.touch.right = true), () => (this.touch.right = false));
    mkBtn(W - 200, "W", () => (this.touch.up = true), null);
    mkBtn(W - 70, "S", () => (this.touch.down = true), null);
  }

  makeExitButton(W, uiY) {
    const btn = this.add.container(W - 80, uiY + 150).setDepth(this.DEPTH.controls);
    const bg = this.add.rectangle(0, 0, 140, 56, 0x5a1f1f).setStrokeStyle(2, 0xa34848);
    const tx = this.add.text(-44, -14, "IZIET", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff"
    });
    btn.add([bg, tx]);

    btn.setSize(140, 56);
    btn.setInteractive(new Phaser.Geom.Rectangle(-70, -28, 140, 56), Phaser.Geom.Rectangle.Contains);

    const pressIn = () => {
      bg.setFillStyle(0x7a2a2a, 1);
      btn.setScale(0.98);
    };
    const pressOut = () => {
      bg.setFillStyle(0x5a1f1f, 1);
      btn.setScale(1);
    };

    const doExit = () => {
      try {
        window.close();
      } catch (e) {}

      try {
        this.game.destroy(true);
      } catch (e) {}

      try {
        window.location.href = "about:blank";
      } catch (e) {}
    };

    btn.on("pointerdown", () => pressIn());
    btn.on("pointerup", () => {
      pressOut();
      doExit();
    });
    btn.on("pointerout", () => pressOut());
  }

  // ----------------- Helpers -----------------
  addPlatform(x, y, w, h) {
    const r = this.add.rectangle(x + w / 2, y, w, h, 0x263449).setDepth(this.DEPTH.platforms);
    this.physics.add.existing(r, true);
    r.body.setSize(w, h);
    this.platforms.add(r);
    return r;
  }

  setExtState(ex, state) {
    if (state === "OK") ex.setTexture("tex_ext_ok");
    else ex.setTexture("tex_ext_bad");
  }

  finishGame() {
    // vienkāršs “uzvaras” pārklājums
    const W = this.scale.width;

    const overlay = this.add
      .rectangle(W / 2, this.playH / 2, W, this.playH, 0x000000, 0.72)
      .setDepth(this.DEPTH.overlay);

    const msg = this.add
      .text(W / 2, this.playH / 2 - 30, "Malacis! Viss salikts pareizi ✅", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        align: "center"
      })
      .setOrigin(0.5)
      .setDepth(this.DEPTH.overlay);

    const hint = this.add
      .text(W / 2, this.playH / 2 + 20, "Vari doties atpakaļ uz izvēlni.", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#d7e6f7"
      })
      .setOrigin(0.5)
      .setDepth(this.DEPTH.overlay);

    // pēc brīža uz izvēlni
    this.time.delayedCall(1200, () => {
      this.scene.start("MainMenu");
    });
  }

  uiStyleSmall() {
    return {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    };
  }

  uiStylePlain() {
    return {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#ffffff"
    };
  }

  // --------- Tekstūras / vektori ---------
  buildGradientTextures() {
    // BUSS (plakans, stabils)
    if (!this.textures.exists("tex_bus")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 256;
      const h = 128;

      g.clear();
      g.fillStyle(0x2f5a7a, 1);
      g.fillRoundedRect(0, 0, w, h, 10);

      g.fillStyle(0x23445e, 1);
      g.fillRoundedRect(12, 16, w - 24, 50, 10);

      g.fillStyle(0x1c3447, 1);
      g.fillRoundedRect(12, 74, w - 24, 40, 10);

      g.generateTexture("tex_bus", w, h);
      g.destroy();
    }

    // slot
    if (!this.textures.exists("tex_slot")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 28;
      const h = 40;

      g.clear();
      g.fillStyle(0x184059, 1);
      g.fillRoundedRect(0, 0, w, h, 6);

      g.lineStyle(2, 0x74c0ff, 1);
      g.strokeRoundedRect(2, 2, w - 4, h - 4, 6);

      g.generateTexture("tex_slot", w, h);
      g.destroy();
    }

    // extinguisher OK
    if (!this.textures.exists("tex_ext_ok")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 20;
      const h = 36;

      g.clear();
      g.fillStyle(0xe85b5b, 1);
      g.fillRoundedRect(0, 6, w, h - 6, 6);

      g.fillStyle(0xffe0e0, 1);
      g.fillRect(4, 16, w - 8, 6);

      g.fillStyle(0x2a2a2a, 1);
      g.fillRect(4, 0, w - 8, 6);

      g.generateTexture("tex_ext_ok", w, h);
      g.destroy();
    }

    // extinguisher BAD
    if (!this.textures.exists("tex_ext_bad")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 20;
      const h = 36;

      g.clear();
      g.fillStyle(0xb63f3f, 1);
      g.fillRoundedRect(0, 6, w, h - 6, 6);

      g.fillStyle(0xffd2d2, 1);
      g.fillRect(4, 16, w - 8, 6);

      g.fillStyle(0x2a2a2a, 1);
      g.fillRect(4, 0, w - 8, 6);

      g.generateTexture("tex_ext_bad", w, h);
      g.destroy();
    }
  }

  buildPlayerVisual() {
    // vienkāršs cilvēciņš: galva + ķermenis + cepure + rokas + kājas
    // (atstāju minimāli, lai nekas “neuzsprāgst” no sintakses)
    const head = this.add.ellipse(0, -40, 26, 26, 0xf1d2b6, 1);
    const body = this.add.rectangle(0, -14, 22, 30, 0xd7dfe8, 1);

    // cepure (2 taisnstūri)
    const hatTop = this.add.rectangle(0, -56, 22, 10, 0x1a2432, 1);
    const hatBrim = this.add.rectangle(0, -50, 28, 4, 0x101a24, 1);

    // rokas
    const armL = this.add.triangle(-16, -14, 0, 0, 12, -4, 12, 4, 0xd7dfe8, 1);
    const armR = this.add.triangle(16, -14, 0, 0, -12, -4, -12, 4, 0xd7dfe8, 1);

    // kājas
    this.legL = this.add.rectangle(-6, 10, 6, 18, 0x2d3c50, 1);
    this.legR = this.add.rectangle(6, 10, 6, 18, 0x2d3c50, 1);

    this.player.add([head, body, hatTop, hatBrim, armL, armR, this.legL, this.legR]);
  }

  applyLegAnim(moving) {
    if (!this.legL || !this.legR) return;

    if (!moving) {
      this.legL.y = 10;
      this.legR.y = 10;
      return;
    }

    const a = Math.sin(this.runT) * 3;
    this.legL.y = 10 + a;
    this.legR.y = 10 - a;
  }
}
