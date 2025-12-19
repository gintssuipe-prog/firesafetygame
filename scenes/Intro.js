class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  preload() {
    // ielādē intro bildi
    this.load.image("introBg", "assets/img/intro.png");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // fons
    this.cameras.main.setBackgroundColor("#000000");

    // ===== INTRO BILDE (augšā) =====
    const img = this.add.image(W / 2, 0, "introBg");
    img.setOrigin(0.5, 0);

    // mērogojam pēc platuma
    const scale = W / img.width;
    img.setScale(scale);

    const imgHeight = img.displayHeight;

    // ===== MELNA ZONA APKŠĀ =====
    this.add
      .rectangle(W / 2, imgHeight + (H - imgHeight) / 2, W, H - imgHeight, 0x000000)
      .setDepth(-1);

    // ===== START POGA =====
    const btnY = imgHeight + (H - imgHeight) / 2;

    const btnBg = this.add
      .rectangle(W / 2, btnY, 180, 56, 0x1f3b52)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "START", {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // hover / press efekti
    btnBg.on("pointerover", () => btnBg.setFillStyle(0x2c5675));
    btnBg.on("pointerout", () => btnBg.setFillStyle(0x1f3b52));

    const startGame = () => {
      this.scene.start("MainMenu");
    };

    btnBg.on("pointerdown", startGame);

    // ENTER arī strādā
    this.input.keyboard.once("keydown-ENTER", startGame);
  }
}
