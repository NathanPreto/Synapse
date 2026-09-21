/* Layout geral: sidebar, navegação e composição das abas. */

function Shell({ children, theme }) {
  const dark = theme === 'dark';
  const vars = dark
    ? {
        '--bg': '#0A0A0A',
        '--surface': '#121212',
        '--surface2': '#1A1A1A',
        '--border': '#303238',
        '--text': '#F5F7FA',
        '--muted': '#B4BAC4',
        '--muted2': '#7E8794',
        '--ember': '#39E6B0',
        '--teal': '#39E6B0',
        '--rose': '#FF6B6B',
        '--gold': '#FBBF24',
        '--on-accent': '#06140F',
        '--stage-novo': '#8B95A3',
        '--stage-contato': '#60A5FA',
        '--stage-proposta': '#39E6B0',
        '--stage-fechado': '#FBBF24',
        '--stage-perdido': '#FF6B6B',
        '--temp-quente': '#FF6B6B',
        '--temp-morno': '#FBBF24',
        '--temp-frio': '#60A5FA',
        '--mood-travado': '#FF6B6B',
        '--mood-pesado': '#FB923C',
        '--mood-neutro': '#FBBF24',
        '--mood-firme': '#86EFAC',
        '--mood-focado': '#39E6B0',
        '--blue': '#60A5FA',
        '--violet': '#A78BFA'
      }
    : {
        '--bg': '#F8F9FA',
        '--surface': '#FFFFFF',
        '--surface2': '#F1F3F5',
        '--border': '#DDE2E6',
        '--text': '#111827',
        '--muted': '#374151',
        '--muted2': '#6B7280',
        '--ember': '#00875A',
        '--teal': '#00875A',
        '--rose': '#B42318',
        '--gold': '#8A5A00',
        '--on-accent': '#FFFFFF',
        '--stage-novo': '#6B7280',
        '--stage-contato': '#155EEF',
        '--stage-proposta': '#00875A',
        '--stage-fechado': '#8A5A00',
        '--stage-perdido': '#B42318',
        '--temp-quente': '#B42318',
        '--temp-morno': '#8A5A00',
        '--temp-frio': '#155EEF',
        '--mood-travado': '#B42318',
        '--mood-pesado': '#C2410C',
        '--mood-neutro': '#8A5A00',
        '--mood-firme': '#287A4B',
        '--mood-focado': '#006B47',
        '--blue': '#155EEF',
        '--violet': '#6D28D9'
      };
  return React.createElement(
    'div',
    {
      style: {
        ...vars,
        background: 'var(--bg)',
        color: 'var(--text)',
        minHeight: '100vh',
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      },
      className: 'synapse-shell w-full flex flex-col',
      'data-theme': dark ? 'dark' : 'light'
    },
    React.createElement(
      'style',
      null,
      `
 .serif { font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; letter-spacing:-.02em; }
 @keyframes pulseIn { 0% { opacity:0; transform:translateY(6px) scale(.995); } 100% { opacity:1; transform:translateY(0) scale(1); } }
 @keyframes softLift { from { opacity:.78; transform:translateY(2px); } to { opacity:1; transform:translateY(0); } }
 .pop { animation:pulseIn .28s ease-out; }
 .pop > .mb-8, .pop > .p-4.rounded { animation:softLift .28s ease-out; }
 input, textarea, select { font-family:inherit; background:var(--surface); color:var(--text); border:1px solid var(--border); border-radius:12px; transition:border-color .18s ease, box-shadow .18s ease, background .18s ease; }
 input:hover, textarea:hover, select:hover { border-color:color-mix(in srgb, var(--ember) 35%, var(--border)); }
 input:focus, textarea:focus, select:focus { outline:none; border-color:var(--ember); box-shadow:0 0 0 3px color-mix(in srgb, var(--ember) 16%, transparent); }
 ::placeholder { color:var(--muted2); opacity:1; }
 button { font:inherit; transition:transform .16s ease, box-shadow .16s ease, background-color .16s ease, border-color .16s ease, color .16s ease, opacity .16s ease; }
 button:not(:disabled):hover { transform:translateY(-1px); }
 button:not(:disabled):active { transform:translateY(0) scale(.98); }
 button:focus-visible, input:focus-visible, textarea:focus-visible, select:focus-visible { outline:2px solid var(--ember); outline-offset:2px; }
 .rounded { border-radius:14px !important; }
 .rounded-full { border-radius:999px !important; }
 .shadow, .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow:none !important; }
 .max-w-3xl { max-width:1120px !important; }
 .pop > .mb-8 { margin-bottom:0 !important; }
 .pop > .mb-8 > .flex.items-center.justify-between { margin-bottom:14px !important; }
 .pop > .mb-8 > .flex.items-center.justify-between h2 { font-family:Inter, sans-serif !important; font-size:15px !important; font-weight:700 !important; letter-spacing:-.01em; }
 .pop > .mb-8 > div:not(.flex) { background:var(--surface); border:1px solid var(--border); border-radius:20px !important; padding:20px !important; }
 @media (min-width: 768px) {
   .pop { display:grid; grid-template-columns:repeat(12,minmax(0,1fr)); gap:18px; align-items:start; }
 }
 @media (max-width: 767px) {
   .pop { display:grid; grid-template-columns:1fr; gap:16px; }
   .pop > .mb-8 { margin-bottom:0 !important; }
 }
 /* Bento surfaces for the existing interface without changing its behavior */
 .pop > .p-4.rounded { border-radius:20px !important; }
 .pop > .p-4.rounded[style*="var(--surface)"] { box-shadow:0 1px 0 rgba(255,255,255,.02); }

 /* ---------- Refinamento visual: Bento UI + microinterações ---------- */
 :root { color-scheme: dark; }
 * { -webkit-tap-highlight-color: transparent; }
 body { background:var(--bg); }
 .pop > .mb-8 > div:not(.flex),
 .pop > .p-4.rounded,
 .pop .space-y-2 > div,
 .pop .space-y-1\.5 > div {
   position:relative;
   overflow:hidden;
   border-color:color-mix(in srgb, var(--border) 88%, var(--ember) 12%) !important;
   box-shadow:0 1px 0 rgba(255,255,255,.025), 0 10px 28px rgba(0,0,0,.06);
   transition:transform .2s ease, border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
 }
 .pop > .mb-8 > div:not(.flex):hover,
 .pop > .p-4.rounded:hover,
 .pop .space-y-2 > div:hover,
 .pop .space-y-1\.5 > div:hover {
   transform:translateY(-2px);
   border-color:color-mix(in srgb, var(--ember) 34%, var(--border)) !important;
   box-shadow:0 10px 30px rgba(0,0,0,.10);
 }
 .pop button { min-height:38px; }
 .pop button:not(:disabled):hover {
   box-shadow:0 5px 14px color-mix(in srgb, var(--ember) 14%, transparent);
 }
 .pop button:not(:disabled):active { transform:translateY(0) scale(.97); }
 .pop textarea, .pop input, .pop select {
   transition:border-color .2s ease, box-shadow .2s ease, background-color .2s ease, transform .2s ease;
 }
 .pop textarea:hover, .pop input:hover, .pop select:hover {
   transform:translateY(-1px);
 }

 /* Pipeline: evita excesso de scroll e mantém cada etapa legível */
 .pop .overflow-x-auto {
   scrollbar-width:thin;
   scrollbar-color:var(--border) transparent;
   scroll-snap-type:x proximity;
   overscroll-behavior-inline:contain;
 }
 .pop .overflow-x-auto > div { scroll-snap-align:start; }
 @media (min-width:900px) {
   .pop .overflow-x-auto {
     display:grid;
     grid-template-columns:repeat(5,minmax(0,1fr));
     overflow:visible;
     gap:12px;
   }
   .pop .overflow-x-auto > div { width:auto !important; min-width:0; }
 }
 @media (max-width:899px) {
   .pop .overflow-x-auto {
     display:grid;
     grid-template-columns:repeat(2,minmax(0,1fr));
     overflow:visible;
     gap:12px;
   }
   .pop .overflow-x-auto > div { width:auto !important; min-width:0; }
 }
 @media (max-width:560px) {
   .pop .overflow-x-auto { grid-template-columns:1fr; }
   .pop .overflow-x-auto > div { width:100% !important; }
 }

 /* Status e temperatura: área de toque confortável */
 .pop .flex.gap-1\.5.flex-wrap button,
 .pop .flex.gap-1\.5 button {
   min-height:36px;
   padding-left:11px !important;
   padding-right:11px !important;
   border:1px solid color-mix(in srgb, var(--border) 90%, var(--text) 10%);
 }

 /* Correlação: leitura instantânea */
 .correlation-card {
   display:grid;
   gap:12px;
   grid-template-columns:repeat(2,minmax(0,1fr));
 }
 .loss-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
 @media (min-width:768px) {
 }
 @media (max-width:767px) {
   .correlation-card { grid-template-columns:1fr; }
   .loss-grid { grid-template-columns:1fr; }
 }
 .correlation-card > div {
   padding:14px;
   border:1px solid var(--border);
   border-radius:16px;
   background:var(--surface2);
 }

 /* Feedback de salvamento */
 @keyframes successPop {
   0% { opacity:.5; transform:scale(.97); }
   55% { opacity:1; transform:scale(1.03); }
   100% { opacity:1; transform:scale(1); }
 }
 .pop button:focus-visible { box-shadow:0 0 0 4px color-mix(in srgb, var(--ember) 18%, transparent); }

 /* ---------- Clientes: aproveitamento total da tela + pills sem corte ---------- */
 .clientes-ui { width:100%; min-width:0; }
 .clientes-ui > .mb-8 { min-width:0; width:100%; }
 .clientes-ui .mb-8 > div:not(.flex) { width:100%; max-width:none; }
 .clientes-pipeline {
   width:100%;
   display:grid;
   grid-template-columns:repeat(5,minmax(0,1fr));
   gap:16px;
   align-items:start;
   overflow:visible;
 }
 .cliente-stage {
   min-width:0;
   width:100%;
   box-sizing:border-box;
 }
 .cliente-stage > .flex {
   min-height:30px;
   padding:7px 10px;
   border-radius:10px;
   background:color-mix(in srgb, var(--surface2) 72%, transparent);
   border:1px solid var(--border);
   font-weight:700;
   line-height:1.2;
 }
 .cliente-stage > .space-y-2 {
   display:flex;
   flex-direction:column;
   gap:12px;
   margin-top:10px;
 }
 .cliente-stage > .space-y-2 > div {
   min-width:0;
   width:100%;
   box-sizing:border-box;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded {
   padding:16px !important;
   border-radius:16px !important;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded > .flex.items-center.justify-between {
   gap:12px;
   min-width:0;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded > .flex.items-center.justify-between > div:first-child {
   min-width:0;
   flex:1;
 }
 .clientes-ui .cliente-stage .p-2\.5.rounded > .flex.items-center.justify-between > div:first-child > div:first-child {
   overflow-wrap:anywhere;
   word-break:break-word;
   line-height:1.35;
 }
 .cliente-stage-actions,
 .cliente-temp-actions {
   width:100%;
   min-width:0;
   display:grid !important;
   grid-template-columns:repeat(2,minmax(0,1fr));
   gap:8px !important;
 }
 .cliente-temp-actions { grid-template-columns:repeat(3,minmax(0,1fr)); }
 .cliente-pill,
 .cliente-temp-pill {
   min-width:0 !important;
   width:100%;
   box-sizing:border-box;
   white-space:normal !important;
   overflow:hidden;
   text-overflow:ellipsis;
   line-height:1.2;
   min-height:38px !important;
   padding:8px 7px !important;
   display:flex;
   align-items:center;
   justify-content:center;
   text-align:center;
   border:1px solid var(--border) !important;
   transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease, background-color .18s ease, color .18s ease !important;
 }
 /* Hover perceptível no light mode, sem depender apenas de mudança sutil de cor */
 .clientes-ui .cliente-pill:hover,
 .clientes-ui .cliente-temp-pill:hover {
   transform:translateY(-2px) !important;
   border-color:var(--ember) !important;
   box-shadow:0 5px 14px color-mix(in srgb, var(--ember) 22%, transparent) !important;
   filter:saturate(1.08) brightness(1.02);
 }
 .clientes-ui .cliente-pill:active,
 .clientes-ui .cliente-temp-pill:active {
   transform:translateY(0) scale(.97) !important;
 }
 /* Pills inativas ficam claramente interativas no tema claro */
 .clientes-ui .cliente-pill, .clientes-ui .cliente-temp-pill { cursor:pointer; }
 .clientes-ui .cliente-stage > .space-y-2 > div:hover {
   transform:translateY(-3px);
   border-color:color-mix(in srgb, var(--ember) 45%, var(--border)) !important;
   box-shadow:0 12px 28px color-mix(in srgb, var(--text) 10%, transparent) !important;
 }
 .clientes-ui .cliente-stage > .space-y-2 > div { transition:transform .2s ease, border-color .2s ease, box-shadow .2s ease; }
 @media (max-width:1199px) {
   .clientes-pipeline { grid-template-columns:repeat(3,minmax(0,1fr)); }
 }
 @media (max-width:800px) {
   .clientes-pipeline { grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
 }
 @media (max-width:560px) {
   .clientes-pipeline { grid-template-columns:1fr; }
   .cliente-stage-actions { grid-template-columns:repeat(2,minmax(0,1fr)); }
   .cliente-temp-actions { grid-template-columns:repeat(3,minmax(0,1fr)); }
 }

 /* ---------- Clientes: página inteira, colunas equilibradas ---------- */
 .clientes-ui {
   display:block;
   width:100%;
   max-width:none !important;
   padding:0 !important;
 }
 .clientes-ui > .mb-8 { width:100%; margin-bottom:22px !important; }
 .clientes-ui > .mb-8:first-child > div:last-child {
   width:100%;
   max-width:none !important;
 }
 .clientes-ui .clientes-pipeline {
   width:100%;
   grid-template-columns:repeat(5,minmax(0,1fr));
   gap:18px;
   align-items:stretch;
 }
 .clientes-ui .cliente-stage {
   display:flex;
   flex-direction:column;
   min-height:100%;
 }
 .clientes-ui .cliente-stage > .space-y-2 {
   flex:1;
 }
 .clientes-ui .cliente-stage > .flex {
   width:100%;
   box-sizing:border-box;
 }
 .clientes-ui .cliente-stage > .space-y-2:empty::after {
   content:'Nenhum cliente';
   display:block;
   min-height:72px;
   padding:18px;
   border:1px dashed var(--border);
   border-radius:16px;
   color:var(--muted2);
   text-align:center;
   font-size:12px;
   background:color-mix(in srgb, var(--surface) 70%, transparent);
 }
 .clientes-ui .cliente-stage > .space-y-2 > div {
   width:100%;
 }
 .clientes-ui .cliente-pill,
 .clientes-ui .cliente-temp-pill {
   white-space:nowrap !important;
   overflow:visible !important;
   text-overflow:clip !important;
   font-size:12px !important;
 }
 @media (min-width:1400px) {
   .clientes-ui .clientes-pipeline { gap:22px; }
   .clientes-ui .cliente-stage > .space-y-2 { gap:14px; }
 }
 @media (max-width:1199px) {
   .clientes-ui .clientes-pipeline { grid-template-columns:repeat(3,minmax(0,1fr)); }
 }
 @media (max-width:800px) {
   .clientes-ui .clientes-pipeline { grid-template-columns:repeat(2,minmax(0,1fr)); }
 }
 @media (max-width:560px) {
   .clientes-ui .clientes-pipeline { grid-template-columns:1fr; }
 }

 /* ---------- Layout em tela cheia: aproveita toda a área disponível ---------- */
 .max-w-3xl { max-width: none !important; width: 100% !important; }
 .pop { width: 100%; box-sizing: border-box; }
 .pop > .mb-8 { min-width: 0; }
 .pop > .mb-8 > div:not(.flex),
 .pop > .p-4.rounded { width: 100%; box-sizing: border-box; }
 @media (min-width: 768px) {
   .pop { grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px; }
 }
 @media (min-width: 1280px) {
   .pop { gap: 24px; }
 }
 /* Kanban ocupa toda a largura disponível */
 .pop .overflow-x-auto { width: 100%; box-sizing: border-box; }
 @media (min-width: 900px) {
   .pop .overflow-x-auto { grid-template-columns: repeat(5, minmax(0, 1fr)); }
 }
 /* Campos e blocos de conteúdo usam melhor o espaço horizontal */
 .pop textarea.w-full, .pop input.w-full, .pop select.w-full { width: 100%; }
 @media (min-width: 768px) {
   .pop .correlation-card { grid-template-columns: repeat(4, minmax(0, 1fr)); }
 }
 @media (max-width: 767px) {
   .pop { padding-bottom: 24px; }
 }
 @media (prefers-reduced-motion:reduce) {
   *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; transition-duration:.01ms !important; scroll-behavior:auto !important; }
 }
 `
    ),
    children
  );
}
