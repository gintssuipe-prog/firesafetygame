class Score extends Phaser.Scene {
  constructor() {
    super("Score");
    this.API_URL = "https://script.google.com/macros/s/AKfycbyh6BcVY_CBPW9v7SNo1bNp_XttvhxpeSdYPfrTdRCD4KWXLeLvv-0S3p96PX0Dv5BnrA/exec";
    this._top = [];
    this._scrollY = 0;
    this._contentH = 0;

    this._onWheel = null;
    this._dragging = false;
    this._dragStartY = 0;
    this._scrollStartY = 0;
    this._jsonpTimeout = null;
    this._jsonpCleanup = null;
  }

  init() {
    // Reset every time we enter Score
    this._top = [];
    this._scrollY = 0;
    this._contentH = 0;
    this._dragging = false;
    this._dragStartY = 0;
    this._scrollStartY = 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.cameras.main.setBackgroundColor("#101a24");

    // Background image (same as MainMenu)
    const bg = this.add.image(0, 0, "intro_bg").setOrigin(0.5);
    bg.setAlpha(0.12);

    const gg = this.add.graphics();

    // Title
    const title = this.add.text(W / 2, 70, "TOP 50", {
      fontFamily: "Arial",
      fontSize: "34px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // Status (loading / error)
    const status = this.add.text(W / 2, 118, "Ielādē rezultātu tabulu…", {
      fontFamily: "Arial",
      fontSize: "18px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);
    this._statusText = status;

    // Table area geometry
    const tableX = 28;
    const tableY = 150;
    const tableW = W - 56;
    const tableH = H - 150 - 120; // leave room for button
    const headerH = 36;
    const rowH = 28;

    // Semi-transparent container (no white background)
    const panel = this.add.rectangle(W / 2, tableY + tableH / 2, tableW, tableH, 0x000000, 0.25);
    panel.setStrokeStyle(2, 0xffffff, 0.12);

    // Header
    const headerBg = this.add.rectangle(W / 2, tableY + headerH / 2, tableW, headerH, 0x000000, 0.45);
    headerBg.setStrokeStyle(1, 0xffffff, 0.10);

    const colRankX = tableX + 18;
    const colNameX = tableX + 70;
    const colTimeX = tableX + tableW - 18;

    const hdrStyle = { fontFamily: "Arial", fontSize: "16px", color: "#ffffff", fontStyle: "bold" };
    this.add.text(colRankX, tableY + 9, "Vieta", hdrStyle).setOrigin(0, 0);
    this.add.text(colNameX, tableY + 9, "Vārds", hdrStyle).setOrigin(0, 0);
    this.add.text(colTimeX, tableY + 9, "Laiks", hdrStyle).setOrigin(1, 0);

    // Content container (scrollable)
    const content = this.add.container(0, 0);
    this._content = content;

    // Mask to clip rows
    const maskG = this.make.graphics({ x: 0, y: 0, add: false });
    maskG.fillStyle(0xffffff);
    maskG.fillRect(tableX, tableY + headerH, tableW, tableH - headerH);
    const mask = maskG.createGeometryMask();
    content.setMask(mask);

    // Button (same width as MainMenu)
    const btnW = 200;
    const btnH = 58;
    const btnY = H - 70;

    const btnMenu = this._makeButton(W / 2, btnY, btnW, btnH, "UZ MENU", 0x184a30, 0x1f5c3a);
    btnMenu.on("pointerup", () => {
      this._cleanupJsonp();
      this.scene.start("MainMenu");
    });

    // Layout updater (for orientation/resize, safe because no DOM input here)
    const applyLayout = (w, h) => {
      bg.setPosition(w / 2, h / 2);
      const scaleBg = Math.max(w / bg.width, h / bg.height);
      bg.setScale(scaleBg);

      gg.clear();
      gg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.92, 0.92);
      gg.fillRect(0, Math.floor(h * 0.28), w, Math.ceil(h * 0.72));
    };

    applyLayout(W, H);
    this._onResize = (gameSize) => applyLayout(gameSize.width, gameSize.height);
    this.scale.on("resize", this._onResize);

    // Scrolling: wheel + drag
    this._onWheel = (pointer, gameObjects, dx, dy) => {
      this._setScroll(this._scrollY + dy);
    };
    this.input.on("wheel", this._onWheel);

    panel.setInteractive(new Phaser.Geom.Rectangle(panel.x - tableW / 2, panel.y - tableH / 2, tableW, tableH), Phaser.Geom.Rectangle.Contains);
    panel.on("pointerdown", (p) => {
      this._dragging = true;
      this._dragStartY = p.y;
      this._scrollStartY = this._scrollY;
    });
    this.input.on("pointerup", () => (this._dragging = false));
    this.input.on("pointermove", (p) => {
      if (!this._dragging) return;
      const delta = this._dragStartY - p.y;
      this._setScroll(this._scrollStartY + delta);
    });

    // Cleanup on shutdown/destroy
    this.events.once("shutdown", this._cleanup, this);
    this.events.once("destroy", this._cleanup, this);

    // Load data
    this._loadTop();
  }

  _cleanup() {
    this._cleanupJsonp();
    if (this.scale && this._onResize) this.scale.off("resize", this._onResize);
    if (this.input && this._onWheel) this.input.off("wheel", this._onWheel);
  }

  _cleanupJsonp() {
    try { if (this._jsonpCleanup) this._jsonpCleanup(); } catch (e) {}
    this._jsonpCleanup = null;
    if (this._jsonpTimeout) clearTimeout(this._jsonpTimeout);
    this._jsonpTimeout = null;
  }

  _loadTop() {
    this._cleanupJsonp();

    if (this._statusText) {
      this._statusText.setText("Ielādē rezultātu tabulu…").setVisible(true);
    }

    const cbName = `__fsg_top_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    const url = `${this.API_URL}?action=top&callback=${cbName}`;

    const script = document.createElement("script");
    script.src = url;
    script.async = true;

    const cleanup = () => {
      try { delete window[cbName]; } catch (e) {}
      try { if (script && script.parentNode) script.parentNode.removeChild(script); } catch (e) {}
    };
    this._jsonpCleanup = cleanup;

    window[cbName] = (data) => {
      this._cleanupJsonp();
      if (!Array.isArray(data)) {
        this._showError();
        return;
      }
      this._top = data;
      this._renderRows();
      if (this._statusText) this._statusText.setVisible(false);
    };

    script.onerror = () => {
      this._cleanupJsonp();
      this._showError();
    };

    document.body.appendChild(script);

    this._jsonpTimeout = setTimeout(() => {
      this._cleanupJsonp();
      this._showError();
    }, 8000);
  }

  _showError() {
    if (this._statusText) {
      this._statusText.setText("Neizdevās ielādēt TOP (pārbaudi deploy).").setVisible(true);
    }
  }

  _formatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

    _renderRows() {
    if (!this._content) return;
    this._content.removeAll(true);

    const W = this.scale.width;
    const tableX = 28;
    const tableW = W - 56;
    const rowH = 28;

    const colRankX = tableX + 18;
    const colNameX = tableX + 70;
    const colTimeX = tableX + tableW - 18;

    const rowStyle = { fontFamily: "Arial", fontSize: "16px", color: "#ffffff" };

    let y = 0;
    for (let i = 0; i < this._top.length; i++) {
      const r = this._top[i];
      const rank = (r && r.rank) ? r.rank : (i + 1);
      const name = (r && r.name) ? String(r.name) : "";
      const time = this._formatTime(r && r.time);

      // zebra row (subtle)
      const zebraA = (i % 2 === 0) ? 0.06 : 0.0;
      if (zebraA > 0) {
        const bg = this.add.rectangle(W / 2, 0, tableW, rowH, 0xffffff, zebraA).setOrigin(0.5, 0);
        bg.y = y - 2;
        this._content.add(bg);
      }

      this._content.add(this.add.text(colRankX, y, String(rank), rowStyle).setOrigin(0, 0));
      this._content.add(this.add.text(colNameX, y, name, rowStyle).setOrigin(0, 0));
      this._content.add(this.add.text(colTimeX, y, time, rowStyle).setOrigin(1, 0));

      y += rowH;
    }

    this._contentH = Math.max(0, y + 10);
    this._setScroll(0);
  }

  _setScroll(newScroll) {
    const H = this.scale.height;

    const tableY = 150;
    const tableH = H - 150 - 120;
    const headerH = 36;
    const viewH = tableH - headerH;

    const maxScroll = Math.max(0, this._contentH - viewH);
    this._scrollY = Phaser.Math.Clamp(newScroll, 0, maxScroll);

    if (this._content) {
      const contentTop = tableY + headerH + 10;
      this._content.setPosition(0, contentTop - this._scrollY);
    }
  }


  _makeButton(newScroll) {
    // Content is inside masked area: we move container up/down
    const W = this.scale.width;
    const H = this.scale.height;

    const tableY = 150;
    const tableH = H - 150 - 120;
    const headerH = 36;
    const viewH = tableH - headerH;

    const maxScroll = Math.max(0, this._contentH - viewH);
    this._scrollY = Phaser.Math.Clamp(newScroll, 0, maxScroll);

    if (this._content) {
      const startY = tableY + headerH + 10;
      this._content.y = -this._scrollY;
      // content container anchored at y=0; rows start at startY, so move container relative to that
      this._content.setPosition(0, -this._scrollY);
    }
  }

  _makeButton(x, y, w, h, label, color, colorOver) {
    const bg = this.add.rectangle(x, y, w, h, color, 1).setOrigin(0.5);
    bg.setStrokeStyle(2, 0xffffff, 0.15);

    const txt = this.add.text(x, y, label, {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0x000000, 0).setOrigin(0.5).setInteractive({ useHandCursor: true });

    hit.on("pointerover", () => bg.setFillStyle(colorOver, 1));
    hit.on("pointerout", () => bg.setFillStyle(color, 1));

    return hit;
  }
}
