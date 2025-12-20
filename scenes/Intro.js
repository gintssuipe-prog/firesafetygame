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

    // ===============================
    // 1) FONA BILDE: cover pa visu canvas
    // ===============================
    const bg = this.add.image(W / 2, H / 2, "intro_bg").setOrigin(0.5);
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale);

    // ===============================
    // 2) Apakšējais gradient overlay (melns -> caurspīdīgs)
    //    augšā: 0 alpha, apakšā: ~0.92 alpha
    // ===============================
    const gradH = 280; // <- cik augstu gradients iet uz augšu (vari mainīt)
    const rt = this.add.renderTexture(0, H - gradH, W, gradH).setOrigin(0);

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillGradientStyle(
      0x000000, // top-left
      0x000000, // top-right
      0x000000, // bottom-left
      0x000000, // bottom-right
      0.0, // alpha top-left (caurspīdīgs)
      0.0, // alpha top-right
      0.92, // alpha bottom-left (melns)
      0.92 // alpha bottom-right
    );
    g.fillRect(0, 0, W, gradH);
    rt.draw(g);
    g.destroy();

    // ===============================
    // 3) Hint + START poga (poga zem hint)
    // ===============================
    const hintY = H - 150; // hints paliek kā iepriekš
    const btnY = hintY + 75; // ✅ START poga zem hint

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

    const doStart = async () => {
      // ✅ mūzika 1x uz visu spēli (pēc user gesture)
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

    // poga (touch/pele)
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
