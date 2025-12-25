class Finish extends Phaser.Scene {
  constructor() {
    super("Finish");
    this.API_URL = "https://script.google.com/macros/s/AKfycbyh6BcVY_CBPW9v7SNo1bNp_XttvhxpeSdYPfrTdRCD4KWXLeLvv-0S3p96PX0Dv5BnrA/exec";
    this.TOKEN = "FIRE2025";

    this._data = null;
    this._saved = false;
    this._nameInput = null;
    this._syncPos = null;
    this._onResize = null;

    this._msgText = null;
    this._saveBtn = null;
  }

  init(data) {
    this._data = data || {};
    this._saved = false;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    const reason = String(this._data.reason || "exit");
    const success = reason === "success";
    const elapsedMs = Number(this._data.elapsedMs);
    const timeSec = success && Number.isFinite(elapsedMs) ? Math.max(1, Math.round(elapsedMs / 1000)) : null;

    this.events.once("shutdown", this.cleanup, this);
    this.events.once("destroy", this.cleanup, this);

    // Background like MainMenu/Score
    this.cameras.main.setBackgroundColor("#101a24");

    this._addTopExitButton();

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
    this._onResize = (gameSize) => applyBg(gameSize.width, gameSize.height);
    this.scale.on("resize", this._onResize);

    // Title
    const title = success ? "MISIJA IR IZPILDĪTA!" : "MISIJA NAV IZPILDĪTA!";
    this.add
      .text(W / 2, 64, title, {
        fontFamily: "Arial",
        fontSize: "34px",
        color: "#ffffff",
        fontStyle: "bold"
      })
      .setOrigin(0.5);

    // Subtitle
    if (success) {
      this.add
        .text(W / 2, 106, `Tavs laiks: ${this.formatTime(timeSec)}`, {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#ffffff",
          fontStyle: "bold"
        })
        .setOrigin(0.5);
    } else {
      const sub = reason === "timeout" ? "Laiks beidzies (15 min.)" : "Iziets no spēles";
      this.add
        .text(W / 2, 108, sub, {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#ffffff",
          alpha: 0.95
        })
        .setOrigin(0.5);
    }

    // Panel
    const panelW = Math.min(420, W - 44);
    const panelH = Math.min(300, H - 240);
    const panelTop = 142;

    // Shared button size/style (match Score/MainMenu sizing)
    const btnW = Math.min(260, W - 80);
    const btnH = 58;

    const panel = this.add.rectangle(W / 2, panelTop + panelH / 2, panelW, panelH, 0x000000, 0.25);
if (success) {
      this._msgText = this.add
        .text(W / 2, panelTop + 26, "Ieraksti vārdu un saglabā rezultātu", {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          alpha: 0.95,
          align: "center",
          wordWrap: { width: panelW - 28 }
        })
        .setOrigin(0.5);

      const inputY = panelTop + 92;
      this.createNameInput(W / 2, inputY, Math.min(280, panelW - 60), 44);

      const saveY = panelTop + 160;
      this._saveBtn = this.makeButton(W / 2, saveY, btnW, btnH, "SAGLABĀT", 0x5a5a5a, 0x6a6a6a);
      this._saveBtn.on("pointerup", () => this.submitScore(timeSec));
    } else {
      this._msgText = this.add
        .text(W / 2, panelTop + 26, "Rezultātu var saglabāt tikai pēc veiksmīgas misijas.", {
          fontFamily: "Arial",
          fontSize: "16px",
          color: "#ffffff",
          alpha: 0.95,
          align: "center",
          wordWrap: { width: panelW - 28 }
        })
        .setOrigin(0.5);
    }

    // Bottom button: MENU
    const btnY = H - 72;
    const btnMenu = this.makeButton(W / 2, btnY, btnW, btnH, "MENU", 0x5a5a5a, 0x6a6a6a);
    btnMenu.on("pointerup", () => this.scene.start("MainMenu"));
  }

  createNameInput(centerX, centerY, w, h) {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Vārds";
    input.maxLength = 28;
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;

    input.style.position = "fixed";
    input.style.left = "0px";
    input.style.top = "0px";
    input.style.width = `${w}px`;
    input.style.height = `${h}px`;
    input.style.padding = "0 12px";
    input.style.borderRadius = "10px";
    input.style.border = "1px solid rgba(255,255,255,0.25)";
    input.style.background = "rgba(0,0,0,0.30)";
    input.style.color = "#fff";
    input.style.fontSize = "18px";
    input.style.outline = "none";

    document.body.appendChild(input);
    this._nameInput = input;

    const syncPos = () => {
      if (!this._nameInput) return;
      const rect = this.sys.game.canvas.getBoundingClientRect();

      const localX = centerX - w / 2;
      const localY = centerY - h / 2;

      const cssX = rect.left + (localX / this.scale.width) * rect.width;
      const cssY = rect.top + (localY / this.scale.height) * rect.height;
      const cssW = (w / this.scale.width) * rect.width;
      const cssH = (h / this.scale.height) * rect.height;

      input.style.left = `${Math.round(cssX)}px`;
      input.style.top = `${Math.round(cssY)}px`;
      input.style.width = `${Math.round(cssW)}px`;
      input.style.height = `${Math.round(cssH)}px`;
      input.style.lineHeight = `${Math.round(cssH)}px`;
    };

    this._syncPos = syncPos;
    syncPos();
    this.events.on("postupdate", syncPos);
  }

  async submitScore(timeSec) {
    if (this._saved) return;
    if (!this._nameInput) return;

    const name = String(this._nameInput.value || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 28);

    if (!name) {
      if (this._msgText) this._msgText.setText("Ieraksti vārdu.");
      return;
    }

    this._saved = true;

    try { this._nameInput.disabled = true; } catch (e) {}
    if (this._saveBtn) this._saveBtn.disableInteractive();
    if (this._msgText) this._msgText.setText("Saglabā...");

    try {
      const base = `${this.API_URL}?action=submit&token=${encodeURIComponent(this.TOKEN)}&name=${encodeURIComponent(name)}&time=${encodeURIComponent(timeSec)}`;
      const resp = await this.jsonp(base);

      if (resp && resp.ok) {
        if (this._msgText) this._msgText.setText("Saglabāts ✓");
        if (this._saveBtn) this._saveBtn.setLabel("SAGLABĀTS ✓");
      } else {
        this._saved = false;
        try { this._nameInput.disabled = false; } catch (e) {}
        if (this._saveBtn) {
          this._saveBtn.setLabel("SAGLABĀT");
          this._saveBtn.setInteractive({ useHandCursor: true });
        }
        if (this._msgText) this._msgText.setText((resp && resp.error) ? resp.error : "Neizdevās saglabāt.");
      }
    } catch (e) {
      this._saved = false;
      try { this._nameInput.disabled = false; } catch (e2) {}
      if (this._saveBtn) {
        this._saveBtn.setLabel("SAGLABĀT");
        this._saveBtn.setInteractive({ useHandCursor: true });
      }
      if (this._msgText) this._msgText.setText("Neizdevās saglabāt (tīkls).");
    }
  }

  cleanup() {
    try {
      if (this._onResize) this.scale.off("resize", this._onResize);
      this._onResize = null;
    } catch (e) {}

    // critical for second runs
    try {
      if (this._syncPos) this.events.off("postupdate", this._syncPos);
      this._syncPos = null;
    } catch (e) {}

    try {
      if (this._nameInput) this._nameInput.remove();
      this._nameInput = null;
    } catch (e) {}
  }

  jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = `cb_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
      const script = document.createElement("script");

      const cleanup = () => {
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error("timeout"));
      }, 12000);

      window[cb] = (data) => {
        clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        clearTimeout(timer);
        cleanup();
        reject(new Error("load error"));
      };

      const sep = url.includes("?") ? "&" : "?";
      script.src = `${url}${sep}callback=${cb}`;
      document.body.appendChild(script);
    });
  }

  formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }

  makeButton(x, y, w, h, label, color, colorOver) {
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
