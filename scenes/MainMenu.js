class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  preload() {
    // Fons no intro (ja nav vēl ielādēts)
    if (!this.textures.exists("intro_bg")) {
      this.load.image("intro_bg", "assets/img/intro.png");
    }
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#101a24");

    // ---------- FONA BILDE (tā pati, kas intro), ļoti tumša ----------
    const bg = this.add.image(W / 2, H / 2, "intro_bg").setOrigin(0.5);
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale);
    bg.setAlpha(0.12);

    // ---------- Apakšas tumšinājums ar gradientu (bez asas malas) ----------
    const g = this.add.graphics();
    g.fillGradientStyle(
      0x000000, 0x000000, 0x000000, 0x000000,
      0.0,      0.0,      0.92,     0.92
    );
    g.fillRect(0, Math.floor(H * 0.28), W, Math.ceil(H * 0.72));

    // ---------- TEKSTI (lielāki, viss balts) ----------
    const titleY = Math.round(H * 0.12);

    this.add
      .text(W / 2, titleY, "PASPĒT LAIKĀ", {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, titleY + 50, "Iejūties ugunsdrošības speciālista lomā!", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const textBlock =
      "Savā busiņā pārbaudi un atjauno visus objektā esošos ugunsdzēšamos aparātus!\n\n" +
      "Objektā pavadi pēc iespējas mazāk laika!";

    this.add
      .text(W / 2, Math.round(H * 0.31), textBlock, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        align: "center",
        lineSpacing: 10,
        wordWrap: { width: W - 46 }
      })
      .setOrigin(0.5, 0.5);

    // ---------- KONTROLES (noņemti A/V, viss balts) ----------
    const controlsTitleY = Math.round(H * 0.45);

    this.add
      .text(Math.round(W * 0.18), controlsTitleY, "KONTROLE:", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0, 0);

    const controlsText =
      "→   Pa labi\n" +
      "←   Pa kreisi\n" +
      "↑   Paņemt\n" +
      "↓   Nolikt";

    this.add
      .text(Math.round(W * 0.18), controlsTitleY + 30, controlsText, {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        align: "left",
        lineSpacing: 10
      })
      .setOrigin(0, 0);

    // ---------- Atruna (sarkana) ----------
    this.add
      .text(
        W / 2,
        Math.round(H * 0.66),
        "Visi spēles personāži, atribūti, loģika un lokācijas ir mākslinieka izdomājums!",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ff3b3b",
          align: "center",
          wordWrap: { width: W - 46 }
        }
      )
      .setOrigin(0.5);

    // ===============================
    // POGA: 1:1 kā Intro.js (pozīcija + izmēri + krāsas + animācija)
    // ===============================
    const hintY = H - 150;     // tā pati loģika kā Intro
    const btnY = hintY + 75;   // ✅ poga turpat, kur Intro (relatīvi pret apakšu)

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
      this.tweens.add({
        targets: [btnBg, btnText],
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 70
      });
    };

    const pressOut = () => {
      btnBg.setFillStyle(0x1f3a52, 1);
      this.tweens.add({
        targets: [btnBg, btnText],
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 90
      });
    };

    const goNext = () => {
      this.scene.start("Stage1");
    };

    // touch/pele
    btnBg.on("pointerdown", () => pressIn());
    btnBg.on("pointerup", () => {
      pressOut();
      goNext();
    });
    btnBg.on("pointerout", () => pressOut());
    btnBg.on("pointercancel", () => pressOut());

    // ENTER arī strādā
    this.input.keyboard.once("keydown-ENTER", () => goNext());
  }
}
