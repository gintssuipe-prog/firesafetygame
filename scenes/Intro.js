class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b0f14");

    this.add.text(550, 260, "Ugunsdrošības spēle", {
      fontFamily: "system-ui, Segoe UI, Roboto, Arial",
      fontSize: "44px",
      color: "#ffffff"
    }).setOrigin(0.5);

    this.add.text(550, 330, "Spied jebkur vai ENTER", {
      fontFamily: "system-ui, Segoe UI, Roboto, Arial",
      fontSize: "18px",
      color: "#e7edf5"
    }).setOrigin(0.5);

    this.input.once("pointerdown", () => this.scene.start("MainMenu"));
    this.input.keyboard.once("keydown-ENTER", () => this.scene.start("MainMenu"));
  }
}
