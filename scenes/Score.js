class Score extends Phaser.Scene {
  constructor() {
    super("Score");
    this.API_URL = "https://script.google.com/macros/s/AKfycbyh6BcVY_CBPW9v7SNo1bNp_XttvhxpeSdYPfrTdRCD4KWXLeLvv-0S3p96PX0Dv5BnrA/exec";
    this._top = [];
    this._scrollY = 0;
    this._contentH = 0;
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;

    // dark overlay
    this.add.rectangle(W/2, H/2, W, H, 0x000000, 0.55);

    this.add.text(W/2, 60, "TOP 50", {
      fontFamily: "Arial",
      fontSize: "34px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    this._status = this.add.text(W/2, 105, "Ielādē rezultātu tabulu...", {
      fontFamily: "Arial",
      fontSize: "16px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    // table viewport
    const pad = 26;
    const tableTop = 140;
    const tableBottom = H - 150;
    this._viewX = pad;
    this._viewY = tableTop;
    this._viewW = W - pad*2;
    this._viewH = Math.max(220, tableBottom - tableTop);

    // header
    const headerH = 36;
    this.add.rectangle(W/2, this._viewY + headerH/2, this._viewW, headerH, 0x000000, 0.35);

    const colRank = this._viewX + 14;
    const colName = this._viewX + 90;
    const colTime = this._viewX + this._viewW - 14;

    const hStyle = { fontFamily:"Arial", fontSize:"16px", color:"#ffffff", fontStyle:"bold" };
    this.add.text(colRank, this._viewY + 8, "Vieta", hStyle).setOrigin(0,0);
    this.add.text(colName, this._viewY + 8, "Vārds", hStyle).setOrigin(0,0);
    this.add.text(colTime, this._viewY + 8, "Laiks", hStyle).setOrigin(1,0);

    // content container (rows)
    this._rowsCont = this.add.container(this._viewX, this._viewY + headerH);

    // mask for rows (exclude header)
    const g = this.make.graphics();
    g.fillStyle(0xffffff);
    g.fillRect(this._viewX, this._viewY + headerH, this._viewW, this._viewH - headerH);
    const mask = g.createGeometryMask();
    this._rowsCont.setMask(mask);
    g.destroy();

    // buttons
    this._btnMenu = this.makeBigButton(W/2, H - 70, "UZ MENU", 0x1f3e62, 0x2a537f);
    this._btnMenu.on("pointerup", () => this.scene.start("MainMenu"));

    // scrolling
    this.enableScroll();

    // load
    this.loadTop();
  }

  enableScroll() {
    // wheel (desktop)
    this.input.on("wheel", (pointer, gx, gy, dx, dy) => {
      this.scrollBy(dy);
    });

    // drag (mobile)
    this.input.on("pointerdown", (p) => {
      this._dragging = true;
      this._dragStartY = p.y;
      this._dragStartScroll = this._scrollY;
    });
    this.input.on("pointerup", () => { this._dragging = false; });
    this.input.on("pointerout", () => { this._dragging = false; });
    this.input.on("pointermove", (p) => {
      if (!this._dragging) return;
      const dy = p.y - this._dragStartY;
      this._scrollY = this._dragStartScroll + dy;
      this.clampScroll();
      this.applyScroll();
    });
  }

  scrollBy(delta) {
    // positive delta scrolls down (content up)
    this._scrollY -= delta * 0.35;
    this.clampScroll();
    this.applyScroll();
  }

  clampScroll() {
    const minY = Math.min(0, (this._viewH - 36) - this._contentH);
    if (this._scrollY < minY) this._scrollY = minY;
    if (this._scrollY > 0) this._scrollY = 0;
  }

  applyScroll() {
    this._rowsCont.y = (this._viewY + 36) + this._scrollY;
  }

  async loadTop() {
    this._status.setText("Ielādē rezultātu tabulu...");
    this._status.setColor("#ffffff");
    try {
      const top = await this.jsonp(`${this.API_URL}?action=top`);
      if (!Array.isArray(top)) throw new Error("bad response");
      // Clean invalid rows
      const clean = top.filter(r => {
        const t = Number(r && r.time);
        const name = (r && r.name != null) ? String(r.name).trim() : "";
        return Number.isFinite(t) && t > 0 && name.length > 0;
      }).map((r, i) => ({ rank: i+1, name: String(r.name), time: Number(r.time) }));
      this._top = clean;
      this._status.setText("");
      this.buildRows();
    } catch (e) {
      this._top = [];
      this._status.setText("Neizdevās ielādēt TOP (pārbaudi deploy).");
      this._status.setColor("#ffb3b3");
      this.buildRows();
    }
  }

  buildRows() {
    this._rowsCont.removeAll(true);
    const rowH = 34;
    const colRank = 14;
    const colName = 90;
    const colTime = this._viewW - 14;

    const normal = { fontFamily:"Arial", fontSize:"16px", color:"#ffffff" };

    for (let i=0;i<this._top.length;i++) {
      const r = this._top[i];
      const y = i * rowH;

      // subtle stripe
      if (i % 2 === 1) {
        const bg = this.add.rectangle(this._viewW/2, y + rowH/2, this._viewW, rowH, 0x000000, 0.18);
        bg.setOrigin(0.5);
        this._rowsCont.add(bg);
      }

      const tRank = this.add.text(colRank, y + 7, String(r.rank), normal).setOrigin(0,0);
      const tName = this.add.text(colName, y + 7, r.name, normal).setOrigin(0,0);
      const tTime = this.add.text(colTime, y + 7, this.formatTime(r.time), normal).setOrigin(1,0);

      this._rowsCont.add([tRank, tName, tTime]);
    }

    this._contentH = this._top.length * rowH;
    this._scrollY = 0;
    this.applyScroll();
  }

  formatTime(sec) {
    const s = Math.max(0, Math.floor(sec));
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
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

  makeBigButton(x, y, label, color, colorOver) {
    const w = Math.min(320, this.scale.width - 60);
    const h = 54;
    const bg = this.add.rectangle(x, y, w, h, color, 0.95).setOrigin(0.5);
    const txt = this.add.text(x, y, label, {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const hit = this.add.rectangle(x, y, w, h, 0x000000, 0).setOrigin(0.5).setInteractive({ useHandCursor: true });

    hit.on("pointerover", () => bg.setFillStyle(colorOver, 0.98));
    hit.on("pointerout", () => bg.setFillStyle(color, 0.95));

    return hit;
  }
}