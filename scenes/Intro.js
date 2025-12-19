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

    this.cameras.main.setBackgroundColor("#000000");

    // --- FONA BILDE: COVER pa visu canvas (nesaraujas) ---
    const bg = this.add.image(W / 2, H / 2, "intro_bg").setOrigin(0.5);

    // Cover: lai aizpildītu visu ekrānu, pat ja apgriež malas
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale);

    // --- Apakšā tumšs panelis tekstam/pogai (bet bilde paliek pilna) ---
    const panelH = 220; // var mainīt, ja gribi vairāk/mazāk melno zonu
    this.add
      .rectangle(W / 2, H - panelH / 2, W, panelH, 0x000000, 0.55)
      .setOrigin(0.5);

    // --- HINT (mirgo) + START poga ---
    const hintY = H - 150;
    const btnY = H - 85; // ✅ poga zem hint

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
      duration: 550,
      yoyo: true,
      repeat: -1
    });

    const btnW = 200;
    const btnH = 58;

    const btnBg = this.add.rectangle(W / 2, btnY, btnW, btnH, 0x1f3a52, 1);
    const btnText = this.add
      .text(W / 2, btnY, "START", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    btnBg.setInteractive({ useHandCursor: true });

    const pressIn = () => {
      btnBg.setFillStyle(0x2a587c, 1);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };

    const pressOut = () => {
      btnBg.setFillStyle(0x1f3a52, 1);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    const doStart = async () => {
      // ✅ Startējam mūziku 1x uz visu spēli (tikai pēc user gesture)
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

    // poga (pele/touch)
    btnBg.on("pointerdown", () => pressIn());
    btnBg.on("pointerup", () => {
      pressOut();
      doStart();
    });
    btnBg.on("pointerout", () => pressOut());
    btnBg.on("pointercancel", () => pressOut());

    // ENTER
    this.input.keyboard.once("keydown-ENTER", () => doStart());
  }
}
