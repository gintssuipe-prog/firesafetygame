class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    this.add.text(550, 300, "Ugunsdrošības glābējzvans", {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this.add.text(550, 380, "Klikšķini vai spied ENTER", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cccccc"
    }).setOrigin(0.5);

    this.input.keyboard.once("keydown-ENTER", () => this.scene.start("MainMenu"));
    this.input.once("pointerdown", () => this.scene.start("MainMenu"));
  }
}
