(() => {
  const W = 1100;
  const H = 650;

  // 5 stāvu virsmas (kur stāv kājas)
  const FLOORS_Y = [110, 220, 330, 440, 550];
  const PLATFORM_THICK = 20;

  // Lifts
  const ELEVATOR = {
    x: 650,
    w: 140,
    h: 110,
    speed: 55, // px/sec
  };

  // Buss apakšā pa kreisi
  const BUS = { x: 70, y: 455, w: 220, h: 155 };

  // “Spot” = vieta (sarkanais kvadrāts) + sākumā tur stāv aparāts
  // y tiks aprēķināts automātiski uz attiecīgā stāva
  const SPOTS = [
    { floor: 1, x: 820 }, { floor: 1, x: 980 },
    { floor: 2, x: 760 }, { floor: 2, x: 940 },
    { floor: 3, x: 800 }, { floor: 3, x: 1000 },
    { floor: 0, x: 860 }, { floor: 0, x: 1020 },
    { floor: 4, x: 520 }, { floor: 4, x: 900 },
  ];

  const EXT_H = 44; // aparāta “ķermeņa” augstums (physics)
  const EXT_FOOT_OFFSET = EXT_H / 2; // cik jānoliek virsmas y, lai apakša būtu uz grīdas

  class Main extends Phaser.Scene {
    constructor() {
      super("main");
      this.score = 0;

      this.carrying = null;
      this.lastInteractAt = 0;
      this.touch = { left:false, right:false, up:false, down:false };
      this.gameOver = false;

      this.elevDir = -1; // -1 uz augšu, +1 uz leju
      this.riding = false; // vai spēlētājs “ir liftā”
      this.prevElevY = null;
    }

    create() {
      this.cameras.main.setBackgroundColor("#0b0f14");

      // Fons
      const bg = this.add.graphics();
      bg.fillStyle(0x121a22, 1);
      bg.fillRect(0, 0, W, H);

      // Platformas (stāvi)
      this.platforms = this.physics.add.staticGroup();

      // 1. stāvs (apakšā) pilnā platumā
      this.addPlatform(0, FLOORS_Y[4], W, PLATFORM_THICK);

      // 2–5 stāvs labā puse (kā tavā shēmā)
      const rightStartX = 520;
      const rightWidth = 640;
      for (let i = 0; i < 4; i++) {
        this.addPlatform(rightStartX, FLOORS_Y[i], rightWidth, PLATFORM_THICK);
      }

      // Buss
      this.busRect = this.add.rectangle(
        BUS.x + BUS.w/2,
        BUS.y + BUS.h/2,
        BUS.w,
        BUS.h,
        0xf2f4f8
      ).setStrokeStyle(4, 0xc7ced8);

      this.add.text(this.busRect.x, BUS.y + 10, "BUSS", {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#0b0f14"
      }).setOrigin(0.5, 0);

      this.busZone = new Phaser.Geom.Rectangle(BUS.x, BUS.y, BUS.w, BUS.h);

      // Lifts (kustīga platforma)
      this.elevator = this.add.rectangle(
        ELEVATOR.x,
        FLOORS_Y[4] - (ELEVATOR.h/2),
        ELEVATOR.w,
        ELEVATOR.h,
        0x3a3f46
      ).setStrokeStyle(3, 0x1a1f26);

      this.physics.add.existing(this.elevator);
      this.elevator.body.setAllowGravity(false);
      this.elevator.body.setImmovable(true);

      // Gravitācija (krīt, ja izlec nepareizi)
      this.physics.world.gravity.y = 900;

      // Slot vietas + aparāti
      this.slots = [];
      this.extinguishers = this.physics.add.group();

      SPOTS.forEach((s) => {
        const surfaceY = FLOORS_Y[s.floor];
        const spotY = surfaceY - EXT_FOOT_OFFSET; // aparāta centrs, lai apakša būtu uz virsmas

        // Sarkanā vieta vienmēr virs aparāta
        const base = this.add.rectangle(s.x, spotY, 44, 44, 0xa90f0f)
          .setStrokeStyle(3, 0xff6b6b)
          .setAlpha(0.55)
          .setDepth(40);

        const icon = this.add.text(s.x, spotY, "🧯", { fontSize: "22px" })
          .setOrigin(0.5)
          .setDepth(41);

        const slot = { x: s.x, y: spotY, used: false, base, icon };
        this.slots.push(slot);

        // Aparāts sākumā uz vietas
        const ex = this.makeExtinguisher(s.x, spotY, "NOK");
        ex.setDepth(20); // zem slotiem
        ex.setData("state", "NOK");
        ex.setData("placed", false);
        ex.setData("held", false);
        this.extinguishers.add(ex);
      });

      // Spēlētājs (sāk apakšā)
      this.player = this.makePlayer(140, FLOORS_Y[4]);
      this.physics.add.existing(this.player);
      this.player.body.setCollideWorldBounds(true);
      this.player.body.setSize(28, 54);
      this.player.body.setOffset(-14, -54);

      // Kolīzijas
      this.physics.add.collider(this.player, this.platforms);
      this.physics.add.collider(this.extinguishers, this.platforms);

      // UI (bez taimera – testēšanai)
      this.scoreText = this.add.text(14, 12, "Punkti: 0", this.uiStyle()).setDepth(80);
      this.hintText = this.add.text(14, 48, "← → kustība | ↑ paņem | ↓ noliec | (liftā ieiet automātiski)", this.uiStyle()).setDepth(80);

      // Klaviatūra + mobilās pogas
      this.cursors = this.input.keyboard.createCursorKeys();
      this.createTouchControls();

      this.prevElevY = this.elevator.y;
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
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "12px",
        color: "#ffffff",
        fontStyle: "700"
      }).setOrigin(0.5);

      // OK marķieris (parādās tikai, kad OK)
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
      c.body.setCollideWorldBounds(false);
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

      const shell = ext.getData("shell");
      const badge = ext.getData("badge");
      const txt = ext.getData("txt");
      const okMark = ext.getData("okMark");

      if (state === "OK") {
        badge.setFillStyle(0x00ff66).setAlpha(0.9);
        txt.setColor("#0b0f14");
        shell.setFillStyle(0xff5a5a);
        okMark.setVisible(true);
      } else {
        badge.setFillStyle(0x0b0f14).setAlpha(0.9);
        txt.setColor("#ffffff");
        shell.setFillStyle(0xff4040);
        okMark.setVisible(false);
      }
    }

    createTouchControls() {
      const btnSize = 58;
      const pad = 14;

      const mk = (x, y, label) => {
        const r = this.add.rectangle(x + btnSize/2, y + btnSize/2, btnSize, btnSize, 0x111822)
          .setAlpha(0.75)
          .setScrollFactor(0)
          .setDepth(90)
          .setInteractive();
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

      ex.x = this.player.x + 26;
      ex.y = this.player.y - EXT_FOOT_OFFSET;

      // busā noliekot -> OK
      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y);
      if (inBus) this.setExtState(ex, "OK");

      // OK + uz slot = punkts + fiksēts
      if (ex.getData("state") === "OK" && !ex.getData("placed")) {
        const slot = this.findSlotUnder(ex.x, ex.y);
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
      if (this.gameOver) return;

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

      // ---- AUTO IEKĀPŠANA LIFTĀ ----
      const elevatorTop = this.elevator.y - (ELEVATOR.h / 2);
      const onBottomFloor = Math.abs(this.player.y - FLOORS_Y[4]) < 3; // 1. stāvs
      const nearElevatorX = Math.abs(this.player.x - this.elevator.x) < (ELEVATOR.w / 2 + 10);

      if (!this.riding && onBottomFloor && nearElevatorX) {
        // ja lifts ir “pieejams” (t.i. tā augša nav pārāk augstu virs grīdas)
        // ļaujam “ielekt” jebkurā brīdī, ja esi pie lifta
        this.riding = true;
        this.player.body.setAllowGravity(false);
        this.player.body.setVelocityY(0);
        this.player.y = elevatorTop;
      }

      // ---- ja liftā: brauc līdzi + vari izlekt sāniski ----
      if (this.riding) {
        // braucam līdzi liftam
        this.player.y += elevDeltaY;
        this.player.body.setVelocityX(vx);

        // ja iziet ārā no lifta zonas, tad izkrīt
        const stillOnElevator = Math.abs(this.player.x - this.elevator.x) < (ELEVATOR.w / 2 + 14);
        if (!stillOnElevator) {
          this.riding = false;
          this.player.body.setAllowGravity(true);
        }

        // “izlekšana” ar ↑ vai vienkārši ejot ārā — tev derēs ejot ārā.
        // bet lai būtu “apzināts” izkāpšanas moments, ļaujam arī ar ↑:
        if (up) {
          this.riding = false;
          this.player.body.setAllowGravity(true);
          // neliels horizontāls impulss, lai “izmetas”
          if (vx !== 0) this.player.body.setVelocityX(vx * 1.2);
        }
      } else {
        // normāli uz stāva / krītot
        this.player.body.setAllowGravity(true);
        this.player.body.setVelocityX(vx);
      }

      // ---- paņem/noliec ----
      const now = time;
      if (up && now - this.lastInteractAt > 140) {
        this.lastInteractAt = now;
        // ja neesi liftā, tad up ir “paņem”; ja liftā, up var arī “izlekt”
        if (!this.riding) this.tryPickup();
        this.touch.up = false;
      }
      if (down && now - this.lastInteractAt > 140) {
        this.lastInteractAt = now;
        this.tryDrop();
        this.touch.down = false;
      }

      // ---- nesamais aparāts seko ----
      if (this.carrying) {
        this.carrying.x = this.player.x + 28;
        this.carrying.y = this.player.y - 30;
      }

      // buss “izceļas”
      const inBus = Phaser.Geom.Rectangle.Contains(this.busZone, this.player.x, this.player.y - 10);
      this.busRect.setAlpha(inBus ? 1 : 0.92);

      // drošība
      this.player.x = Phaser.Math.Clamp(this.player.x, 10, W - 10);
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
