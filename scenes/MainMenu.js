class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  preload() {
    // Fons no intro (tumšināsim ar alpha)
    if (!this.textures.exists("intro_bg")) {
      this.load.image("intro_bg", "./assets/img/intro.png");
    }
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // fons
    this.cameras.main.setBackgroundColor("#101a24");

    // ---------- FONA BILDE (tā pati, kas intro), bet pavisam tumša ----------
    const bg = this.add.image(W / 2, H / 2, "intro_bg");
    // cover (aizpilda ekrānu, saglabājot proporciju)
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale);
    bg.setAlpha(0.12); // te regulē "cik tumši" redz bildi

    // ---------- Apakšas tumšinājums ar gradientu (bez asas malas) ----------
    const g = this.add.graphics();
    // augšā caurspīdīgs, apakšā tumšs
    g.fillGradientStyle(
      0x000000, 0x000000, 0x000000, 0x000000,
      0.0,      0.0,      0.92,     0.92
    );
    g.fillRect(0, Math.floor(H * 0.30), W, Math.ceil(H * 0.70));

    // ---------- TEKSTI (TIKAI tie, ko iedevi) ----------
    const titleY = Math.round(H * 0.10);

    this.add
      .text(W / 2, titleY, "PASPĒT LAIKĀ", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, titleY + 46, "Iejūties ugunsdrošības speciālista lomā!", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: Math.min(380, W - 40) }
      })
      .setOrigin(0.5);

    const bodyText =
      "Savā busiņā pārbaudi un atjauno visus objektā esošos ugunsdzēšamos aparātus!\n\n" +
      "Objektā pavadi pēc iespējas mazāk laika!\n\n" +
      "KONTROLE:\n" +
      "->   PA labi\n" +
      "<-   Pa kreisi\n" +
      "A     Paņemt\n" +
      "V      Nolikt";

    // teksts pa kreisi (kā tavā piemērā)
    const textX = Math.round(W * 0.16);
    const textY = Math.round(H * 0.23);

    this.add
      .text(textX, textY, bodyText, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#e7edf5",
        align: "left",
        lineSpacing: 8,
        wordWrap: { width: Math.min(380, W - textX - 20) }
      })
      .setOrigin(0, 0);

    // sarkanā atruna
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
          wordWrap: { width: Math.min(380, W - 40) }
        }
      )
      .setOrigin(0.5);

    // ---------- POGA (IDENTISKA Intro stilam: bez ēnas) ----------
    const btnW = Math.min(260, W - 80);
    const btnH = 64;
    const btnY = H - 110;

    const btn = this.add
      .rectangle(W / 2, btnY, btnW, btnH, 0x1a3550, 1)
      .setOrigin(0.5)
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
      btn.setFillStyle(0x224463, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 60
      });
    };

    const pressOut = () => {
      btn.setFillStyle(0x1a3550, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 80
      });
    };

    const goNext = () => {
      this.scene.start("Stage1");
    };

    btn.on("pointerdown", () => pressIn());
    btn.on("pointerup", () => {
      pressOut();
      goNext();
    });
    btn.on("pointerout", () => pressOut());
    btn.on("pointercancel", () => pressOut());

    // ENTER arī strādā
    this.input.keyboard.once("keydown-ENTER", goNext);
  }
}
