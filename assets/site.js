(() => {
'use strict';
// ---- Edit these for the real business ----
const PHONE = '2348162289022';           // WhatsApp number, international format, no "+"
const PHONE_DISPLAY = '+234 816 228 9022';
const BRAND = '4Sure Table Water';
// Product list. If the admin app has saved products in this browser, those are used instead.
const DEFAULT_PRODUCTS = [
  {name:'4Sure 75cl Bottle', size:'12 bottles / pack', price:1400, tag:'Bottled', chips:['75cl','Shops & offices']},
];
let products = DEFAULT_PRODUCTS;
try {
  const admin = JSON.parse(localStorage.getItem('4sure-table-water-v5'));
  if (admin && admin.products && admin.products.length) {
    products = admin.products.map(p => ({name:p.name, size:p.size, price:p.price, tag:'Bottled', chips:[p.size]}));
  }
} catch {}

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const wa = text => `https://wa.me/${PHONE}?text=${encodeURIComponent(text)}`;

// contact links
document.querySelectorAll('[data-phone]').forEach(a => { a.href = wa(`Hello ${BRAND}, I'd like to make an enquiry.`); if (a.textContent.includes('+')) a.textContent = PHONE_DISPLAY; });
document.querySelectorAll('[data-phone-tel]').forEach(a => { a.href = 'tel:+' + PHONE; if (a.textContent.includes('+')) a.textContent = PHONE_DISPLAY; });
$('#yr').textContent = new Date().getFullYear();

// product cards + select
$('#cards').innerHTML = products.map(p => `
  <article class="card reveal">
    <div class="pic photo"><span class="shot"><img src="assets/bottle-75cl.png" alt="${esc(p.name)}" loading="lazy"><i class="badge75">75cl</i></span></div>
    <div class="body">
      <span class="tag">${esc(p.tag)}</span><h3>${esc(p.name)}</h3><span class="pack">${esc(p.size)}</span>
      <div class="chips">${p.chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>
      <div class="price">₦${Number(p.price).toLocaleString('en-NG')} <small>per pack</small></div>
      <a class="btn" target="_blank" rel="noopener" href="${wa(`Hello ${BRAND}, I would like a quote for ${p.name}.`)}">Request Quote</a>
    </div>
  </article>`).join('');
$('#productSel').innerHTML = products.map(p => `<option>${esc(p.name)}</option>`).join('');

// order form -> WhatsApp
$('#orderForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target, v = n => f.elements[n].value.trim();
  let ok = true;
  ['name', 'phone'].forEach(n => { const bad = !v(n); f.elements[n].classList.toggle('invalid', bad); ok = ok && !bad; });
  if (!ok) { $('#formNote').textContent = 'Please enter your name and phone number.'; return; }
  $('#formNote').textContent = '';
  const msg = `Hello ${BRAND},\nI'd like to order:\n• ${v('qty') || 1} × ${v('product')}\nName: ${v('name')}\nPhone: ${v('phone')}\nArea: ${v('area') || '-'}${v('msg') ? '\nNote: ' + v('msg') : ''}`;
  window.open(wa(msg), '_blank', 'noopener');
});


// ---- videos (Cloudinary) ----
const CLD = 'https://res.cloudinary.com/de9weqldw/video/upload/';
const REELS = [
  {id:'v1793954269/VID-20261106-WA0001_j4anhn', title:'Pure to the last drop', tag:'Our promise'},
  {id:'v1793954276/VID-20261106-WA0002_j1ogb8', title:'A companion through the heat', tag:'Everyday hydration'},
  {id:'v1793954275/VID-20261106-WA0003_nsbox8', title:'4Sure on the move', tag:'Delivery'},
];
const mp4 = r => `${CLD}q_auto/${r.id}.mp4`;
$('#reels').innerHTML = REELS.map((r, i) => `
  <button class="reel reveal" data-i="${i}" aria-label="Play video: ${esc(r.title)}">
    <video muted loop playsinline preload="none" poster="${CLD}so_1,w_540,h_960,c_fill,g_auto,q_auto/${r.id}.jpg" data-src="${mp4(r)}"></video>
    <span class="reel-shade"></span>
    <span class="play"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span>
    <span class="reel-cap"><small>${esc(r.tag)}</small><b>${esc(r.title)}</b></span>
  </button>`).join('');

const canHover = matchMedia('(hover:hover)').matches;
document.querySelectorAll('.reel').forEach(card => {
  const v = $('video', card);
  const load = () => { if (!v.src) v.src = v.dataset.src; };
  if (canHover) {
    card.addEventListener('mouseenter', () => { load(); v.play().catch(() => {}); card.classList.add('live'); });
    card.addEventListener('mouseleave', () => { v.pause(); card.classList.remove('live'); });
  }
  card.addEventListener('click', () => openVideo(REELS[+card.dataset.i]));
});

const lb = $('#lightbox'), lbv = $('#lbVideo');
function openVideo(r) { lbv.src = mp4(r); lb.hidden = false; document.body.style.overflow = 'hidden'; lbv.play().catch(() => {}); $('#lbClose').focus(); }
function closeVideo() { lbv.pause(); lbv.removeAttribute('src'); lbv.load(); lb.hidden = true; document.body.style.overflow = ''; }
$('#lbClose').onclick = closeVideo;
lb.addEventListener('click', e => { if (e.target === lb) closeVideo(); });
addEventListener('keydown', e => { if (e.key === 'Escape' && !lb.hidden) closeVideo(); });

// mobile nav
const nav = $('#nav'), burger = $('#burger');
burger.onclick = () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
nav.addEventListener('click', e => { if (e.target.tagName === 'A') { nav.classList.remove('open'); burger.setAttribute('aria-expanded', false); } });

// scroll reveal + active link + counters
const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), {threshold:.15});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

const links = [...nav.querySelectorAll('a:not(.cta)')];
const secs = links.map(a => $(a.getAttribute('href') === '#top' ? '.hero' : a.getAttribute('href')));
addEventListener('scroll', () => {
  let cur = 0; secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < 140) cur = i; });
  links.forEach((a, i) => a.classList.toggle('on', i === cur));
}, {passive:true});

const cio = new IntersectionObserver(es => es.forEach(en => {
  if (!en.isIntersecting) return; cio.unobserve(en.target);
  const el = en.target, end = +el.dataset.count, suf = el.dataset.suffix || (el.hasAttribute('data-plus') ? '+' : '');
  const t0 = performance.now();
  const tick = t => { const p = Math.min(1, (t - t0) / 1400); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))).toLocaleString() + suf; if (p < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}), {threshold:.6});
document.querySelectorAll('[data-count]').forEach(el => cio.observe(el));
})();
