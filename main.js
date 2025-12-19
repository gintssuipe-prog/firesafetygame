const config = {
  type: Phaser.AUTO,
  width: 420,
  height: 820,
  parent: "game",
  scene: [Intro, MainMenu, Stage1],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 900 },
      debug: false
    }
  }
};

new Phaser.Game(config);
