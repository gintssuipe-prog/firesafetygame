class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  preload() {
    this.load.image("intro_bg", "assets/img/intro.png");
    this.load.audio("bgm", "assets/audio/intro.mp3");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    const isDesktop = !!(this.sys.game.device && this.sys.game.device.os && this.sys.game.device.os.desktop);

    this.cameras.main.setBackgroundColor("#000000");

    // ===============================
    // 1) FONA BILDE: cover pa visu canvas
    // ===============================
    const bg = this.add.image(W / 2, H / 2, "intro_bg").setOrigin(0.5);
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale);

    // ===============================
    // 2) Apakšējais gradient overlay (melns -> caurspīdīgs)
    // ===============================
    const gradH = 280;
    const grad = this.add.graphics();
    grad.fillGradientStyle(
      0x000000, 0x000000, 0x000000, 0x000000,
      0.0, 0.0, 0.92, 0.92
    );
    grad.fillRect(0, H - gradH, W, gradH);

    // ===============================
    // 3) © teksts (augšā labajā stūrī)
    // ===============================
    this.add
      .text(W - 12, 10, "©Gints Suipe", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff"
      })
      .setOrigin(1, 0)
      .setAlpha(0.9);

    // ===============================
    // 4) Hint + START poga
    // ===============================
    const hintY = H - (isDesktop ? 165 : 150);
    const btnY = hintY + 75;

    const hint = this.add
      .text(W / 2, hintY, "Spied START vai ENTER", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff"
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: hint,
      alpha: 0.15,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    const btnW = 200;
    const btnH = 58;

    const btnBg = this.add
      .rectangle(W / 2, btnY, btnW, btnH, 0x1f3a52, 1)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "START", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const pressIn = () => {
      btnBg.setFillStyle(0x2a587c, 1);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };

    const pressOut = () => {
      btnBg.setFillStyle(0x1f3a52, 1);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    // ===============================
    // 5) Start (drošs pret dubult-trigger)
    // ===============================
    let starting = false;

    const doStart = async () => {
      if (starting) return;
      starting = true;

      btnBg.disableInteractive();
      if (this.input.keyboard) this.input.keyboard.enabled = false;

      // mūzika 1x uz visu spēli (pēc user gesture)
      if (!this.sound.get("bgm")) {
        if (this.sound.context && this.sound.context.state === "suspended") {
          try {
            await this.sound.context.resume();
          } catch (e) {}
        }
        const bgm = this.sound.add("bgm", { loop: true, volume: 0.7 });
        bgm.play();
      }

      this.scene.start("MainMenu");
    };

    btnBg.on("pointerdown", () => pressIn());
    btnBg.on("pointerup", () => {
      pressOut();
      doStart();
    });
    btnBg.on("pointerout", () => pressOut());
    btnBg.on("pointercancel", () => pressOut());

    this.input.keyboard.once("keydown-ENTER", () => doStart());

    // ===============================
    // 6) FADE-IN no melna (lai bilde neuzlec)
    // ===============================
    // Piezīme: fade notiek PĒC create, bet vizuāli dod tieši to efektu.
    // Ļoti lēts, nav smags.
    this.cameras.main.fadeIn(350, 0, 0, 0);
  }
}
