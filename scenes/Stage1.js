class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");

    this.readyCount = 0;
    this.totalCount = 10;

    this.carrying = null;
    this.lastInteractAt = 0;

    this.touch = { left: false, right: false, up: false, down: false };
    this.prevElevY = 0;

    this.startTimeMs = 0;
    this.finished = false;

    this.facing = 1; // 1 = pa labi, -1 = pa kreisi
  }

  create() {
    const W = 1100;

    this.FLOORS_Y = [110, 220, 330, 440, 550];
    this.THICK = 20;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

    this.platforms = this.physics.add.staticGroup();

    // Apakšējais stāvs pilns
    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    // Lifta šahta
    this.elevatorWidth = 80;
    this.elevatorX = 650;
    const gap = this.elevatorWidth + 30;

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];
      const holeL = this.elevatorX - gap / 2;
      const holeR = this.elevatorX + gap / 2;

      this.addPlatform(520, y, holeL - 520, this.THICK);
      this.addPlatform(holeR, y, W - holeR, this.THICK);
    }

    // Lifts
    this.elevator = this.add.rectangle(
      this.elevatorX,
      this.FLOORS_Y[4] + this.THICK / 2,
      this.elevatorWidth,
      this.THICK,
      0x666666
    );
    this.physics.add.existing(this.elevator);
    this.elevator.body.setAllowGravity(false);
    this.elevator.body.setImmovable(true);

    this.elevatorSpeed = 60;
    this.elevatorDir = -1;

    // Spēlētājs
    this.player = this.makePlayer(140, this.FLOORS_Y[4]);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // Buss
    this.busZone = new Phaser.Geom.Rectangle(70, 455, 220, 155);

    // Aparāti
    this.extinguishers = this.physics.add.group();
    this.slots = [];

    const SPOTS = [
      { floor: 1, x: 820 }, { floor: 1, x: 980 },
      { floor: 2, x: 760 }, { floor: 2, x: 940 },
      { floor: 3, x: 800 }, { floor: 3, x: 1000 },
      { floor: 0, x: 860 }, { floor: 0, x: 1020 },
      { floor: 4, x: 520 }, { floor: 4, x: 900 }
    ];

    SPOTS.forEach(s => {
      const y = this.FLOORS_Y[s.floor] - 22;
      const slot = { x: s.x, y, used: false };
      this.slots.push(slot);

      const ex = this.makeExtinguisher(s.x, y, "NOK");
      ex.setData("state", "NOK");
      ex.setData("slotRef", null);
      this.extinguishers.add(ex);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    // Kontroles
    this.cursors = this.input.keyboard.createCursorKeys();

    // UI
    this.readyText = this.add.text(14, 12, "Gatavs: 0/10", { color: "#fff" });
    this.timeText = this.add.text(14, 40, "Laiks: 00:00", { color: "#fff" });

    this.startTimeMs = this.time.now;
  }

  update(time, delta) {
    // Taimeris
    const sec = Math.floor((time - this.startTimeMs) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    this.timeText.setText(`Laiks: ${mm}:${ss}`);

    // Kustība
    const speed = 260;
    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-speed);
      this.facing = -1;
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(speed);
      this.facing = 1;
    } else {
      this.player.body.setVelocityX(0);
    }

    // Lifts
    this.elevator.y += this.elevatorSpeed * delta / 1000 * this.elevatorDir;
    if (this.elevator.y < this.FLOORS_Y[0]) this.elevatorDir = 1;
    if (this.elevator.y > this.FLOORS_Y[4]) this.elevatorDir = -1;
    this.elevator.body.updateFromGameObject();

    // Paņem / noliec
    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.tryPickup();
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.tryDrop();

    // Aparāts rokās — kreisā / labā puse
    if (this.carrying) {
      this.carrying.x = this.player.x + 28 * this.facing;
      this.carrying.y = this.player.y - 30;
    }
  }

  tryPickup() {
    if (this.carrying) return;

    const px = this.player.x;
    const py = this.player.y;

    let best = null;
    let dist = 50;

    this.extinguishers.getChildren().forEach(ex => {
      if (Phaser.Math.Distance.Between(px, py, ex.x, ex.y) < dist) {
        best = ex;
      }
    });

    if (!best) return;

    best.body.enable = false;
    this.carrying = best;
  }

  tryDrop() {
    if (!this.carrying) return;

    const ex = this.carrying;
    ex.body.enable = true;

    // Buss → OK
    if (Phaser.Geom.Rectangle.Contains(this.busZone, ex.x, ex.y)) {
      ex.setData("state", "OK");
    }

    // Slots
    this.slots.forEach(s => {
      if (!s.used && Phaser.Math.Distance.Between(ex.x, ex.y, s.x, s.y) < 30 && ex.getData("state") === "OK") {
        s.used = true;
        ex.body.enable = false;
        ex.x = s.x;
        ex.y = s.y;
        this.readyCount++;
        this.readyText.setText(`Gatavs: ${this.readyCount}/10`);
      }
    });

    this.carrying = null;
  }

  addPlatform(x, y, w, h) {
    const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x0f5f7a);
    this.physics.add.existing(r, true);
    this.platforms.add(r);
  }

  makePlayer(x, y) {
    const c = this.add.container(x, y);
    c.add(this.add.rectangle(0, -30, 30, 50, 0x222222));
    return c;
  }

  makeExtinguisher(x, y, label) {
    const c = this.add.container(x, y);
    c.add(this.add.rectangle(0, 0, 24, 40, 0xff4444));
    this.physics.add.existing(c);
    c.body.setSize(24, 40);
    c.body.setOffset(-12, -20);
    return c;
  }
}
