/* ============================================================
   Ballet Lucero del Alba — panel de administración
   ============================================================ */
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PALETA = ['#c9852b','#8a3220','#5c6b46','#7a5a2b','#37506b','#6b3752','#704a3a','#4c5a50'];
const colorFor = n => PALETA[[...String(n)].reduce((a,c)=>a+c.charCodeAt(0),0) % PALETA.length];
const iniciales = n => String(n).trim().split(/\s+/).slice(0,2).map(w=>w[0]||'').join('').toUpperCase();
const monoHTML = (n,t) => '<span class="mono" style="background:'+colorFor(n)+';width:'+t+'px;height:'+t+'px"><b>'+esc(iniciales(n))+'</b></span>';
function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(()=>t.classList.remove('show'),2800); }
function confirmar(txt){ return new Promise(res => {
  const m=$('#modal'); $('#modal-txt').textContent=txt; m.classList.add('open');
  $('#modal-yes').onclick=()=>{m.classList.remove('open');res(true)};
  $('#modal-no').onclick=()=>{m.classList.remove('open');res(false)};
});}
function comprimir(file, max){ return new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = ev => { const img = new Image();
    img.onload = () => { const sc = Math.min(1, max/Math.max(img.width,img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width*sc); c.height = Math.round(img.height*sc);
      c.getContext('2d').drawImage(img,0,0,c.width,c.height);
      let out = c.toDataURL('image/webp',.85); if(!out.startsWith('data:image')) out = c.toDataURL('image/jpeg',.85);
      res(out); };
    img.onerror = rej; img.src = ev.target.result; };
  r.onerror = rej; r.readAsDataURL(file);
});}

let sb = null;
let S = { ballet:{}, evento:null, sponsors:[], mensajes:[] };
let editId = null, pendingImg = null;

const configLista = () =>
  typeof SUPABASE_URL === 'string' && !SUPABASE_URL.includes('PEGÁ') &&
  typeof SUPABASE_ANON_KEY === 'string' && !SUPABASE_ANON_KEY.includes('PEGÁ');

/* ---------- sesión ---------- */
async function init(){
  if(!configLista()){
    $('#lg-err').textContent = '◆ Falta completar assets/config.js con tus datos de Supabase.';
    return;
  }
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await sb.auth.getSession();
  if(data.session) await entrar(false);
}
function mostrar(logged){ $('#login').hidden = logged; $('#panel').hidden = !logged; }
async function entrar(avisar = true){
  mostrar(true);
  await loadAll();
  if(avisar) toast('✦ Bienvenido al panel');
}
$('#lg-form').addEventListener('submit', async e => {
  e.preventDefault();
  const { error } = await sb.auth.signInWithPassword({
    email: $('#lg-email').value.trim(),
    password: $('#lg-pass').value
  });
  if(error){ $('#lg-err').textContent = '◆ Correo o contraseña incorrectos.'; return; }
  $('#lg-err').textContent = ''; e.target.reset();
  await entrar();
});
$('#logout').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });

/* ---------- carga de datos ---------- */
async function loadAll(){
  const [c, ev, sp, ms] = await Promise.all([
    sb.from('configuracion').select('*').eq('id', 1).single(),
    sb.from('eventos').select('*').order('creado_en', { ascending:false }).limit(1).maybeSingle(),
    sb.from('auspiciantes').select('*').order('orden', { ascending:true }),
    sb.from('mensajes').select('*').order('creado_en', { ascending:false })
  ]);
  if(c.error){ toast('◆ Error al cargar datos: ' + c.error.message); return; }
  S.ballet = c.data || {}; S.evento = ev.data; S.sponsors = sp.data || []; S.mensajes = ms.data || [];
  $('#abar-nombre').textContent = S.ballet.nombre || 'Ballet Lucero del Alba';
  renderSponsors(); renderMsgs(); fillForm();
}

/* ---------- tabs ---------- */
$$('.atab').forEach(b => b.addEventListener('click', () => {
  $$('.atab').forEach(x => x.classList.remove('on')); b.classList.add('on');
  $$('.apanel').forEach(p => p.classList.remove('on'));
  $('#tab-' + b.dataset.tab).classList.add('on');
}));

/* ---------- auspiciantes ---------- */
function renderSponsors(){
  const list = $('#sp-list');
  if(!S.sponsors.length){ list.innerHTML = '<p class="empty">Todavía no hay auspiciantes. Cargá el primero arriba.</p>'; return; }
  list.innerHTML = S.sponsors.map((sp,i) => {
    const thumb = sp.logo ? '<img class="thumb" src="'+sp.logo+'" alt="">' : monoHTML(sp.nombre,40);
    return '<div class="arow">'+thumb+
      '<div class="info"><b>'+esc(sp.nombre)+'</b><span>'+esc(sp.link||'sin enlace')+'</span></div>'+
      '<div class="ord"><button class="ibtn" data-act="up" data-id="'+sp.id+'" '+(i===0?'disabled':'')+'>▲</button>'+
      '<button class="ibtn" data-act="down" data-id="'+sp.id+'" '+(i===S.sponsors.length-1?'disabled':'')+'>▼</button></div>'+
      '<div class="acts"><button class="ibtn" data-act="edit" data-id="'+sp.id+'" title="Editar">✎</button>'+
      '<button class="ibtn del" data-act="del" data-id="'+sp.id+'" title="Eliminar">✕</button></div></div>';
  }).join('');
}
function renderPrev(){
  const box = $('#sp-prev'), nom = $('#sp-nombre').value || 'Logo';
  if(pendingImg) box.innerHTML = '<img src="'+pendingImg+'" alt="Vista previa">';
  else if(editId){ const sp = S.sponsors.find(s=>s.id===editId); box.innerHTML = sp && sp.logo ? '<img src="'+sp.logo+'" alt="">' : monoHTML(nom,56); }
  else box.innerHTML = monoHTML(nom,56);
}
$('#sp-file').addEventListener('change', e => { const f = e.target.files[0]; if(f) comprimir(f,700).then(d => { pendingImg = d; renderPrev(); }); });
$('#sp-nombre').addEventListener('input', () => { if(!pendingImg) renderPrev(); });
function resetSpForm(){
  editId = null; pendingImg = null; $('#sp-form').reset();
  $('#sp-form-title').textContent = 'Nuevo auspiciante';
  $('#sp-submit').textContent = 'Guardar auspiciante'; $('#sp-cancel').hidden = true; renderPrev();
}
$('#sp-cancel').addEventListener('click', resetSpForm);

$('#sp-form').addEventListener('submit', async e => {
  e.preventDefault();
  const nombre = $('#sp-nombre').value.trim();
  if(!nombre){ toast('◆ El nombre es obligatorio'); return; }
  const data = { nombre, link:$('#sp-link').value.trim(), telefono:$('#sp-tel').value.trim(),
    logo: pendingImg || (editId ? (S.sponsors.find(s=>s.id===editId)||{}).logo || '' : '') };
  let r;
  if(editId) r = await sb.from('auspiciantes').update(data).eq('id', editId);
  else {
    const orden = S.sponsors.length ? Math.max(...S.sponsors.map(s=>s.orden||0)) + 1 : 1;
    r = await sb.from('auspiciantes').insert({ ...data, orden });
  }
  if(r.error){ toast('◆ Error al guardar: ' + r.error.message); return; }
  resetSpForm(); await loadAll();
  toast('✦ Auspiciante guardado y publicado en el carrusel');
});

async function guardarOrden(){
  await Promise.all(S.sponsors.map((s,idx) => sb.from('auspiciantes').update({ orden: idx + 1 }).eq('id', s.id)));
  await loadAll(); toast('Orden del carrusel actualizado');
}

$('#sp-list').addEventListener('click', async e => {
  const b = e.target.closest('button[data-act]'); if(!b) return;
  const i = S.sponsors.findIndex(s => s.id === Number(b.dataset.id)); if(i < 0) return;
  const sp = S.sponsors[i], act = b.dataset.act;
  if(act==='up' && i>0){ [S.sponsors[i-1],S.sponsors[i]]=[S.sponsors[i],S.sponsors[i-1]]; await guardarOrden(); }
  if(act==='down' && i<S.sponsors.length-1){ [S.sponsors[i+1],S.sponsors[i]]=[S.sponsors[i],S.sponsors[i+1]]; await guardarOrden(); }
  if(act==='edit'){
    editId = sp.id; pendingImg = null;
    $('#sp-nombre').value = sp.nombre; $('#sp-link').value = sp.link||''; $('#sp-tel').value = sp.telefono||''; $('#sp-file').value = '';
    $('#sp-form-title').textContent = 'Editando: ' + sp.nombre;
    $('#sp-submit').textContent = 'Guardar cambios'; $('#sp-cancel').hidden = false;
    renderPrev(); window.scrollTo({ top: $('#tab-ausp').offsetTop, behavior:'smooth' });
  }
  if(act==='del' && await confirmar('¿Eliminar a "'+sp.nombre+'" del carrusel?')){
    const { error } = await sb.from('auspiciantes').delete().eq('id', sp.id);
    if(error) return toast('◆ ' + error.message);
    if(editId===sp.id) resetSpForm();
    await loadAll(); toast('Auspiciante eliminado');
  }
});

/* ---------- ballet y evento ---------- */
function fillForm(){
  const b = S.ballet, ev = S.evento || {};
  $('#fv-titulo').value = ev.titulo||''; $('#fv-desc').value = ev.descripcion||'';
  $('#fv-fecha').value = ev.fecha ? String(ev.fecha).slice(0,10) : '';
  $('#fv-hora').value = ev.hora||''; $('#fv-entrada').value = ev.entrada||'';
  $('#fp-nombre').value = b.nombre||''; $('#fp-tel').value = b.telefono||''; $('#fp-wa').value = b.whatsapp||'';
  $('#fp-mail').value = b.email||''; $('#fp-dir').value = b.direccion||''; $('#fp-hor').value = b.horarios||'';
  $('#fp-desc').value = b.descripcion||''; $('#fp-ig').value = b.instagram||''; $('#fp-fb').value = b.facebook||'';
}
$('#p-form').addEventListener('submit', async e => {
  e.preventDefault();
  const ballet = {
    nombre: $('#fp-nombre').value.trim() || 'Ballet Lucero del Alba',
    telefono: $('#fp-tel').value.trim(),
    whatsapp: $('#fp-wa').value.replace(/\D/g,''),
    email: $('#fp-mail').value.trim(),
    direccion: $('#fp-dir').value.trim(),
    horarios: $('#fp-hor').value.trim(),
    descripcion: $('#fp-desc').value.trim(),
    instagram: $('#fp-ig').value.trim(),
    facebook: $('#fp-fb').value.trim()
  };
  const ev = {
    titulo: $('#fv-titulo').value.trim(),
    fecha: $('#fv-fecha').value,
    hora: $('#fv-hora').value,
    entrada: $('#fv-entrada').value.trim(),
    descripcion: $('#fv-desc').value.trim()
  };
  const r1 = await sb.from('configuracion').update(ballet).eq('id', 1);
  const r2 = S.evento
    ? await sb.from('eventos').update(ev).eq('id', S.evento.id)
    : await sb.from('eventos').insert(ev);
  if(r1.error || r2.error) return toast('◆ Error al guardar');
  await loadAll(); toast('✦ Cambios publicados en el sitio');
});

/* ---------- mensajes ---------- */
function renderMsgs(){
  const nuevos = S.mensajes.filter(m => !m.leido).length;
  const badge = $('#msg-badge'); badge.hidden = !nuevos; badge.textContent = nuevos;
  const list = $('#msg-list');
  if(!S.mensajes.length){ list.innerHTML = '<p class="empty">Todavía no llegaron mensajes.</p>'; return; }
  list.innerHTML = S.mensajes.map(m =>
    '<div class="msg '+(m.leido?'':'nuevo')+'"><div class="head"><b>'+esc(m.nombre)+(m.leido?'':' <span style="color:var(--gold);font-size:.7rem">◆ NUEVO</span>')+'</b><small>'+new Date(m.creado_en).toLocaleString('es-AR')+'</small></div>'+
    (m.telefono?'<p class="tel">☏ '+esc(m.telefono)+'</p>':'')+'<p>'+esc(m.mensaje)+'</p>'+
    '<div class="acts"><button class="btn btn-ghost btn-sm" data-m="leer" data-id="'+m.id+'">'+(m.leido?'Marcar no leído':'Marcar leído')+'</button>'+
    '<button class="btn btn-red btn-sm" data-m="del" data-id="'+m.id+'">Eliminar</button></div></div>'
  ).join('');
}
$('#msg-list').addEventListener('click', async e => {
  const b = e.target.closest('button[data-m]'); if(!b) return;
  const id = Number(b.dataset.id);
  if(b.dataset.m==='leer'){
    const m = S.mensajes.find(x => x.id === id);
    await sb.from('mensajes').update({ leido: !m.leido }).eq('id', id);
    await loadAll();
  }
  if(b.dataset.m==='del' && await confirmar('¿Eliminar este mensaje?')){
    await sb.from('mensajes').delete().eq('id', id);
    await loadAll(); toast('Mensaje eliminado');
  }
});

/* ---------- ajustes ---------- */
$('#pass-form').addEventListener('submit', async e => {
  e.preventDefault();
  const n1 = $('#aj-new').value, n2 = $('#aj-new2').value;
  if(n1.length < 6) return toast('◆ La contraseña necesita al menos 6 caracteres');
  if(n1 !== n2) return toast('◆ Las contraseñas no coinciden');
  const { error } = await sb.auth.updateUser({ password: n1 });
  if(error) return toast('◆ ' + error.message);
  e.target.reset(); toast('✦ Contraseña actualizada');
});
$('#btn-export').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type:'application/json' }));
  a.download = 'lucero-del-alba-respaldo.json'; a.click(); URL.revokeObjectURL(a.href);
  toast('⬇ Respaldo descargado');
});

init();