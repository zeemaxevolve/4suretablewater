(() => {
'use strict';
const KEY = '4sure-table-water-v5';
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => '₦' + Number(n || 0).toLocaleString('en-NG');
const today = () => new Date().toISOString().slice(0, 10);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate = d => new Date(d + 'T00:00').toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'});

/* ---------- Data ---------- */
function seed() {
  const d = n => { const x = new Date(); x.setDate(x.getDate() - n); return x.toISOString().slice(0, 10); };
  const products = [
    {id:'p3', name:'4Sure 75cl Bottle', size:'12 bottles / pack', price:1400, stock:220, reorder:50},
  ];
  const customers = [
    {id:'c1', name:'Greenfield Supermarket', phone:'08031234567', address:'12 Allen Ave, Ikeja', type:'Retailer'},
    {id:'c2', name:'Adaeze Okafor', phone:'08057654321', address:'5 Palm Close, Lekki', type:'Individual'},
    {id:'c3', name:'Sunrise Hotel', phone:'08099887766', address:'Plot 8, Airport Rd', type:'Corporate'},
    {id:'c4', name:'Mama Tolu Provisions', phone:'07011223344', address:'Ojota Market', type:'Retailer'},
  ];
  const mk = (n, c, items, status) => ({id:'o' + n, date:d(n * 2), customerId:c, items, status});
  const orders = [
    mk(1,'c1',[{productId:'p3',qty:50}],'Delivered'),
    mk(2,'c3',[{productId:'p3',qty:15}],'Paid'),
    mk(3,'c2',[{productId:'p3',qty:3}],'Pending'),
    mk(4,'c4',[{productId:'p3',qty:25}],'Delivered'),
    mk(5,'c1',[{productId:'p3',qty:8}],'Delivered'),
    mk(6,'c3',[{productId:'p3',qty:25}],'Delivered'),
    mk(7,'c4',[{productId:'p3',qty:30}],'Delivered'),
  ];
  return {products, customers, orders};
}
let db;
try { db = JSON.parse(localStorage.getItem(KEY)); } catch { db = null; }
if (!db) db = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} };
const prod = id => db.products.find(p => p.id === id);
const cust = id => db.customers.find(c => c.id === id);
const orderTotal = o => o.items.reduce((s, i) => s + (prod(i.productId)?.price || 0) * i.qty, 0);
const customerName = id => cust(id)?.name || '— deleted —';

/* ---------- UI helpers ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200); }
const badge = (text, kind) => `<span class="badge b-${kind}">${esc(text)}</span>`;
const statusBadge = s => badge(s, {Pending:'warn', Paid:'info', Delivered:'ok'}[s] || 'info');

function openModal(title, bodyHtml, onSubmit, after) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  const m = $('#modal'); m.hidden = false;
  $('#modalForm').onsubmit = e => { e.preventDefault(); if (onSubmit(new FormData(e.target), e.target) !== false) closeModal(); };
  after && after();
  const f = $('#modalBody').querySelector('input,select'); f && f.focus();
}
const closeModal = () => { $('#modal').hidden = true; };
$('#modalClose').onclick = $('#modalCancel').onclick = closeModal;
$('#modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

const field = (label, name, val = '', attrs = '') => `<label>${label}<input name="${name}" value="${esc(val)}" ${attrs}></label>`;
const select = (label, name, opts, val) => `<label>${label}<select name="${name}">${opts.map(o => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${v === val ? 'selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;

/* ---------- Generic data table ---------- */
const tableState = {};
function dataTable(key, {rows, cols, search, filters = [], onEdit, onDelete, csvName}) {
  const st = tableState[key] ||= {q:'', sort:null, dir:1, page:1, f:{}};
  const PAGE = 8;
  const el = document.createElement('div');
  const render = () => {
    let data = rows.filter(r => (!st.q || search(r).toLowerCase().includes(st.q.toLowerCase())) &&
      filters.every(f => !st.f[f.name] || f.get(r) === st.f[f.name]));
    if (st.sort != null) {
      const c = cols[st.sort];
      data = [...data].sort((a, b) => { const x = c.val(a), y = c.val(b); return (x > y ? 1 : x < y ? -1 : 0) * st.dir; });
    }
    const pages = Math.max(1, Math.ceil(data.length / PAGE));
    st.page = Math.min(st.page, pages);
    const slice = data.slice((st.page - 1) * PAGE, st.page * PAGE);
    el.innerHTML = `
      <div class="toolbar">
        <input type="search" placeholder="Search…" value="${esc(st.q)}" id="q-${key}">
        ${filters.map(f => `<select data-f="${f.name}"><option value="">${f.label}: All</option>${f.options.map(o => `<option ${st.f[f.name] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`).join('')}
        <button class="btn" data-csv>Export CSV</button>
      </div>
      <div class="table-wrap"><table><thead><tr>
        ${cols.map((c, i) => `<th data-s="${i}" class="${c.num ? 'num' : ''}">${c.label}<span class="arr">${st.sort === i ? (st.dir > 0 ? '▲' : '▼') : ''}</span></th>`).join('')}
        <th class="nosort"></th></tr></thead><tbody>
        ${slice.map(r => `<tr>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.html ? c.html(r) : esc(c.val(r))}</td>`).join('')}
          <td class="actions">${onEdit ? `<button class="btn small" data-edit="${r.id}">Edit</button> ` : ''}<button class="btn small danger" data-del="${r.id}">Delete</button></td></tr>`).join('')}
        </tbody></table>${slice.length ? '' : '<div class="empty">No records found.</div>'}</div>
      <div class="pager"><span>${data.length} record${data.length === 1 ? '' : 's'}</span>
        <div><button class="btn small" data-p="-1" ${st.page <= 1 ? 'disabled' : ''}>Prev</button><span>Page ${st.page} / ${pages}</span><button class="btn small" data-p="1" ${st.page >= pages ? 'disabled' : ''}>Next</button></div></div>`;
    const q = $('input[type=search]', el);
    q.oninput = () => { st.q = q.value; st.page = 1; const pos = q.selectionStart; render(); const n = $('input[type=search]', el); n.focus(); n.setSelectionRange(pos, pos); };
    el.querySelectorAll('[data-f]').forEach(s => s.onchange = () => { st.f[s.dataset.f] = s.value; st.page = 1; render(); });
    el.querySelectorAll('th[data-s]').forEach(h => h.onclick = () => { const i = +h.dataset.s; st.dir = st.sort === i ? -st.dir : 1; st.sort = i; render(); });
    el.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { st.page += +b.dataset.p; render(); });
    el.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => onEdit(b.dataset.edit));
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('Delete this record?')) onDelete(b.dataset.del); });
    $('[data-csv]', el).onclick = () => exportCsv(csvName, cols, data);
  };
  render();
  return el;
}
function exportCsv(name, cols, data) {
  const cell = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const csv = [cols.map(c => cell(c.label)).join(','), ...data.map(r => cols.map(c => cell(c.val(r))).join(','))].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], {type:'text/csv'}));
  a.download = `${name}-${today()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  toast('CSV exported');
}

/* ---------- Views ---------- */
const views = {};
const addBtn = (label, fn) => { const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = label; b.onclick = fn; $('#topActions').append(b); };

views.dashboard = (root) => {
  const sales = db.orders.reduce((s, o) => s + orderTotal(o), 0);
  const pending = db.orders.filter(o => o.status === 'Pending');
  const low = db.products.filter(p => p.stock <= p.reorder);
  // revenue for last 6 months
  const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 5 + i); return {k:d.toISOString().slice(0, 7), l:d.toLocaleString('en', {month:'short'}), v:0}; });
  db.orders.forEach(o => { const m = months.find(x => x.k === o.date.slice(0, 7)); if (m) m.v += orderTotal(o); });
  const max = Math.max(1, ...months.map(m => m.v));
  const top = {};
  db.orders.forEach(o => o.items.forEach(i => top[i.productId] = (top[i.productId] || 0) + i.qty));
  const topList = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
  root.innerHTML = `
    <div class="grid stats">
      <div class="card stat"><div class="label">Total sales</div><div class="value">${money(sales)}</div><div class="sub">${db.orders.length} orders</div></div>
      <div class="card stat"><div class="label">Pending orders</div><div class="value">${pending.length}</div><div class="sub">${money(pending.reduce((s, o) => s + orderTotal(o), 0))} outstanding</div></div>
      <div class="card stat"><div class="label">Customers</div><div class="value">${db.customers.length}</div><div class="sub">registered</div></div>
      <div class="card stat"><div class="label">Low stock items</div><div class="value" style="color:${low.length ? 'var(--bad)' : 'var(--ok)'}">${low.length}</div><div class="sub">at or below reorder level</div></div>
    </div>
    <div class="grid two">
      <div class="card"><h3>Revenue — last 6 months</h3><div class="bars">${months.map(m => `<div class="bar" title="${money(m.v)}"><i style="height:${m.v / max * 100}%"></i>${m.l}</div>`).join('')}</div></div>
      <div class="card"><h3>Top selling products</h3>${topList.length ? topList.map(([id, q]) => `<p style="margin:6px 0;display:flex;justify-content:space-between"><span>${esc(prod(id)?.name || 'Deleted')}</span><b>${q}</b></p>`).join('') : '<div class="empty">No sales yet</div>'}</div>
    </div>
    <div class="card" style="margin-top:16px"><h3>Stock alerts</h3>${low.length ? low.map(p => `<p style="margin:6px 0">${badge('Low', 'bad')} ${esc(p.name)} — <b>${p.stock}</b> left (reorder at ${p.reorder})</p>`).join('') : '<span style="color:var(--muted)">All products are sufficiently stocked.</span>'}</div>`;
};

views.products = (root) => {
  const form = (p = {}) => `${field('Product name', 'name', p.name, 'required')}${field('Pack size', 'size', p.size)}
    <div class="row">${field('Price (₦)', 'price', p.price ?? '', 'type="number" min="0" required')}${field('Reorder level', 'reorder', p.reorder ?? 20, 'type="number" min="0" required')}</div>
    ${p.id ? '' : field('Opening stock', 'stock', 0, 'type="number" min="0"')}`;
  const edit = id => {
    const p = id ? prod(id) : {};
    openModal(id ? 'Edit product' : 'New product', form(p), fd => {
      const v = {name:fd.get('name').trim(), size:fd.get('size').trim(), price:+fd.get('price'), reorder:+fd.get('reorder')};
      if (id) Object.assign(p, v); else db.products.push({id:uid(), stock:+fd.get('stock') || 0, ...v});
      save(); toast('Product saved'); go();
    });
  };
  addBtn('+ New product', () => edit());
  root.append(dataTable('products', {
    rows: db.products, csvName: 'products', search: p => p.name + p.size, onEdit: edit,
    onDelete: id => { db.products = db.products.filter(p => p.id !== id); save(); go(); },
    cols: [
      {label:'Product', val:p => p.name}, {label:'Pack', val:p => p.size},
      {label:'Price', num:true, val:p => p.price, html:p => money(p.price)},
      {label:'In stock', num:true, val:p => p.stock},
      {label:'Status', val:p => p.stock <= p.reorder ? 'Low' : 'OK', html:p => p.stock <= p.reorder ? badge('Low stock', 'bad') : badge('In stock', 'ok')},
    ]}));
};

views.customers = (root) => {
  const types = ['Individual', 'Retailer', 'Corporate'];
  const edit = id => {
    const c = id ? cust(id) : {};
    openModal(id ? 'Edit customer' : 'New customer',
      `${field('Name', 'name', c.name, 'required')}${field('Phone', 'phone', c.phone, 'type="tel"')}${field('Address', 'address', c.address)}${select('Type', 'type', types, c.type)}`,
      fd => { const v = {name:fd.get('name').trim(), phone:fd.get('phone').trim(), address:fd.get('address').trim(), type:fd.get('type')};
        if (id) Object.assign(c, v); else db.customers.push({id:uid(), ...v}); save(); toast('Customer saved'); go(); });
  };
  addBtn('+ New customer', () => edit());
  const spent = c => db.orders.filter(o => o.customerId === c.id).reduce((s, o) => s + orderTotal(o), 0);
  root.append(dataTable('customers', {
    rows: db.customers, csvName: 'customers', search: c => c.name + c.phone + c.address, onEdit: edit,
    filters: [{name:'type', label:'Type', options:types, get:c => c.type}],
    onDelete: id => { db.customers = db.customers.filter(c => c.id !== id); save(); go(); },
    cols: [
      {label:'Name', val:c => c.name}, {label:'Phone', val:c => c.phone}, {label:'Address', val:c => c.address},
      {label:'Type', val:c => c.type, html:c => badge(c.type, 'info')},
      {label:'Total spent', num:true, val:spent, html:c => money(spent(c))},
    ]}));
};

views.orders = (root) => {
  const statuses = ['Pending', 'Paid', 'Delivered'];
  const edit = id => {
    const o = id ? db.orders.find(x => x.id === id) : {items:[{productId:db.products[0]?.id, qty:1}], date:today(), status:'Pending'};
    if (!db.customers.length || !db.products.length) return toast('Add at least one customer and product first');
    let lines = o.items.map(i => ({...i}));
    const body = `<div class="row">${select('Customer', 'customerId', db.customers.map(c => [c.id, c.name]), o.customerId)}${field('Date', 'date', o.date, 'type="date" required')}</div>
      ${select('Status', 'status', statuses, o.status)}
      <div><b style="font-size:13px">Items</b><div id="lines"></div><button type="button" class="btn small" id="addLine">+ Add item</button></div>
      <div class="total" id="ototal"></div><div class="err" id="oerr"></div>`;
    const draw = () => {
      $('#lines').innerHTML = lines.map((l, i) => `<div class="line"><select data-i="${i}" data-k="productId">${db.products.map(p => `<option value="${p.id}" ${p.id === l.productId ? 'selected' : ''}>${esc(p.name)} — ${money(p.price)} (${p.stock} in stock)</option>`).join('')}</select>
        <input type="number" min="1" value="${l.qty}" data-i="${i}" data-k="qty"><button type="button" class="x" data-rm="${i}">×</button></div>`).join('');
      $('#ototal').textContent = 'Total: ' + money(lines.reduce((s, l) => s + (prod(l.productId)?.price || 0) * l.qty, 0));
      $('#lines').querySelectorAll('[data-k]').forEach(e => e.onchange = () => { lines[+e.dataset.i][e.dataset.k] = e.dataset.k === 'qty' ? Math.max(1, +e.value) : e.value; draw(); });
      $('#lines').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { if (lines.length > 1) { lines.splice(+b.dataset.rm, 1); draw(); } });
    };
    openModal(id ? 'Edit order' : 'New order', body, fd => {
      // stock accounting: restore the old order's stock, then deduct the new one
      const restore = id ? o.items : [];
      const need = {};
      lines.forEach(l => need[l.productId] = (need[l.productId] || 0) + l.qty);
      const avail = pid => (prod(pid)?.stock || 0) + restore.filter(i => i.productId === pid).reduce((s, i) => s + i.qty, 0);
      const short = Object.keys(need).find(pid => need[pid] > avail(pid));
      if (short) { $('#oerr').textContent = `Not enough stock for ${prod(short).name} (available: ${avail(short)})`; return false; }
      restore.forEach(i => { const p = prod(i.productId); if (p) p.stock += i.qty; });
      lines.forEach(l => { prod(l.productId).stock -= l.qty; });
      const v = {customerId:fd.get('customerId'), date:fd.get('date'), status:fd.get('status'), items:lines.map(l => ({...l}))};
      if (id) Object.assign(o, v); else db.orders.unshift({id:uid(), ...v});
      save(); toast('Order saved'); go();
    }, () => { draw(); $('#addLine').onclick = () => { lines.push({productId:db.products[0].id, qty:1}); draw(); }; });
  };
  addBtn('+ New order', () => edit());
  root.append(dataTable('orders', {
    rows: db.orders, csvName: 'orders', onEdit: edit,
    search: o => customerName(o.customerId) + o.status + o.id,
    filters: [{name:'status', label:'Status', options:statuses, get:o => o.status}],
    onDelete: id => { const o = db.orders.find(x => x.id === id); o.items.forEach(i => { const p = prod(i.productId); if (p) p.stock += i.qty; }); db.orders = db.orders.filter(x => x.id !== id); save(); toast('Order deleted, stock restored'); go(); },
    cols: [
      {label:'Order #', val:o => o.id.slice(-5).toUpperCase()},
      {label:'Date', val:o => o.date, html:o => fmtDate(o.date)},
      {label:'Customer', val:o => customerName(o.customerId)},
      {label:'Items', val:o => o.items.map(i => `${i.qty}× ${prod(i.productId)?.name || '?'}`).join('; ')},
      {label:'Total', num:true, val:orderTotal, html:o => money(orderTotal(o))},
      {label:'Status', val:o => o.status, html:o => statusBadge(o.status)},
    ]}));
};

/* ---------- Router ---------- */
function go() {
  const name = (location.hash.slice(1) in views) ? location.hash.slice(1) : 'dashboard';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === name));
  $('#title').textContent = name[0].toUpperCase() + name.slice(1);
  $('#topActions').innerHTML = '';
  const root = $('#view'); root.innerHTML = '';
  views[name](root);
  $('#sidebar').classList.remove('open');
}
window.addEventListener('hashchange', go);
$('#menuBtn').onclick = () => $('#sidebar').classList.toggle('open');
$('#resetData').onclick = () => { if (confirm('Replace all data with the demo data?')) { db = seed(); Object.keys(tableState).forEach(k => delete tableState[k]); save(); go(); toast('Demo data restored'); } };
go();
})();
