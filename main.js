// ===============================
// GAME BOOTSTRAP
// ===============================

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 1100,
  height: 650,
  backgroundColor: "#000000",

  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  },

  scene: [
    Intro,
    MainMenu,
    Stage1
  ],

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

// ===============================
// START GAME
// ===============================
new Phaser.Game(config);
