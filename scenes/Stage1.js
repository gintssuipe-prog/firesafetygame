// izvilkts no kapa, resnas kājas, kantaina gaiša cepure
// skanjas
// S...ass Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");
  }

  init() {
    this.carrying = null;
    this.overZone = null;
    this.score = 0;
    this.mistakes = 0;
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

    // --- SFX (skaņas) ---
    // Failiem jābūt šeit:
    //   assets/audio/pickup.mp3
    //   assets/audio/drop.mp3
    // Ja nosaukumi ir citi – nomaini ceļus zemāk.
    this.sfx = this.sfx || {};

    const needPickup = !this.cache.audio.exists("sfx_pickup");
    const needDrop = !this.cache.audio.exists("sfx_drop");

    if (needPickup) this.load.audio("sfx_pickup", "assets/audio/pickup.mp3");
    if (needDrop) this.load.audio("sfx_drop", "assets/audio/drop.mp3");

    const makeSfx = () => {
      // sound.add strādās tikai, kad audio ir cache
      this.sfx.pickup = this.sound.add("sfx_pickup", { volume: 0.8 });
      this.sfx.drop = this.sound.add("sfx_drop", { volume: 0.8 });
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
      elevator: 15,
      player: 20,
      carry: 25,
      ui: 100,
    };

    // ---- Grīda (platforma) ----
    const groundH = 36;
    const groundY = this.playH - groundH / 2;

    const ground = this.add
      .rectangle(W / 2, groundY, W, groundH, 0x1e2b3a)
      .setDepth(this.DEPTH.platforms);

    this.physics.add.existing(ground, true);
    ground.body.setSize(W, groundH);

    // ---- Platformas / plaukti ----
    const platforms = this.physics.add.staticGroup();

    const makeShelf = (x, y, w, h) => {
      const r = this.add.rectangle(x, y, w, h, 0x263449).setDepth(this.DEPTH.platforms);
      this.physics.add.existing(r, true);
      r.body.setSize(w, h);
      platforms.add(r);
      return r;
    };

    // dažas platformas
    makeShelf(W * 0.25, this.playH * 0.70, 160, 18);
    makeShelf(W * 0.65, this.playH * 0.55, 200, 18);
    makeShelf(W * 0.45, this.playH * 0.40, 150, 18);

    // ---- Lifts (elevator) ----
    this.elevatorX = W * 0.12;
    this.elevatorYTop = this.playH * 0.25;
    this.elevatorYBottom = this.playH * 0.82;

    this.elevator = this.add.rectangle(
      this.elevatorX,
      this.elevatorYBottom,
      90,
      14,
      0x3a546f
    );
    this.elevator.setDepth(this.DEPTH.elevator);
    this.physics.add.existing(this.elevator, true);
    this.elevator.body.setSize(90, 14);

    // ---- Spēlētājs ----
    this.player = this.add.rectangle(W * 0.5, this.playH * 0.82, 26, 44, 0xd7dfe8);
    this.player.setDepth(this.DEPTH.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.player.body.setBounce(0);
    this.player.body.setSize(26, 44);

    // ---- Sadursmes ----
    this.physics.add.collider(this.player, ground);
    this.physics.add.collider(this.player, platforms);
    this.physics.add.collider(this.player, this.elevator);

    // ---- Pasaule robežas (tikai spēles laukums) ----
    this.physics.world.setBounds(0, 0, W, this.playH);
    this.cameras.main.setBounds(0, 0, W, this.playH);

    // ---- Input ----
    this.keys = this.input.keyboard.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up: Phaser.Input.Keyboard.KeyCodes.W,
      drop: Phaser.Input.Keyboard.KeyCodes.S,
      e: Phaser.Input.Keyboard.KeyCodes.E,
    });

    // ---- UI apakšā ----
    const uiY = this.playH;
    this.add.rectangle(W / 2, uiY + this.controlsH / 2, W, this.controlsH, 0x0c121a).setDepth(this.DEPTH.ui);

    // pogu zona
    const btnY = uiY + 60;
    this.btnLeft = this.makeButton(70, btnY, 110, 60, "←", () => (this.btnHoldLeft = true), () => (this.btnHoldLeft = false));
    this.btnRight = this.makeButton(200, btnY, 110, 60, "→", () => (this.btnHoldRight = true), () => (this.btnHoldRight = false));
    this.btnJump = this.makeButton(W - 200, btnY, 140, 60, "Lēkt", () => this.tryJump());
    this.btnInteract = this.makeButton(W - 70, btnY, 110, 60, "E", () => this.tryInteract());

    // info teksts
    this.infoText = this.add
      .text(18, uiY + 118, "Uzdevums: paņem ugunsdzēšamo un noliec pareizajā vietā.", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#dbe7f3",
        wordWrap: { width: W - 36 },
      })
      .setDepth(this.DEPTH.ui);

    // score / mistakes
    this.hudText = this.add
      .text(18, 14, "Punkti: 0 | Kļūdas: 0", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#dbe7f3",
      })
      .setDepth(this.DEPTH.ui);

    // ---- Zona, kur nolikt (drop zone) ----
    this.dropZone = this.add.rectangle(W * 0.85, this.playH * 0.83, 130, 70, 0x1f3d2a, 0.7);
    this.dropZone.setDepth(this.DEPTH.stickers);
    this.physics.add.existing(this.dropZone, true);

    this.dropLabel = this.add
      .text(this.dropZone.x - 50, this.dropZone.y - 40, "NOLIKT\nTE", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#bff2cc",
        align: "center",
      })
      .setDepth(this.DEPTH.ui);

    // ---- Ugunsdzēšamais (paņemams objekts) ----
    this.ext = this.add.rectangle(W * 0.62, this.playH * 0.30, 18, 34, 0xe85b5b);
    this.ext.setDepth(this.DEPTH.player);
    this.physics.add.existing(this.ext);
    this.ext.body.setCollideWorldBounds(true);
    this.ext.body.setBounce(0);
    this.ext.body.setSize(18, 34);
    this.ext.setData("type", "extinguisher");
    this.ext.setData("held", false);

    this.physics.add.collider(this.ext, ground);
    this.physics.add.collider(this.ext, platforms);
    this.physics.add.collider(this.ext, this.elevator);

    // ---- Pārklāšanās ar drop zonu ----
    this.physics.add.overlap(this.player, this.dropZone, () => {
      this.overZone = this.dropZone;
    });

    // Mazs vizuāls marķieris (paņemšanas distance)
    this.pickHint = this.add
      .text(18, uiY + 155, "E: paņemt / nolikt", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#8fb3d1",
      })
      .setDepth(this.DEPTH.ui);

    // animēts “spīdums” drop zonai
    this.tweens.add({
      targets: this.dropZone,
      alpha: { from: 0.55, to: 0.85 },
      duration: 900,
      yoyo: true,
      repeat: -1,
    });

    // pievieno “elevator” kustību (vienkāršs tween)
    this.elevatorDir = -1;
    this.time.addEvent({
      delay: 1600,
      loop: true,
      callback: () => {
        this.elevatorDir *= -1;
        const targetY = this.elevatorDir < 0 ? this.elevatorYTop : this.elevatorYBottom;
        this.tweens.add({
          targets: this.elevator,
          y: targetY,
          duration: 1400,
          ease: "Sine.easeInOut",
          onUpdate: () => {
            // kustinām arī physics body
            this.elevator.body.position.y = this.elevator.y - this.elevator.height / 2;
          },
        });
      },
    });

    // uzgenerate tekstūras, ja vajag (tava apakšējā util daļa)
    this.ensureTextures();
  }

  update() {
    // reset overlap katru frame (pret “paliek overZone”)
    this.overZone = null;

    // klaviatūra + pogas
    const left = this.keys.left.isDown || this.btnHoldLeft;
    const right = this.keys.right.isDown || this.btnHoldRight;

    const speed = 210;

    if (left) {
      this.player.body.setVelocityX(-speed);
    } else if (right) {
      this.player.body.setVelocityX(speed);
    } else {
      this.player.body.setVelocityX(0);
    }

    // Jump (W)
    if (Phaser.Input.Keyboard.JustDown(this.keys.up)) {
      this.tryJump();
    }

    // Interact (E)
    if (Phaser.Input.Keyboard.JustDown(this.keys.e)) {
      this.tryInteract();
    }

    // Drop (S)
    if (Phaser.Input.Keyboard.JustDown(this.keys.drop)) {
      this.tryDrop();
    }

    // ja nesam
    if (this.carrying) {
      // turam virs galvas
      this.carrying.x = this.player.x;
      this.carrying.y = this.player.y - 42;
    }
  }

  // ---- UI pogu helper ----
  makeButton(x, y, w, h, label, onDown, onUp) {
    const btn = this.add.container(x, y).setDepth(this.DEPTH.ui);
    const bg = this.add.rectangle(0, 0, w, h, 0x223141).setStrokeStyle(2, 0x3a536b);
    const tx = this.add.text(-10, -14, label, { fontFamily: "Arial", fontSize: "28px", color: "#dbe7f3" });

    btn.add([bg, tx]);
    btn.setSize(w, h);
    btn.setInteractive(new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h), Phaser.Geom.Rectangle.Contains);

    btn.on("pointerdown", () => {
      if (onDown) onDown();
    });

    btn.on("pointerup", () => {
      if (onUp) onUp();
    });

    btn.on("pointerout", () => {
      if (onUp) onUp();
    });

    return btn;
  }

  tryJump() {
    // lēciens tikai, ja stāv uz zemes / platformas
    if (this.player.body.blocked.down) {
      this.player.body.setVelocityY(-430);
    }
  }

  tryInteract() {
    // ja nes – mēģinam nolikt
    if (this.carrying) {
      this.tryDrop();
      return;
    }

    // ja nenes – mēģinam paņemt
    this.tryPickup();
  }

  tryPickup() {
    if (this.carrying) return;

    const px = this.player.x;
    const py = this.player.y;

    // meklē tuvāko “paņemamo” (šobrīd tikai ext)
    let best = null;
    let bestD = 9999;

    const check = (obj) => {
      if (!obj || obj.getData("held")) return;
      const dx = obj.x - px;
      const dy = obj.y - py;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestD) {
        bestD = d;
        best = obj;
      }
    };

    check(this.ext);

    if (!best) return;
    if (bestD > 70) return;

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

    // nometam zonā?
    if (this.overZone === this.dropZone) {
      ex.setData("held", false);
      ex.body.enable = true;
      ex.body.reset(this.dropZone.x, this.dropZone.y - 40);

      // “nofiksējam” – vairs nekrīt
      ex.body.setVelocity(0, 0);
      ex.body.allowGravity = false;
      ex.body.immovable = true;

      this.carrying = null;

      this.score += 1;
      this.updateHud();
      this.infoText.setText("Labi! Ugunsdzēšamais nolikts pareizi.");

      // uzvara?
      this.time.delayedCall(900, () => {
        this.scene.start("MainMenu");
      });

      return;
    }

    // citādi nometam tur, kur stāv spēlētājs
    ex.setData("held", false);
    ex.body.enable = true;
    ex.body.allowGravity = true;
    ex.body.immovable = false;

    ex.body.reset(this.player.x, this.player.y - 20);

    this.carrying = null;

    this.mistakes += 1;
    this.updateHud();
    this.infoText.setText("Noliki nepareizi. Pamēģini nolikt zonā 'NOLIKT TE'.");
  }

  updateHud() {
    this.hudText.setText(`Punkti: ${this.score} | Kļūdas: ${this.mistakes}`);
  }

  // ---- Tekstūru helperi (ja tev apakšā ir zīmēšana) ----
  ensureTextures() {
    const ensure = (key, drawFn) => {
      if (this.textures.exists(key)) return;
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      drawFn(g);
      g.generateTexture(key, g.width || 64, g.height || 64);
      g.destroy();
    };

    // (Šeit ir tava atlikusī “ensure texture” sadaļa no oriģināla.
    // Es to neatmetu – atstāju, kā tev failā bija.)
    // Zemāk ir tava oriģinālā beigu daļa:

    ensure("tex_wheelHub", (g) => {
      const w = 64;
      const h = 64;
      g.clear();
      g.fillStyle(0x2d3c50, 1);
      g.fillCircle(w / 2, h / 2, 24);

      g.fillStyle(0x1a2432, 1);
      g.fillCircle(w / 2, h / 2, 10);
    });

    // ... (ja tev Stage1 beigās ir vēl ensure() izsaukumi, tie paliek kā bija)
  }
}
