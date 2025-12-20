class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#0b0f14");

    // -----------------
    // VIRSRaksts
    // -----------------
    this.add
      .text(W / 2, 80, "Ugunsdrošības glābējzvans", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: W - 40 }
      })
      .setOrigin(0.5);

    // -----------------
    // SKAIDROJOŠAIS TEKSTS
    // -----------------
    this.add
      .text(
        W / 2,
        210,
        "Spēlējot, domā par efektīvākajām taktikām\n" +
          "novecojušu ugunsdzēšamo aparātu atjaunošanā.\n\n" +
          "Vari savākt vairākus aparātus un nogādāt\n" +
          "tos busā uz atjaunošanu, bet ne vairāk kā\n" +
          "SEŠUS vienlaicīgi.\n\n" +
          "Dari, kā uzskati par labāko — tavs mērķis\n" +
          "ir pavadīt objektā pēc iespējas mazāk laika.",
        {
          fontFamily: "Arial",
          fontSize: "15px",
          color: "#d6dee8",
          align: "center",
          lineSpacing: 6,
          wordWrap: { width: W - 50 }
        }
      )
      .setOrigin(0.5);

    // -----------------
    // POGA "UZ PRIEKŠU" (Intro stilā)
    // -----------------
    const btnY = H - 140;
    const btnW = 220;
    const btnH = 64;

    // ēna (fake 3D)
    const shadow = this.add
      .rectangle(W / 2, btnY + 6, btnW, btnH, 0x000000, 0.6)
      .setDepth(1);

    const btn = this.add
      .rectangle(W / 2, btnY, btnW, btnH, 0x142334)
      .setDepth(2)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(W / 2, btnY, "UZ PRIEKŠU", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#e7edf5",
        fontStyle: "bold"
      })
      .setOrigin(0.5)
      .setDepth(3);

    const startGame = () => {
      this.scene.start("Stage1");
    };

    // ---- pogas animācija (tā pati sajūta kā Intro)
    btn.on("pointerdown", () => {
      btn.setFillStyle(0x1d3a55, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 0.96,
        scaleY: 0.96,
        duration: 60
      });
    });

    btn.on("pointerup", () => {
      btn.setFillStyle(0x142334, 1);
      this.tweens.add({
        targets: [btn, btnText],
        scaleX: 1,
        scaleY: 1,
        duration: 80,
        onComplete: startGame
      });
    });

    btn.on("pointerout", () => {
      btn.setFillStyle(0x142334, 1);
      btn.setScale(1);
      btnText.setScale(1);
    });

    // ENTER atbalsts
    this.input.keyboard.once("keydown-ENTER", startGame);
  }
}
