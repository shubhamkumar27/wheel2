import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, remove, set, get } from 'firebase/database';
import QRCode from 'qrcode';
import { firebaseConfig } from './firebase-config';

// ── Types ────────────────────────────────────────────────────────────────────

interface WheelEntry { id: string; name: string; color: string; }
interface DbEntry    { name: string; joinedAt: number; }
type Particle = {
  x: number; y: number; vx: number; vy: number;
  color: string; size: number; angle: number; spin: number; alive: boolean;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const COLORS: readonly string[] = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f59e0b', '#ef4444', '#3b82f6', '#10b981',
  '#f97316', '#a855f7', '#06b6d4', '#84cc16',
  '#e11d48', '#7c3aed', '#0ea5e9', '#16a34a',
];

const BASE_URL = 'https://shubhamkumar27.github.io/wheel2/';
const JOIN_URL = `${BASE_URL}?join`;

// ── Firebase ──────────────────────────────────────────────────────────────────

const fbApp    = initializeApp(firebaseConfig);
const db       = getDatabase(fbApp);
const namesRef = ref(db, 'names');

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function easeOutCubic(t: number): number { return 1 - Math.pow(1 - t, 3); }
function sanitizeName(raw: string): string { return raw.trim().slice(0, 60); }

// ── Router ────────────────────────────────────────────────────────────────────

const isJoin = new URLSearchParams(location.search).has('join');
if (isJoin) {
  (document.getElementById('presenterView') as HTMLElement).style.display = 'none';
  (document.getElementById('joinView') as HTMLElement).style.display = 'flex';
  initJoinView();
} else {
  initPresenterView();
}

// ── Join View ─────────────────────────────────────────────────────────────────

function initJoinView(): void {
  const form      = document.getElementById('joinForm') as HTMLFormElement;
  const nameInput = document.getElementById('joinName') as HTMLInputElement;
  const submitBtn = document.getElementById('joinSubmit') as HTMLButtonElement;
  const successEl = document.getElementById('joinSuccess')!;
  const errorEl   = document.getElementById('joinError')!;
  const countEl   = document.getElementById('joinCount')!;

  // Live participant count
  onValue(namesRef, (snap) => {
    const n = snap.exists() ? Object.keys(snap.val()).length : 0;
    countEl.textContent = `${n} ${n === 1 ? 'person' : 'people'} already on the wheel`;
  });

  function showError(msg: string): void {
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Join the Wheel 🎯';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = sanitizeName(nameInput.value);
    if (!name) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Joining…';
    errorEl.classList.add('hidden');

    try {
      // Duplicate check
      const snap = await get(namesRef);
      if (snap.exists()) {
        const entries = Object.values(snap.val() as Record<string, DbEntry>);
        if (entries.some(en => en.name.toLowerCase() === name.toLowerCase())) {
          showError("You're already on the wheel! 🎡 Watch the screen to see if you win.");
          return;
        }
      }
      await push(namesRef, { name, joinedAt: Date.now() } satisfies DbEntry);
      form.classList.add('hidden');
      successEl.classList.remove('hidden');
    } catch {
      showError('Something went wrong. Please try again.');
    }
  });
}

// ── Presenter View ────────────────────────────────────────────────────────────

function initPresenterView(): void {
  const wheel = new WheelApp();

  // QR code → join URL
  QRCode.toDataURL(JOIN_URL, { width: 320, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
    .then(url => { (document.getElementById('qrImg') as HTMLImageElement).src = url; })
    .catch(err => { console.error('QR failed', err); });

  // Real-time sync from Firebase
  onValue(namesRef, (snap) => {
    const data = snap.val() as Record<string, DbEntry> | null;
    const map  = new Map<string, string>();
    if (data) Object.entries(data).forEach(([id, e]) => map.set(id, e.name));
    wheel.syncFromFirebase(map);
  });

  // Reset all names
  document.getElementById('resetBtn')!.addEventListener('click', async () => {
    if (!confirm('Remove all names from the wheel?')) return;
    await set(namesRef, null);
  });

  // Manual add
  const nameInput = document.getElementById('nameInput') as HTMLInputElement;
  const addBtn    = document.getElementById('addBtn')    as HTMLButtonElement;

  const addName = async () => {
    const name = sanitizeName(nameInput.value);
    if (!name) return;
    addBtn.disabled = true;
    try {
      const snap = await get(namesRef);
      if (snap.exists()) {
        const entries = Object.values(snap.val() as Record<string, DbEntry>);
        if (entries.some(en => en.name.toLowerCase() === name.toLowerCase())) {
          nameInput.classList.add('shake');
          setTimeout(() => nameInput.classList.remove('shake'), 400);
          addBtn.disabled = false;
          return;
        }
      }
      await push(namesRef, { name, joinedAt: Date.now() } satisfies DbEntry);
      nameInput.value = '';
      nameInput.focus();
    } catch (err) {
      console.error('Firebase push failed:', err);
      alert(`Failed to add participant: ${(err as Error).message}`);
    } finally {
      addBtn.disabled = false;
    }
  };

  addBtn.addEventListener('click', addName);
  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') addName(); });

  // Fullscreen toggle
  const fsBtn = document.getElementById('fsBtn') as HTMLButtonElement;
  const presenterEl = document.getElementById('presenterView') as HTMLElement;

  const updateFsBtn = () => {
    const isFs = !!(document.fullscreenElement || (document as unknown as Record<string, unknown>).webkitFullscreenElement);
    fsBtn.textContent = isFs ? '⛶ Exit' : '⛶ Fullscreen';
  };
  document.addEventListener('fullscreenchange', updateFsBtn);
  document.addEventListener('webkitfullscreenchange', updateFsBtn);

  fsBtn.addEventListener('click', () => {
    if (!document.fullscreenElement && !(document as unknown as Record<string, unknown>).webkitFullscreenElement) {
      const req = presenterEl.requestFullscreen?.bind(presenterEl)
        ?? (presenterEl as unknown as Record<string, () => Promise<void>>).webkitRequestFullscreen?.bind(presenterEl);
      req?.();
    } else {
      (document.exitFullscreen?.bind(document)
        ?? (document as unknown as Record<string, () => Promise<void>>).webkitExitFullscreen?.bind(document))?.();
    }
  });

  // Keyboard shortcut: F = toggle fullscreen
  document.addEventListener('keydown', e => {
    if (e.key === 'f' || e.key === 'F') fsBtn.click();
  });
}

// Global handler for per-row remove buttons
async function removeFromFirebase(id: string): Promise<void> {
  if (!/^[-\w]+$/.test(id)) return; // validate before using in path
  await remove(ref(db, `names/${id}`));
}
(window as unknown as Record<string, unknown>).removeFromFirebase = removeFromFirebase;

// ── WheelApp ──────────────────────────────────────────────────────────────────

class WheelApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private confettiCanvas: HTMLCanvasElement;
  private confettiCtx: CanvasRenderingContext2D;
  private entries: WheelEntry[] = [];
  private rotation = 0;
  private isSpinning = false;
  private winner: WheelEntry | null = null;
  private confetti: Particle[] = [];
  private confettiRaf = 0;

  constructor() {
    this.canvas         = document.getElementById('wheel') as HTMLCanvasElement;
    this.ctx            = this.canvas.getContext('2d')!;
    this.confettiCanvas = document.getElementById('confettiCanvas') as HTMLCanvasElement;
    this.confettiCtx    = this.confettiCanvas.getContext('2d')!;
    this.resizeCanvas();
    this.setupEvents();
    this.render();
    window.addEventListener('resize', () => { this.resizeCanvas(); this.resizeConfettiCanvas(); });
  }

  private resizeCanvas(): void {
    const sz = Math.min(document.getElementById('wheelWrap')!.offsetWidth, 520);
    this.canvas.width = sz; this.canvas.height = sz;
    this.render();
  }

  private resizeConfettiCanvas(): void {
    this.confettiCanvas.width  = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
  }

  private setupEvents(): void {
    document.getElementById('spinBtn')!.addEventListener('click', () => this.spin());
    document.getElementById('closeWinner')!.addEventListener('click', () =>
      document.getElementById('winnerOverlay')!.classList.add('hidden'));
  }

  // ── Firebase sync ─────────────────────────────────────────────────────────

  syncFromFirebase(map: Map<string, string>): void {
    const existingIds = new Set(this.entries.map(e => e.id));
    this.entries = this.entries.filter(e => map.has(e.id));
    map.forEach((name, id) => {
      if (!existingIds.has(id))
        this.entries.push({ id, name, color: COLORS[this.entries.length % COLORS.length] as string });
    });
    this.updateList(); this.syncSpinBtn(); this.render();
  }

  reset(): void {
    this.entries = []; this.winner = null; this.rotation = 0; this.isSpinning = false;
    this.updateList(); this.syncSpinBtn(); this.render();
    document.getElementById('winnerOverlay')!.classList.add('hidden');
  }

  private updateList(): void {
    document.getElementById('count')!.textContent =
      `${this.entries.length} participant${this.entries.length !== 1 ? 's' : ''}`;
    document.getElementById('namesList')!.innerHTML = this.entries.map(e => `
      <div class="name-item" style="border-left:3px solid ${e.color}">
        <span class="dot" style="background:${e.color}"></span>
        <span class="label">${escapeHtml(e.name)}</span>
        <button class="rm" onclick="removeFromFirebase('${escapeHtml(e.id)}')" title="Remove">×</button>
      </div>`).join('');
  }

  private syncSpinBtn(): void {
    (document.getElementById('spinBtn') as HTMLButtonElement).disabled =
      this.entries.length < 2 || this.isSpinning;
  }

  // ── Spin ──────────────────────────────────────────────────────────────────

  spin(): void {
    if (this.isSpinning || this.entries.length < 2) return;
    this.isSpinning = true;
    this.winner = null;
    document.getElementById('winnerOverlay')!.classList.add('hidden');
    this.syncSpinBtn();

    const n           = this.entries.length;
    const winnerIndex = Math.floor(Math.random() * n);
    const slice       = (2 * Math.PI) / n;
    const baseTarget  = Math.PI / 2 - winnerIndex * slice - slice / 2;
    const norm        = ((baseTarget % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const spins       = 6 + Math.random() * 4;
    const start       = this.rotation;
    const delta       = (norm + spins * 2 * Math.PI) - (start % (2 * Math.PI));
    const target      = start + delta + (spins - 1) * 2 * Math.PI;
    const dur         = 4500 + Math.random() * 1500;
    const t0          = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      this.rotation = start + easeOutCubic(p) * (target - start);
      this.render();
      if (p < 1) { requestAnimationFrame(tick); return; }
      this.rotation = target; this.isSpinning = false;
      this.winner   = this.entries[winnerIndex];
      this.showWinner(); this.launchConfetti(); this.syncSpinBtn(); this.render();
    };
    requestAnimationFrame(tick);
  }

  private showWinner(): void {
    if (!this.winner) return;
    const card = document.getElementById('winnerCard')!;
    document.getElementById('winnerName')!.textContent = this.winner.name;
    card.style.borderColor = this.winner.color;
    (card.querySelector('.trophy') as HTMLElement).style.color = this.winner.color;
    document.getElementById('winnerOverlay')!.classList.remove('hidden');
  }

  // ── Confetti ──────────────────────────────────────────────────────────────

  private launchConfetti(): void {
    this.confetti = [];
    this.resizeConfettiCanvas();
    for (let i = 0; i < 140; i++)
      this.confetti.push({
        x: Math.random() * window.innerWidth, y: -10 - Math.random() * 100,
        vx: (Math.random() - 0.5) * 7, vy: Math.random() * 4 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] as string,
        size: Math.random() * 10 + 5, angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.25, alive: true,
      });
    cancelAnimationFrame(this.confettiRaf);
    this.tickConfetti();
  }

  private tickConfetti(): void {
    const ctx = this.confettiCtx, W = this.confettiCanvas.width, H = this.confettiCanvas.height;
    ctx.clearRect(0, 0, W, H);
    let anyAlive = false;
    for (const p of this.confetti) {
      if (!p.alive) continue;
      p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.angle += p.spin;
      if (p.y > H + 20) { p.alive = false; continue; }
      anyAlive = true;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.fillStyle = p.color; ctx.globalAlpha = 0.9;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (anyAlive) this.confettiRaf = requestAnimationFrame(() => this.tickConfetti());
    else ctx.clearRect(0, 0, W, H);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private render(): void {
    const { canvas, ctx } = this;
    const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 12;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const glow = ctx.createRadialGradient(cx, cy, r - 2, cx, cy, r + 22);
    glow.addColorStop(0, 'rgba(99,102,241,0.35)'); glow.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.beginPath(); ctx.arc(cx, cy, r + 22, 0, 2 * Math.PI); ctx.fillStyle = glow; ctx.fill();

    const n = this.entries.length;
    if (n === 0) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = '#1a1a2e'; ctx.fill();
      ctx.strokeStyle = '#6366f1'; ctx.lineWidth = 3; ctx.stroke();
      ctx.fillStyle = '#6366f1';
      ctx.font = `bold ${Math.round(r * 0.12)}px Inter,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Scan QR to join', cx, cy - r * 0.1);
      ctx.font = `${Math.round(r * 0.09)}px Inter,sans-serif`;
      ctx.fillStyle = '#8b8fc7'; ctx.fillText('or add names below', cx, cy + r * 0.12);
      this.drawPointer(cx); return;
    }

    const sa = (2 * Math.PI) / n;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(this.rotation - Math.PI / 2);
    this.entries.forEach((e, i) => {
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * sa, (i + 1) * sa); ctx.closePath();
      ctx.fillStyle = e.color; ctx.fill();
      ctx.strokeStyle = 'rgba(13,13,26,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.save(); ctx.rotate(i * sa + sa / 2);
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      const fs = Math.max(9, Math.min(15, r * 0.09 - n * 0.15));
      ctx.font = `bold ${fs}px Inter,sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4; ctx.fillStyle = '#fff';
      const mc = Math.max(4, Math.floor(r / 10 - n * 0.2));
      ctx.fillText(e.name.length > mc ? e.name.slice(0, mc - 1) + '…' : e.name, r * 0.87, 0);
      ctx.restore();
    });
    ctx.beginPath(); ctx.arc(0, 0, r * 0.09, 0, 2 * Math.PI);
    const hub = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.09);
    hub.addColorStop(0, '#a78bfa'); hub.addColorStop(1, '#6366f1');
    ctx.fillStyle = hub; ctx.fill(); ctx.strokeStyle = '#0d0d1a'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();
    this.drawPointer(cx);
  }

  private drawPointer(cx: number): void {
    const { ctx } = this;
    ctx.save(); ctx.translate(cx, 10);
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.lineTo(0, 28); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, 28);
    g.addColorStop(0, '#f43f5e'); g.addColorStop(1, '#ec4899');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(244,63,94,0.7)'; ctx.shadowBlur = 12; ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  }
}
