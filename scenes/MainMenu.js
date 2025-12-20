class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  preload() {
    if (!this.textures.exists("intro_bg")) {
      this.load.image("intro_bg", "assets/img/intro.png");
    }
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#101a24");

    // ---------- FONA BILDE ----------
    const bg = this.add.image(W / 2, H / 2, "intro_bg").setOrigin(0.5);
    const scaleBg = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scaleBg);
    bg.setAlpha(0.12);

    // ---------- Apakšas tumšinājums (gradients) ----------
    const g = this.add.graphics();
    g.fillGradientStyle(
      0x000000, 0x000000, 0x000000, 0x000000,
      0.0,      0.0,      0.92,     0.92
    );
    g.fillRect(0, Math.floor(H * 0.28), W, Math.ceil(H * 0.72));

    // ===============================
    // POGA: 1:1 kā Intro.js (pozīcija + izmēri + krāsas + animācija)
    // Intro: hintY = H - 150, btnY = hintY + 75 => btnY = H - 75
    // ===============================
    const hintY = H - 150;
    const btnY = hintY + 75; // ✅ identiski Intro
    const btnW = 200;
    const btnH = 58;

    const btnBg = this.add
      .rectangle(W / 2, btnY, btnW, btnH, 0x1f3a52, 1)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "UZ PRIEKŠU", {
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

    const goNext = () => {
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

    const contentTop = 44; // drošā zona augšā (var mainīt)
    const btnTop = btnY - btnH / 2;
    const contentBottomLimit = btnTop - 18; // atstarpe virs pogas

    // Vienoti atstarpju soļi (pielāgoti šim izmēram)
    const GAP_S = 12;
    const GAP_M = 18;
    const GAP_L = 24;

    // --- Teksti (viss balts, izņemot sarkano atrunu) ---
    const title = this.add.text(W / 2, 0, "PASPĒT LAIKĀ", {
      fontFamily: "Arial",
      fontSize: "40px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5, 0);

    const subtitle = this.add.text(W / 2, 0, "Iejūties ugunsdrošības speciālista lomā!", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5, 0);

    const p1 = this.add.text(W / 2, 0,
      "Savā busiņā pārbaudi un atjauno visus\nobjektā esošos ugunsdzēšamos aparātus!",
      {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 8,
        wordWrap: { width: W - 46 }
      }
    ).setOrigin(0.5, 0);

    const p2 = this.add.text(W / 2, 0,
      "Objektā pavadi pēc iespējas mazāk laika!",
      {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: W - 46 }
      }
    ).setOrigin(0.5, 0);

    const controlsTitle = this.add.text(Math.round(W * 0.18), 0, "KONTROLE:", {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0, 0);

    const controlsText = this.add.text(Math.round(W * 0.18), 0,
      "→   Pa labi\n←   Pa kreisi\n↑   Paņemt\n↓   Nolikt",
      {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        align: "left",
        lineSpacing: 10
      }
    ).setOrigin(0, 0);

    const warning = this.add.text(
      W / 2,
      0,
      "Visi spēles personāži, atribūti, loģika un lokācijas ir mākslinieka izdomājums!",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ff3b3b",
        align: "center",
        wordWrap: { width: W - 46 }
      }
    ).setOrigin(0.5, 0);

    // Visi “satura” elementi (bez pogas)
    const contentItems = [title, subtitle, p1, p2, controlsTitle, controlsText, warning];

    // 1) Izkārtojums pēc faktiskajiem augstumiem
    const layoutOnce = () => {
      let y = contentTop;

      title.setPosition(W / 2, y);
      y += title.height + GAP_S;

      subtitle.setPosition(W / 2, y);
      y += subtitle.height + GAP_L;

      p1.setPosition(W / 2, y);
      y += p1.height + GAP_M;

      p2.setPosition(W / 2, y);
      y += p2.height + GAP_L;

      controlsTitle.setPosition(Math.round(W * 0.18), y);
      y += controlsTitle.height + GAP_S;

      controlsText.setPosition(Math.round(W * 0.18), y);
      y += controlsText.height;

      // Sarkanais teksts: pa vidu starp kontroles apakšu un pogas augšu
      const controlsBottom = y;
      const warningY = Math.round((controlsBottom + contentBottomLimit) / 2);
      warning.setPosition(W / 2, warningY);

      // Atgriež “sliktāko” (zemāko) satura apakšu, lai saprastu overflow
      const warningBottom = warningY + warning.height;
      return Math.max(controlsBottom, warningBottom);
    };

    // 2) Ja pārāk zemu (iekāpj pogā), samazini saturu ar scale un pārliec vēlreiz
    const fitContent = () => {
      // sākumā 1.0
      contentItems.forEach(o => o.setScale(1));

      const bottom = layoutOnce();
      const overflow = bottom - contentBottomLimit;

      if (overflow > 0) {
        // piegriežam scale tikai tik, cik vajag (ar rezervi), bet ne zem 0.88
        const available = contentBottomLimit - contentTop;
        const used = (bottom - contentTop);
        let s = available / used;

        // drošības robežas
        s = Math.max(0.88, Math.min(1.0, s - 0.02));

        contentItems.forEach(o => o.setScale(s));
        layoutOnce();
      }
    };

    fitContent();
  }
}
