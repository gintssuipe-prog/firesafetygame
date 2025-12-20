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

    const isDesktop = !!(this.sys.game.device && this.sys.game.device.os && this.sys.game.device.os.desktop);

    this.cameras.main.setBackgroundColor("#101a24");

    // ---------- FONA BILDE ----------
    const bg = this.add.image(W / 2, H / 2, "intro_bg").setOrigin(0.5);
    const scaleBg = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scaleBg);
    bg.setAlpha(0.12);

    // ---------- Apakšas tumšinājums (gradients) ----------
    const gg = this.add.graphics();
    gg.fillGradientStyle(
      0x000000, 0x000000, 0x000000, 0x000000,
      0.0,      0.0,      0.92,     0.92
    );
    gg.fillRect(0, Math.floor(H * 0.28), W, Math.ceil(H * 0.72));

    // ===============================
    // POGA: 1:1 kā Intro.js (pozīcija + izmēri + krāsas + animācija)
    // Intro: hintY = H - 150, btnY = hintY + 75 => btnY = H - 75
    // ===============================
    const hintY = H - 150;
    const btnY = hintY + 75; // identiski Intro
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
    const btnTop = btnY - btnH / 2;

    // Desktopā nolaidām visu nedaudz zemāk + vairāk elpas
    const contentTop = isDesktop ? 78 : 56;

    // Drošā apakšējā robeža virs pogas
    const contentBottomLimit = btnTop - (isDesktop ? 26 : 18);

    // Platākas, simetriskākas atstarpes
    const GAP_S = isDesktop ? 16 : 12;
    const GAP_M = isDesktop ? 26 : 18;
    const GAP_L = isDesktop ? 36 : 24;

    // Tekstu izmēri (desktopā var atstāt tos pašus; ja gribi, varam palielināt)
    const titleSize = 40;
    const subSize = 22;
    const pSize = 20;
    const ctrlSize = 20;
    const warnSize = 16;

    // --- Satura elementi ---
    const title = this.add
      .text(W / 2, 0, "PASPĒT LAIKĀ", {
        fontFamily: "Arial",
        fontSize: `${titleSize}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    const subtitle = this.add
      .text(W / 2, 0, "Iejūties ugunsdrošības speciālista lomā!", {
        fontFamily: "Arial",
        fontSize: `${subSize}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5, 0);

    // P1 un P2 tu gribēji “vienu rindkopu zemāk” — tas tiek panākts ar lielākiem GAPiem
    const p1 = this.add
      .text(
        W / 2,
        0,
        "Savā busiņā pārbaudi un atjauno visus\nobjektā esošos ugunsdzēšamos aparātus!",
        {
          fontFamily: "Arial",
          fontSize: `${pSize}px`,
          color: "#ffffff",
          align: "center",
          lineSpacing: 8,
          wordWrap: { width: W - 46 }
        }
      )
      .setOrigin(0.5, 0);

    const p2 = this.add
      .text(W / 2, 0, "Objektā pavadi pēc iespējas mazāk laika!", {
        fontFamily: "Arial",
        fontSize: `${pSize}px`,
        color: "#ffffff",
        align: "center",
        wordWrap: { width: W - 46 }
      })
      .setOrigin(0.5, 0);

    // KONTROLE virsraksts
    const controlsTitle = this.add
      .text(0, 0, "KONTROLE:", {
        fontFamily: "Arial",
        fontSize: `${ctrlSize}px`,
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0, 0);

    // Kontroles rindas: 2 kolonnas (perfekti taisni stabiņi)
    const ctrlRows = [
      { key: "→", label: "Pa labi" },
      { key: "←", label: "Pa kreisi" },
      { key: "↑", label: "Paņemt" },
      { key: "↓", label: "Nolikt" }
    ];

    const ctrlKeyTexts = [];
    const ctrlLabelTexts = [];

    // izvēlamies kontroles bloka kreiso malu “optiski smuki”
    const ctrlLeft = Math.round(W * (isDesktop ? 0.28 : 0.22));
    const ctrlKeyX = ctrlLeft;
    const ctrlLabelX = ctrlLeft + (isDesktop ? 46 : 44); // kolonnas attālums

    for (let i = 0; i < ctrlRows.length; i++) {
      const kt = this.add
        .text(ctrlKeyX, 0, ctrlRows[i].key, {
          fontFamily: "Arial",
          fontSize: `${ctrlSize}px`,
          color: "#ffffff"
        })
        .setOrigin(0, 0);

      const lt = this.add
        .text(ctrlLabelX, 0, ctrlRows[i].label, {
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
        W / 2,
        0,
        "Visi spēles personāži, atribūti, loģika un lokācijas ir mākslinieka izdomājums!",
        {
          fontFamily: "Arial",
          fontSize: `${warnSize}px`,
          color: "#ff3b3b",
          align: "center",
          wordWrap: { width: W - 46 }
        }
      )
      .setOrigin(0.5, 0);

    const contentItems = [
      title,
      subtitle,
      p1,
      p2,
      controlsTitle,
      ...ctrlKeyTexts,
      ...ctrlLabelTexts,
      warning
    ];

    // 1) Layout funkcija (pēc faktiskajiem augstumiem)
    const layoutOnce = () => {
      let y = contentTop;

      // VIRSRAKSTS — tu gribēji zemāk: to dara contentTop + GAPi
      title.setPosition(W / 2, y);
      y += title.height + GAP_M;

      subtitle.setPosition(W / 2, y);
      y += subtitle.height + GAP_L; // vairāk elpas starp sub un p1

      // P1 zemāk (viena “rindkopa”): lielāks GAP_L iepriekš jau to izdara
      p1.setPosition(W / 2, y);
      y += p1.height + GAP_L; // platāka un simetriska šķirba uz p2

      // P2 zemāk (viena “rindkopa”)
      p2.setPosition(W / 2, y);
      y += p2.height + GAP_L;

      // Kontrole bloks
      controlsTitle.setPosition(ctrlLeft, y);
      y += controlsTitle.height + GAP_S;

      // rindas ar fiksētu line-height (nelietojam “space” izlīdzināšanu)
      const lineH = isDesktop ? 34 : 32;
      for (let i = 0; i < ctrlRows.length; i++) {
        const rowY = y + i * lineH;
        ctrlKeyTexts[i].setPosition(ctrlKeyX, rowY);
        ctrlLabelTexts[i].setPosition(ctrlLabelX, rowY);
      }

      const controlsBottom = y + ctrlRows.length * lineH;

      // Sarkanais teksts: pa vidu starp kontroles apakšu un pogas augšu
      const warningY = Math.round((controlsBottom + contentBottomLimit) / 2);
      warning.setPosition(W / 2, warningY);

      const warningBottom = warningY + warning.height;
      return Math.max(controlsBottom, warningBottom);
    };

    // 2) Fit: ja pārāk zemu, samazina saturu (nedaudz) un pārliek
    const fitContent = () => {
      contentItems.forEach(o => o.setScale(1));

      const bottom = layoutOnce();
      const overflow = bottom - contentBottomLimit;

      if (overflow > 0) {
        const available = contentBottomLimit - contentTop;
        const used = bottom - contentTop;

        let s = available / used;
        s = Math.max(0.88, Math.min(1.0, s - 0.02));

        contentItems.forEach(o => o.setScale(s));
        layoutOnce();
      }
    };

    fitContent();
  }
}
