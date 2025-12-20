class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  preload() {
    // tas pats intro fons
    this.load.image("introBg", "assets/img/intro.png");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ---------- FONA BILDE ----------
    const bg = this.add.image(W / 2, H / 2, "introBg");

    // pareizi izstiepjam pa visu ekrānu
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale);
    bg.setAlpha(0.25); // 👈 dim efekts

    // papildus tumšinājums ar gradientu (bez asas malas)
    const overlay = this.add.graphics();
    const grd = overlay.createLinearGradient(0, H * 0.4, 0, H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.85)");

    overlay.fillStyle(grd);
    overlay.fillRect(0, 0, W, H);

    // ---------- VIRSRaksts ----------
    this.add.text(W / 2, 90, "PASPĒT LAIKĀ", {
      fontFamily: "Arial",
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // ---------- APRAKSTS ----------
    this.add.text(
      W / 2,
      160,
      "Iejūties ugunsdrošības speciālista lomā!\n\n" +
      "Savā busiņā pārbaudi un atjauno visus objektā\n" +
      "esošos ugunsdzēšamos aparātus.\n\n" +
      "Vari sakrāt vairākus aparātus busā uz\n" +
      "atjaunošanu (ne vairāk kā 6 vienlaicīgi).\n\n" +
      "Dari kā vēlies — tavs mērķis ir pavadīt\n" +
      "objektā pēc iespējas mazāk laika.",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#e6ebf2",
        align: "center",
        lineSpacing: 6,
        wordWrap: { width: W - 40 }
      }
    ).setOrigin(0.5, 0);

    // ---------- KONTROLES ----------
    this.add.text(
      W / 2,
      H - 230,
      "KONTROLE:\n← → pārvietošanās\n↑ paņemt\n↓ nolikt",
      {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#c7d0dd",
        align: "center",
        lineSpacing: 4
      }
    ).setOrigin(0.5, 0);

    // ---------- ATRUNA ----------
    this.add.text(
      W / 2,
      H - 150,
      "Visi spēles personāži, atribūti, loģika un\nlokācijas ir māksliniecisks izdomājums.",
      {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#ff4a4a",
        align: "center"
      }
    ).setOrigin(0.5, 0);

    // ---------- POGA UZ PRIEKŠU ----------
    const btnY = H - 70;

    const shadow = this.add.rectangle(
      W / 2 + 4,
      btnY + 4,
      200,
      54,
      0x000000,
      0.4
    );

    const btn = this.add.rectangle(
      W / 2,
      btnY,
      200,
      54,
      0x1f3b57
    ).setInteractive({ useHandCursor: true });

    const btnText = this.add.text(
      W / 2,
      btnY,
      "UZ PRIEKŠU",
      {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setOrigin(0.5);

    const pressIn = () => {
      btn.setFillStyle(0x2c5275);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 80
      });
    };

    const pressOut = () => {
      btn.setFillStyle(0x1f3b57);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 1,
        scaleY: 1,
        duration: 100
      });
    };

    btn.on("pointerdown", pressIn);
    btn.on("pointerup", () => {
      pressOut();
      this.scene.start("Stage1");
    });
    btn.on("pointerout", pressOut);

    this.input.keyboard.once("keydown-ENTER", () => {
      this.scene.start("Stage1");
    });
  }
}
