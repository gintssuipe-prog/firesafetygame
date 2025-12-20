// steiblfiksi
class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");

    this._starting = false;
    this._onResize = null;

    // refs cleanup/stabilitātei
    this._bg = null;
    this._grad = null;
    this._hint = null;
    this._hintTween = null;
    this._btnBg = null;
    this._btnText = null;
  }

  preload() {
    this.load.image("intro_bg", "assets/img/intro.png");
    this.load.audio("bgm", "assets/audio/intro.mp3");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    const isDesktop = !!(this.sys.game.device && this.sys.game.device.os && this.sys.game.device.os.desktop);

    // 1) FONA BILDE (cover)
    const bg = this.add.image(0, 0, "intro_bg").setOrigin(0.5);
    this._bg = bg;

    // 2) Apakšējais gradient overlay
    const grad = this.add.graphics();
    this._grad = grad;

    // 3) © teksts (augšā labajā stūrī)
    // (pozīcija tiks atjaunota resize laikā)
    const copyright = this.add
      .text(0, 10, "©Gints Suipe", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#ffffff"
      })
      .setOrigin(1, 0)
      .setAlpha(0.9);

    // 4) Hint + START poga
    const hint = this.add
      .text(0, 0, "Spied START vai ENTER", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff"
      })
      .setOrigin(0.5);
    this._hint = hint;

    // mirgošana (tween ref, lai var kill on shutdown)
    this._hintTween = this.tweens.add({
      targets: hint,
      alpha: 0.15,
      duration: 650,
      yoyo: true,
      repeat: -1
    });

    const btnW = 200;
    const btnH = 58;

    const btnBg = this.add
      .rectangle(0, 0, btnW, btnH, 0x1f3a52, 1)
      .setInteractive({ useHandCursor: true });
    this._btnBg = btnBg;

    const btnText = this.add
      .text(0, 0, "START", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this._btnText = btnText;

    const pressIn = () => {
      btnBg.setFillStyle(0x2a587c, 1);
      this.tweens.killTweensOf([btnBg, btnText]); // stabilitāte: nav tween-spam
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };

    const pressOut = () => {
      btnBg.setFillStyle(0x1f3a52, 1);
      this.tweens.killTweensOf([btnBg, btnText]); // stabilitāte: nav tween-spam
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    // 5) Start (drošs pret dubult-trigger)
    const doStart = async () => {
      if (this._starting) return;
      this._starting = true;

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

    // 6) FADE-IN no melna (kā tev bija)
    this.cameras.main.fadeIn(350, 0, 0, 0);

    // ---------- Layout / Resize ----------
    const applyLayout = (W, H) => {
      // bg cover
      bg.setPosition(W / 2, H / 2);
      const s = Math.max(W / bg.width, H / bg.height);
      bg.setScale(s);

      // gradient redraw
      const gradH = 280;
      grad.clear();
      grad.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.92, 0.92);
      grad.fillRect(0, H - gradH, W, gradH);

      // © pozīcija
      copyright.setPosition(W - 12, 10);

      // >>> START pogas izvietojums (kanoniski, kā tev patīk)
      const hintY = H - (isDesktop ? 165 : 150);
      const btnY = hintY + 75;

      hint.setPosition(W / 2, hintY);
      btnBg.setPosition(W / 2, btnY);
      btnText.setPosition(W / 2, btnY);
    };

    // initial
    applyLayout(this.scale.width, this.scale.height);

    // resize handler
    this._onResize = (gameSize) => {
      applyLayout(gameSize.width, gameSize.height);
    };
    this.scale.on("resize", this._onResize);

    // cleanup
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
  }

  onShutdown() {
    // resize off
    try {
      if (this._onResize) this.scale.off("resize", this._onResize);
    } catch (e) {}

    // kill hint tween
    try {
      if (this._hintTween) this._hintTween.stop();
    } catch (e) {}
    try {
      if (this._hint) this.tweens.killTweensOf(this._hint);
    } catch (e) {}

    // kill button tweens + listeners
    try {
      if (this._btnBg && this._btnText) {
        this.tweens.killTweensOf([this._btnBg, this._btnText]);
        this._btnBg.removeAllListeners();
        this._btnBg.disableInteractive();
      }
    } catch (e) {}
  }
}

export default Intro;
