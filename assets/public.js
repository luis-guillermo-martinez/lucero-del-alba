/* ============================================================
   Ballet Lucero del Alba — sitio público
   ============================================================ */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PALETA = ['#c9852b','#8a3220','#5c6b46','#7a5a2b','#37506b','#6b3752','#704a3a','#4c5a50'];
const colorFor = n => PALETA[[...String(n)].reduce((a,c)=>a+c.charCodeAt(0),0) % PALETA.length];
const iniciales = n => String(n).trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const monoHTML = (n,t) => '<span class="mono" style="background:'+colorFor(n)+';width:'+t+'px;height:'+t+'px"><b>'+esc(iniciales(n))+'</b></span>';
const fmtFecha = f => f ? new Date(String(f).slice(0,10)+'T12:00:00').toLocaleDateString('es-AR',{weekday:'long',day:'numeric',month:'long'}) : '';
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2800); }

let sb = null;
let S = { ballet:{}, evento:{}, sponsors:[] };

const configLista = () =>
  typeof SUPABASE_URL === 'string' && !SUPABASE_URL.includes('PEGÁ') &&
  typeof SUPABASE_ANON_KEY === 'string' && !SUPABASE_ANON_KEY.includes('PEGÁ');

function waLink(){
  const m = 'Hola! Quiero entradas anticipadas para el evento del Ballet Lucero del Alba' +
    (S.evento.fecha ? ' del ' + fmtFecha(S.evento.fecha) : '') + '.';
  return 'https://wa.me/' + (S.ballet.whatsapp || '') + '?text=' + encodeURIComponent(m);
}

function renderPublic(){
  const b = S.ballet, ev = S.evento;
  document.title = (b.nombre || 'Ballet Lucero del Alba') + ' — El primer brillo de la tradición';
  $('#hdr-nombre').textContent = b.nombre || 'Ballet Lucero del Alba';
  $('#ftr-nombre').textContent = b.nombre || 'Ballet Lucero del Alba';
  $('#ev-titulo').textContent = ev.titulo || '';
  $('#ev-desc').textContent = ev.descripcion || '';
  $('#ev-fecha').textContent = fmtFecha(ev.fecha);
  $('#ev-hora').textContent = ev.hora ? ev.hora + ' hs' : '';
  $('#ev-entrada').textContent = ev.entrada || '';
  ['hdr-wa','mnav-wa','hero-wa'].forEach(id => $('#'+id).href = waLink());
  $('#is-dir').textContent = b.direccion || ''; $('#is-hor').textContent = b.horarios || '';
  $('#is-tel').textContent = 'Entradas Anticipadas' + (b.telefono || '');
  $('#bl-desc').textContent = b.descripcion || '';
  $('#bl-dir').textContent = b.direccion || ''; $('#bl-hor').textContent = b.horarios || '';
  const t = $('#bl-tel'); t.textContent = b.telefono || ''; t.href = waLink();
  const m = $('#bl-mail'); m.textContent = b.email || ''; m.href = 'mailto:' + (b.email || '');
  const ct = $('#ct-tel'); ct.textContent = b.telefono || ''; ct.href = waLink();
  const cm = $('#ct-mail'); cm.textContent = b.email || ''; cm.href = 'mailto:' + (b.email || '');
  $('#ct-dir').textContent = b.direccion || ''; $('#ct-hor').textContent = b.horarios || '';
  $('#ct-soc').innerHTML =
    (b.instagram ? '<a href="'+esc(b.instagram)+'" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg></a>' : '') +
    (b.facebook ? '<a href="'+esc(b.facebook)+'" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h2.5V5H14a4 4 0 0 0-4 4v2H7.5v3H10v7h3v-7h2.5l.5-3H13V9a1 1 0 0 1 1-1z"/></svg></a>' : '') +
    '<a href="'+waLink()+'" target="_blank" rel="noopener" aria-label="WhatsApp"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z"/><path d="M9 8.5c.4 3 3.5 6 6.3 6.4l.7-1.6-2-1-.8.8c-1-.4-2.3-1.7-2.7-2.7l.8-.8-1-2z" fill="currentColor" stroke="none"/></svg></a>';
  renderCarousel();
}

function renderCarousel(){
  const track = $('#sp-track');
  if(!S.sponsors.length){ track.innerHTML = '<p class="empty" style="width:100%">Pronto vas a ver a nuestros auspiciantes por acá.</p>'; return; }
  const card = sp => {
    const inner = (sp.logo
      ? '<span class="sp-img"><img src="'+sp.logo+'" alt="Logo de '+esc(sp.nombre)+'" loading="lazy"></span>'
      : '<span class="sp-img">'+monoHTML(sp.nombre,64)+'</span>') + '<b>'+esc(sp.nombre)+'</b>';
    return sp.link ? '<a class="sp" href="'+esc(sp.link)+'" target="_blank" rel="noopener">'+inner+'</a>' : '<div class="sp">'+inner+'</div>';
  };
  let items = S.sponsors.slice();
  while(items.length < 8) items = items.concat(S.sponsors);
  const html = items.map(card).join('');
  track.innerHTML = '<div class="sp-group">'+html+'</div><div class="sp-group" aria-hidden="true">'+html+'</div>';
  track.style.setProperty('--dur', Math.max(30, items.length * 5) + 's');
}

function startCountdown(){
  const el = { d:$('#cd-d'), h:$('#cd-h'), m:$('#cd-m'), s:$('#cd-s') };
  if(!S.evento.fecha){ el.d.textContent='—'; el.h.textContent='—'; el.m.textContent='—'; el.s.textContent='—'; return; }
  const tick = () => {
    const target = new Date(String(S.evento.fecha).slice(0,10) + 'T' + (S.evento.hora || '21:00') + ':00');
    let diff = target - Date.now();
    if(diff <= 0){ el.d.textContent='¡ES'; el.h.textContent='ESTA'; el.m.textContent='NO'; el.s.textContent='CHE!'; return; }
    el.d.textContent = Math.floor(diff/864e5);
    el.h.textContent = String(Math.floor(diff/36e5)%24).padStart(2,'0');
    el.m.textContent = String(Math.floor(diff/6e4)%60).padStart(2,'0');
    el.s.textContent = String(Math.floor(diff/1e3)%60).padStart(2,'0');
  };
  tick(); setInterval(tick, 1000);
}

addEventListener('scroll', () => $('#hdr').classList.toggle('scrolled', scrollY > 40), {passive:true});
$('#burger').addEventListener('click', () => {
  const open = $('#mnav').classList.toggle('open');
  $('#burger').classList.toggle('x', open);
});
$$('#mnav a').forEach(a => a.addEventListener('click', () => $('#mnav').classList.remove('open')));

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = $('#f-nom').value.trim(), telefono = $('#f-tel').value.trim(), mensaje = $('#f-msg').value.trim();
  if(!nombre || !mensaje){ toast('◆ Completá tu nombre y el mensaje'); return; }
  const { error } = await sb.from('mensajes').insert({ nombre, telefono, mensaje });
  if(error){ toast('◆ No se pudo enviar, probá de nuevo'); return; }
  e.target.reset(); toast('✦ ¡Mensaje enviado! Te respondemos pronto.');
});

async function cargar(){
  if(!configLista()){
    $('#ev-titulo').textContent = 'Configuración pendiente';
    $('#ev-desc').textContent = 'Para conectar el sitio, completá el archivo assets/config.js con la URL y la anon key de tu proyecto Supabase (Project Settings → API).';
    return;
  }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const [c, e, a] = await Promise.all([
    sb.from('configuracion').select('*').eq('id', 1).single(),
    sb.from('eventos').select('*').order('creado_en', { ascending:false }).limit(1).maybeSingle(),
    sb.from('auspiciantes').select('*').order('orden', { ascending:true })
  ]);
  if(c.error){ toast('◆ Error de conexión con Supabase: revisá assets/config.js'); return; }
  S.ballet = c.data || {}; S.evento = e.data || {}; S.sponsors = a.data || [];
  renderPublic(); startCountdown();
}
cargar();