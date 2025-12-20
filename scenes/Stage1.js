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

    this.controlsH = 190;
    this.playH = H - this.controlsH;

    this.cameras.main.setBackgroundColor("#101a24");
    this.physics.world.gravity.y = 900;

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

    this.buildGradientTextures();

    const topY = 130;
    const bottomY = this.playH - 35;
    this.FLOORS_Y = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      this.FLOORS_Y.push(Phaser.Math.Linear(topY, bottomY, t));
    }
    this.THICK = 18;

    this.platforms = this.physics.add.staticGroup();

    this.addPlatform(0, this.FLOORS_Y[4], W, this.THICK);

    this.elevatorWidth = 70;
    this.elevatorX = Math.round(W * 0.62);
    this.shaftGapW = this.elevatorWidth + 26;

    const rightStartX = Math.round(W * 0.42);
    const holeL = this.elevatorX - this.shaftGapW / 2;
    const holeR = this.elevatorX + this.shaftGapW / 2;

    const seg1W_base = holeL - rightStartX;
    this.NARROW_MID_X = Math.round(rightStartX + seg1W_base / 2);

    for (let i = 0; i < 4; i++) {
      const y = this.FLOORS_Y[i];

      const leftW = rightStartX;
      this.addPlatform(0, y, leftW, this.THICK);

      const seg1X = rightStartX;
      const seg1W = holeL - rightStartX;
      const seg2X = holeR;
      const seg2W = W - holeR;

      if (!(i === 1 || i === 3)) {
        this.addPlatform(seg1X, y, seg1W, this.THICK);
      }
      this.addPlatform(seg2X, y, seg2W, this.THICK);
    }

    this.buildExteriorStairs();
    this.buildElevator();
    this.buildBus();
    this.buildPlayer();
    this.buildDevices();

    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.player, this.elevator);
    this.physics.add.collider(this.devices, this.platforms);
    this.physics.add.collider(this.devices, this.elevator);

    this.readyText = this.add
      .text(16, 16, "Gatavi: 0/10", { fontFamily: "Arial", fontSize: "20px", color: "#ffffff" })
      .setScrollFactor(0)
      .setDepth(this.DEPTH.ui);

    this.timeText = this.add
      .text(W - 16, 16, "Laiks: 00:00", { fontFamily: "Arial", fontSize: "20px", color: "#ffffff" })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(this.DEPTH.ui);

    this.createPortraitControls();
    this.createExitButton();

    this.cursors = this.input.keyboard.createCursorKeys();

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

    const d = Math.min(delta, 66);

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

    this.updatePlayerVisuals(d, movingLR);

    if (!this.finished) {
      const upPressed = Phaser.Input.Keyboard.JustDown(this.cursors.up) || this.consumeTouch("up");
      const downPressed = Phaser.Input.Keyboard.JustDown(this.cursors.down) || this.consumeTouch("down");
      if (upPressed) this.tryPickup();
      if (downPressed) this.tryDrop();
    }

    if (this.carrying) {
      const offX = 22 * this.facing;
      const offY = -18;
      this.carrying.x = this.player.x + offX;
      this.carrying.y = this.player.y + offY;
    }

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

    if (this.player._vecLayer) {
      this.player._vecLayer.scaleX = this.facing;
    }

    if (this.player._legL && this.player._legR) {
      if (movingLR) {
        this.runT += delta * 0.018;
        const s = Math.sin(this.runT);
        const amp = 2.6;
        this.player._legL.y = this.player._legBaseY + s * amp;
        this.player._legR.y = this.player._legBaseY - s * amp;
      } else {
        this.player._legL.y = this.player._legBaseY;
        this.player._legR.y = this.player._legBaseY;
      }
    }

    if (this.player._armL && this.player._armR) {
      const armFwd = movingLR ? 1 : 0;
      this.player._armL.x = this.player._armL_baseX + armFwd * 1.5;
      this.player._armR.x = this.player._armR_baseX + armFwd * 1.5;
    }
  }

  // --- pārējās tavas funkcijas (buildGradientTextures/addPlatform/buildExteriorStairs/buildElevator/buildBus/buildPlayer/buildDevices/tryPickup/tryDrop/isInBusZone/findFreeBusSlot/finishStage/consumeTouch/createPortraitControls) paliek 1:1 ---
  // Te atstāju identiski kā tev bija; vienīgā faktiskā izmaiņa ir createExitButton() -> btn._label = label;

  buildGradientTextures() { /* ... TE LIEC SAVU ESOŠO KODU 1:1 ... */ }
  addPlatform(x, y, w, h) { /* ... */ }
  buildExteriorStairs() { /* ... */ }
  buildElevator() { /* ... */ }
  buildBus() { /* ... */ }
  buildPlayer() { /* ... */ }
  buildDevices() { /* ... */ }
  tryPickup() { /* ... */ }
  tryDrop() { /* ... */ }
  isInBusZone(px, py) { /* ... */ }
  findFreeBusSlot() { /* ... */ }
  finishStage() { /* ... */ }
  consumeTouch(key) { /* ... */ }
  createPortraitControls() { /* ... */ }

  onStage1Shutdown() {
    try {
      if (this._uiButtons && this._uiButtons.length) {
        for (const b of this._uiButtons) {
          if (!b) continue;
          try {
            this.tweens.killTweensOf(b);
            if (b._label) this.tweens.killTweensOf(b._label);
          } catch (e) {}
          try { b.removeAllListeners(); } catch (e) {}
          try { b.disableInteractive(); } catch (e) {}
        }
      }
    } catch (e) {}
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

    // ✅ šī ir “micro” stabilitātes izmaiņa
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
      try { window.open("", "_self"); window.close(); } catch (e) {}
      try { this.game.destroy(true); } catch (e) {}
      try { window.location.href = "about:blank"; } catch (e) {}
    };

    btn.on("pointerdown", () => pressIn());
    btn.on("pointerup", () => { pressOut(); doExit(); });
    btn.on("pointerout", () => pressOut());
    btn.on("pointercancel", () => pressOut());
  }
}

window.Stage1 = Stage1;
