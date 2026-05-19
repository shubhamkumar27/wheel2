import QRCode from 'qrcode';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WheelEntry {
  id: string;
  name: string;
  color: string;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  angle: number;
  spin: number;
  alive: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const COLORS: string[] = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#ef4444', '#3b82f6', '#10b981',
  '#f97316', '#a855f7', '#06b6d4', '#84cc16',
  '#e11d48', '#7c3aed', '#0ea5e9', '#16a34a',
];

const PAGE_URL = 'https://shubhamkumar27.github.io/wheel2/';
// Custom domain alias: http://shubhamkumar.tech/wheel2/

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ─── Wheel App ───────────────────────────────────────────────────────────────

class WheelApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private confettiCanvas: HTMLCanvasElement;
  private confettiCtx: CanvasRenderingContext2D;

  private entries: WheelEntry[] = [];
  private rotation = 0;          // current visual rotation (radians)
  private isSpinning = false;
  private winner: WheelEntry | null = null;
  private confetti: ConfettiParticle[] = [];
  private confettiRaf = 0;

  constructor() {
    this.canvas = document.getElementById('wheel') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.confettiCanvas = document.getElementById('confettiCanvas') as HTMLCanvasElement;
    this.confettiCtx = this.confettiCanvas.getContext('2d')!;

    this.resizeCanvas();
    this.setupEvents();
    this.generateQR();
    this.render();

    window.addEventListener('resize', () => {
      this.resizeCanvas();
      this.resizeConfettiCanvas();
    });
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  private resizeCanvas(): void {
    const el = document.getElementById('wheelWrap')!;
    const size = Math.min(el.offsetWidth, 520);
    this.canvas.width = size;
    this.canvas.height = size;
    this.render();
  }

  private resizeConfettiCanvas(): void {
    this.confettiCanvas.width = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
  }

  private setupEvents(): void {
    const input = document.getElementById('nameInput') as HTMLInputElement;
    const addBtn = document.getElementById('addBtn') as HTMLButtonElement;
    const spinBtn = document.getElementById('spinBtn') as HTMLButtonElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    const closeWinner = document.getElementById('closeWinner') as HTMLButtonElement;

    const addName = () => {
      const name = input.value.trim();
      if (!name) return;
      if (this.entries.some(e => e.name.toLowerCase() === name.toLowerCase())) {
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
        this.showToast('That name is already on the wheel!');
        return;
      }
      if (this.entries.length >= 100) {
        this.showToast('Maximum 100 participants reached.');
        return;
      }
      this.addEntry(name);
      input.value = '';
      input.focus();
    };

    addBtn.addEventListener('click', addName);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') addName(); });
    spinBtn.addEventListener('click', () => this.spin());
    resetBtn.addEventListener('click', () => this.reset());
    closeWinner.addEventListener('click', () => {
      document.getElementById('winnerOverlay')!.classList.add('hidden');
    });
  }

  private async generateQR(): Promise<void> {
    const qrCanvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
    try {
      await QRCode.toCanvas(qrCanvas, PAGE_URL, {
        width: 160,
        margin: 1,
        color: { dark: '#0d0d1a', light: '#ffffff' },
      });
    } catch (err) {
      console.error('QR generation failed:', err);
    }
  }

  // ── Entries ───────────────────────────────────────────────────────────────

  addEntry(name: string): void {
    const color = COLORS[this.entries.length % COLORS.length];
    this.entries.push({ id: crypto.randomUUID(), name, color });
    this.updateList();
    this.render();
    this.syncSpinButton();
  }

  removeEntry(id: string): void {
    this.entries = this.entries.filter(e => e.id !== id);
    this.updateList();
    this.render();
    this.syncSpinButton();
  }

  private updateList(): void {
    const list = document.getElementById('namesList')!;
    const count = document.getElementById('count')!;
    count.textContent = `${this.entries.length} participant${this.entries.length !== 1 ? 's' : ''}`;

    list.innerHTML = this.entries.map(e => `
      <div class="name-item" style="border-left:3px solid ${e.color}">
        <span class="dot" style="background:${e.color}"></span>
        <span class="label">${escapeHtml(e.name)}</span>
        <button class="rm" onclick="wheel.removeEntry('${e.id}')" title="Remove">×</button>
      </div>
    `).join('');
  }

  private syncSpinButton(): void {
    const btn = document.getElementById('spinBtn') as HTMLButtonElement;
    btn.disabled = this.entries.length < 2 || this.isSpinning;
  }

  // ── Spin ──────────────────────────────────────────────────────────────────

  spin(): void {
    if (this.isSpinning || this.entries.length < 2) return;

    this.isSpinning = true;
    this.winner = null;
    document.getElementById('winnerOverlay')!.classList.add('hidden');
    this.syncSpinButton();

    const n = this.entries.length;
    const winnerIndex = Math.floor(Math.random() * n);
    const sliceAngle = (2 * Math.PI) / n;

    // We want winnerIndex slice to stop under the pointer (top = -π/2 offset).
    // After rotation r (from start), the slice i occupies [i·s - π/2 + r … (i+1)·s - π/2 + r].
    // We want the pointer (at 0 visually = top) to sit in the middle of winnerIndex slice.
    // Solving: winnerIndex·s + s/2 - π/2 + r ≡ 0 (mod 2π)
    // → r = π/2 - winnerIndex·s - s/2  (mod 2π)
    const baseTarget = Math.PI / 2 - winnerIndex * sliceAngle - sliceAngle / 2;
    const normalised = ((baseTarget % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const spins = 6 + Math.random() * 4;
    const target = normalised + spins * 2 * Math.PI;

    const start = this.rotation;
    const delta = target - (start % (2 * Math.PI));
    const finalTarget = start + delta + (spins - 1) * 2 * Math.PI;

    const duration = 4500 + Math.random() * 1500;
    const t0 = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      this.rotation = start + easeOutCubic(p) * (finalTarget - start);
      this.render();
      if (p < 1) {
        requestAnimationFrame(tick);
      } else {
        this.rotation = finalTarget;
        this.isSpinning = false;
        this.winner = this.entries[winnerIndex];
        this.showWinner();
        this.launchConfetti();
        this.syncSpinButton();
        this.render();
      }
    };

    requestAnimationFrame(tick);
  }

  private showWinner(): void {
    if (!this.winner) return;
    const overlay = document.getElementById('winnerOverlay')!;
    const nameEl = document.getElementById('winnerName')!;
    const borderEl = document.getElementById('winnerCard')!;
    nameEl.textContent = this.winner.name;
    borderEl.style.borderColor = this.winner.color;
    (borderEl.querySelector('.trophy') as HTMLElement).style.color = this.winner.color;
    overlay.classList.remove('hidden');
  }

  reset(): void {
    this.entries = [];
    this.winner = null;
    this.rotation = 0;
    this.isSpinning = false;
    this.updateList();
    this.syncSpinButton();
    this.render();
    document.getElementById('winnerOverlay')!.classList.add('hidden');
  }

  // ── Confetti ──────────────────────────────────────────────────────────────

  private launchConfetti(): void {
    this.confetti = [];
    this.resizeConfettiCanvas();
    for (let i = 0; i < 140; i++) {
      this.confetti.push({
        x: Math.random() * window.innerWidth,
        y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 7,
        vy: Math.random() * 4 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 10 + 5,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25,
        alive: true,
      });
    }
    cancelAnimationFrame(this.confettiRaf);
    this.tickConfetti();
  }

  private tickConfetti(): void {
    const ctx = this.confettiCtx;
    const W = this.confettiCanvas.width;
    const H = this.confettiCanvas.height;
    ctx.clearRect(0, 0, W, H);

    let anyAlive = false;
    for (const p of this.confetti) {
      if (!p.alive) continue;
      p.vy += 0.25;
      p.x += p.vx;
      p.y += p.vy;
      p.angle += p.spin;
      if (p.y > H + 20) { p.alive = false; continue; }
      anyAlive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.9;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }

    if (anyAlive) {
      this.confettiRaf = requestAnimationFrame(() => this.tickConfetti());
    } else {
      ctx.clearRect(0, 0, W, H);
    }
  }

  // ── Toast ─────────────────────────────────────────────────────────────────

  private showToast(msg: string): void {
    const t = document.getElementById('toast')!;
    t.textContent = msg;
    t.classList.remove('hidden');
    t.classList.add('show');
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.classList.add('hidden'), 300);
    }, 2500);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private render(): void {
    const { canvas, ctx } = this;
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const r = Math.min(cx, cy) - 12;

    ctx.clearRect(0, 0, W, H);

    // ── Glow ring ──
    const glow = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 22);
    glow.addColorStop(0, 'rgba(99,102,241,0.35)');
    glow.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, r + 22, 0, 2 * Math.PI);
    ctx.fillStyle = glow;
    ctx.fill();

    const n = this.entries.length;

    if (n === 0) {
      // Empty state
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = '#1a1a2e';
      ctx.fill();
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#6366f1';
      ctx.font = `bold ${Math.round(r * 0.13)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Add names', cx, cy - r * 0.1);
      ctx.font = `${Math.round(r * 0.11)}px Inter, sans-serif`;
      ctx.fillStyle = '#8b8fc7';
      ctx.fillText('to get started', cx, cy + r * 0.1);

      this.drawPointer(cx, cy, r);
      return;
    }

    const sliceAngle = (2 * Math.PI) / n;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation - Math.PI / 2);

    this.entries.forEach((entry, i) => {
      const sa = i * sliceAngle;
      const ea = sa + sliceAngle;

      // Fill
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, sa, ea);
      ctx.closePath();
      ctx.fillStyle = entry.color;
      ctx.fill();

      // Edge
      ctx.strokeStyle = 'rgba(13,13,26,0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate(sa + sliceAngle / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(9, Math.min(15, r * 0.09 - n * 0.15));
      ctx.font = `bold ${fontSize}px Inter, sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#fff';

      const maxChars = Math.max(4, Math.floor(r / 10 - n * 0.2));
      let label = entry.name;
      if (label.length > maxChars) label = label.slice(0, maxChars - 1) + '…';
      ctx.fillText(label, r * 0.87, 0);
      ctx.restore();
    });

    // Hub
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.09, 0, 2 * Math.PI);
    const hub = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.09);
    hub.addColorStop(0, '#a78bfa');
    hub.addColorStop(1, '#6366f1');
    ctx.fillStyle = hub;
    ctx.fill();
    ctx.strokeStyle = '#0d0d1a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.restore();

    this.drawPointer(cx, cy, r);
  }

  private drawPointer(cx: number, _cy: number, r: number): void {
    const { ctx } = this;
    const tip = 10;
    const base = tip + 28;
    const half = 11;

    ctx.save();
    ctx.translate(cx, tip);

    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    ctx.lineTo(0, base);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, base);
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(1, '#ec4899');
    ctx.fillStyle = grad;
    ctx.shadowColor = 'rgba(244,63,94,0.7)';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
    void r; // suppress unused warning
  }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

const wheel = new WheelApp();
(window as unknown as Record<string, unknown>).wheel = wheel;
