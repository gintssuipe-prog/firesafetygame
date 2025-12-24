// vajagot to fiksu
class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");

    this._starting = false;
    this._onResize = null;

    this._btnBg = null;
    this._btnText = null;
    this._btnTopBg = null;
    this._btnTopText = null;
    this._btnExitBg = null;
    this._btnExitText = null;
    this._bg = null;
    this._gg = null;

    this._contentItems = [];
    this._ctrlKeyTexts = [];
    this._ctrlLabelTexts = [];
  }
  init() {
    // Reset state when returning from Finish/Stage scenes
    this._starting = false;
    if (this.input && this.input.keyboard) {
      this.input.keyboard.enabled = true;
    }
  }



  preload() {
    if (!this.textures.exists("intro_bg")) {
      this.load.image("intro_bg", "assets/img/intro.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#101a24");

    const isDesktop = !!(this.sys.game.device && this.sys.game.device.os && this.sys.game.device.os.desktop);

    const bg = this.add.image(0, 0, "intro_bg").setOrigin(0.5);
    bg.setAlpha(0.12);
    this._bg = bg;

    const gg = this.add.graphics();
    this._gg = gg;

    const btnW = 200;
    const btnH = 58;

    const btnBg = this.add
      .rectangle(0, 0, btnW, btnH, 0x1f5a3a, 1)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(0, 0, "SPĒLĒT SPĒLI", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // ----- TOP 50 poga (uz Score scēnu) -----
    const btn2W = btnW;
    const btn2H = btnH;
    const btnTopBg = this.add
      .rectangle(0, 0, btn2W, btn2H, 0x1f5a3a, 1)
      .setInteractive({ useHandCursor: true });

    const btnTopText = this.add
      .text(0, 0, "TOP 50", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this._btnTopBg = btnTopBg;
    this._btnTopText = btnTopText;

    // ----- IZIET NO SPĒLES poga -----
    const btnExitBg = this.add
      .rectangle(0, 0, btn2W, btn2H, 0x7a2020, 1)
      .setInteractive({ useHandCursor: true });

    const btnExitText = this.add
      .text(0, 0, "IZIET NO SPĒLES", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this._btnExitBg = btnExitBg;
    this._btnExitText = btnExitText;

    const pressInExit = () => {
      btnExitBg.setFillStyle(0x8b2a2a, 1);
      this.tweens.killTweensOf([btnExitBg, btnExitText]);
      this.tweens.add({ targets: [btnExitBg, btnExitText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };

    const pressOutExit = () => {
      btnExitBg.setFillStyle(0x7a2020, 1);
      this.tweens.killTweensOf([btnExitBg, btnExitText]);
      this.tweens.add({ targets: [btnExitBg, btnExitText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    const safeExit = () => {
      // Web drošības dēļ window.close() bieži nestrādā, ja cilni neatvēra ar window.open.
      try { window.close(); } catch (e) {}
      // Fallback: atgriežam uz Intro (lietotājs var aizvērt cilni)
      this.scene.start("Intro");
    };

    btnExitBg.on("pointerdown", () => pressInExit());
    btnExitBg.on("pointerup", () => { pressOutExit(); safeExit(); });
    btnExitBg.on("pointerout", () => pressOutExit());
    btnExitBg.on("pointercancel", () => pressOutExit());

    const pressIn2 = () => {
      btnTopBg.setFillStyle(0x24455f, 1);
      this.tweens.killTweensOf([btnTopBg, btnTopText]);
      this.tweens.add({ targets: [btnTopBg, btnTopText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };

    const pressOut2 = () => {
      btnTopBg.setFillStyle(0x1f5a3a, 1);
      this.tweens.killTweensOf([btnTopBg, btnTopText]);
      this.tweens.add({ targets: [btnTopBg, btnTopText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    const goTop = () => {
      if (this._starting) return;
      this.scene.start("Score");
    };

    btnTopBg.on("pointerdown", () => pressIn2());
    btnTopBg.on("pointerup", () => { pressOut2(); goTop(); });
    btnTopBg.on("pointerout", () => pressOut2());
    btnTopBg.on("pointercancel", () => pressOut2());

    this._btnBg = btnBg;
    this._btnText = btnText;

    const pressIn = () => {
      btnBg.setFillStyle(0x2a7c58, 1);
      this.tweens.killTweensOf([btnBg, btnText]);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };

    const pressOut = () => {
      btnBg.setFillStyle(0x1f5a3a, 1);
      this.tweens.killTweensOf([btnBg, btnText]);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    const goNext = () => {
      if (this._starting) return;
      this._starting = true;

      btnBg.disableInteractive();
      if (this.input.keyboard) this.input.keyboard.enabled = false;

      this.scene.start("Stage1");
    };

    btnBg.on("pointerdown", () => pressIn());
    btnBg.on("pointerup", () => {
      pressOut();
      goNext();
    });
    btnBg.on("pointerout", () => pressOut());
    btnBg.on("pointercancel", () => pressOut());
    this.input.keyboard.once("keydown-ENTER", () => goNext());

    // ---------- Teksti ----------
    const title = this.add
      .text(0, 0, "PASPĒT LAIKĀ", {
        fontFamily: "Arial",
        fontSize: "40px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    const subtitle = this.add
      .text(0, 0, "Iejūties ugunsdrošības speciālista lomā!", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    const p1 = this.add
      .text(0, 0, "Savā busiņā pārbaudi un atjauno visus\nobjektā esošos ugunsdzēšamos aparātus!", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 8
      })
      .setOrigin(0.5, 0);

    const p2 = this.add
      .text(0, 0, "Objektā pavadi pēc iespējas mazāk laika!", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        align: "center"
      })
      .setOrigin(0.5, 0);

    const controlsTitle = this.add
      .text(0, 0, "KONTROLE:", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0, 0);

    const ctrlRows = [
      { key: "→", label: "Pa labi" },
      { key: "←", label: "Pa kreisi" },
      { key: "↑", label: "Paņemt" },
      { key: "↓", label: "Nolikt" }
    ];

    const ctrlKeyTexts = [];
    const ctrlLabelTexts = [];
    for (let i = 0; i < ctrlRows.length; i++) {
      const kt = this.add
        .text(0, 0, ctrlRows[i].key, {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#ffffff"
        })
        .setOrigin(0, 0);

      const lt = this.add
        .text(0, 0, ctrlRows[i].label, {
          fontFamily: "Arial",
          fontSize: "20px",
          color: "#ffffff"
        })
        .setOrigin(0, 0);

      ctrlKeyTexts.push(kt);
      ctrlLabelTexts.push(lt);
    }

    const warning = this.add
      .text(0, 0, "Visi spēles personāži, atribūti, loģika un lokācijas ir mākslinieka izdomājums!", {
        fontFamily: "Arial",
          fontSize: "14px",
          color: "#ff6666",
        align: "center"
      })
      .setOrigin(0.5, 0);.setAlpha(0.85)

    this._contentItems = [title, subtitle, p1, p2, controlsTitle, ...ctrlKeyTexts, ...ctrlLabelTexts, warning];
    this._ctrlKeyTexts = ctrlKeyTexts;
    this._ctrlLabelTexts = ctrlLabelTexts;

    const applyLayout = (W, H) => {
      bg.setPosition(W / 2, H / 2);
      const scaleBg = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scaleBg);

      gg.clear();
      gg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.92, 0.92);
      gg.fillRect(0, Math.floor(H * 0.28), W, Math.ceil(H * 0.72));

      p1.setWordWrapWidth(W - 46, true);
      p2.setWordWrapWidth(W - 46, true);
      warning.setWordWrapWidth(W - 46, true);

      // ✅ pogas Y SALĀGOTS ar Intro (desktop: -165, mobilais: -150)
      const hintY = H - (isDesktop ? 165 : 150);
      const btnY = hintY + 75;

      btnBg.setPosition(W / 2, btnY);
      btnText.setPosition(W / 2, btnY);

      // TOP 50 poga zem galvenās
      const btn2Y = btnY + 74;
      btnTopBg.setPosition(W / 2, btn2Y);
      btnTopText.setPosition(W / 2, btn2Y);

      // IZIET NO SPĒLES poga zem TOP 50
      const btn3Y = btn2Y + 74;
      btnExitBg.setPosition(W / 2, btn3Y);
      btnExitText.setPosition(W / 2, btn3Y);

      const btnTopEdge = btnY - btnH / 2;
      const contentTop = isDesktop ? 78 : 56;
      const contentBottomLimit = btnTopEdge - (isDesktop ? 26 : 18);

      const GAP_S = isDesktop ? 16 : 12;
      const GAP_M = isDesktop ? 26 : 18;
      const GAP_L = isDesktop ? 36 : 24;

      const ctrlLeft = Math.round(W * (isDesktop ? 0.28 : 0.22));
      const ctrlKeyX = ctrlLeft;
      const ctrlLabelX = ctrlLeft + (isDesktop ? 46 : 44);

      const layoutOnce = () => {
        let y = contentTop;

        title.setPosition(W / 2, y);
        y += title.height + GAP_M;

        subtitle.setPosition(W / 2, y);
        y += subtitle.height + GAP_L;

        p1.setPosition(W / 2, y);
        y += p1.height + GAP_L;

        p2.setPosition(W / 2, y);
        y += p2.height + GAP_L;

        controlsTitle.setPosition(ctrlLeft, y);
        y += controlsTitle.height + GAP_S;

        const lineH = isDesktop ? 34 : 32;
        for (let i = 0; i < ctrlRows.length; i++) {
          const rowY = y + i * lineH;
          ctrlKeyTexts[i].setPosition(ctrlKeyX, rowY);
          ctrlLabelTexts[i].setPosition(ctrlLabelX, rowY);
        }

        const controlsBottom = y + ctrlRows.length * lineH;

        const warningY = Math.round((controlsBottom + contentBottomLimit) / 2);
        warning.setPosition(W / 2, warningY);

        const warningBottom = warningY + warning.height;
        return Math.max(controlsBottom, warningBottom);
      };

      const fitContent = () => {
        this._contentItems.forEach((o) => o.setScale(1));
        const bottom = layoutOnce();

        const overflow = bottom - contentBottomLimit;
        if (overflow > 0) {
          const available = contentBottomLimit - contentTop;
          const used = bottom - contentTop;
          let s = available / used;
          s = Math.max(0.88, Math.min(1.0, s - 0.02));
          this._contentItems.forEach((o) => o.setScale(s));
          layoutOnce();
        }
      };

      fitContent();
    };

    applyLayout(this.scale.width, this.scale.height);

    this._onResize = (gameSize) => applyLayout(gameSize.width, gameSize.height);
    this.scale.on("resize", this._onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.onShutdown, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.onShutdown, this);
  }

  onShutdown() {
    try {
      if (this._onResize) this.scale.off("resize", this._onResize);
    } catch (e) {}

    try {
      if (this._btnBg && this._btnText) {
        this.tweens.killTweensOf([this._btnBg, this._btnText]);
        this._btnBg.removeAllListeners();
        this._btnBg.disableInteractive();
      }
    } catch (e) {}

    try {
      if (this._btnTopBg && this._btnTopText) {
        this.tweens.killTweensOf([this._btnTopBg, this._btnTopText]);
        this._btnTopBg.removeAllListeners();
        this._btnTopBg.disableInteractive();
      }
    } catch (e) {}

    try {
      if (this._btnExitBg && this._btnExitText) {
        this.tweens.killTweensOf([this._btnExitBg, this._btnExitText]);
        this._btnExitBg.removeAllListeners();
        this._btnExitBg.disableInteractive();
      }
    } catch (e) {}
  }
}

window.MainMenu = MainMenu;