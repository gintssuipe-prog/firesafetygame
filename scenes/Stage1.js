class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");

    this.score = 0;
    this.carrying = null;
    this.lastInteractAt = 0;

    this.touch = { left: false, right: false, up: false, down: false };
    this.prevElevY = 0;
  }

  create() {
    const W = 1100;
    const H = 650;

    // 5 stāvu virsmas (kur stāv kājas)
    this.FLOORS_Y = [110, 220, 330, 440, 550];
    this.THICK = 20;

    // Nolikšanas “snap” režģis + pret uzkraušanu vienā punktā
    this.DROP_GRID = 26;
    this.DROP_MIN_DIST = 20;
    this.DROP_SEARCH_STEPS = 14;

    this.cameras.main.setBackgroundColor("#0b0f14");

    // Fizika
    this.physics.world.gravity.y = 900;

    // Platformas (statiski stāvi)
    this.platforms = this.physics.add.staticGroup();

    // 1. stāvs (apakšā) pilnā platumā
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // 2–5 stāvs (labā puse kā shēmā)
    const rightStartX = 520;
    const rightWidth = 640;
    for (let i = 0; i < 4; i++) {
      this.addPlatform(rightStartX, this.FLOORS_Y[i], rightWidth, this.THICK);
    }

    // Buss (vizuāli + zona)
    this.BUS = { x: 70, y: 455, w: 220, h: 155 };
    const busRect = this.add.rectangle(
      this.BUS.x + this.BUS.w / 2,
      this.BUS.y + this.BUS.h / 2,
      this.BUS.w,
      this.BUS.h,
      0xf2f4f8
    ).setStrokeStyle(4, 0xc7ced8);
    busRect.setDepth(5);

    this.add.text(busRect.x, this.BUS.y + 10, "BUSS", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#0b0f14",
      fontStyle: "bold"
    }).setOrigin(0.5, 0).setDepth(6);

    this.busZone = new Phaser.Geom.Rectangle(this.BUS.x, this.BUS.y, this.BUS.w, this.BUS.h);

    // ===== LIFTS KĀ ŠAURA GRĪDAS PLATFORMA (3× šaurāks) =====
    const elevatorWidth = 80;   // <-- bija 240, tagad 3× šaurāks
    const elevatorX = 650;

    this.elevatorMinY = this.FLOORS_Y[0];
    this.elevatorMaxY = this.FLOORS_Y[4] + 40; // “pagrabstāvs”, lai var uzskriet
    this.elevatorSpeed = 60;
    this.elevatorDir = -1;

    this.elevator = this.add.rectangle(
      elevatorX,
      this.elevatorMaxY + this.THICK / 2,
      elevatorWidth,
      this.THICK,
      0x555555
    ).setStrokeStyle(2, 0x1a1f26);
    this.elevator.setDepth(10);

    this.physics.add.existing(this.elevator);
    this.elevator.body.setAllowGravity(false);
    this.elevator.body.setImmovable(true);

    this.prevElevY = this.elevator.y;

    // Spēlētājs
    this.player = this.makePlayer(140, this.FLOORS_Y[4]);
    this.physics.add.existing(this.player);

    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(-14, -54);

    // Kolīzijas
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // Ugunsdzēšamie aparāti + vietu marķieri
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    // Spot definīcijas (varēsi viegli mainīt)
    const SPOTS = [
      { floor: 1, x: 820 }, { floor: 1, x: 980 },
      { floor: 2, x: 760 }, { floor: 2, x: 940 },
      { floor: 3, x: 800 }, { floor: 3, x: 1000 },
      { floor: 0, x: 860 }, { floor: 0, x: 1020 },
      { floor: 4, x: 520 }, { floor: 4, x: 900 },
    ];

    const EXT_H = 44;
    const EXT_FOOT_OFFSET = EXT_H / 2;

    SPOTS.forEach((s) => {
      const surfaceY = this.FLOORS_Y[s.floor];
      const y = surfaceY - EXT_FOOT_OFFSET;

      // “Sarkanā kvadrāta” vieta — UZ APARĀTA (virsū, nevis blakus)
      const mark = this.add.rectangle(s.x, y, 46, 46, 0xa90f0f)
        .setStrokeStyle(3, 0xff6b6b)
        .setAlpha(0.55)
        .setDepth(40);

      const icon = this.add.text(s.x, y, "🧯", { fontSize: "22px" })
        .setOrigin(0.5)
        .setDepth(41);

      this.slots.push({ x: s.x, y, used: false, mark, icon });

      // Aparāts sākumā NOK
      const ex = this.makeExtinguisher(s.x, y, "NOK");
      ex.setDepth(20);
      ex.setData("state", "NOK");
      ex.setData("placed", false);
      ex.setData("held", false);
      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    // Kontroles
    this.cursors = this.input.keyboard.createCursorKeys();
    this.createTouchControls();

    // UI
    this.scoreText = this.add.text(14, 12, "Punkti: 0", this.uiStyle()).setDepth(80);
    this.hintText = this.add.text(14, 48, "← → kustība | ↑ paņemt | ↓ nolikt (telefonā ir pogas)", this.uiStyle()).setDepth(80);
  }

  // ---------------- UI ----------------
  uiStyle() {
    return {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    };
  }

  // ---------------- Platformas ----------------
  addPlatform(xLeft, surfaceY, width, thickness) {
    const r = this.add.rectangle(
      xLeft + width / 2,
      surfaceY + thickness / 2,
      width,
      thickness,
      0x0f5f7a
    ).setStrokeStyle(2, 0x0b0f14);

    this.physics.add.existing(r, true);
    this.platforms.add(r);
  }

  // ---------------- Spēlētājs ----------------
  makePlayer(x, surfaceY) {
    const c = this.add.container(x, surfaceY);

    const body = this.add.rectangle(0, -31, 32, 46, 0x0b0b0b);
    const stripe1 = this.add.rectangle(0, -23, 32, 8, 0x00ff66);
    const stripe2 = this.add.rectangle(0, -7, 32, 6, 0x00ff66);

    const head = this.add.circle(0, -62, 12, 0xffe2b8);
    const hair = this.add.arc(
      0, -66, 13,
      Phaser.Math.DegToRad(200),
      Phaser.Math.DegToRad(-20),
      true,
      0xffd24a
    );

    c.add([body, stripe1, stripe2, head, hair]);
    return c;
  }

  // ---------------- Ugunsdzēšamais aparāts ----------------
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

  // ---------------- Telefonam bultas ----------------
  createTouchControls() {
    const btnSize = 58;
    const pad = 14;

    const mk = (x, y, label) => {
      const r = this.add.rectangle(x + btnSize / 2, y + btnSize / 2, btnSize, btnSize, 0x111822)
        .setAlpha(0.75).setScrollFactor(0).setDepth(90).setInteractive();
      r.setStrokeStyle(2, 0x2a394a);

      this.add.text(x + btnSize / 2, y + btnSize / 2, label, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#e7edf5"
      }).setOrigin(0.5).setScrollFactor(0).setDepth(91);

      return r;
    };

    const baseY = this.scale.height - pad - btnSize;
    const leftBtn = mk(pad, baseY, "◀");
    const rightBtn = mk(pad + btnSize + 10, baseY, "▶");
    const upBtn = mk(this.scale.width - pad - btnSize * 2 - 10, baseY, "▲");
    const downBtn = mk(this.scale.width - pad - btnSize, baseY, "▼");

    const bind = (btn, key) => {
      btn.on("pointerdown", () => { this.touch[key] = true; btn.setAlpha(1); });
      btn.on("pointerup", () => { this.touch[key] = false; btn.setAlpha(0.75); });
      btn.on("pointerout", () => { this.touch[key] = false; btn.setAlpha(0.75); });
      btn.on("pointercancel", () => { this.touch[key] = false; btn.setAlpha(0.75); });
    };

    bind(leftBtn, "left");
    bind(rightBtn, "right");
    bind(upBtn, "up");
    bind(downBtn, "down");

    // ja pārzīmējas ekrāns (rotācija) — vienkāršākais ir restartēt ainu
    this.scale.on("resize", () => this.scene.restart());
  }

  // ---------------- Nolikšanas “anti-stack” helpers ----------------
  snapToGrid(x) {
    return Math.round(x / this.DROP_GRID) * this.DROP_GRID;
  }

  anyExtinguisherNear(x, y, ignoreExt) {
    const arr = this.extinguishers.getChildren();
    for (const ex of arr) {
      if (!ex.active) continue;
      if (ex === ignoreExt) continue;
      if (ex.getData("held")) continue;
      if (ex.getData("placed")) continue;

      const d = Phaser.Math.Distance.Between(x, y, ex.x, ex.y);
      if (d < this.DROP_MIN_DIST) return true;
    }
    return false;
  }

  findFreeDropPos(desiredX, desiredY, ex) {
    const baseX = this.snapToGrid(desiredX);
    const y = desiredY;

    for (let i = 0; i <= this.DROP_SEARCH_STEPS; i++) {
      const dx = i === 0 ? 0 : (i * this.DROP_GRID);
      const candidates = i === 0 ? [baseX] : [baseX + dx, baseX - dx];

      for (const x of candidates) {
        const xx = Phaser.Math.Clamp(x, 20, 1100 - 20);
        if (!this.anyExtinguisherNear(xx, y, ex)) return { x: xx, y };
      }
    }
    return { x: Phaser.Math.Clamp(baseX, 20, 1100 - 20), y };
  }

  hopTo(ex, x, y) {
    ex.x = x;
    ex.y = y - 10;
    this.tweens.add({ targets: ex, y, duration: 140, ease: "Quad.easeOut" });
  }

  findSlotUnder(x, y) {
    for (const s of this.slots) {
      const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
      if (d < 28) return s;
    }
    return null;
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
      if (ex.getData("placed")) return;

      const d = Phaser.Math.Distance.Between(px, py, ex.x, ex.y);
      if (d < 55 && d < bestD) { best = ex; bestD = d; }
    });

    if (!best) return;

    best.setData("held", true);
    best.body.enable = false;
    this.carrying = best;
  }

  tryDrop() {
    if (!this.carrying) return;

    const ex = this.carrying;

    ex.setData("held", false);
    ex.body.enable = true;

    // vēlamā vieta pie kājām
    const desiredX = this.player.x + 26;
    const desiredY = this.player.y - (44 / 2);

    const pos = this.findFreeDropPos(desiredX, desiredY, ex);
    this.hopTo(ex, pos.x, pos.y);

    // ja noliek busā -> kļūst OK
    const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, pos.x, pos.y);
    if (inBus) this.setExtState(ex, "OK");

    // OK + uz marķiera -> punkts un “fiksēts”
    if (ex.getData("state") === "OK" && !ex.getData("placed")) {
      const slot = this.findSlotUnder(pos.x, pos.y);
      if (slot) {
        ex.setData("placed", true);
        ex.body.enable = false;
        ex.x = slot.x;
        ex.y = slot.y;

        this.score += 1;
        this.scoreText.setText(`Punkti: ${this.score}`);
      }
    }

    this.carrying = null;
  }

  // ---------------- Update ----------------
  update(time, delta) {
    const dt = delta / 1000;

    // Lifts kustas
    this.elevator.y += this.elevatorSpeed * dt * this.elevatorDir;

    if (this.elevator.y <= this.elevatorMinY + this.THICK / 2) {
      this.elevator.y = this.elevatorMinY + this.THICK / 2;
      this.elevatorDir = 1;
    }
    if (this.elevator.y >= this.elevatorMaxY + this.THICK / 2) {
      this.elevator.y = this.elevatorMaxY + this.THICK / 2;
      this.elevatorDir = -1;
    }

    this.elevator.body.updateFromGameObject();

    const elevDeltaY = this.elevator.y - this.prevElevY;
    this.prevElevY = this.elevator.y;

    // Kustība
    const left = this.cursors.left.isDown || this.touch.left;
    const right = this.cursors.right.isDown || this.touch.right;
    const speed = 260;

    if (left) this.player.body.setVelocityX(-speed);
    else if (right) this.player.body.setVelocityX(speed);
    else this.player.body.setVelocityX(0);

    // Paņem/noliec (keyboard JustDown + touch “vienreiz”)
    const upJust = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touch.up;
    const downJust = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.touch.down;

    if (upJust && (time - this.lastInteractAt > 140)) {
      this.lastInteractAt = time;
      this.tryPickup();
      this.touch.up = false;
    }

    if (downJust && (time - this.lastInteractAt > 140)) {
      this.lastInteractAt = time;
      this.tryDrop();
      this.touch.down = false;
    }

    // Ja tur rokā — seko spēlētājam
    if (this.carrying) {
      this.carrying.x = this.player.x + 28;
      this.carrying.y = this.player.y - 30;
    }

    // “Brauc līdzi” liftam, ja stāv uz tā
    const playerOnElevator =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (playerOnElevator) {
      this.player.y += elevDeltaY;
      // Ja tur rokā aparātu, arī tam “līdzi”
      if (this.carrying) this.carrying.y += elevDeltaY;
    }
  }
}
