class Finish extends Phaser.Scene {
  constructor() {
    super("Finish");
    this.API_URL = "https://script.google.com/macros/s/AKfycbyh6BcVY_CBPW9v7SNo1bNp_XttvhxpeSdYPfrTdRCD4KWXLeLvv-0S3p96PX0Dv5BnrA/exec";
    this.TOKEN = "FIRE2025";

    this.result = { reason: "exit", timeSec: null };

    this._saved = false;
    this._nameInput = null;
    this._cleanupBound = null;
  }

  init(data) {
    this.result = data || { reason: "exit", timeSec: null };
    this._saved = false;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // Ensure cleanup always runs
    this._cleanupBound = () => this.cleanup();
    this.events.once("shutdown", this._cleanupBound);
    this.events.once("destroy", this._cleanupBound);

    // dark overlay
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.55);

    const success = this.result.reason === "success" && typeof this.result.timeSec === "number";

    const title = success ? "MISIJA IR IZPILDĪTA!" : "MISIJA NAV IZPILDĪTA!";
    this.add.text(W/2, 64, title, {
      fontFamily: "Arial",
      fontSize: "34px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    if (success) {
      this.add.text(W/2, 102, `Tavs laiks: ${this.formatTime(this.result.timeSec)}`, {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#ffffff",
        fontStyle: "bold"
      }).setOrigin(0.5);
    } else {
      const sub = (this.result.reason === "timeout") ? "Laiks beidzies (15 min)." : "Iziets no spēles.";
      this.add.text(W/2, 104, sub, {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#ffffff"
      }).setOrigin(0.5);
    }

    // Buttons row at bottom
    const btnY = H - 70;
    const btnW = Math.min(170, (W - 70) / 2);
    const btnH = 54;

    const btnMenu = this.makeButton(W/2 - btnW/2 - 10, btnY, btnW, btnH, "UZ MENU", 0x1f3e62, 0x2a537f);
    btnMenu.on("pointerup", () => this.scene.start("MainMenu"));

    const btnTop = this.makeButton(W/2 + btnW/2 + 10, btnY, btnW, btnH, "TOP 50", 0x1f3a52, 0x24455f);
    btnTop.on("pointerup", () => this.scene.start("Score"));

    // Save UI only on success
    if (success) {
      const y = 155;

      this._msg = this.add.text(W/2, y, "Ieraksti vārdu un saglabā rezultātu", {
        fontFamily:"Arial",
        fontSize:"15px",
        color:"#ffffff"
      }).setOrigin(0.5);

      this.createNameInput(W/2 - 90, y + 42, 180, 36);

      this._btnSave = this.makeButton(W/2 + 90 + 68, y + 42, 120, 36, "Saglabāt", 0x2c4d72, 0x35618f);
      this._btnSave.on("pointerup", () => this.submitScore());
    } else {
      this.add.text(W/2, 150, "Rezultātu var saglabāt tikai pēc veiksmīgas misijas.", {
        fontFamily:"Arial",
        fontSize:"14px",
        color:"#ffffff",
        alpha: 0.85
      }).setOrigin(0.5);
    }
  }

  createNameInput(x, y, w, h) {
    // DOM input for mobile keyboard
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Vārds";
    input.maxLength = 28;
    input.autocomplete = "off";
    input.autocapitalize = "words";
    input.spellcheck = false;
    input.value = "";

    input.style.position = "fixed";
    input.style.left = "0px";
    input.style.top = "0px";
    input.style.width = `${w}px`;
    input.style.height = `${h}px`;
    input.style.padding = "0 10px";
    input.style.borderRadius = "10px";
    input.style.border = "1px solid rgba(255,255,255,0.25)";
    input.style.background = "rgba(0,0,0,0.25)";
    input.style.color = "#fff";
    input.style.fontSize = "18px";
    input.style.outline = "none";

    document.body.appendChild(input);
    this._nameInput = input;

    // Place it over canvas coordinates
    const syncPos = () => {
      if (!this._nameInput) return;
      const canvas = this.sys.game.canvas;
      const rect = canvas.getBoundingClientRect();
      const localX = x - w/2;
      const localY = y - h/2;
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

    syncPos();
    // No resize handlers here (mobile safe). We only update position on each frame while alive.
    this.events.on("postupdate", syncPos);
  }

  async submitScore() {
    if (this._saved) return;
    if (!this._nameInput) return;

    const name = String(this._nameInput.value || "").trim().replace(/\s+/g, " ").slice(0, 28);
    if (!name) {
      if (this._msg) this._msg.setText("Ieraksti vārdu.");
      return;
    }

    const timeSec = Number(this.result.timeSec);
    if (!Number.isFinite(timeSec) || timeSec <= 0) return;

    // Lock UI
    this._saved = true;
    if (this._btnSave) this._btnSave.disableInteractive();
    if (this._msg) this._msg.setText("Saglabā...");

    try {
      const url = `${this.API_URL}?action=submit&token=${encodeURIComponent(this.TOKEN)}&name=${encodeURIComponent(name)}&time=${encodeURIComponent(timeSec)}`;
      const resp = await this.jsonp(url);
      if (resp && resp.ok) {
        if (this._msg) this._msg.setText("Saglabāts ✓");
        if (this._nameInput) this._nameInput.disabled = true;
        if (this._btnSave) this._btnSave.setLabel("Saglabāts ✓");
      } else {
        this._saved = false;
        if (this._msg) this._msg.setText((resp && resp.error) ? resp.error : "Neizdevās saglabāt.");
        if (this._btnSave) this._btnSave.setLabel("Saglabāt");
        if (this._btnSave) this._btnSave.setInteractive({ useHandCursor:true });
      }
    } catch (e) {
      this._saved = false;
      if (this._msg) this._msg.setText("Neizdevās saglabāt (tīkls).");
      if (this._btnSave) this._btnSave.setLabel("Saglabāt");
      if (this._btnSave) this._btnSave.setInteractive({ useHandCursor:true });
    }
  }

  cleanup() {
    try {
      if (this._nameInput) {
        this._nameInput.remove();
        this._nameInput = null;
      }
    } catch(e) {}
  }

  jsonp(url) {
    return new Promise((resolve, reject) => {
      const cb = `cb_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
      const script = document.createElement("script");

      const cleanup = () => {
        try { delete window[cb]; } catch(e) { window[cb] = undefined; }
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
    const bg = this.add.rectangle(x, y, w, h, color, 0.95).setOrigin(0.5);
    const txt = this.add.text(x, y, label, {
      fontFamily: "Arial",
      fontSize: (h >= 50 ? "18px" : "16px"),
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0x000000, 0)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    hit.on("pointerover", () => bg.setFillStyle(colorOver, 0.98));
    hit.on("pointerout", () => bg.setFillStyle(color, 0.95));
    hit.on("pointerdown", () => { bg.setFillStyle(colorOver, 1); txt.setScale(0.98); });
    hit.on("pointerup", () => { bg.setFillStyle(colorOver, 0.98); txt.setScale(1.0); });

    hit.setLabel = (t) => txt.setText(t);
    return hit;
  }
}
