(() => {
  const W = 1100;
  const H = 650;

  const FLOORS_Y = [110, 220, 330, 440, 550]; // 5 stāvi
  const PLATFORM_THICK = 20;

  const ELEVATOR = {
    x: 650,
    w: 140,
    h: 110,
    speed: 55,          // px/sec
    snapTolX: 18,       // cik tuvu X jābūt, lai “ieķertos”
    snapTolY: 10        // cik tuvu Y virsmai, lai “ieķertos”
  };

  const BUS = { x: 70, y: 455, w: 220, h: 155 };
  const EXT_H = 44;
  const EXT_FOOT_OFFSET = EXT_H / 2;

  // Spot = vieta + sākumā tur stāv aparāts
  const SPOTS = [
    { floor: 1, x: 820 }, { floor: 1, x: 980 },
    { floor: 2, x: 760 }, { floor: 2, x: 940 },
    { floor: 3, x: 800 }, { floor: 3, x: 1000 },
    { floor: 0, x: 860 }, { floor: 0, x: 1020 },
    { floor: 4, x: 520 }, { floor: 4, x: 900 },
  ];

  // “snap” režģis (lai noliekot koordinātas būtu “pieņemamas”)
  const DROP_GRID = 26;           // solis px
  const DROP_MIN_DIST = 20;       // min attālums starp aparātiem (lai neuzkrauj viens uz otra)
  const DROP_SEARCH_STEPS = 14;   // cik blakus vietas meklēt

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function snapToGrid(x) {
    return Math.round(x / DROP_GRID) * DROP_GRID;
  }

  class Main extends Phaser.Scene {
    constructor() {
      super("main");
      this.score = 0;

      this.carrying = null;
      this.lastInteractAt = 0;
      this.touch = { left:false, right:false, up:false, down:false };

      this.elevDir = -1;
      this.riding = false;         // vai spēlētājs šobrīd ir liftā
      this.ridingOffsetX = 0;      // cik pa labi/kreisi liftā stāv
    }

    create() {
      this.cameras.main.setBackgroundColor("#0b0f14");

      // fons
      const bg = this.add.graphics();
      bg.fillStyle(0x121a22, 1);
      bg.fillRect(0, 0, W, H);

      // platformas
      this.platforms = this.physics.add.staticGroup();
      this.addPlatform(0, FLOORS_Y[4], W, PLATFORM_THICK); // apakšējais pilnā platumā

      const rightStartX = 520;
      const rightWidth = 640;
      for (let i = 0; i < 4; i++) this.addPlatform(rightStartX, FLOORS_Y[i], rightWidth, PLATFORM_THICK);

      // buss
      this.busRect = this.add.rectangle(BUS.x + BUS.w/2, BUS.y + BUS.h/2, BUS.w, BUS.h, 0xf2f4f8)
        .setStrokeStyle(4, 0xc7ced8);

      this.add.text(this.busRect.x, BUS.y + 10, "BUSS", {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#0b0f14"
      }).setOrigin(0.5, 0);

      this.busZone = new Phaser.Geom.Rectangle(BUS.x, BUS.y, BUS.w, BUS.h);

      // lifts (kustīga platforma)
      this.elevator = this.add.rectangle(
        ELEVATOR.x,
        FLOORS_Y[4] - (ELEVATOR.h / 2),
        ELEVATOR.w,
        ELEVATOR.h,
        0x3a3f46
      ).setStrokeStyle(3, 0x1a1f26);

      this.physics.add.existing(this.elevator);
      this.elevator.body.setAllowGravity(false);
      this.elevator.body.setImmovable(true);

      // gravitācija
      this.physics.world.gravity.y = 900;

      // sloti + aparāti
      this.slots = [];
      this.extinguishers = this.physics.add.group();

      SPOTS.forEach((s) => {
        const surfaceY = FLOORS_Y[s.floor];
        const y = surfaceY - EXT_FOOT_OFFSET;

        const base = this.add.rectangle(s.x, y, 44, 44, 0xa90f0f)
          .setStrokeStyle(3, 0xff6b6b)
          .setAlpha(0.55)
          .setDepth(40);

        const icon = this.add.text(s.x, y, "🧯", { fontSize: "22px" })
          .setOrigin(0.5)
          .setDepth(41);

        this.slots.push({ x: s.x, y, used: false, base, icon });

        const ex = this.makeExtinguisher(s.x, y, "NOK");
        ex.setDepth(20);
        ex.setData("state", "NOK");
        ex.setData("placed", false);
        ex.setData("held", false);
        this.extinguishers.add(ex);
      });

      // spēlētājs
      this.player = this.makePlayer(140, FLOORS_Y[4]);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setSize(28, 54);
      this.player.body.setOffset(-14, -54);

      // kolīzijas
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.extinguishers, this.platforms);

      // UI (bez taimera testēšanai)
      this.scoreText = this.add.text(14, 12, "Punkti: 0", this.uiStyle()).setDepth(80);
      this.hintText = this.add.text(14, 48, "← → kustība | ↑ paņem | ↓ noliec | lifts: automātiski pie 1.stāva", this.uiStyle()).setDepth(80);

      // kontroles
      this.cursors = this.input.keyboard.createCursorKeys();
      this.createTouchControls();
    }

    uiStyle() {
      return {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#e7edf5",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 10, y: 6 }
      };
    }

    addPlatform(xLeft, surfaceY, width, thickness) {
      const r = this.add.rectangle(xLeft + width/2, surfaceY + thickness/2, width, thickness, 0x0f5f7a)
        .setStrokeStyle(2, 0x0b0f14);
      this.physics.add.existing(r, true);
      this.platforms.add(r);
    }

    makePlayer(x, surfaceY) {
      const c = this.add.container(x, surfaceY);
      c.add([
        this.add.rectangle(0, -31, 32, 46, 0x0b0b0b),
        this.add.rectangle(0, -23, 32, 8, 0x00ff66),
        this.add.rectangle(0, -7, 32, 6, 0x00ff66),
        this.add.circle(0, -62, 12, 0xffe2b8),
        this.add.arc(0, -66, 13, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(-20), true, 0xffd24a)
      ]);
      return c;
    }

    makeExtinguisher(x, y, label) {
      const c = this.add.container(x, y);

      const shell = this.add.rectangle(0, 0, 28, 44, 0xff4040).setStrokeStyle(2, 0x7a0a0a);
      const badge = this.add.rectangle(0, 8, 28, 18, 0x0b0f14).setAlpha(0.9);

      const txt = this.add.text(0, 8, label, {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "700"
      }).setOrigin(0.5);

      const okMark = this.add.text(0, -20, "✓", {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#00ff66",
        fontStyle: "900"
      }).setOrigin(0.5);
      okMark.setVisible(false);

      c.add([shell, badge, txt, okMark]);

      this.physics.add.existing(c);
      c.body.setBounce(0);
      c.body.setSize(28, 44);
      c.body.setOffset(-14, -22);

      c.setData("txt", txt);
      c.setData("shell", shell);
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

    createTouchControls() {
      const btnSize = 58;
      const pad = 14;

      const mk = (x, y, label) => {
        const r = this.add.rectangle(x + btnSize/2, y + btnSize/2, btnSize, btnSize, 0x111822)
          .setAlpha(0.75).setScrollFactor(0).setDepth(90).setInteractive();
        r.setStrokeStyle(2, 0x2a394a);

        const t = this.add.text(x + btnSize/2, y + btnSize/2, label, {
          fontFamily: "system-ui, Segoe UI, Roboto, Arial",
          fontSize: "20px",
          color: "#e7edf5"
        }).setOrigin(0.5).setScrollFactor(0).setDepth(91);

        return { r, t };
      };

      const baseY = this.scale.height - pad - btnSize;
      const left  = mk(pad, baseY, "◀");
      const right = mk(pad + btnSize + 10, baseY, "▶");
      const up    = mk(this.scale.width - pad - btnSize*2 - 10, baseY, "▲");
      const down  = mk(this.scale.width - pad - btnSize, baseY, "▼");

      const bind = (btn, key) => {
        btn.r.on("pointerdown", () => { this.touch[key] = true; btn.r.setAlpha(1); });
        btn.r.on("pointerup",   () => { this.touch[key] = false; btn.r.setAlpha(0.75); });
        btn.r.on("pointerout",  () => { this.touch[key] = false; btn.r.setAlpha(0.75); });
        btn.r.on("pointercancel", () => { this.touch[key] = false; btn.r.setAlpha(0.75); });
      };

      bind(left, "left");
      bind(right, "right");
      bind(up, "up");
      bind(down, "down");

      this.scale.on("resize", () => this.scene.restart());
    }

    anyExtinguisherNear(x, y, ignoreExt) {
      const arr = this.extinguishers.getChildren();
      for (const ex of arr) {
        if (!ex.active) continue;
        if (ex === ignoreExt) continue;
        if (ex.getData("held")) continue;
        const d = Phaser.Math.Distance.Between(x, y, ex.x, ex.y);
        if (d < DROP_MIN_DIST) return true;
      }
      return false;
    }

    findFreeDropPos(desiredX, desiredY, ex) {
      // snap uz režģa + meklē blakus brīvu vietu
      const baseX = snapToGrid(desiredX);
      const y = desiredY;

      // pārbaudām base, tad +step, -step, +2step, -2step...
      for (let i = 0; i <= DROP_SEARCH_STEPS; i++) {
        const dx = i === 0 ? 0 : (i * DROP_GRID);
        const candidates = i === 0 ? [baseX] : [baseX + dx, baseX - dx];

        for (const x of candidates) {
          const xx = clamp(x, 20, W - 20);
          if (!this.anyExtinguisherNear(xx, y, ex)) return { x: xx, y };
        }
      }

      // ja nu viss pilns — atgriežam kaut ko, bet reāli ar 14 soļiem pietiek
      return { x: clamp(baseX, 20, W - 20), y };
    }

    hopTo(ex, x, y) {
      // “palēciens” uz nolikšanas vietu (lai redz, ka pats pārkārtojas)
      const startY = y - 10;
      ex.x = x;
      ex.y = startY;
      this.tweens.add({
        targets: ex,
        y: y,
        duration: 140,
        ease: "Quad.easeOut"
      });
    }

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

    findSlotUnder(x, y) {
      for (const s of this.slots) {
        const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
        if (d < 28) return s;
      }
      return null;
    }

    tryDrop() {
      if (!this.carrying) return;

      const ex = this.carrying;
      ex.setData("held", false);
      ex.body.enable = true;

      // nolikšanas vēlamā vieta pie kājām
      const desiredX = this.player.x + 26;
      const desiredY = this.player.y - EXT_FOOT_OFFSET;

      // atrodam brīvu snap pozīciju
      const pos = this.findFreeDropPos(desiredX, desiredY, ex);
      this.hopTo(ex, pos.x, pos.y);

      // busā noliekot -> OK
      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, pos.x, pos.y);
      if (inBus) this.setExtState(ex, "OK");

      // OK + uz slot = punkts + fiksēts
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

    update(time, delta) {
      const dt = delta / 1000;

      // ---- LIFTS kustība ----
      const topY = FLOORS_Y[0] - (ELEVATOR.h / 2);
      const bottomY = FLOORS_Y[4] - (ELEVATOR.h / 2);

      let newY = this.elevator.y + (this.elevDir * ELEVATOR.speed * dt);
      if (newY < topY) { newY = topY; this.elevDir = +1; }
      if (newY > bottomY) { newY = bottomY; this.elevDir = -1; }

      const elevDeltaY = newY - this.elevator.y;
      this.elevator.y = newY;
      this.elevator.body.updateFromGameObject();

      // ---- kustība horizontāli ----
      const left  = this.cursors.left.isDown  || this.touch.left;
      const right = this.cursors.right.isDown || this.touch.right;
      const up = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.touch.up;
      const down = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.touch.down;

      const speed = 260;
      let vx = 0;
      if (left) vx -= speed;
      if (right) vx += speed;

      // ---- droša ieiešana liftā: TIKAI, kad lifts ir apakšā ----
      const elevatorTop = this.elevator.y - (ELEVATOR.h / 2);
      const liftIsAtBottom = Math.abs(this.elevator.y - bottomY) < 6;

      const nearLiftX = Math.abs(this.player.x - this.elevator.x) < (ELEVATOR.w / 2 + ELEVATOR.snapTolX);
      const onBottomFloor = Math.abs(this.player.y - FLOORS_Y[4]) < ELEVATOR.snapTolY;

      if (!this.riding && liftIsAtBottom && nearLiftX && onBottomFloor) {
        // “ielec” liftā
        this.riding = true;
        this.ridingOffsetX = this.player.x - this.elevator.x;

        this.player.body.setAllowGravity(false);
        this.player.body.setVelocityY(0);

        this.player.y = elevatorTop; // kājas uz lifta virsmas
      }

      // ---- ja liftā: brauc līdzi + vari izkāpt, ejot sānis ----
      if (this.riding) {
        // līdzi liftam
        this.player.y += elevDeltaY;

        // horizontāli kustas, bet “iekš” lifta platuma
        this.player.x += (vx * dt);

        const liftLeft = this.elevator.x - ELEVATOR.w/2 - 6;
        const liftRight = this.elevator.x + ELEVATOR.w/2 + 6;

        // ja iziet ārā no lifta platuma => izkrīt/izkāpj
        if (this.player.x < liftLeft || this.player.x > liftRight) {
          this.riding = false;
          this.player.body.setAllowGravity(true);
        }

        // apzināts “izlēc” ar ↑ (optional, atstāju)
        if (up) {
          this.riding = false;
          this.player.body.setAllowGravity(true);
        }
      } else {
        this.player.body.setAllowGravity(true);
        this.player.body.setVelocityX(vx);
      }

      // ---- paņem / noliec ----
      if (up && (time - this.lastInteractAt > 140)) {
        this.lastInteractAt = time;
        if (!this.riding) this.tryPickup();
        this.touch.up = false;
      }

      if (down && (time - this.lastInteractAt > 140)) {
        this.lastInteractAt = time;
        this.tryDrop();
        this.touch.down = false;
      }

      // ---- nesamais seko rokai ----
      if (this.carrying) {
        this.carrying.x = this.player.x + 28;
        this.carrying.y = this.player.y - 30;
      }

      // buss “izceļas”
      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, this.player.x, this.player.y - 10);
      this.busRect.setAlpha(inBus ? 1 : 0.92);

      // robežas
      this.player.x = clamp(this.player.x, 10, W - 10);
    }
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: W,
    height: H,
    physics: { default: "arcade", arcade: { debug: false } },
    scene: [Main],
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
  });
})();
