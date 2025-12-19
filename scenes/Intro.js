class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
    this._music = null;
    this._started = false;
  }

  preload() {
    // Ceļi no repo saknes (index.html atrodas saknē)
    this.load.image("introBg", "assets/img/intro.png");
    this.load.audio("introMusic", "assets/audio/intro.mp3");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#000000");

    // --- FONA ATTĒLS (portrait, ietur letterbox) ---
    const bg = this.add.image(W / 2, H / 2, "introBg").setOrigin(0.5);

    // Cover efekts: aizpilda laukumu, bet var apgriezt malas.
    // Ja gribi "contain" (lai nekas netiek apgriezts), nomaini uz Math.min.
    const s = Math.max(W / bg.width, H / bg.height);
    bg.setScale(s);

    // --- START poga (centrā, apakšējā daļā) ---
    const btnY = Math.round(H * 0.63);
    const btnW = 190;
    const btnH = 56;

    const btn = this.add
      .rectangle(W / 2, btnY, btnW, btnH, 0x1b3a55, 1)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "START", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // --- Pogas "spiešanās" (feik 3D) ---
    const pressIn = () => {
      btn.setFillStyle(0x10283b, 1);
      this.tweens.add({ targets: [btn, btnText], scaleX: 0.97, scaleY: 0.97, duration: 60 });
    };
    const pressOut = () => {
      btn.setFillStyle(0x1b3a55, 1);
      this.tweens.add({ targets: [btn, btnText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    // --- Start handler (mūzika + pāreja) ---
    const doStart = () => {
      if (this._started) return;
      this._started = true;

      // Chrome/Edge: audio drīkst sākt tikai pēc user gesture.
      // Tāpēc palaižam tieši šeit.
      try {
        if (!this.sound.locked) {
          // jau atslēgts
        } else {
          // ja vēl locked, mēģinām atslēgt ar resume
          this.sound.context && this.sound.context.resume && this.sound.context.resume();
        }
      } catch (e) {
        // ignorējam – dažās platformās šis nav pieejams
      }

      // Nepalaist 2x, ja atgriežas atpakaļ Intro
      if (!this.sound.get("introMusic")) {
        this._music = this.sound.add("introMusic", { loop: true, volume: 0.7 });
        this._music.play();
      }

      // Mazs “click” efekts
      pressIn();
      this.time.delayedCall(120, () => {
        pressOut();
        this.scene.start("MainMenu");
      });
    };

    btn.on("pointerdown", pressIn);
    btn.on("pointerup", () => doStart());
    btn.on("pointerout", pressOut);
    btn.on("pointercancel", pressOut);

    // ENTER arī startē
    this.input.keyboard.once("keydown-ENTER", doStart);

    // Drošības variants: klikšķis jebkurā vietā (ja gribi – vari izņemt)
    // this.input.once("pointerdown", doStart);

    // --- (neobligāti) mirgojošs mazs teksts zem pogas ---
    const hint = this.add
      .text(W / 2, btnY + 52, "Spied START vai ENTER", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#cfd8e3"
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: 0.25,
      duration: 650,
      yoyo: true,
      repeat: -1
    });
  }
}
