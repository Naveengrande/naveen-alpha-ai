"use client";
import { useEffect, useRef } from "react";

interface Node {
  x: number; y: number; z: number; // unit sphere coords
  pulse: number;
}
interface Particle {
  a: number; // node index start
  b: number; // node index end
  t: number;
  speed: number;
}

/** Rotating "intelligence core": a lattice of nodes on a sphere, connected by lines, with data particles flowing along edges. */
export default function NeuralCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const small = window.innerWidth < 640;
    const N = small ? 48 : 90;
    const P = small ? 26 : 60;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, last = performance.now(), rot = 0;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

    // Fibonacci sphere
    const nodes: Node[] = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const th = i * 2.399963229728653;
      return { x: Math.cos(th) * r, y, z: Math.sin(th) * r, pulse: Math.random() * Math.PI * 2 };
    });
    const edges: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const d: { j: number; d: number }[] = [];
      for (let j = 0; j < N; j++) if (j !== i) d.push({ j, d: (nodes[i].x - nodes[j].x) ** 2 + (nodes[i].y - nodes[j].y) ** 2 + (nodes[i].z - nodes[j].z) ** 2 });
      d.sort((a, b) => a.d - b.d);
      for (const k of d.slice(0, 3)) if (i < k.j || !edges.some(([a, b]) => a === k.j && b === i)) edges.push([i, k.j]);
    }
    const particles: Particle[] = Array.from({ length: P }, () => {
      const e = edges[Math.floor(Math.random() * edges.length)];
      return { a: e[0], b: e[1], t: Math.random(), speed: 0.15 + Math.random() * 0.35 };
    });

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 });
    io.observe(canvas);

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      mouse.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const css = getComputedStyle(document.documentElement);
    const rgb = (name: string) => css.getPropertyValue(name).trim().split(/\s+/).join(",");

    const project = (n: Node, ry: number, rx: number, R: number, cx: number, cy: number) => {
      const cosY = Math.cos(ry), sinY = Math.sin(ry), cosX = Math.cos(rx), sinX = Math.sin(rx);
      let x = n.x * cosY + n.z * sinY;
      let z = -n.x * sinY + n.z * cosY;
      const y = n.y * cosX - z * sinX;
      z = n.y * sinX + z * cosX;
      const persp = 1 / (1.9 - z * 0.45);
      return { px: cx + x * R * persp * 1.9, py: cy + y * R * persp * 1.9, z, s: persp };
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visible) { last = now; return; }
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (!reduce) rot += dt * 0.12;
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;

      ctx.clearRect(0, 0, w, h);
      const fg = rgb("--fg"), accent = rgb("--accent");
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.3;

      // core glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
      g.addColorStop(0, `rgba(${accent},0.16)`);
      g.addColorStop(0.5, `rgba(${accent},0.04)`);
      g.addColorStop(1, `rgba(${accent},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // orbit rings
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${fg},${0.06 - k * 0.012})`;
        ctx.ellipse(cx, cy, R * (1.55 + k * 0.28), R * (0.5 + k * 0.1), rot * (k % 2 ? -1 : 1) * 0.6 + k, 0, Math.PI * 2);
        ctx.stroke();
      }

      const ry = rot + mouse.x * 0.35, rx = 0.35 + mouse.y * 0.25;
      const pts = nodes.map((n) => project(n, ry, rx, R, cx, cy));

      // edges
      for (const [a, b] of edges) {
        const A = pts[a], B = pts[b];
        const depth = (A.z + B.z) / 2;
        const al = 0.05 + (depth + 1) * 0.09;
        ctx.strokeStyle = `rgba(${fg},${al})`;
        ctx.beginPath(); ctx.moveTo(A.px, A.py); ctx.lineTo(B.px, B.py); ctx.stroke();
      }

      // particles along edges
      for (const p of particles) {
        if (!reduce) p.t += p.speed * dt;
        if (p.t >= 1) {
          // hop to a neighbouring edge to feel like flow
          const nexts = edges.filter(([a, b]) => a === p.b || b === p.b);
          const e = nexts[Math.floor(Math.random() * nexts.length)] ?? edges[0];
          p.a = p.b; p.b = e[0] === p.b ? e[1] : e[0]; p.t = 0;
        }
        const A = pts[p.a], B = pts[p.b];
        const x = A.px + (B.px - A.px) * p.t, y = A.py + (B.py - A.py) * p.t;
        const z = A.z + (B.z - A.z) * p.t;
        ctx.fillStyle = `rgba(${accent},${0.35 + (z + 1) * 0.3})`;
        ctx.beginPath(); ctx.arc(x, y, 1.2 + (z + 1) * 0.6, 0, Math.PI * 2); ctx.fill();
      }

      // nodes
      const order = pts.map((_, i) => i).sort((i, j) => pts[i].z - pts[j].z);
      for (const i of order) {
        const p = pts[i];
        nodes[i].pulse += dt * 1.4;
        const glow = (Math.sin(nodes[i].pulse) + 1) / 2;
        const r = 1.4 + (p.z + 1) * 1.1;
        if (glow > 0.8 && p.z > -0.2) {
          ctx.fillStyle = `rgba(${accent},0.18)`;
          ctx.beginPath(); ctx.arc(p.px, p.py, r * 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${fg},${0.3 + (p.z + 1) * 0.35})`;
        ctx.beginPath(); ctx.arc(p.px, p.py, r, 0, Math.PI * 2); ctx.fill();
      }

      // central core
      const pulse = 1 + Math.sin(now / 700) * 0.06;
      ctx.strokeStyle = `rgba(${accent},0.7)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, 9 * pulse, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = `rgba(${accent},0.95)`;
      ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 1;
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return <canvas ref={ref} className={`h-full w-full ${className}`} aria-hidden="true" />;
}
