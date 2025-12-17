(() => {
  const W = 1100;
  const H = 650;

  // 5 stāvu virsmas (kur stāv kājas)
  const FLOORS_Y = [110, 220, 330, 440, 550];
  const PLATFORM_THICK = 20;

  // Lifts
  const ELEVATOR = {
    x: 650,
    w: 140,
    h: 110,
    speed: 55, // px/sec
  };

  // Buss apakšā pa kreisi
  const BUS = { x: 70, y: 455, w: 220, h: 155 };

  // “Spot” = vieta (sarkanais kvadrāts) + sākumā tur stāv aparāts
  // y tiks aprēķināts automātiski uz attiecīgā stāva
  const SPOTS = [
    { floor: 1, x: 820 }, { floor: 1, x: 980 },
    { floor: 2, x: 760 }, { floor: 2, x: 940 },
    { floor: 3, x: 800 }, { floor: 3, x: 1000 },
    { floor: 0, x: 860 }, { floor: 0, x: 1020 },
    { floor: 4, x: 520 }, { floor: 4, x: 900 },
  ];

  const EXT_H = 44; // aparāta “ķermeņa” augstums (physics)
  const EXT_FOOT_OFFSET = EXT_H / 2; // cik jānoliek virsmas y, lai apakša būtu uz grīdas

  class Main extends Phaser.Scene {
    constructor() {
      super("main");
      this.score = 0;

      this.carrying = null;
      this.lastInteractAt = 0;
      this.touch = { left:false, right:false, up:false, down:false };
      this.gameOver = false;

      this.elevDir = -1; // -1 uz augšu, +1 uz leju
      this.riding = false; // vai spēlētājs “ir liftā”
      this.prevElevY = null;
    }

    create() {
      this.cameras.main.setBackgroundColor("#0b0f14");

      // Fons
      const bg = this.add.graphics();
      bg.fillStyle(0x121a22, 1);
      bg.fillRect(0, 0, W, H);

      // Platformas (stāvi)
      this.platforms = this.physics.add.staticGroup();

      // 1. stāvs (apakšā) pilnā platumā
      this.addPlatform(0, FLOORS_Y[4], W, PLATFORM_THICK);

      // 2–5 stāvs labā puse (kā tavā shēmā)
      const rightStartX = 520;
      const rightWidth = 640;
      for (let i = 0; i < 4; i++) {
        this.addPlatform(rightStartX, FLOORS_Y[i], rightWidth, PLATFORM_THICK);
      }

      // Buss
      this.busRect = this.add.rectangle(
        BUS.x + BUS.w/2,
        BUS.y + BUS.h/2,
        BUS.w,
        BUS.h,
        0xf2f4f8
      ).setStrokeStyle(4, 0xc7ced8);

      this.add.text(this.busRect.x, BUS.y + 10, "BUSS", {
        fontFamily: "system-ui, Segoe UI, Roboto, Arial",
        fontSize: "18px",
        color: "#0b0f14"
      }).setOrigin(0.5, 0);

      this.busZone = new Phaser.Geom.Rectangle(BUS.x, BUS.y, BUS.w, BUS.h);

      // Li
