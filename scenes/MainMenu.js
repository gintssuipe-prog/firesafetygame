class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  preload() {
    // ielādējam tikai tad, ja vēl nav
    if (!this.textures.exists("introBg")) {
      this.load.image("introBg", "assets/img/intro.png"); // <-- šim ceļam jābūt pareizam
    }
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // ---- Fade IN (ienākot scenā) ----
    this.cameras.main.fadeIn(250, 0, 0, 0);

    // ---- FONS: bilde + dim ----
    const hasBg = this.textures.exists("introBg");
    if (hasBg) {
      const bg = this.add.image(W / 2, H / 2, "introBg").setDepth(0);

      // cover (pa visu laukumu)
      const scale = Math.max(W / bg.width, H / bg.height);
      bg.setScale(scale);

      // padarām tumšu (lai netraucē tekstam)
      bg.setAlpha(0.22);
    } else {
      // ja bilde nav ielādēta (ceļš nepareizs) – vismaz būs fons, un viss pārējais strādās
      this.cameras.main.setBackgroundColor("#101a24");
    }

    // apakšā mīksts tumšinājums (gradients bez asas malas)
    const overlay = this.add.graphics().setDepth(1);
    const grd = overlay.createLinearGradient(0, H * 0.45, 0, H);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.88)");
    overlay.fillStyle(grd);
    overlay.fillRect(0, 0, W, H);

    // ---- TEKSTI (vienmēr virs fona) ----
    const title = this.add
      .text(W / 2, 90, "PASPĒT LAIKĀ", {
        fontFamily: "Arial",
        fontSize: "28px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(10);

    const bodyText =
      "Iejūties ugunsdrošības speciālista lomā!\n\n" +
      "Savā busiņā pārbaudi un atjauno visus objektā\n" +
      "esošos ugunsdzēšamos aparātus.\n\n" +
      "Vari sakrāt vairākus aparātus busā uz atjaunošanu,\n" +
      "bet ne vairāk par 6 vienlaicīgi.\n\n" +
      "Dari kā vēlies — tavs mērķis ir pavadīt objektā\n" +
      "pēc iespējas mazāk laika.";

    this.add
      .text(W / 2, 150, bodyText, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#e6ebf2",
        align: "center",
        lineSpacing: 6,
        wordWrap: { width: W - 40 }
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.add
      .text(W / 2, H - 230, "KONTROLE:\n← → pārvietošanās\n↑ paņemt\n↓ nolikt", {
        fontFamily: "Arial",
        fontSize: "14px",
        color: "#c7d0dd",
        align: "center",
        lineSpacing: 4
      })
      .setOrigin(0.5, 0)
      .setDepth(10);

    this.add
      .text(
        W / 2,
        H - 150,
        "Visi spēles personāži, atribūti, loģika un\nlokācijas ir māksliniecisks izdomājums.",
        {
          fontFamily: "Arial",
          fontSize: "13px",
          color: "#ff4a4a",
          align: "center"
        }
      )
      .setOrigin(0.5, 0)
      .setDepth(10);

    // ---- POGA (Intro stilā: zili pelēka + spiediena efekts) ----
    const btnY = H - 70;

    // ēna nobīdīta pa labi + uz leju (dabīgāk)
    const shadow = this.add
      .rectangle(W / 2 + 5, btnY + 5, 220, 60, 0x000000, 0.42)
      .setDepth(19);

    const btn = this.add
      .rectangle(W / 2, btnY, 220, 60, 0x1f3b57, 1)
      .setDepth(20)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "UZ PRIEKŠU", {
        fontFamily: "Arial",
        fontSize: "20px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(21);

    const pressIn = () => {
      btn.setFillStyle(0x2c5275, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 70
      });
    };

    const pressOut = () => {
      btn.setFillStyle(0x1f3b57, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 1,
        scaleY: 1,
        duration: 90
      });
    };

    const goNext = () => {
      // ---- Fade OUT (izejot no scenas) ----
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("Stage1");
      });
    };

    btn.on("pointerdown", pressIn);
    btn.on("pointerup", () => {
      pressOut();
      goNext();
    });
    btn.on("pointerout", pressOut);

    // ENTER arī lai strādā
    this.input.keyboard.once("keydown-ENTER", goNext);
  }
}
