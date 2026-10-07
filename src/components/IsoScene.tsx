import type { ReactNode } from 'react';

/* Isometric projection: x → right-down, y → left-down, z → up */
const CX = 260, CY = 235;
const P = (x: number, y: number, z = 0): [number, number] => [CX + (x - y) * 0.866, CY + (x + y) * 0.5 - z];
const pts = (a: [number, number][]) => a.map((p) => p.join(',')).join(' ');
type Tone = { t: string; l: string; r: string };

function Box({ x, y, z, w, d, h, c, extra }: { x: number; y: number; z: number; w: number; d: number; h: number; c: Tone; extra?: ReactNode }) {
  return (
    <g>
      <polygon points={pts([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)])} fill={c.l} />
      <polygon points={pts([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)])} fill={c.r} />
      <polygon points={pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)])} fill={c.t} />
      {extra}
    </g>
  );
}

function Cyl({ r, z0, z1, side, top, stroke }: { r: number; z0: number; z1: number; side: string; top: string; stroke?: string }) {
  const [cx, cy] = P(0, 0, 0); const rx = r * 1.2247, ry = r * 0.7071;
  const d = `M${cx - rx},${cy - z0} L${cx - rx},${cy - z1} A${rx},${ry} 0 0 0 ${cx + rx},${cy - z1} L${cx + rx},${cy - z0} A${rx},${ry} 0 0 1 ${cx - rx},${cy - z0}Z`;
  return <g><path d={d} fill={side} /><ellipse cx={cx} cy={cy - z1} rx={rx} ry={ry} fill={top} stroke={stroke} strokeWidth={1.2} /></g>;
}

const SLAB: Tone = { t: '#0e4a43', l: '#08302c', r: '#0a3b36' };
const PAD: Tone = { t: '#12665b', l: '#0a3f39', r: '#0d4f47' };
const NODES = { lock: [-100, -35], laptop: [35, -105], server: [-45, 105], shield: [105, -30], chat: [95, 70] } as const;
type NK = keyof typeof NODES;

function Pad({ k, children }: { k: NK; children: ReactNode }) {
  const [nx, ny] = NODES[k]; const [tx, ty] = P(nx, ny, 0);
  return (
    <g>
      <ellipse cx={tx} cy={ty - 14} rx="34" ry="19.5" className="iso-pulse" fill="none" stroke="#2dd4bf" strokeWidth="1.5" style={{ animationDelay: `${Object.keys(NODES).indexOf(k) * 0.5}s` }} />
      <Box x={nx - 22} y={ny - 22} z={14} w={44} d={44} h={7} c={PAD} />
      {children}
    </g>
  );
}

export function IsoScene() {
  const [cx0, cy0] = P(0, 0, 0);
  const lines = (Object.keys(NODES) as NK[]).map((k, i) => {
    const [nx, ny] = NODES[k]; const a = P(0, 0, 14), b = P(nx, ny, 14);
    return { k, i, d: `M${a} L${b}`, rev: `M${b} L${a}` };
  });
  const tiles = [[-190, -60, 40], [150, -170, 70], [200, 60, 30], [-170, 140, 60], [20, 190, 20], [-60, -200, 80]];

  return (
    <svg viewBox="0 0 520 440" className="h-full max-h-[460px] w-full overflow-visible" role="img" aria-label="JumpServer isometric illustration">
      <defs>
        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fde68a" /><stop offset="0.55" stopColor="#f59e0b" /><stop offset="1" stopColor="#b45309" /></linearGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5eead4" stopOpacity="0" /><stop offset="1" stopColor="#5eead4" stopOpacity="0.55" /></linearGradient>
        <radialGradient id="floorGlow"><stop offset="0" stopColor="#14b8a6" stopOpacity="0.45" /><stop offset="1" stopColor="#14b8a6" stopOpacity="0" /></radialGradient>
        <filter id="soft"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      {/* drifting background tiles */}
      {tiles.map(([x, y, z], i) => (
        <polygon key={i} className="iso-tile" style={{ animationDelay: `${i * 0.9}s` }} points={pts([P(x, y, z), P(x + 36, y, z), P(x + 36, y + 36, z), P(x, y + 36, z)])} fill="#14b8a6" fillOpacity="0.1" stroke="#2dd4bf" strokeOpacity="0.25" />
      ))}
      <ellipse cx={cx0} cy={cy0 + 10} rx="250" ry="140" fill="url(#floorGlow)" />

      {/* base slab */}
      <Box x={-135} y={-135} z={0} w={270} d={270} h={14} c={SLAB} />
      <polygon points={pts([P(-120, -120, 14.1), P(120, -120, 14.1), P(120, 120, 14.1), P(-120, 120, 14.1)])} fill="none" stroke="#2dd4bf" strokeOpacity="0.35" strokeDasharray="3 5" className="iso-dash" />
      {[-80, -40, 0, 40, 80].map((v) => (<g key={v} stroke="#2dd4bf" strokeOpacity="0.08"><line x1={P(v, -120, 14)[0]} y1={P(v, -120, 14)[1]} x2={P(v, 120, 14)[0]} y2={P(v, 120, 14)[1]} /><line x1={P(-120, v, 14)[0]} y1={P(-120, v, 14)[1]} x2={P(120, v, 14)[0]} y2={P(120, v, 14)[1]} /></g>))}

      {/* connection lines + data packets */}
      {lines.map((l) => (
        <g key={l.k}>
          <path d={l.d} stroke="#2dd4bf" strokeOpacity="0.55" strokeWidth="1.6" fill="none" strokeDasharray="4 6" className="iso-dash" />
          <circle r="3.2" fill="#99f6e4"><animateMotion dur="2.6s" begin={`${l.i * 0.45}s`} repeatCount="indefinite" path={l.i % 2 ? l.rev : l.d} /><animate attributeName="opacity" values="0;1;1;0" dur="2.6s" begin={`${l.i * 0.45}s`} repeatCount="indefinite" /></circle>
        </g>
      ))}

      {/* back nodes */}
      <Pad k="lock">{(() => { const [x, y] = P(...NODES.lock, 21); return (
        <g transform={`translate(${x},${y})`} className="iso-bob" style={{ animationDelay: '0.3s' }}><path d="M-6,-14 v-7 a6,6 0 0 1 12,0 v7" fill="none" stroke="#99f6e4" strokeWidth="3.2" /><rect x="-11" y="-14" width="22" height="17" rx="4" fill="#2dd4bf" /><circle cy="-6" r="2.6" fill="#08302c" /></g>); })()}</Pad>
      <Pad k="laptop">{(() => { const [nx, ny] = NODES.laptop; const z = 21; return (<g>
        <Box x={nx - 16} y={ny - 10} z={z} w={32} d={22} h={3} c={{ t: '#5eead4', l: '#14b8a6', r: '#0f9488' }} />
        <polygon points={pts([P(nx - 16, ny - 10, z + 3), P(nx + 16, ny - 10, z + 3), P(nx + 16, ny - 10, z + 26), P(nx - 16, ny - 10, z + 26)])} fill="#06231f" stroke="#5eead4" strokeWidth="1.5" />
        {[8, 13, 18].map((h, i) => <line key={h} className="iso-blink" style={{ animationDelay: `${i * 0.35}s` }} x1={P(nx - 11, ny - 10, z + h)[0]} y1={P(nx - 11, ny - 10, z + h)[1]} x2={P(nx + (i === 1 ? 4 : 10), ny - 10, z + h)[0]} y2={P(nx + (i === 1 ? 4 : 10), ny - 10, z + h)[1]} stroke="#2dd4bf" strokeWidth="2" />)}
      </g>); })()}</Pad>

      {/* central platform */}
      <Cyl r={88} z0={14} z1={24} side="#0a3b36" top="#0f5d53" stroke="#2dd4bf" />
      <ellipse cx={cx0} cy={cy0 - 24} rx="124" ry="70" fill="none" stroke="#5eead4" strokeOpacity="0.8" strokeWidth="1.6" strokeDasharray="10 14" className="iso-dash-fast" />
      <Cyl r={62} z0={24} z1={38} side="#0d4f47" top="#14796c" stroke="#5eead4" />
      <Cyl r={40} z0={38} z1={54} side="#12665b" top="#2dd4bf" stroke="#99f6e4" />
      <ellipse cx={cx0} cy={cy0 - 54} rx="28" ry="16" fill="#99f6e4" fillOpacity="0.5" className="iso-glow" />
      {/* cloud */}
      <g transform={`translate(${cx0},${cy0 - 66})`} className="iso-bob-sm" fill="#ecfdf5"><circle cx="-13" cy="0" r="10" /><circle cx="0" cy="-7" r="14" /><circle cx="14" cy="0" r="10" /><rect x="-23" y="0" width="47" height="10" rx="5" /></g>
      {/* rising particles */}
      {[-30, -10, 14, 32].map((dx, i) => <circle key={i} className="iso-particle" style={{ animationDelay: `${i * 0.8}s` }} cx={cx0 + dx} cy={cy0 - 60} r="2" fill="#99f6e4" />)}

      {/* front nodes */}
      <Pad k="server">{(() => { const [nx, ny] = NODES.server; return (<g>{[21, 28, 35].map((z, i) => (
        <g key={z}><Box x={nx - 15} y={ny - 15} z={z} w={30} d={30} h={5} c={{ t: '#5eead4', l: '#0f9488', r: '#14b8a6' }} extra={<circle className="iso-blink" style={{ animationDelay: `${i * 0.4}s` }} cx={P(nx + 15, ny - 4, z + 2.5)[0] - 2} cy={P(nx + 15, ny - 4, z + 2.5)[1]} r="1.8" fill="#fef08a" />} /></g>))}</g>); })()}</Pad>
      <Pad k="shield">{(() => { const [x, y] = P(...NODES.shield, 21); return (
        <g transform={`translate(${x},${y - 16})`} className="iso-bob" style={{ animationDelay: '0.9s' }}><path d="M0,-18 L15,-12 V2 C15,12 7,17 0,21 C-7,17 -15,12 -15,2 V-12Z" fill="#2dd4bf" /><path d="M-6,1 L-2,5 L7,-5" fill="none" stroke="#06231f" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></g>); })()}</Pad>
      <Pad k="chat">{(() => { const [x, y] = P(...NODES.chat, 21); return (
        <g transform={`translate(${x},${y - 4})`} className="iso-bob" style={{ animationDelay: '0.6s' }}><path d="M-20,-30 h40 a6,6 0 0 1 6,6 v14 a6,6 0 0 1 -6,6 h-24 l-9,8 v-8 h-7 a6,6 0 0 1 -6,-6 v-14 a6,6 0 0 1 6,-6z" fill="#34d399" />{[-9, 0, 9].map((dx, i) => <circle key={dx} className="iso-blink" style={{ animationDelay: `${i * 0.3}s` }} cx={dx} cy={-17} r="2.8" fill="#06231f" />)}</g>); })()}</Pad>

      {/* floating shield + beam */}
      <polygon className="iso-glow" points={`${cx0 - 22},${cy0 - 112} ${cx0 + 22},${cy0 - 112} ${cx0 + 36},${cy0 - 58} ${cx0 - 36},${cy0 - 58}`} fill="url(#beam)" />
      <ellipse cx={cx0} cy={cy0 - 104} rx="34" ry="13" fill="none" stroke="#5eead4" strokeWidth="1.5" className="iso-pulse" />
      <g transform={`translate(${cx0},${cy0 - 150})`} className="iso-bob">
        <ellipse cy="26" rx="34" ry="30" fill="#f59e0b" fillOpacity="0.35" filter="url(#soft)" className="iso-glow" />
        <path d="M0,-30 L28,-20 V4 C28,20 13,30 0,38 C-13,30 -28,20 -28,4 V-20Z" fill="url(#gold)" />
        <path d="M0,-30 L28,-20 V4 C28,20 13,30 0,38Z" fill="#000" fillOpacity="0.14" />
        <path d="M-12,4 L-3,13 L14,-6" fill="none" stroke="#fffbeb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
