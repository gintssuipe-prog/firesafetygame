(() => {
  const config = {
    type: Phaser.AUTO,
    parent: "game",
    width: 1100,
    height: 650,
    backgroundColor: "#000000",
    scene: [Intro, MainMenu],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  };

  new Phaser.Game(config);
})();
