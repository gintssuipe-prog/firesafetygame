class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  preload() {
    // 🔴 INTRO BILDE (ieliec failu, piem. assets/intro.png)
    this.load.image("introImage", "assets/intro.png");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // fons
    this.cameras.main.setBackgroundColor("#000000");

    // ===============================
    // INTRO BILDE (augšējā daļa)
    // ===============================
    const img = this.add.image(W / 2, 0, "introImage");
    img.setOrigin(0.5, 0);

    // mērogojam, lai ietilptu platumā
    const scale = W / img.width;
    img.setScale(scale);

    const imgBottomY = img.displayHeight;

    // ===============================
    // MELNA JOSLA APakšā
    // ===============================
    const bottomH = Math.max(120, H - imgBottomY);

    this.add
      .rectangle(W / 2, imgBottomY + bottomH / 2, W, bottomH, 0x000000, 1)
      .setOrigin(0.5);

    // ===============================
    // START POGA
    // ===============================
    const btnY = imgBottomY + bottomH / 2;

    const btnBg = this.add
      .rectangle(W / 2, btnY, 200, 56, 0x1d3a55, 1)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "START", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .s
