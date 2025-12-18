const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: 420,
  height: 820,
  backgroundColor: "#000000",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 900 }, debug: false }
  },
  scene: [Stage1],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
