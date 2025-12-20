// mainmenu ar pogas izvietojuma fixu   un citiem bug defenderiem
class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");

    this._starting = false;
    this._onResize = null;

    // references, lai droši tīrītu
    this._btnBg = null;
    this._btnText = null;
    this._bg = null;
    this._gg = null;

    this._contentItems = [];
    this._ctrlKeyTexts = [];
    this._ctrlLabelTexts = [];
  }

  preload() {
    if (!this.textures.exists("intro_bg")) {
      this.load.image("intro_bg", "assets/img/intro.png");
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#101a24");

    const isDesktop = !!(this.sys.game.device && this.sys.game.device.os && this.sys.game.device.os.desktop);

    // ---------- FONA BILDE ----------
    const bg = this.add.image(0, 0, "intro_bg").setOrigin(0.5);
    bg.setAlpha(0.12);
    this._bg = bg;

    // ---------- Apakšas tumšinājums (gradients) ----------
    const gg = this.add.graphics();
    this._gg = gg;

    // ===============================
    // POGA: 1:1 kā Intro.js (pozīcija + izmēri + krāsas + animācija)
    // Intro: hintY = H - (isDesktop ? 165 : 150); btnY = hintY + 75
    // ===============================
    const btnW = 200;
    const btnH = 58;

    const btnBg = this.add
      .rectangle(0, 0, btnW, btnH, 0x1f3a52, 1)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(0, 0, "UZ PRIEKŠU", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this._btnBg = btnBg;
    this._btnText = btnText;

    const pressIn = () => {
      btnBg.setFillStyle(0x2a587c, 1);
      this.tweens.killTweensOf([btnBg, btnText]);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };

    const pressOut = () => {
      btnBg.setFillStyle(0x1f3a52, 1);
      this.tweens.killTweensOf([btnBg, btnText]);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    const goNext = () => {
      if (this._starting) return;
      this._starting = true;

      // stabilitāte pret dubult-trigger
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

    // ===============================
    // DROŠS LAYOUT BLOKS (viss virs pogas)
    // ===============================
    const titleSize = 40;
    const subSize = 22;
    const pSize = 20;
    const ctrlSize = 20;
    const warnSize = 16;

    const title = this.add
      .text(0, 0, "PASPĒT LAIKĀ", {
        fontFamily: "Arial",
        fontSize: `${titleSize}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    const subtitle = this.add
      .text(0, 0, "Iejūties ugunsdrošības speciālista lomā!", {
        fontFamily: "Arial",
        fontSize: `${subSize}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    const p1 = this.add
      .text(0, 0, "Savā busiņā pārbaudi un atjauno visus\nobjektā esošos ugunsdzēšamos aparātus!", {
        fontFamily: "Arial",
        fontSize: `${pSize}px`,
        color: "#ffffff",
        align: "center",
        lineSpacing: 8
      })
      .setOrigin(0.5, 0);

    const p2 = this.add
      .text(0, 0, "Objektā pavadi pēc iespējas mazāk laika!", {
        fontFamily: "Arial",
        fontSize: `${pSize}px`,
        color: "#ffffff",
        align: "center"
      })
      .setOrigin(0.5, 0);

    const controlsTitle = this.add
      .text(0, 0, "KONTROLE:", {
        fontFamily: "Arial",
        fontSize: `${ctrlSize}px`,
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
          fontSize: `${ctrlSize}px`,
          color: "#ffffff"
        })
        .setOrigin(0, 0);

      const lt = this.add
        .text(0, 0, ctrlRows[i].label, {
          fontFamily: "Arial",
          fontSize: `${ctrlSize}px`,
          color: "#ffffff"
        })
        .setOrigin(0, 0);

      ctrlKeyTexts.push(kt);
      ctrlLabelTexts.push(lt);
    }

    const warning = this.add
      .text(
        0,
        0,
        "Visi spēles personāži, atribūti, loģika un lokācijas ir mākslinieka izdomājums!",
        {
          fontFamily: "Arial",
          fontSize: `${warnSize}px`,
          color: "#ff3b3b",
          align: "center"
        }
      )
      .setOrigin(0.5, 0);

    this._contentItems = [title, subtitle, p1, p2, controlsTitle, ...ctrlKeyTexts, ...ctrlLabelTexts, warning];
    this._ctrlKeyTexts = ctrlKeyTexts;
    this._ctrlLabelTexts = ctrlLabelTexts;

    // ---------- Layout / Resize ----------
    const applyLayout = (W, H) => {
      const isD = isDesktop;

      // bg cover
      bg.setPosition(W / 2, H / 2);
      const scaleBg = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scaleBg);

      // gradient
      gg.clear();
      gg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.92, 0.92);
      gg.fillRect(0, Math.floor(H * 0.28), W, Math.ceil(H * 0.72));

      // wordWrap widths
      p1.setWordWrapWidth(W - 46, true);
      p2.setWordWrapWidth(W - 46, true);
      warning.setWordWrapWidth(W - 46, true);

      // >>> POGAS POZĪCIJA 1:1 kā Intro.js (tas ir tavs Windows misalignment fix)
      const hintY = H - (isD ? 165 : 150);
      const btnY = hintY + 75;
      btnBg.setPosition(W / 2, btnY);
      btnText.setPosition(W / 2, btnY);

      // content area bounds virs pogas
      const btnTop = btnY - btnH / 2;
      const contentTop = isD ? 78 : 56;
      const contentBottomLimit = btnTop - (isD ? 26 : 18);

      const GAP_S = isD ? 16 : 12;
      const GAP_M = isD ? 26 : 18;
      const GAP_L = isD ? 36 : 24;

      const ctrlLeft = Math.round(W * (isD ? 0.28 : 0.22));
      const ctrlKeyX = ctrlLeft;
      const ctrlLabelX = ctrlLeft + (isD ? 46 : 44);

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

        const lineH = isD ? 34 : 32;
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

    // initial layout
    applyLayout(this.scale.width, this.scale.height);

    // resize handler (mobilais + Windows resizes)
    this._onResize = (gameSize) => {
      const W = gameSize.width;
      const H = gameSize.height;
      applyLayout(W, H);
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

    // kill button tweens + listeners
    try {
      if (this._btnBg && this._btnText) {
        this.tweens.killTweensOf([this._btnBg, this._btnText]);
        this._btnBg.removeAllListeners();
        this._btnBg.disableInteractive();
      }
    } catch (e) {}

    // optional: kill any leftover tweens on menu items
    try {
      if (this._contentItems && this._contentItems.length) {
        this._contentItems.forEach((o) => this.tweens.killTweensOf(o));
      }
    } catch (e) {}
  }
}

export default MainMenu;
