// ---------- INTRO SCENE ----------
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

    this.input.keyboard.once("keydown-ENTER", () => {
      this.scene.start("MainMenu");
    });

    this.input.once("pointerdown", () => {
      this.scene.start("MainMenu");
    });
  }
}

// ---------- MAIN MENU SCENE ----------
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
      "VADĪBA:\n← → pārvietošanās\n↑ paņemt\n↓ nolikt",
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

    btn.on("pointerdown", () => {
      this.scene.start("Stage1");
    });
  }
}

// ---------- STAGE 1 (PAGAIDĀM TUKŠS) ----------
class Stage1 extends Phaser.Scene {
  constructor() {
    super("Stage1");
  }

  create() {
    this.cameras.main.setBackgroundColor("#1a1a1a");

    this.add.text(550, 320, "Stage 1 — tukšs", {
      fontFamily: "Arial",
      fontSize: "24px",
      color: "#ffffff"
    }).setOrigin(0.5);
  }
}

// ---------- GAME CONFIG ----------
const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1100,
  height: 650,
  backgroundColor: "#000000",
  scene: [Intro, MainMenu, Stage1],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// ---------- START GAME ----------
new Phaser.Game(config);
