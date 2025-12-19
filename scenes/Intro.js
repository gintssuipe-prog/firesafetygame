class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  preload() {
    // ✅ Intro bilde (ieliec failu: assets/img/intro.png)
    this.load.image("intro_bg", "assets/img/intro.png");
  }

  create() {
    // fons (ja bilde vēl nav ielādējusies vai ir tukšums)
    this.cameras.main.setBackgroundColor("#000000");

    const W = this.scale.width;
    const H = this.scale.height;

    // ✅ bilde pa visu ekrānu
    const bg = this.add.image(W / 2, H / 2, "intro_bg");
    bg.setDisplaySize(W, H);

    // virsraksts – centrēts
    this.add
      .text(W / 2, H / 2 - 40, "Ugunsdrošības glābējzvans", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: W - 40 }
      })
      .setOrigin(0.5);

    // apakšteksts – zem virsraksta
    this.add
      .text(W / 2, H / 2 + 30, "Klikšķini vai spied ENTER", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#cccccc"
      })
      .setOrigin(0.5);

    // ievade
    this.input.keyboard.once("keydown-ENTER", () => {
      this.scene.start("MainMenu");
    });

    this.input.once("pointerdown", () => {
      this.scene.start("MainMenu");
    });
  }
}
