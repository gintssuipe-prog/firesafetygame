(() => {
  const config = {
    type: Phaser.AUTO,
    parent: "game",
    width: 1100,
    height: 650,
    backgroundColor: "#111111",
    scene: {
      create() {
        this.add.text(550, 325, "Phaser works", {
          fontSize: "32px",
          color: "#00ff88"
        }).setOrigin(0.5);
      }
    }
  };

  new Phaser.Game(config);
})();
