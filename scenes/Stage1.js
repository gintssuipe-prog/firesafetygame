class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");
  }

  create() {
    const W = 1100;

    // 5 stāvu virsmas (kur stāv kājas)
    this.FLOORS_Y = [110, 220, 330, 440, 550];
    this.THICK = 20;

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

    // Buss (vizuāli)
    const bus = this.add.rectangle(180, 520, 220, 155, 0xf2f4f8).setStrokeStyle(4, 0xc7ced8);
    this.add.text(bus.x, bus.y - 55, "BUSS", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#0b0f14",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // ===== LIFTS KĀ GRĪDAS PLATFORMA =====
    // Lifts ir tikpat “grīdas gabals”, tikai kustīgs
    const elevatorWidth = 240;
    const elevatorX = 650;

    this.elevatorMinY = this.FLOORS_Y[0];       // augšējā stāva līmenis
    this.elevatorMaxY = this.FLOORS_Y[4] + 40;  // nedaudz “pagrabstāvā”, lai var uzskriet
    this.elevatorSpeed = 60;                    // px/sec
    this.elevatorDir = -1;                      // sākumā brauc uz augšu

    this.elevator = this.add.rectangle(
      elevatorX,
      this.elevatorMaxY + this.THICK / 2,
      elevatorWidth,
      this.THICK,
      0x555555
    ).setStrokeStyle(2, 0x1a1f26);

    this.physics.add.existing(this.elevator);
    this.elevator.body.setAllowGravity(false);
    this.elevator.body.setImmovable(true);

    // Lai varētu korekti pārbīdīt spēlētāju līdzi liftam:
    this.prevElevY = this.elevator.y;

    // Spēlētājs
    this.player = this.makePlayer(140, this.FLOORS_Y[4]);
    this.physics.add.existing(this.player);

    this.player.body.setCollideWorldBounds(true);
    this.player.body.setSize(28, 54);
    this.player.body.setOffset(-14, -54);

    // Kolīzijas: ar stāviem + ar liftu
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);

    // Kontroles
    this.cursors = this.input.keyboard.createCursorKeys();

    // UI
    this.add.text(14, 12, "Stage 1: lifts (platforma) + kustība", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    });

    this.add.text(14, 46, "← → kustība | lifts brauc automātiski", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#e7edf5",
      backgroundColor: "rgba(0,0,0,0.35)",
      padding: { x: 10, y: 6 }
    });
  }

  update(time, delta) {
    // --- LIFTA KUSTĪBA ---
    const dt = delta / 1000;

    const dy = this.elevatorSpeed * dt * this.elevatorDir;
    this.elevator.y += dy;

    if (this.elevator.y <= this.elevatorMinY + this.THICK / 2) {
      this.elevator.y = this.elevatorMinY + this.THICK / 2;
      this.elevatorDir = 1;
    }
    if (this.elevator.y >= this.elevatorMaxY + this.THICK / 2) {
      this.elevator.y = this.elevatorMaxY + this.THICK / 2;
      this.elevatorDir = -1;
    }

    // atjauno fizikas body
    this.elevator.body.updateFromGameObject();

    // cik lifts reāli pārbīdījās šajā kadrā
    const elevDeltaY = this.elevator.y - this.prevElevY;
    this.prevElevY = this.elevator.y;

    // --- SPĒLĒTĀJA KUSTĪBA ---
    const speed = 260;

    if (this.cursors.left.isDown) {
      this.player.body.setVelocityX(-speed);
    } else if (this.cursors.right.isDown) {
      this.player.body.setVelocityX(speed);
    } else {
      this.player.body.setVelocityX(0);
    }

    // --- “BRAUC LĪDZI” MEHĀNIKA ---
    // Arcade fizika ne vienmēr pati “piebīda” spēlētāju līdzi kustīgai platformai,
    // tāpēc, ja spēlētājs stāv uz lifta, pārbīdam viņu tikpat, cik lifts.
    const playerOnElevator =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (playerOnElevator) {
      this.player.y += elevDeltaY;
    }
  }

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
}
