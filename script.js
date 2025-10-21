// Utilities
const $ = q => document.querySelector(q);
const canvas = $('#c'); const ctx = canvas.getContext('2d');
let W, H, DPR = Math.max(1, window.devicePixelRatio || 1);
function resize() { W = innerWidth - (document.querySelector('.left')?.offsetWidth || 420) - 80; H = innerHeight - 64; if (window.matchMedia('(max-width:880px)').matches) { W = innerWidth - 32; H = Math.round(innerHeight * 0.58); } canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
window.addEventListener('resize', resize); resize();

// State
let particles = []; let mouse = { x: W / 2, y: H / 2, down: false };
let params = { count: 300, size: 2.4, grav: 0.75, mode: 0, sound: false };

// Particle
class P {
    constructor(x, y) { this.x = x; this.y = y; this.vx = (Math.random() - 0.5) * 0.6; this.vy = (Math.random() - 0.5) * 0.6; this.life = Math.random() * 200 + 60; this.r = Math.random() * 1.3 + 0.4; this.h = Math.random() * 360; }
    step() {
        const dx = mouse.x - this.x; const dy = mouse.y - this.y; const dist = Math.hypot(dx, dy) + 0.001;
        const force = (params.grav) * (params.mode ? -1 : 1) * Math.min(120, 300 / dist);
        this.vx += (dx / dist) * force * 0.12;
        this.vy += (dy / dist) * force * 0.12;
        this.vx *= 0.98; this.vy *= 0.98;
        this.x += this.vx; this.y += this.vy;
        this.life -= 1;
        this.h += 0.3;
        if (this.x < -50 || this.x > W + 50 || this.y < -50 || this.y > H + 50) this.life = 0;
    }
    draw(ctx) {
        ctx.beginPath();
        ctx.fillStyle = `hsla(${this.h % 360},70%,60%,0.9)`;
        ctx.arc(this.x, this.y, Math.max(0.2, params.size * this.r), 0, Math.PI * 2);
        ctx.fill();
    }
}

function regen() { particles = []; for (let i = 0; i < params.count; i++) { particles.push(new P(Math.random() * W, Math.random() * H)); } }

// Controls
$('#count').addEventListener('input', e => { params.count = +e.target.value; $('#countLabel').textContent = params.count; regen(); });
$('#size').addEventListener('input', e => { params.size = +e.target.value; $('#sizeLabel').textContent = params.size; });
$('#grav').addEventListener('input', e => { params.grav = +e.target.value; $('#gravLabel').textContent = params.grav; });
$('#regen').addEventListener('click', regen);
$('#reset').addEventListener('click', () => { params = { count: 300, size: 2.4, grav: 0.75, mode: 0, sound: false }; $('#count').value = 300; $('#size').value = 2.4; $('#grav').value = 0.75; $('#countLabel').textContent = 300; $('#sizeLabel').textContent = 2.4; $('#gravLabel').textContent = 0.75; $('#toggleSound').textContent = 'Sound: Off'; regen(); });

// Mode switch
const modeSwitch = $('#modeSwitch'); const knob = $('#knob'); modeSwitch.addEventListener('click', () => { params.mode = +!params.mode; knob.style.transform = params.mode ? 'translateX(20px)' : 'translateX(0)'; modeSwitch.style.background = params.mode ? 'linear-gradient(90deg,var(--accent1),var(--accent2))' : 'rgba(255,255,255,0.06)'; });

// Sound (WebAudio)
let audioCtx, osc, gainNode;
function initAudio() { if (audioCtx) return; audioCtx = new (window.AudioContext || window.webkitAudioContext)(); osc = audioCtx.createOscillator(); gainNode = audioCtx.createGain(); osc.type = 'sine'; osc.frequency.value = 220; gainNode.gain.value = 0; osc.connect(gainNode); gainNode.connect(audioCtx.destination); osc.start(); }
$('#toggleSound').addEventListener('click', () => {
    params.sound = !params.sound;
    $('#toggleSound').textContent = 'Sound: ' + (params.sound ? 'On' : 'Off');
    if (params.sound) initAudio(); else if (gainNode) gainNode.gain.value = 0;
});

// Interaction
canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = (e.clientX - r.left); mouse.y = (e.clientY - r.top); if (params.sound && gainNode) { const f = Math.max(80, Math.min(1200, 200 + (mouse.x / W) * 1200)); osc.frequency.value = f; gainNode.gain.value = 0.03 + Math.min(0.3, (mouse.y / H) * 0.5); } });
canvas.addEventListener('pointerdown', e => { mouse.down = true; for (let i = 0; i < 40; i++) { particles.push(new P(mouse.x + (Math.random() - 0.5) * 40, mouse.y + (Math.random() - 0.5) * 40)); } });
canvas.addEventListener('pointerup', () => { mouse.down = false; if (params.sound && gainNode) gainNode.gain.value = 0.01; });

// Save PNG
$('#snap').addEventListener('click', () => {
    const link = document.createElement('a');
    const exportCanvas = document.createElement('canvas');
    const scale = 2; exportCanvas.width = canvas.width * scale / DPR; exportCanvas.height = canvas.height * scale / DPR;
    const exCtx = exportCanvas.getContext('2d'); exCtx.fillStyle = getComputedStyle(document.body).backgroundColor; exCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    // draw our scene scaled
    exCtx.scale(scale, scale);
    // draw current canvas into it
    exCtx.drawImage(canvas, 0, 0);
    link.download = 'eternal-playground.png'; link.href = exportCanvas.toDataURL('image/png'); link.click();
});

// Animation
function step() {
    ctx.clearRect(0, 0, W, H);
    // subtle trailing effect
    ctx.fillStyle = 'rgba(4,6,14,0.18)'; ctx.fillRect(0, 0, W, H);
    // glow composite
    ctx.globalCompositeOperation = 'lighter';
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.step(); p.draw(ctx); if (p.life <= 0) particles.splice(i, 1); }
    ctx.globalCompositeOperation = 'source-over';

    // spawn if low
    if (particles.length < params.count) particles.push(new P(Math.random() * W, Math.random() * H));
    requestAnimationFrame(step);
}

// boot
regen(); step();

// initial small animation for brand
(function () { let k = 0; const id = setInterval(() => { k++; if (k > 14) { clearInterval(id); } }, 120); })();

// accessibility: allow keyboard toggles
window.addEventListener('keydown', e => { if (e.key === 's') document.getElementById('snap').click(); if (e.key === 'r') regen(); if (e.key === ' ') modeSwitch.click(); });