(() => {
  const W = 1100;
  const H = 650;
  const ROUND_SECONDS = 60;

  const LEVEL = {
    floorY: 520,
    bus: { x: 70, y: 420, w: 220, h: 160 },

    extinguishers: [
      { x: 420, y: 500 }, { x: 520, y: 500 }, { x: 650, y: 500 },
      { x: 780, y: 500 }, { x: 900, y: 500 }, { x: 980, y: 500 }
    ],

    slots: [
      { x: 460, y: 500 }, { x: 580, y: 500 }, { x: 700, y: 500 },
      { x: 820, y: 500 }, { x: 940, y: 500 }
    ],

    walls: [
      { x: 340, y: 360, w: 20, h: 200 },
      { x: 620, y: 360, w: 20, h: 200 },
      { x: 860, y: 360, w: 20, h: 200 },
      { x: 340, y: 300, w: 300, h: 20 },
      { x: 640, y: 260, w: 240, h: 20 },
      { x: 880, y: 300, w: 180, h: 20 }
    ]
  };

  class Main extends Phaser.Scene {
    constructor() {
      super("main");
      this.score = 0;
      this.timeLeft = ROUND_SECONDS;
      this.carrying = null;
      this.touch = { left:false, right:false, up:false, down:false };
      this.gameOver = false;
    }

    create() {
      this.cameras.main.setBackgroundColor("#0b0f14");

      const bg = this.add.graphics();
      bg.fillStyle(0x121a22, 1);
      bg.fillRect(0, 0, W, H);

      const floor = this.add.rectangle(W/2, LEVEL.floorY + 40, W, 120, 0x1a2430);
      this.physics.add.existing(floor, true);

      this.busRect = this.add.rectangle(
        LEVEL.bus.x + LEVEL.bus.w/2,
        LEVEL.bus.y + LEVEL.bus.h/2,
        LEVEL.bus.w,
        LEVEL.bus.h,
        0xf2f4f8
      ).setStrokeStyle(4, 0xc7ced8);

      this.add.text(this.busRect.x, LEVEL.bus.y + 10, "BUSS", {
        fontSize: "18px",
        color: "#0b0f14"
      }).setOrigin(0.5, 0);

      this.busZone = new Phaser.Geom.Rectangle(
        LEVEL.bus.x, LEVEL.bus.y, LEVEL.bus.w, LEVEL.bus.h
      );

      this.walls = this.physics.add.staticGroup();
      LEVEL.walls.forEach(w => {
        const r = this.add.rectangle(w.x + w.w/2, w.y + w.h/2, w.w, w.h, 0x2a394a);
        this.physics.add.existing(r, true);
        this.walls.add(r);
      });

      this.slots = [];
      LEVEL.slots.forEach(s => {
        const base = this.add.rectangle(s.x, s.y, 44, 44, 0xa90f0f);
        this.add.text(s.x, s.y, "🧯", { fontSize: "22px" }).setOrigin(0.5);
        this.slots.push({ x: s.x, y: s.y, used: false, base });
      });

      this.extinguishers = this.physics.add.group({ allowGravity: false });
      LEVEL.extinguishers.forEach(p => {
        const ex = this.makeExtinguisher(p.x, p.y, "NOK");
        ex.setData("state", "NOK");
        ex.setData("placed", false);
        this.extinguishers.add(ex);
      });

      this.player = this.makePlayer(120, LEVEL.floorY);
      this.physics.add.existing(this.player);
      this.player.body.setAllowGravity(false);
      this.player.body.setSize(28, 54);
      this.player.body.setOffset(-14, -54);
      this.player.body.setCollideWorldBounds(true);

      this.physics.add.collider(this.player, floor);
      this.physics.add.collider(this.player, this.walls);

      this.scoreText = this.add.text(14, 12, "Punkti: 0", this.uiStyle());
      this.timerText = this.add.text(14, 48, "Laiks: 60", this.uiStyle());

      this.cursors = this.input.keyboard.createCursorKeys();
      this.createTouchControls();

      this.time.addEvent({
        delay: 1000,
        loop: true,
        callback: () => {
          if (this.gameOver) return;
          this.timeLeft--;
          this.timerText.setText(`Laiks: ${this.timeLeft}`);
          if (this.timeLeft <= 0) this.endGame();
        }
      });
    }

    uiStyle() {
      return {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "rgba(0,0,0,0.35)",
        padding: { x: 10, y: 6 }
      };
    }

    makePlayer(x, y) {
      const c = this.add.container(x, y);
      c.add([
        this.add.roundedRect(-16, -54, 32, 46, 8, 0x0b0b0b),
        this.add.roundedRect(-16, -38, 32, 8, 4, 0x00ff66),
        this.add.circle(0, -62, 12, 0xffe2b8),
        this.add.arc(0, -66, 13, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(-20), true, 0xffd24a)
      ]);
      return c;
    }

    makeExtinguisher(x, y, label) {
      const c = this.add.container(x, y);
      const body = this.add.roundedRect(-14, -22, 28, 44, 8, 0xff4040);
      const badge = this.add.roundedRect(-14, -6, 28, 18, 6, 0x0b0f14);
      const txt = this.add.text(0, 3, label, { fontSize: "12px", color: "#fff" }).setOrigin(0.5);
      c.add([body, badge, txt]);
      this.physics.add.existing(c);
      c.body.setAllowGravity(false);
      c.body.setSize(28, 44);
      c.body.setOffset(-14, -22);
      c.setData("txt", txt);
      return c;
    }

    createTouchControls() {
      // minimāli – var papildināt vēlāk
    }

    endGame() {
      this.gameOver = true;
      alert(`Laiks beidzies!\nTavi punkti: ${this.score}`);
    }

    update() {
      if (this.gameOver) return;
      let vx = 0;
      if (this.cursors.left.isDown) vx = -240;
      if (this.cursors.right.isDown) vx = 240;
      this.player.body.setVelocity(vx, 0);
      this.player.y = LEVEL.floorY;
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
