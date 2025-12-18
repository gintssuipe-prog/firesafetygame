class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");

    this.readyCount = 0;
    this.totalCount = 10;

    this.carrying = null;
    this.busStorage = [];

    this.startTimeMs = 0;
    this.finished = false;

    this.facing = 1;
  }

  create() {
    const W = 420;
    const H = 780;

    this.cameras.main.setBackgroundColor("#0b0f14");
    this.physics.world.gravity.y = 900;

    this.FLOORS_Y = [140, 260, 380, 500, 620];
    this.THICK = 16;

    this.platforms = this.physics.add.staticGroup();

    // Grīdas ar lifta šahtu
    this.elevatorX = 220;
    this.elevatorW = 70;
    const gap = this.elevatorW + 20;

    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];
      const l = this.elevatorX - gap / 2;
      const r = this.elevatorX + gap / 2;
      this.addPlatform(0, y, l, this.THICK);
      this.addPlatform(r, y, W - r, this.THICK);
    }

    // Lifts
    this.elevator = this.add.rectangle(
      this.elevatorX,
      this.FLOORS_Y[4],
      this.elevatorW,
      this.THICK,
      0x555555
    );
    this.physics.add.existing(this.elevator);
    this.elevator.body.setImmovable(true).setAllowGravity(false);

    this.elevatorDir = -1;
    this.elevatorSpeed = 50;

    // Spēlētājs
    this.player = this.add.circle(80, this.FLOORS_Y[4] - 30, 12, 0xffddaa);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // BUSS
    this.busZone = new Phaser.Geom.Rectangle(10, 520, 130, 100);
    this.busRect = this.add.rectangle(75, 570, 130, 100, 0xe6e6e6);
    this.add.text(45, 555, "BUSS", { color: "#000" });

    // SLOTI
    this.slots = [];
    const SLOT_POS = [
      { f: 0, x: 300 },
      { f: 1, x: 320 },
      { f: 2, x: 300 },
      { f: 3, x: 320 },
      { f: 4, x: 300 },
      { f: 0, x: 350 },
      { f: 1, x: 350 },
      { f: 2, x: 350 },
      { f: 3, x: 350 },
      { f: 4, x: 350 }
    ];

    SLOT_POS.forEach(p => {
      const y = this.FLOORS_Y[p.f] - 22;
      const r = this.add.rectangle(p.x, y, 14, 14, 0xaa2222);
      this.slots.push({ x: p.x, y, rect: r, used: false });
    });

    // APARĀTI
    this.extinguishers = this.physics.add.group();

    SLOT_POS.forEach(p => {
      const e = this.add.rectangle(p.x, this.FLOORS_Y[p.f] - 50, 18, 32, 0xff4444);
      this.physics.add.existing(e);
      e.setData("state", "NOK");
      this.extinguishers.add(e);
    });

    this.physics.add.collider(this.extinguishers, this.platforms);
    this.physics.add.collider(this.extinguishers, this.elevator);

    // UI
    this.readyText = this.add.text(10, 10, "Gatavs: 0/10", { color: "#fff" });
    this.timeText = this.add.text(10, 30, "Laiks: 00:00", { color: "#fff" });

    // Kontroles
    this.cursors = this.input.keyboard.createCursorKeys();

    this.startTimeMs = this.time.now;
  }

  update(time, delta) {
    const sec = Math.floor((time - this.startTimeMs) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    this.timeText.setText(`Laiks: ${mm}:${ss}`);

    const speed = 160;
    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-speed);
      this.facing = -1;
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(speed);
      this.facing = 1;
    } else {
      this.player.body.setVelocityX(0);
    }

    this.elevator.y += this.elevatorSpeed * delta / 1000 * this.elevatorDir;
    if (this.elevator.y < this.FLOORS_Y[0]) this.elevatorDir = 1;
    if (this.elevator.y > this.FLOORS_Y[4]) this.elevatorDir = -1;
    this.elevator.body.updateFromGameObject();

    if (Phaser.Input.Keyboard.JustDown(this.cursors.up)) this.tryPickup();
    if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) this.tryDrop();

    if (this.carrying) {
      this.carrying.x = this.player.x + this.facing * 18;
      this.carrying.y = this.player.y - 20;
    }
  }

  tryPickup() {
    if (this.carrying) return;
    this.extinguishers.getChildren().forEach(e => {
      if (!this.carrying && Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < 30) {
        this.carrying = e;
        e.body.enable = false;
      }
    });
  }

  tryDrop() {
    if (!this.carrying) return;
    const e = this.carrying;
    e.body.enable = true;

    // BUSS
    if (Phaser.Geom.Rectangle.Contains(this.busZone, e.x, e.y)) {
      if (this.busStorage.length >= 6) {
        e.x += 40;
      } else {
        e.setData("state", "OK");
        e.fillColor = 0x44aa44;
        this.busStorage.push(e);
      }
    }

    // SLOTI
    this.slots.forEach(s => {
      if (!s.used && e.getData("state") === "OK" &&
        Phaser.Math.Distance.Between(e.x, e.y, s.x, s.y) < 20) {
        s.used = true;
        s.rect.fillColor = 0x44aa44;
        e.body.enable = false;
        e.x = s.x;
        e.y = s.y + 18;
        this.readyCount++;
        this.readyText.setText(`Gatavs: ${this.readyCount}/10`);
      }
    });

    this.carrying = null;
  }

  addPlatform(x, y, w, h) {
    const r = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x1e6a88);
    this.physics.add.existing(r, true);
    this.platforms.add(r);
  }
}
