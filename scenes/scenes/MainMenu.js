class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b0f14");

    // Spēles nosaukums
    this.add.text(550, 120, "Ugunsdrošības glābējzvans", {
      fontFamily: "system-ui, Segoe UI, Roboto, Arial",
      fontSize: "40px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Apraksts / instrukcija
    const infoText =
      "MĒRĶIS:\n" +
      "Savākt bojātos ugunsdzēšamos aparātus (NOK),\n" +
      "nogādāt tos busā un atgriezt atjaunotus (OK)\n" +
      "pareizajās vietās.\n\n" +
      "VADĪBA:\n" +
      "← →  pārvietošanās\n" +
      "↑    paņemt aparātu\n" +
      "↓    nolikt aparātu\n\n" +
      "Lifts kustas automātiski.";

    this.add.text(550, 280, infoText, {
      fontFamily: "system-ui, Segoe UI, Roboto, Arial",
      fontSize: "18px",
      color: "#e7edf5",
      align: "center",
      lineSpacing: 6
    }).setOrigin(0.5);

    // Poga "SPĒLĒT"
    const button = this.add.rectangle(550, 470, 220, 54, 0x00aa66)
      .setStrokeStyle(2, 0x00ff99)
      .setInteractive({ useHandCursor: true });

    this.add.text(550, 470, "SPĒLĒT", {
      fontFamily: "system-ui, Segoe UI, Roboto, Arial",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    button.on("pointerdown", () => {
      this.scene.start("Stage1");
    });
  }
}
