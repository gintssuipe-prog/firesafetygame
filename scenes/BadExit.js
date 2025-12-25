class BadExit extends Phaser.Scene {
  constructor() {
    super("BadExit");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#000000");

    this.add.text(W / 2, H * 0.38, "NEVARĒJU AUTOMĀTISKI AIZVĒRT LOGU", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold",
      align: "center",
      wordWrap: { width: Math.min(360, W - 30) }
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.52, "Aizver šo pārlūka cilni (TAB) manuāli.", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#cfcfcf",
      align: "center",
      wordWrap: { width: Math.min(360, W - 30) }
    }).setOrigin(0.5);

    const btnW = 200;
    const btnH = 58;
    const y = H * 0.78;

    const bg = this.add.rectangle(W / 2, y, btnW, btnH, 0x184a30, 1)
      .setStrokeStyle(2, 0x2a7a45, 1)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(W / 2, y, "MENU", {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const pressIn = () => {
      bg.setFillStyle(0x1f5c3a, 1);
      this.tweens.killTweensOf([bg, txt]);
      this.tweens.add({ targets: [bg, txt], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };
    const pressOut = () => {
      bg.setFillStyle(0x184a30, 1);
      this.tweens.killTweensOf([bg, txt]);
      this.tweens.add({ targets: [bg, txt], scaleX: 1, scaleY: 1, duration: 90 });
    };

    bg.on("pointerdown", pressIn);
    bg.on("pointerup", () => { pressOut(); this.scene.start("MainMenu"); });
    bg.on("pointerout", pressOut);
    bg.on("pointercancel", pressOut);
  }
}
