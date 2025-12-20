class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  preload() {
    // Fons no intro (tumšināsim ar alpha)
    if (!this.textures.exists("intro_bg")) {
      this.load.image("intro_bg", "assets/img/intro.png");
    }
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // fons
    this.cameras.main.setBackgroundColor("#101a24");

    // Fade IN (sākumā)
    this.cameras.main.fadeIn(220, 0, 0, 0);

    // ---------- FONA BILDE (tā pati, kas intro), bet pavisam tumša ----------
    const bg = this.add.image(W / 2, H / 2, "intro_bg");
    // cover (aizpilda ekrānu, saglabājot proporciju)
    const scale = Math.max(W / bg.width, H / bg.height);
    bg.setScale(scale);
    bg.setAlpha(0.14); // te regulē "cik tumši" redz bildi

    // ---------- Apakšas tumšinājums ar gradientu (bez asas malas) ----------
    const g = this.add.graphics();
    // augšā caurspīdīgs, apakšā tumšs
    g.fillGradientStyle(
      0x000000, 0x000000, 0x000000, 0x000000,
      0.0,      0.0,      0.92,     0.92
    );
    g.fillRect(0, Math.floor(H * 0.35), W, Math.ceil(H * 0.65));

    // ---------- TEKSTI ----------
    const title = this.add
      .text(W / 2, 110, "PASPĒT LAIKĀ", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const sub = this.add
      .text(W / 2, 160, "Iejūties ugunsdrošības speciālista lomā!", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const bodyText =
      "Savā busiņā pārbaudi un atjauno visus objektā\n" +
      "esošos ugunsdzēšamos aparātus!\n\n" +
      "Spēlējot, domā efektīvākās taktikas novecojušu\n" +
      "termiņu ugunsdzēšamo aparātu atjaunošanā — vari\n" +
      "vairākus aparātus sakrāt busā uz atjaunošanu, bet\n" +
      "ne vairāk par sešiem vienlaicīgi.\n\n" +
      "Dari kā vēlies — tavs mērķis pavadīt objektā pēc\n" +
      "iespējas mazāk laika.\n\n" +
      "KONTROLE:\n" +
      "→  Pa labi\n" +
      "←  Pa kreisi\n" +
      "↑  Paņemt\n" +
      "↓  Nolikt";

    this.add
      .text(W / 2, 330, bodyText, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#e7edf5",
        align: "left",
        lineSpacing: 6
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(W / 2, 585, "Visi spēles personāži, atribūti, loģika un\nlokācijas ir mākslinieka izdomājums!", {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ff3b3b",
        align: "center"
      })
      .setOrigin(0.5);

    // ---------- POGA (tāds pats stils kā Intro START), ēna nobīdīta pa labi ----------
    const btnW = 260;
    const btnH = 64;
    const btnY = H - 110;

    // ēna (nobīdīta pa labi / uz leju)
    const shadow = this.add
      .rectangle(W / 2 + 8, btnY + 8, btnW, btnH, 0x000000, 0.45)
      .setOrigin(0.5);

    const btn = this.add
      .rectangle(W / 2, btnY, btnW, btnH, 0x1a3550, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "UZ PRIEKŠU", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const pressIn = () => {
      btn.setFillStyle(0x224463, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 60
      });
    };

    const pressOut = () => {
      btn.setFillStyle(0x1a3550, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 80
      });
    };

    const goNext = () => {
      // Fade OUT (beigās) + pāreja
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.time.delayedCall(190, () => this.scene.start("Stage1"));
    };

    btn.on("pointerdown", () => {
      pressIn();
    });

    btn.on("pointerup", () => {
      pressOut();
      goNext();
    });

    btn.on("pointerout", () => {
      pressOut();
    });

    btn.on("pointercancel", () => {
      pressOut();
    });

    // ENTER arī strādā
    this.input.keyboard.once("keydown-ENTER", goNext);
  }
}
