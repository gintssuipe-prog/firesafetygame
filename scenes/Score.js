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

    this._addTopExitButton();

    // Background like MainMenu/Finish
    const bg = this.add.image(0, 0, "intro_bg").setOrigin(0.5).setAlpha(0.12);
    const g = this.add.graphics();

    const applyBg = (w, h) => {
      bg.setPosition(w / 2, h / 2);
      const s = Math.max(w / bg.width, h / bg.height);
      bg.setScale(s);

      g.clear();
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

    // Bottom button: MENU (grey, no frame)
    const btnW = Math.min(260, W - 80);
    const btnH = 58;
    const btnY = H - 72;
    const btnMenu = this._makeButton(W / 2, btnY, btnW, btnH, "MENU", 0x5a5a5a, 0x6a6a6a);
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

    this._lastW = 0;
    this._lastH = 0;
  }

  _createDomTable() {
  // Scrollable wrapper (no background)
  const el = document.createElement("div");
  el.style.overflowY = "auto";
  el.style.overflowX = "hidden";
  el.style.webkitOverflowScrolling = "touch";
  el.style.background = "transparent";
  el.style.padding = "0";
  el.style.margin = "0";
  el.style.boxSizing = "border-box";

  // Make it look like a clean table, but still very compatible.
  const table = document.createElement("table");
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.tableLayout = "fixed";
  table.style.fontFamily = "Arial, sans-serif";
  table.style.fontSize = "16px";
  table.style.lineHeight = "1.35";
  table.style.color = "#ffffff";

  const thead = document.createElement("thead");
  const trh = document.createElement("tr");

  const thPos = document.createElement("th");
  thPos.textContent = "Vieta";
  thPos.style.width = "56px";
  const thName = document.createElement("th");
  thName.textContent = "Vārds";
  const thTime = document.createElement("th");
  thTime.textContent = "Laiks";
  thTime.style.width = "76px";

  for (const th of [thPos, thName, thTime]) {
    th.style.textAlign = "left";
    th.style.fontWeight = "bold";
    th.style.padding = "6px 6px";
    th.style.opacity = "0.95";
    th.style.borderBottom = "1px solid rgba(255,255,255,0.28)";
    th.style.whiteSpace = "nowrap";
    th.style.overflow = "hidden";
    th.style.textOverflow = "ellipsis";
  }

  trh.appendChild(thPos);
  trh.appendChild(thName);
  trh.appendChild(thTime);
  thead.appendChild(trh);

  const tbody = document.createElement("tbody");
  tbody.id = "rows";

  table.appendChild(thead);
  table.appendChild(tbody);
  el.appendChild(table);

  this._domEl = el;
  this._domWrap = this.add.dom(0, 0, el);
  this._domWrap.setOrigin(0.5);
  this._domWrap.setScrollFactor(0);

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
  // Two-step JSONP load:
  // 1) try WITHOUT cache-buster (some browsers/privacy modes behave better)
  // 2) if no response -> retry WITH cache-buster (fixes stale cache issues)
  this._loadTopAttempt(false, 1);
}

_loadTopAttempt(useCacheBuster, attemptNo) {
  this._cleanupJsonp();

  if (this._statusText) {
    const suffix = attemptNo === 2 ? " (2/2)" : "";
    this._statusText.setText(`Ielādē rezultātu tabulu…${suffix}`).setVisible(true);
  }
  if (this._hintText) this._hintText.setVisible(false);

  const cbName = `__fsg_top_${Date.now()}_${Math.floor(Math.random() * 1e9)}`;

  let url = `${this.API_URL}?action=top&token=${encodeURIComponent(this.TOKEN)}&callback=${cbName}`;
  if (useCacheBuster) {
    url += `&_=${Date.now()}`;
  }

  const script = document.createElement("script");
  script.src = url;
  script.async = true;

  const cleanup = () => {
    try { delete window[cbName]; } catch (e) {}
    try { script.remove(); } catch (e) {}
  };

  // Keep handle so we can clean on scene destroy
  this._jsonpCleanup = cleanup;

  window[cbName] = (payload) => {
    this._cleanupJsonp();

    if (!payload || payload.ok === false || !Array.isArray(payload.data)) {
      // If first attempt fails, retry once with cache-buster
      if (attemptNo === 1) return this._loadTopAttempt(true, 2);
      return this._showError();
    }

    this._top = payload.data || [];
    this._renderDomRows();
    if (this._statusText) this._statusText.setVisible(false);
    if (this._hintText) this._hintText.setVisible(true);
  };

  script.onerror = () => {
    this._cleanupJsonp();
    if (attemptNo === 1) return this._loadTopAttempt(true, 2);
    this._showError();
  };

  document.body.appendChild(script);

  // Timeout -> retry with cache-buster once
  this._jsonpTimeout = setTimeout(() => {
    this._cleanupJsonp();
    if (attemptNo === 1) return this._loadTopAttempt(true, 2);
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

    const tr = document.createElement("tr");

    const tdPos = document.createElement("td");
    tdPos.textContent = String(rank);

    const tdName = document.createElement("td");
    tdName.innerHTML = name; // already escaped
    tdName.style.whiteSpace = "nowrap";
    tdName.style.overflow = "hidden";
    tdName.style.textOverflow = "ellipsis";

    const tdTime = document.createElement("td");
    tdTime.textContent = time;
    tdTime.style.textAlign = "right";

    for (const td of [tdPos, tdName, tdTime]) {
      td.style.padding = "6px 6px";
      td.style.borderBottom = "1px solid rgba(255,255,255,0.14)";
      td.style.opacity = "0.95";
      td.style.verticalAlign = "middle";
    }

    tr.appendChild(tdPos);
    tr.appendChild(tdName);
    tr.appendChild(tdTime);
    rows.appendChild(tr);
  }
}



update() {
  // Some mobile browsers change viewport without firing Phaser resize reliably (address bar / keyboard).
  // Keep DOM table synced with current canvas size.
  const W = this.scale.width;
  const H = this.scale.height;
  if (this._lastW !== W || this._lastH !== H) {
    this._lastW = W;
    this._lastH = H;
    this._syncDomTable(W, H);
    if (this._statusText) this._statusText.setPosition(W / 2, 108);
    if (this._hintText) this._hintText.setPosition(W / 2, 108);
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

  _addTopExitButton() {
    const pad = 10;
    const w = 62;
    const h = 28;
    const x = pad + w / 2;
    const y = pad + h / 2;

    const bg = this.add.rectangle(x, y, w, h, 0xd10000, 1)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(x, y, "EXIT", {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10000);

    const pressIn = () => bg.setFillStyle(0xff1a1a, 1);
    const pressOut = () => bg.setFillStyle(0xd10000, 1);

    const doExit = () => {
      try { window.close(); } catch (e) {}
      setTimeout(() => {
        try { this.scene.start("BadExit"); } catch (e) {}
      }, 150);
    };

    bg.on("pointerdown", pressIn);
    bg.on("pointerup", () => { pressOut(); doExit(); });
    bg.on("pointerout", pressOut);
    bg.on("pointercancel", pressOut);
  }

}