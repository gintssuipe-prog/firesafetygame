class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#0b0f14");

    // ---- VIRSRaksts ----
    this.add
      .text(W / 2, 90, "Ugunsdrošības glābējzvans", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: W - 40 }
      })
      .setOrigin(0.5);

    // ---- APRAKSTS ----
    this.add
      .text(
        W / 2,
        220,
        "MĒRĶIS:\n" +
          "Savākt bojātos ugunsdzēšamos aparātus,\n" +
          "nogādāt tos busā un atgriezt atjaunotus.\n\n" +
          "VADĪBA:\n" +
          "← → pārvietošanās\n" +
          "↑ paņemt\n" +
          "↓ nolikt",
        {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#dddddd",
          align: "center",
          lineSpacing: 6,
          wordWrap: { width: W - 60 }
        }
      )
      .setOrigin(0.5);

    // ---- POGA ----
    const btnY = H * 0.65;
    const btnW = 220;
    const btnH = 64;

    // ēna (fake 3D)
    this.add.rectangle(W / 2, btnY + 5, btnW, btnH, 0x000000, 0.6);

    const btn = this.add
      .rectangle(W / 2, btnY, btnW, btnH, 0x007755)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "UZ PRIEKŠU", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // ---- INTERAKCIJA ----
    const startGame = () => {
      this.scene.start("Stage1");
    };

    btn.on("pointerdown", () => {
      btn.y += 4;
      btnText.y += 4;
    });

    btn.on("pointerup", () => {
      btn.y -= 4;
      btnText.y -= 4;
      startGame();
    });

    btn.on("pointerout", () => {
      btn.y = btnY;
      btnText.y = btnY;
    });

    this.input.keyboard.once("keydown-ENTER", startGame);
  }
}
