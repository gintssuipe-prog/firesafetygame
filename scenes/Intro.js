class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  preload() {
    // 🎵 Intro mūzika
    this.load.audio("introMusic", "assets/audio/intro.mp3");
  }

  create() {
    this.cameras.main.setBackgroundColor("#000000");

    const W = this.scale.width;
    const H = this.scale.height;

    // 🎵 palaist mūziku
    this.introMusic = this.sound.add("introMusic", {
      loop: true,
      volume: 0.6
    });
    this.introMusic.play();

    // virsraksts
    this.add
      .text(W / 2, H / 2 - 40, "PASPĒT LAIKĀ!", {
        fontFamily: "Arial",
        fontSize: "36px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center"
      })
      .setOrigin(0.5);

    // START poga (tekstā)
    this.add
      .text(W / 2, H / 2 + 40, "START", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#e7edf5"
      })
      .setOrigin(0.5);

    const goNext = () => {
      if (this.introMusic) {
        this.introMusic.stop();
      }
      this.scene.start("MainMenu");
    };

    this.input.keyboard.once("keydown-ENTER", goNext);
    this.input.once("pointerdown", goNext);
  }
}
