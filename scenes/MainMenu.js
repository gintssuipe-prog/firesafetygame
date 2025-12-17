class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b0f14");

    this.add.text(550, 120, "Ugunsdrošības glābējzvans", {
      fontFamily: "Arial",
      fontSize: "36px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(
      550,
      260,
      "MĒRĶIS:\nSavākt bojātos ugunsdzēšamos aparātus,\n" +
      "nogādāt tos busā un atgriezt atjaunotus.\n\n" +
      "VADĪBA:\n← → pārvietošanās\n↑ paņemt (vēlāk)\n↓ nolikt (vēlāk)",
      {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#dddddd",
        align: "center",
        lineSpacing: 6
      }
    ).setOrigin(0.5);

    const btn = this.add.rectangle(550, 460, 220, 60, 0x007755)
      .setInteractive({ useHandCursor: true });

    this.add.text(550, 460, "SPĒLĒT", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    btn.on("pointerdown", () => this.scene.start("Stage1"));
  }
}
