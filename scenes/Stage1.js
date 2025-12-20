// resnas kaajas cepure kruta   taalaak skanjas buus     baigaa stabilitaate klaat   jattestee
// Stage1.js — stabila versija (ROLLBACK) + cilvēciņam vektoru cepure/rokas/kājas + kāju “tipināšana” kantaina cepure aizgaaja resnakas kajas
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
    this.facing = 1; // 1=pa labi, -1=pa kreisi

    this.startTimeMs = 0;
    this.finished = false;

    this.prevElevY = 0;

    // buss
    this.busStorage = [];
    this.BUS_CAPACITY = 6;

    // anim
    this.runT = 0; // “tipināšanas” fāze

    // UI stabilitāte: lai varam droši tīrīt listenerus/tweens (scene restart/crossfade gadījumiem)
    this._uiButtons = [];
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

    // ✅ uzģenerējam gradient-tekstūras (vienreiz)
    this.buildGradientTextures();

    // ---- Grīdas (5 stāvi) ----
    const topY = 130;
    const bottomY = this.playH - 35;
    this.FLOORS_Y = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      this.FLOORS_Y.push(Phaser.Math.Linear(topY, bottomY, t));
    }
    this.THICK = 18;

    // ---- Platformas (Image + static body) ----
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

    // šaurā “seg1” centra x (tas ir tas “pavisam šaurais plauktiņš”)
    const seg1W_base = holeL - rightStartX;
    this.NARROW_MID_X = Math.round(rightStartX + seg1W_base / 2);

    // Noņemam 2 konkrētus mazos plauktiņus (šaurais seg1 gabals)
    // i = 0..3 attiecas uz augšējiem 4 stāviem: FLOORS_Y[0..3]
    // Te noņemam i=1 un i=3 (vizuāli: 2. un 4. stāvs, skaitot no apakšas)
    // (tātad platformas uz augšējiem stāviem būs tikai 2 segmenti: kreisais un labais)
    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      const leftW = rightStartX;
      this.addPlatform(0, y, leftW, this.THICK);

      // right segments: seg1 (šaurais) + seg2 (līdz W)
      const seg1X = rightStartX;
      const seg1W = holeL - rightStartX;
      const seg2X = holeR;
      const seg2W = W - holeR;

      // šaurais “seg1” tikai 2 stāvos (i=0 un i=2), bet 2 citos to noņemam
      if (!(i === 1 || i === 3)) {
        this.addPlatform(seg1X, y, seg1W, this.THICK);
      }
      this.addPlatform(seg2X, y, seg2W, this.THICK);
    }

    // ---- Ārējās kāpnes pa kreisi (vienkārši dekoratīvi un platformas) ----
    this.buildExteriorStairs();

    // ---- Lifts (kustīga platforma) ----
    this.buildElevator();

    // ---- Buss (apakseja labajā pusē) ----
    this.buildBus();

    // ---- Cilvēciņš ----
    this.buildPlayer();

    // ---- Aparāti (10 gab.) ----
    this.buildDevices();

    // Kolīzijas
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);
    this.physics.add.collider(this.devices, this.platforms);
    this.physics.add.collider(this.devices, this.elevator);

    // ---- UI augšā ----
    this.readyText = this.add
      .text(16, 16, "Gatavi: 0/10", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff"
      })
      .setScrollFactor(0)
      .setDepth(this.DEPTH.ui);

    this.timeText = this.add
      .text(W - 16, 16, "Laiks: 00:00", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff"
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.ui);

    // ---- Kontroles (telefons) ----
    this.createPortraitControls();

    // ---- EXIT poga pa vidu kontroles zonā ----
    this.createExitButton();

    // ---- Keyboard ----
    this.cursors = this.input.keyboard.createCursorKeys();

    // drošības josta: ja kādreiz scene tiek apturēta/iznīcināta, neturam vecos input/tweens
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onStage1Shutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onStage1Shutdown, this);

    this.startTimeMs = this.time.now;
  }

  update(time, delta) {
    if (!this.finished) {
      const totalSec = Math.floor((time - this.startTimeMs) / 1000);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      this.timeText.setText(`Laiks: ${mm}:${ss}`);
    }

    // stabilitāte: tab-switch / FPS kritums var dot milzu delta -> clamp
    const d = Math.min(delta, 66); // ~15 FPS “sliktākais” solis

    // lifts
    const dt = d / 1000;
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
    let movingLR = false;
    if (!this.finished) {
      const left = this.cursors.left.isDown || this.touch.left;
      const right = this.cursors.right.isDown || this.touch.right;
      const speed = 230;

      if (left) {
        this.player.body.setVelocityX(-speed);
        this.facing = -1;
        movingLR = true;
      } else if (right) {
        this.player.body.setVelocityX(speed);
        this.facing = 1;
        movingLR = true;
      } else {
        this.player.body.setVelocityX(0);
      }
    } else {
      this.player.body.setVelocityX(0);
    }

    // ✅ vektoru “cepure/rokas” virzienā + kāju tipināšana
    this.updatePlayerVisuals(d, movingLR);

    // paņem/noliec
    if (!this.finished) {
      const upPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.consumeTouch("up");
      const downPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.consumeTouch("down");
      if (upPressed) this.tryPickup();
      if (downPressed) this.tryDrop();
    }

    // aparāts rokās
    if (this.carrying) {
      const offX = 22 * this.facing;
      const offY = -18;
      this.carrying.x = this.player.x + offX;
      this.carrying.y = this.player.y + offY;
    }

    // braukšana līdzi liftam (ja stāv uz lifta)
    const onElev =
      this.player.body.touching.down &&
      this.elevator.body.touching.up &&
      Math.abs(this.player.body.bottom - this.elevator.body.top) <= 3;

    if (onElev) {
      this.player.y += elevDeltaY;
      if (this.carrying) this.carrying.y += elevDeltaY;
    }
  }

  updatePlayerVisuals(delta, movingLR) {
    if (!this.player) return;

    // 1) pagriežam vektoru elementus pēc facing
    if (this.player._vecLayer) {
      this.player._vecLayer.scaleX = this.facing;
    }

    // 2) kājas “tipināšana” tikai skrienot
    if (this.player._legL && this.player._legR) {
      if (movingLR) {
        this.runT += delta * 0.018; // fāze
        const s = Math.sin(this.runT);
        // ±2..3 px
        const amp = 2.6;
        this.player._legL.y = this.player._legBaseY + s * amp;
        this.player._legR.y = this.player._legBaseY - s * amp;
      } else {
        // stāvot mierā
        this.player._legL.y = this.player._legBaseY;
        this.player._legR.y = this.player._legBaseY;
      }
    }

    // 3) rokas nedaudz “uz priekšu” virzienā
    if (this.player._armL && this.player._armR) {
      const armFwd = movingLR ? 1 : 0;
      // neliels vizuāls nobīdes impulss
      this.player._armL.x = this.player._armL_baseX + armFwd * 1.5;
      this.player._armR.x = this.player._armR_baseX + armFwd * 1.5;
    }
  }

  // ---------------------------------------------------------
  // ----------------------- BUILDERS -------------------------
  // ---------------------------------------------------------

  buildGradientTextures() {
    // Galva (balts ar nelielu gradientu)
    if (!this.textures.exists("tex_head")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillCircle(18, 18, 18);
      g.fillStyle(0xe9f2ff, 1);
      g.fillCircle(14, 14, 12);
      g.generateTexture("tex_head", 36, 36);
      g.destroy();
    }

    // Buss (balts ar maigu gradientu)
    if (!this.textures.exists("tex_bus")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0xffffff, 1);
      g.fillRoundedRect(0, 0, 190, 64, 14);

      g.fillStyle(0xeef6ff, 1);
      g.fillRoundedRect(6, 6, 178, 28, 12);

      // logs
      g.fillStyle(0x1b2a3a, 1);
      g.fillRoundedRect(20, 18, 56, 22, 8);
      g.fillRoundedRect(82, 18, 56, 22, 8);

      // riteņi
      g.fillStyle(0x203040, 1);
      g.fillCircle(44, 58, 10);
      g.fillCircle(148, 58, 10);

      g.generateTexture("tex_bus", 190, 64);
      g.destroy();
    }

    // Aparāts (zaļš)
    if (!this.textures.exists("tex_device")) {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(0x2ecc71, 1);
      g.fillRoundedRect(0, 0, 26, 18, 5);
      g.fillStyle(0x1e8f4e, 1);
      g.fillRoundedRect(2, 2, 22, 6, 3);
      g.generateTexture("tex_device", 26, 18);
      g.destroy();
    }
  }

  addPlatform(x, y, w, h) {
    const img = this.add.rectangle(x + w / 2, y, w, h, 0x1a2b3a, 1);
    img.setDepth(this.DEPTH.platforms);

    const body = this.platforms.create(x + w / 2, y, null);
    body.setVisible(false);
    body.body.setSize(w, h);
    body.body.updateFromGameObject();
    return body;
  }

  buildExteriorStairs() {
    // vienkāršs “kāpņu” karkass kreisajā pusē
    const W = this.scale.width;

    const stairX = 58;
    const stairW = 80;

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[4 - i] - 70;
      const rect = this.add.rectangle(stairX, y, stairW, 10, 0x22364a, 1);
      rect.setDepth(this.DEPTH.ext);
    }

    // dekoratīvi sānu stabi
    this.add.rectangle(18, this.playH / 2, 10, this.playH - 60, 0x22364a, 1).setDepth(this.DEPTH.ext);
    this.add.rectangle(98, this.playH / 2, 10, this.playH - 60, 0x22364a, 1).setDepth(this.DEPTH.ext);

    // platformas uz kāpnēm (lai var uzkāpt)
    // 4 mazas platformas starp stāviem
    for (let i = 0; i < 4; i++) {
      const y = Phaser.Math.Linear(this.FLOORS_Y[4], this.FLOORS_Y[0], (i + 0.5) / 4);
      this.addPlatform(0, y, 120, 10);
    }

    // maza “plaukta” platforma ap vidu
    this.addPlatform(0, this.FLOORS_Y[2] + 80, 120, 10);
  }

  buildElevator() {
    const minY = this.FLOORS_Y[0];
    const maxY = this.FLOORS_Y[4];

    this.elevatorMinSurfaceY = minY;
    this.elevatorMaxSurfaceY = maxY;

    // vizuāli (kustīga platforma)
    const e = this.add.rectangle(this.elevatorX, maxY, this.elevatorWidth, this.THICK, 0x3a566d, 1);
    e.setDepth(this.DEPTH.elevator);

    // physics (dynamic body, immovable)
    this.elevator = this.physics.add.existing(e, false);
    this.elevator.body.setAllowGravity(false);
    this.elevator.body.setImmovable(true);

    // kustība
    this.elevatorSpeed = 85;
    this.elevatorDir = -1;

    this.prevElevY = this.elevator.y;

    // šahtas “līnijas”
    const shaftTop = this.FLOORS_Y[0] - 40;
    const shaftBot = this.FLOORS_Y[4] + 20;

    const leftX = this.elevatorX - this.shaftGapW / 2;
    const rightX = this.elevatorX + this.shaftGapW / 2;

    this.add.rectangle(leftX, (shaftTop + shaftBot) / 2, 4, shaftBot - shaftTop, 0x2a3f55, 1).setDepth(this.DEPTH.ext);
    this.add.rectangle(rightX, (shaftTop + shaftBot) / 2, 4, shaftBot - shaftTop, 0x2a3f55, 1).setDepth(this.DEPTH.ext);
  }

  buildBus() {
    const W = this.scale.width;

    const x = Math.round(W * 0.78);
    const y = this.FLOORS_Y[4] - 40;

    const bus = this.add.image(x, y, "tex_bus");
    bus.setDepth(this.DEPTH.bus);

    this.bus = bus;

    // “slot” vietas busā (iekšā)
    this.busSlots = [];
    const startX = x - 60;
    const startY = y - 10;
    const dx = 24;

    for (let i = 0; i < this.BUS_CAPACITY; i++) {
      const sx = startX + i * dx;
      const sy = startY;
      this.busSlots.push({ x: sx, y: sy, filled: false });
    }

    // vizuāli uzzīmējam slot “punktiņus”
    for (let i = 0; i < this.BUS_CAPACITY; i++) {
      const s = this.busSlots[i];
      const dot = this.add.circle(s.x, s.y, 4, 0x2b3b4a, 1);
      dot.setDepth(this.DEPTH.bus + 1);
      s._dot = dot;
    }
  }

  buildPlayer() {
    // start uz grīdas apakšā kreisāk
    const startX = 110;
    const startY = this.FLOORS_Y[4] - 50;

    // physics body (invisible rectangle)
    const body = this.add.rectangle(startX, startY, 26, 48, 0x000000, 0);
    body.setDepth(this.DEPTH.player);

    this.player = this.physics.add.existing(body, false);
    this.player.body.setSize(26, 48);
    this.player.body.setOffset(-13, -24);
    this.player.body.setCollideWorldBounds(true);

    // vektoru slānis (Graphics/Shapes)
    const layer = this.add.container(startX, startY);
    layer.setDepth(this.DEPTH.player);

    // galva
    const head = this.add.image(0, -22, "tex_head").setOrigin(0.5);

    // cepure (2 taisnstūri, naģenes forma, ass gals uz priekšu)
    const hatColor = 0x2a2f35; // tumša, bet ne pilnīgi melna
    const hat = this.add.container(0, -46); // nedaudz nost no galvas

    // “kronis”
    const crown = this.add.rectangle(0, 0, 22, 10, hatColor, 1);
    crown.setOrigin(0.5);

    // “nags” (ass gals uz priekšu)
    const nail = this.add.rectangle(10, 2, 20, 8, hatColor, 1);
    nail.setOrigin(0.5);

    hat.add([crown, nail]);

    // ķermenis
    const torso = this.add.rectangle(0, 0, 16, 20, 0xffffff, 1);
    torso.setOrigin(0.5);

    // rokas (šauri trīsstūri, uz priekšu)
    const armColor = 0xffffff;
    const armL = this.add.triangle(-10, -2, 0, 0, 10, 3, 0, 6, armColor, 1);
    const armR = this.add.triangle(-10, 4, 0, 0, 10, 3, 0, 6, armColor, 1);

    // kājas (taisnstūri, platākas)
    const legColor = 0xffffff;
    const legW = 8; // ~25% platāk nekā “plānais”
    const legH = 16;

    const legL = this.add.rectangle(-5, 18, legW, legH, legColor, 1);
    const legR = this.add.rectangle(5, 18, legW, legH, legColor, 1);
    legL.setOrigin(0.5, 0.0);
    legR.setOrigin(0.5, 0.0);

    layer.add([legL, legR, torso, armL, armR, head, hat]);

    // piesienam reference uz layer, lai update() var pagriezt
    this.player._vecLayer = layer;
    this.player._legL = legL;
    this.player._legR = legR;
    this.player._legBaseY = 18;

    this.player._armL = armL;
    this.player._armR = armR;
    this.player._armL_baseX = armL.x;
    this.player._armR_baseX = armR.x;
  }

  buildDevices() {
    this.devices = this.physics.add.group();

    // 10 gab uz dažādiem stāviem
    const spots = [];
    // uz 2..5 stāviem: kreisā kāpņu zona + labā zona (bez šahtas)
    for (let f = 0; f < 4; f++) {
      const y = this.FLOORS_Y[f] - 20;
      spots.push({ x: 70, y });
      spots.push({ x: 140, y });
      spots.push({ x: 240, y });
      spots.push({ x: 320, y });
    }
    // pielāgojam līdz 10
    const shuffled = Phaser.Utils.Array.Shuffle(spots).slice(0, this.totalCount);

    shuffled.forEach((p) => {
      const d = this.devices.create(p.x, p.y, "tex_device");
      d.setDepth(this.DEPTH.carry);
      d.body.setBounce(0.05);
      d.body.setCollideWorldBounds(true);
      d.body.setDragX(300);
      d._ready = false;
    });
  }

  // ---------------------------------------------------------
  // ----------------------- LOGIC ---------------------------
  // ---------------------------------------------------------

  tryPickup() {
    if (this.carrying) return;

    // meklē tuvāko aparātu (ne-ready)
    let best = null;
    let bestD = 99999;

    this.devices.getChildren().forEach((d) => {
      if (d._ready) return;
      const dx = d.x - this.player.x;
      const dy = d.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    });

    if (best && bestD <= 45) {
      this.carrying = best;
      best.body.setAllowGravity(false);
      best.body.setVelocity(0);
      best.body.setImmovable(true);
    }
  }

  tryDrop() {
    if (!this.carrying) return;

    // ja pie busa un ir brīvs slots -> “ieliekam” un atzīmējam ready
    const inBusZone = this.isInBusZone(this.player.x, this.player.y);

    if (inBusZone) {
      const slot = this.findFreeBusSlot();
      if (slot) {
        // noliekam uz slot vietu
        this.carrying.x = slot.x;
        this.carrying.y = slot.y;
        this.carrying._ready = true;

        // fiksējam slotu
        slot.filled = true;
        slot._dot.setFillStyle(0x2ecc71, 1);

        // noņemam physics no aparāta (lai vairs nekustas)
        this.carrying.body.setAllowGravity(false);
        this.carrying.body.setVelocity(0);
        this.carrying.body.setImmovable(true);
        this.carrying.body.enable = false;

        this.carrying = null;

        this.readyCount++;
        this.readyText.setText(`Gatavi: ${this.readyCount}/${this.totalCount}`);

        if (this.readyCount >= this.totalCount) {
          this.finishStage();
        }
        return;
      }
    }

    // citādi noliekam uz zemes pie kājām
    const d = this.carrying;
    d.body.enable = true;
    d.body.setAllowGravity(true);
    d.body.setImmovable(false);
    d.x = this.player.x + 16 * this.facing;
    d.y = this.player.y - 10;
    this.carrying = null;
  }

  isInBusZone(px, py) {
    // vienkāršs “rect” ap busu
    const bx = this.bus.x;
    const by = this.bus.y;
    return Math.abs(px - bx) < 120 && Math.abs(py - by) < 80;
  }

  findFreeBusSlot() {
    for (let i = 0; i < this.busSlots.length; i++) {
      if (!this.busSlots[i].filled) return this.busSlots[i];
    }
    return null;
  }

  finishStage() {
    this.finished = true;

    // overlay
    const W = this.scale.width;
    const H = this.scale.height;

    const bg = this.add.rectangle(W / 2, this.playH / 2, W, this.playH, 0x000000, 0.55);
    bg.setDepth(this.DEPTH.overlay);

    const panel = this.add.rectangle(W / 2, this.playH / 2, W * 0.78, 180, 0x1c2d3c, 1);
    panel.setDepth(this.DEPTH.overlay + 1);

    const t = this.add
      .text(W / 2, this.playH / 2 - 40, "Līmenis pabeigts!", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(this.DEPTH.overlay + 2);

    const t2 = this.add
      .text(W / 2, this.playH / 2 + 20, "Visi aparāti ievietoti busā.", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cfe6ff"
      })
      .setOrigin(0.5)
      .setDepth(this.DEPTH.overlay + 2);

    // neliels “stop” lai neskrien
    this.player.body.setVelocityX(0);
  }

  // ---------------------------------------------------------
  // ---------------- Controls helpers ----------------
  onStage1Shutdown() {
    // noņemam UI listenerus + apturam tweens, lai restartējot nebojājas stāvoklis
    try {
      if (this._uiButtons && this._uiButtons.length) {
        for (const b of this._uiButtons) {
          if (!b) continue;
          try {
            this.tweens.killTweensOf(b);
            if (b._label) this.tweens.killTweensOf(b._label);
          } catch (e) {}
          try {
            b.removeAllListeners();
          } catch (e) {}
          try {
            b.disableInteractive();
          } catch (e) {}
        }
      }
    } catch (e) {}
  }

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

    const leftX = 80;
    const rightX = W - 80;
    const yMid = Math.round(areaTop + areaH / 2);

    const R = 42;

    const mkBtn = (x, y, txt) => {
      const btn = this.add
        .circle(x, y, R, 0x142334, 1)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls)
        .setInteractive({ useHandCursor: true });

      const label = this.add
        .text(x, y, txt, {
          fontFamily: "Arial",
          fontSize: "34px",
          color: "#ffffff",
          fontStyle: "bold"
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(this.DEPTH.controls + 1);

      btn._label = label;
      return btn;
    };

    const btnLeft = mkBtn(leftX, yMid, "←");
    const btnRight = mkBtn(rightX, yMid, "→");
    const btnDown = mkBtn(rightX, yMid - 45, "↓");
    const btnUp = mkBtn(rightX, yMid + 45, "↑");

    // reģistrējam, lai varam korekti tīrīt listenerus shutdown/destroy gadījumā
    this._uiButtons.push(btnLeft, btnRight, btnDown, btnUp);

    const pressIn = (btn) => {
      btn.setFillStyle(0x1d3a55, 1);
      // stabilitāte: neuzkrājam paralēlus tweens pie ātras spaidīšanas / pointercancel
      this.tweens.killTweensOf([btn, btn._label]);
      this.tweens.add({ targets: [btn, btn._label], scaleX: 0.96, scaleY: 0.96, duration: 60 });
    };
    const pressOut = (btn) => {
      btn.setFillStyle(0x142334, 1);
      this.tweens.killTweensOf([btn, btn._label]);
      this.tweens.add({ targets: [btn, btn._label], scaleX: 1.0, scaleY: 1.0, duration: 80 });
    };

    const bindHold = (btn, key) => {
      btn.on("pointerdown", () => {
        this.touch[key] = true;
        pressIn(btn);
      });
      btn.on("pointerup", () => {
        this.touch[key] = false;
        pressOut(btn);
      });
      btn.on("pointerout", () => {
        this.touch[key] = false;
        pressOut(btn);
      });
      btn.on("pointercancel", () => {
        this.touch[key] = false;
        pressOut(btn);
      });
    };

    bindHold(btnLeft, "left");
    bindHold(btnRight, "right");

    // up/down šeit lietojam kā “vienreizēju” signālu paņem/noliec
    btnUp.on("pointerdown", () => {
      this.touch.up = true;
      pressIn(btnUp);
    });
    btnUp.on("pointerup", () => pressOut(btnUp));
    btnUp.on("pointerout", () => pressOut(btnUp));
    btnUp.on("pointercancel", () => pressOut(btnUp));

    btnDown.on("pointerdown", () => {
      this.touch.down = true;
      pressIn(btnDown);
    });
    btnDown.on("pointerup", () => pressOut(btnDown));
    btnDown.on("pointerout", () => pressOut(btnDown));
    btnDown.on("pointercancel", () => pressOut(btnDown));
  }

  createExitButton() {
    const W = this.scale.width;
    const areaTop = this.playH;
    const areaH = this.controlsH;

    const cx = Math.round(W / 2);
    const cy = Math.round(areaTop + areaH / 2);

    const R = 44;

    const btn = this.add
      .circle(cx, cy, R, 0xb90f0f, 1)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.controls + 3)
      .setInteractive({ useHandCursor: true });

    this._uiButtons.push(btn);

    const label = this.add
      .text(cx, cy, "EXIT", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.controls + 4);

    // ✅ FIX: lai shutdown cleanup nokauj arī EXIT label tweenus
    btn._label = label;

    const pressIn = () => {
      btn.setFillStyle(0xd61a1a, 1);
      this.tweens.killTweensOf([btn, label]);
      this.tweens.add({ targets: [btn, label], scaleX: 0.96, scaleY: 0.96, duration: 60 });
    };

    const pressOut = () => {
      btn.setFillStyle(0xb90f0f, 1);
      this.tweens.killTweensOf([btn, label]);
      this.tweens.add({ targets: [btn, label], scaleX: 1.0, scaleY: 1.0, duration: 80 });
    };

    const doExit = () => {
      try {
        window.open("", "_self");
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
    btn.on("pointercancel", () => pressOut());
  }
}

window.Stage1 = Stage1;
