class Intro extends Phaser.Scene {
  constructor() {
    super("Intro");
  }

  preload() {
    // Intro bilde + vienīgā spēles mūzika
    this.load.image("intro_bg", "assets/img/intro.png");
    this.load.audio("bgm", "assets/audio/intro.mp3");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // fons
    this.cameras.main.setBackgroundColor("#000000");

    // --- FONA BILDE (portrait) ---
    // Atstājam apakšā melnu gabalu start pogai/tekstam.
    const bottomPad = 210; // cik daudz melnā laukuma apakšā
    const targetH = H - bottomPad;

    const bg = this.add.image(W / 2, targetH / 2, "intro_bg");
    bg.setOrigin(0.5, 0.5);

    // cover uz augšu (lai nav baltas malas)
    const scale = Math.max(W / bg.width, targetH / bg.height);
    bg.setScale(scale);

    // ja gribi, vari pabīdīt bildi mazliet uz augšu/leju:
    // bg.y = targetH / 2 - 10;

    // --- TEKSTI ---
    const titleY = Math.round(targetH * 0.72);
    const hintY = titleY + 52;

    this.add
      .text(W / 2, titleY, "PASPĒT LAIKĀ!", {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // HINTS (paliek zem virsraksta)
    const hint = this.add
      .text(W / 2, hintY, "Spied START vai ENTER", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff"
      })
      .setOrigin(0.5);

    // mirgošana hintam (kā arkādēs)
    this.tweens.add({
      targets: hint,
      alpha: 0.15,
      duration: 550,
      yoyo: true,
      repeat: -1
    });

    // --- START POGA (zem hint) ---
    const btnY = hintY + 75; // ✅ zem hint
    const btnW = 190;
    const btnH = 56;

    const btnBg = this.add.rectangle(W / 2, btnY, btnW, btnH, 0x1f3a52, 1);
    const btnText = this.add
      .text(W / 2, btnY, "START", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    btnBg.setInteractive({ useHandCursor: true });

    const pressIn = () => {
      btnBg.setFillStyle(0x2a587c, 1);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };
    const pressOut = () => {
      btnBg.setFillStyle(0x1f3a52, 1);
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    const doStart = async () => {
      // ✅ Audio autoplay uz PC prasa user gesture — šis ir tieši tas brīdis.
      // Startējam mūziku TIKAI 1 reizi uz visu spēli:
      if (!this.sound.get("bgm")) {
        // dažreiz pārlūks prasa explicit resume
        if (this.sound.context && this.sound.context.state === "suspended") {
          try { await this.sound.context.resume(); } catch (e) {}
        }

        const bgm = this.sound.add("bgm", { loop: true, volume: 0.7 });
        bgm.play();
      }

      this.scene.start("MainMenu");
    };

    // poga ar peli/touch
    btnBg.on("pointerdown", () => {
      pressIn();
    });
    btnBg.on("pointerup", () => {
      pressOut();
      doStart();
    });
    btnBg.on("pointerout", () => {
      pressOut();
    });
    btnBg.on("pointercancel", () => {
      pressOut();
    });

    // ENTER uz klaviatūras
    this.input.keyboard.once("keydown-ENTER", () => doStart());

    // ja gribi, vari atstāt arī “klikšķis jebkur” kā fallback:
    // this.input.once("pointerdown", () => doStart());
  }
}
