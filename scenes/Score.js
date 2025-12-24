class Score extends Phaser.Scene {
  constructor() {
    super("Score");
    this.API_URL = "https://script.google.com/macros/s/AKfycbyh6BcVY_CBPW9v7SNo1bNp_XttvhxpeSdYPfrTdRCD4KWXLeLvv-0S3p96PX0Dv5BnrA/exec";
    this.TOKEN = "FIRE2025";

    this._top = [];
    this._statusText = null;
    this._hintText = null;

    this._domWrap = null;     // Phaser DOMElement wrapper
    this._domEl = null;       // actual div element

    this._onResize = null;
    this._jsonpTimeout = null;
    this._jsonpCleanup = null;
  }

  init(data) {
    // nothing
  }

  preload() {
    this.load.image("intro_bg", "assets/bg.jpg");
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);

    this.cameras.main.setBackgroundColor("#101a24");

    // Background like MainMenu/Finish
    const bg = this.add.image(0, 0, "intro_bg").setOrigin(0.5).setAlpha(0.12);
    const g = this.add.graphics();

    const applyBg = (w, h) => {
      bg.setPosition(w / 2, h / 2);
      const s = Math.max(w / bg.width, h / bg.height);
      bg.setScale(s);

      g.clear();
      g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.92, 0.92);
      g.fillRect(0, Math.floor(h * 0.28), w, Math.ceil(h * 0.72));
    };
    applyBg(W, H);

    // Title
    this.add
      .text(W / 2, 64, "TOP 50", {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // Status + hint (match Finish style)
    this._statusText = this.add
      .text(W / 2, 108, "Ielādē rezultātu tabulu…", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        alpha: 0.95
      })
      .setOrigin(0.5);

    this._hintText = this.add
      .text(W / 2, 108, "Skrollē tabulu", {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        alpha: 0.95
      })
      .setOrigin(0.5)
      .setVisible(false);

    // DOM table container (simple + robust on mobile)
    this._createDomTable();

    // Bottom button: UZ MENU (grey, no frame)
    const btnW = Math.min(260, W - 80);
    const btnH = 58;
    const btnY = H - 72;
    const btnMenu = this._makeButton(W / 2, btnY, btnW, btnH, "UZ MENU", 0x5a5a5a, 0x6a6a6a);
    btnMenu.on("pointerup", () => this.scene.start("MainMenu"));

    // Resize handler: keep everything adaptive
    this._onResize = (gameSize) => {
      applyBg(gameSize.width, gameSize.height);

      // Keep DOM table sized/positioned
      this._syncDomTable(gameSize.width, gameSize.height);

      // Move hint/status and menu button
      if (this._statusText) this._statusText.setPosition(gameSize.width / 2, 108);
      if (this._hintText) this._hintText.setPosition(gameSize.width / 2, 108);

      btnMenu.setPosition(gameSize.width / 2, gameSize.height - 72);
    };
    this.scale.on("resize", this._onResize);

    this._loadTop();
  }

  cleanup() {
    this._cleanupJsonp();

    if (this._onResize) {
      try { this.scale.off("resize", this._onResize); } catch (e) {}
      this._onResize = null;
    }

    try {
      if (this._domWrap) this._domWrap.destroy();
    } catch (e) {}
    this._domWrap = null;
    this._domEl = null;
  }

  _createDomTable() {
    // Wrapper div (scrollable)
    const el = document.createElement("div");
    el.style.overflowY = "auto";
    el.style.overflowX = "hidden";
    el.style.webkitOverflowScrolling = "touch";
    el.style.background = "transparent";
    // no background box
    el.style.padding = "0";
    el.style.color = "#fff";
    el.style.fontFamily = "Arial, sans-serif";
    el.style.fontSize = "16px";
    el.style.lineHeight = "1.35";
    el.style.boxSizing = "border-box";

    // Inner content
    const inner = document.createElement("div");
    inner.style.display = "flex";
    inner.style.flexDirection = "column";
    inner.style.gap = "6px";

    // header row
    const header = document.createElement("div");
    header.style.display = "grid";
    header.style.gridTemplateColumns = "54px 1fr 74px";
    header.style.columnGap = "10px";
    header.style.opacity = "0.95";
    header.style.fontWeight = "bold";
    header.style.borderBottom = "1px solid rgba(255,255,255,0.25)";
    header.style.paddingBottom = "6px";
    header.style.marginBottom = "6px";
    header.innerHTML = `<div>Vieta</div><div>Vārds</div><div style="text-align:right;">Laiks</div>`;

    inner.appendChild(header);

    const rows = document.createElement("div");
    rows.id = "rows";
    rows.style.display = "flex";
    rows.style.flexDirection = "column";
    rows.style.gap = "0";
    inner.appendChild(rows);

    el.appendChild(inner);

    // Place as Phaser DOM element
    this._domEl = el;
    this._domWrap = this.add.dom(0, 0, el);
    this._domWrap.setOrigin(0.5);

    // Initial size/position
    this._syncDomTable(this.scale.width, this.scale.height);
  }

  _syncDomTable(W, H) {
    if (!this._domEl || !this._domWrap) return;

    const marginX = Math.max(14, Math.floor(W * 0.04));
    const topY = 142;
    const bottomSpace = 120; // space for the bottom button
    const w = Math.min(560, Math.max(260, W - marginX * 2));
    const h = Math.max(240, Math.min(620, H - topY - bottomSpace));

    this._domEl.style.width = `${w}px`;
    this._domEl.style.height = `${h}px`;

    this._domWrap.setOrigin(0.5);
    this._domWrap.setScrollFactor(0);
    this._domWrap.setPosition(W / 2, topY + h / 2);
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
    if (this._hintText) this._hintText.setVisible(false);

    const cbName = `__fsg_top_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;
    // Avoid cached JSONP responses (incognito vs normal mode issue)
    const url = `${this.API_URL}?action=top&token=${encodeURIComponent(this.TOKEN)}&callback=${cbName}&_=${Date.now()}`;

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
      this._renderDomRows();
      if (this._statusText) this._statusText.setVisible(false);
      if (this._hintText) this._hintText.setVisible(true);
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
      this._statusText.setText("Neizdevās ielādēt TOP").setVisible(true);
    }
    if (this._hintText) this._hintText.setVisible(false);

    // Clear rows if any
    try {
      const rows = this._domEl && this._domEl.querySelector("#rows");
      if (rows) rows.innerHTML = "";
    } catch (e) {}
  }

  _formatTime(sec) {
    const s = Math.max(0, Math.floor(Number(sec) || 0));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  _escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  _renderDomRows() {
    if (!this._domEl) return;
    const rows = this._domEl.querySelector("#rows");
    if (!rows) return;

    rows.innerHTML = "";

    for (let i = 0; i < Math.min(50, this._top.length); i++) {
      const row = this._top[i] || {};
      const rank = i + 1;
      const name = this._escapeHtml(row.name);
      const time = this._formatTime(row.timeSeconds);

      const line = document.createElement("div");
      line.style.display = "grid";
      line.style.gridTemplateColumns = "54px 1fr 74px";
      line.style.columnGap = "10px";
      line.style.alignItems = "center";

      const c1 = document.createElement("div");
      c1.textContent = String(rank);

      const c2 = document.createElement("div");
      c2.textContent = name;
      c2.style.whiteSpace = "nowrap";
      c2.style.overflow = "hidden";
      c2.style.textOverflow = "ellipsis";

      const c3 = document.createElement("div");
      c3.textContent = time;
      c3.style.textAlign = "right";
      c3.style.opacity = "0.95";
      c3.style.fontVariantNumeric = "tabular-nums";

      line.appendChild(c1);
      line.appendChild(c2);
      line.appendChild(c3);

      rows.appendChild(line);
    }
  }

  _makeButton(x, y, w, h, label, color, colorOver) {
    const bg = this.add
      .rectangle(x, y, w, h, color, 1)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const txt = this.add
      .text(x, y, label, {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    const pressIn = () => {
      bg.setFillStyle(colorOver, 1);
      this.tweens.killTweensOf([bg, txt]);
      this.tweens.add({ targets: [bg, txt], scaleX: 0.96, scaleY: 0.96, duration: 70 });
    };
    const pressOut = () => {
      bg.setFillStyle(color, 1);
      this.tweens.killTweensOf([bg, txt]);
      this.tweens.add({ targets: [bg, txt], scaleX: 1.0, scaleY: 1.0, duration: 90 });
    };

    bg.on("pointerdown", pressIn);
    bg.on("pointerup", pressOut);
    bg.on("pointerout", pressOut);
    bg.on("pointercancel", pressOut);

    bg.setLabel = (t) => txt.setText(t);
    return bg;
  }
}