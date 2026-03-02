const STORAGE_KEY = 'salao_financeiro_v3_db';
const SESSION_KEY = 'salao_financeiro_v3_session';

const state = {
  db: null,
  currentScreen: 'dashboard',
  chartMonth: '',
};

const qs = (sel) => document.querySelector(sel);
const qsa = (sel) => Array.from(document.querySelectorAll(sel));
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const numberOrZero = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const parseBRL = (text) => {
  if (text == null) return 0;
  const s = String(text).trim()
    .replace(/\s/g,'')
    .replace(/R\$/g,'')
    .replace(/\./g,'')
    .replace(/,/g,'.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
};

function bindMoneyMask(input) {
  if (!input) return;
  input.addEventListener('input', () => {
    const raw = input.value;
    // keep digits and separators
    const cleaned = raw.replace(/[^0-9,\.]/g,'');
    input.value = cleaned;
  });
}
const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const monthLabel = (ym) => {
  if (!ym) return 'mês atual';
  const [year, month] = ym.split('-');
  return `${month}/${year}`;
};

function defaultDb() {
  return {
    meta: {
      salonName: 'Salão Financeiro',
      themeColor: '#6d28d9',
      auth: {
        username: 'admin',
        password: 'admin123',
        pinHash: '',
      },
      logoDataUrl: '',
      createdAt: new Date().toISOString(),
    },
    services: [],
    collaborators: [],
    attendances: [],
    expenses: [],
    products: [],
  };
}

function readDb() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const db = defaultDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      ...defaultDb(),
      ...parsed,
      meta: {
        ...defaultDb().meta,
        ...(parsed.meta || {}),
        auth: {
          ...defaultDb().meta.auth,
          ...((parsed.meta || {}).auth || {}),
        },
      },
    };
  } catch (err) {
    console.error(err);
    const db = defaultDb();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return db;
  }
}

function saveDb() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.db));
}

function showToast(message) {
  const toast = qs('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 2400);
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function isNativeApp() {
  try {
    return !!(window.AndroidApp && typeof window.AndroidApp.isNative === 'function' && window.AndroidApp.isNative());
  } catch (_) {
    return false;
  }
}

function applyBranding() {
  const salonName = state.db.meta.salonName || 'Salão Financeiro';
  const color = state.db.meta.themeColor || '#6d28d9';
  document.documentElement.style.setProperty('--primary', color);
  qs('#login-salon-name').textContent = salonName;
  qs('#sidebar-salon-name').textContent = salonName;
  document.title = `${salonName} • Offline`;
  qs('#native-chip').textContent = isNativeApp() ? 'App Android offline' : 'Web local';
}

function setSession(value) {
  sessionStorage.setItem(SESSION_KEY, value ? '1' : '0');
}

function isLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function toggleLogin(visible) {
  qs('#login-screen').classList.toggle('hidden', !visible);
  qs('#app-shell').classList.toggle('hidden', visible);
  if (visible) {
    // decide login mode
    if (hasPinEnabled()) {
      qs('#pin-form').classList.remove('hidden');
      qs('#login-form').classList.add('hidden');
    } else {
      qs('#pin-form').classList.add('hidden');
      qs('#login-form').classList.remove('hidden');
    }
  }
}

function login(username, password) {
  const auth = state.db.meta.auth;
  return username === auth.username && password === auth.password;
}

function byMonth(items, field, ym) {
  return items.filter((item) => String(item[field] || '').slice(0, 7) === ym);
}

function serviceById(id) {
  return state.db.services.find((x) => x.id === id);
}

function collaboratorById(id) {
  return state.db.collaborators.find((x) => x.id === id);
}

function calcAttendanceFromInputs() {
  const service = serviceById(qs('#attendance-service').value);
  const collaborator = collaboratorById(qs('#attendance-collaborator').value);
  const amountEl = qs('#attendance-amount');
  const commissionEl = qs('#attendance-commission');
  const salonEl = qs('#attendance-salon');

  let amount = numberOrZero(amountEl.value);
  if (!amount && service) {
    amount = numberOrZero(service.price);
    amountEl.value = amount ? amount.toFixed(2) : '';
  }

  const serviceCommission = service ? numberOrZero(service.commissionPercent) : 0;
  const collaboratorCommission = collaborator ? numberOrZero(collaborator.defaultCommission) : 0;
  const pct = serviceCommission || collaboratorCommission || 0;
  const commission = amount * (pct / 100);
  commissionEl.value = commission.toFixed(2);
  salonEl.value = Math.max(0, amount - commission).toFixed(2);
}

function setupDefaults() {

  const setToday = (sel) => {
    const el = qs(sel);
    if (el && !el.value) el.value = new Date().toISOString().slice(0,10);
  };
  setToday('#attendance-date');
  setToday('#expense-date');
  setToday('#product-date');
  qs('#dashboard-month').value = currentMonth();
  qs('#report-month').value = currentMonth();
  qs('#attendance-date').value = today();
  qs('#expense-date').value = today();
  qs('#product-date').value = today();
}

function closeMenu() {
  qs('#sidebar').classList.remove('open');
  qs('#menu-overlay').classList.remove('open');
}

function openMenu() {
  qs('#sidebar').classList.add('open');
  qs('#menu-overlay').classList.add('open');
}

function setActiveNav(screen) {
  qsa('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.screen === screen));
}

function screenMeta(screen) {
  const map = {
    dashboard: ['Dashboard', 'Resumo do mês atual'],
    services: ['Serviços', 'Cadastro e preços padrão'],
    attendances: ['Atendimentos', 'Entradas com comissão automática'],
    expenses: ['Despesas', 'Saídas e comprovantes'],
    products: ['Produtos', 'Compras e custos'],
    collaborators: ['Colaboradores', 'Equipe e comissão padrão'],
    report: ['Relatório', 'Fechamento mensal e exportação'],
    import: ['Importar', 'Restaurar base local com backup JSON'],
    settings: ['Configurações', 'Branding e login local'],
  };
  return map[screen] || ['Salão Financeiro', ''];
}

function showScreen(screen) {
  state.currentScreen = screen;
  qsa('.screen').forEach((section) => section.classList.toggle('active', section.id === `screen-${screen}`));
  setActiveNav(screen);
  const [title, subtitle] = screenMeta(screen);
  qs('#topbar-title').textContent = title;
  qs('#topbar-subtitle').textContent = subtitle;
  closeMenu();

  if (screen === 'dashboard') renderDashboard();
  if (screen === 'report') renderReport();
}

function renderSelectOptions() {
  const serviceSelect = qs('#attendance-service');
  const collaboratorSelect = qs('#attendance-collaborator');

  serviceSelect.innerHTML = `<option value="">Selecione...</option>` + state.db.services
    .map((service) => `<option value="${service.id}">${escapeHtml(service.name)}</option>`)
    .join('');

  collaboratorSelect.innerHTML = `<option value="">Selecione...</option>` + state.db.collaborators
    .filter((item) => item.status !== 'inativo')
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)}</option>`)
    .join('');
}

function recordCard(title, metaHtml, actionsHtml) {
  return `
    <article class="record-card">
      <div class="record-head">
        <div><strong>${title}</strong></div>
      </div>
      <div class="record-meta">${metaHtml}</div>
      <div class="record-actions">${actionsHtml}</div>
    </article>
  `;
}

function bindActionButtons() {
  qsa('[data-edit-type]').forEach((btn) => {
    btn.onclick = () => editRecord(btn.dataset.editType, btn.dataset.id);
  });
  qsa('[data-delete-type]').forEach((btn) => {
    btn.onclick = () => deleteRecord(btn.dataset.deleteType, btn.dataset.id);
  });
  qsa('[data-preview]').forEach((btn) => {
    btn.onclick = () => previewAttachment(btn.dataset.preview);
  });
  qsa('[data-reset-form]').forEach((btn) => {
    btn.onclick = () => resetFormById(btn.dataset.resetForm);
  });
}

function renderServices() {
  const wrap = qs('#services-list');
  if (!state.db.services.length) {
    wrap.innerHTML = '<small>Nenhum serviço cadastrado ainda.</small>';
    return;
  }

  wrap.innerHTML = state.db.services.map((item) => recordCard(
    escapeHtml(item.name),
    `
      <span>Categoria: ${escapeHtml(item.category || '-')}</span>
      <span>Preço: ${money(item.price)}</span>
      <span>Comissão: ${numberOrZero(item.commissionPercent)}%</span>
      <span>Obs: ${escapeHtml(item.notes || '-')}</span>
    `,
    `
      <button class="mini-btn" data-edit-type="service" data-id="${item.id}">Editar</button>
      <button class="mini-btn danger" data-delete-type="service" data-id="${item.id}">Excluir</button>
    `
  )).join('');
}

function renderCollaborators() {
  const wrap = qs('#collaborators-list');
  if (!state.db.collaborators.length) {
    wrap.innerHTML = '<small>Nenhum colaborador cadastrado ainda.</small>';
    return;
  }

  wrap.innerHTML = state.db.collaborators.map((item) => recordCard(
    escapeHtml(item.name),
    `
      <span>Função: ${escapeHtml(item.role)}</span>
      <span>Comissão padrão: ${numberOrZero(item.defaultCommission)}%</span>
      <span>Contato: ${escapeHtml(item.contact || '-')}</span>
      <span>Status: ${escapeHtml(item.status || 'ativo')}</span>
    `,
    `
      <button class="mini-btn" data-edit-type="collaborator" data-id="${item.id}">Editar</button>
      <button class="mini-btn danger" data-delete-type="collaborator" data-id="${item.id}">Excluir</button>
    `
  )).join('');
}

function attachmentLabel(attachment) {
  if (!attachment) return '<span>Comprovante: -</span>';
  return `<span>Comprovante: ${escapeHtml(attachment.name || 'arquivo')}</span>
          <button class="mini-btn" data-preview="${attachment.id}">Ver anexo</button>`;
}

function renderAttendances() {
  const wrap = qs('#attendances-list');
  if (!state.db.attendances.length) {
    wrap.innerHTML = '<small>Nenhum atendimento lançado ainda.</small>';
    return;
  }

  const sorted = [...state.db.attendances].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  wrap.innerHTML = sorted.map((item) => {
    const service = serviceById(item.serviceId);
    const collaborator = collaboratorById(item.collaboratorId);
    return recordCard(
      `${escapeHtml(item.client || 'Cliente avulso')} • ${escapeHtml(service?.name || 'Serviço')}`,
      `
        <span>Data: ${escapeHtml(item.date)}</span>
        <span>Colaborador: ${escapeHtml(collaborator?.name || '-')}</span>
        <span>Entrada: ${money(item.amount)}</span>
        <span>Comissão: ${money(item.commission)}</span>
        <span>Salão: ${money(item.salonValue)}</span>
        <span>Pagamento: ${escapeHtml(item.paymentMethod)}</span>
        <span>Obs: ${escapeHtml(item.notes || '-')}</span>
        ${attachmentLabel(item.attachment)}
      `,
      `
        <button class="mini-btn" data-edit-type="attendance" data-id="${item.id}">Editar</button>
        <button class="mini-btn danger" data-delete-type="attendance" data-id="${item.id}">Excluir</button>
      `
    );
  }).join('');
}

function renderExpenses() {
  const wrap = qs('#expenses-list');
  if (!state.db.expenses.length) {
    wrap.innerHTML = '<small>Nenhuma despesa lançada ainda.</small>';
    return;
  }

  const sorted = [...state.db.expenses].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  wrap.innerHTML = sorted.map((item) => recordCard(
    `${escapeHtml(item.description)} • ${money(item.amount)}`,
    `
      <span>Data: ${escapeHtml(item.date)}</span>
      <span>Categoria: ${escapeHtml(item.category)}</span>
      <span>Pagamento: ${escapeHtml(item.paymentMethod)}</span>
      <span>Fornecedor: ${escapeHtml(item.vendor || '-')}</span>
      ${attachmentLabel(item.attachment)}
    `,
    `
      <button class="mini-btn" data-edit-type="expense" data-id="${item.id}">Editar</button>
      <button class="mini-btn danger" data-delete-type="expense" data-id="${item.id}">Excluir</button>
    `
  )).join('');
}

function renderProducts() {
  const wrap = qs('#products-list');
  if (!state.db.products.length) {
    wrap.innerHTML = '<small>Nenhum produto registrado ainda.</small>';
    return;
  }

  const sorted = [...state.db.products].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  wrap.innerHTML = sorted.map((item) => recordCard(
    `${escapeHtml(item.name)} • ${money(item.totalCost)}`,
    `
      <span>Data: ${escapeHtml(item.date)}</span>
      <span>Categoria: ${escapeHtml(item.category || '-')}</span>
      <span>Quantidade: ${item.quantity}</span>
      <span>Custo unitário: ${money(item.unitCost)}</span>
      <span>Fornecedor: ${escapeHtml(item.vendor || '-')}</span>
      <span>Obs: ${escapeHtml(item.notes || '-')}</span>
    `,
    `
      <button class="mini-btn" data-edit-type="product" data-id="${item.id}">Editar</button>
      <button class="mini-btn danger" data-delete-type="product" data-id="${item.id}">Excluir</button>
    `
  )).join('');
}

function renderAllLists() {
  renderSelectOptions();
  renderServices();
  renderCollaborators();
  renderAttendances();
  renderExpenses();
  renderProducts();
  bindActionButtons();
  renderDashboard();
  renderReport();
}

function clearPreview(id) {
  qs(id).innerHTML = '';
}

function renderAttachmentPreview(containerSel, attachment) {
  const box = qs(containerSel);
  if (!attachment) {
    box.innerHTML = '';
    return;
  }

  if ((attachment.mimeType || '').startsWith('image/')) {
    box.innerHTML = `<img src="${attachment.dataUrl}" alt="Prévia do anexo" />`;
  } else {
    box.innerHTML = `<span class="file-pill">${escapeHtml(attachment.name || 'arquivo')}</span>`;
  }
}

async function fileToAttachment(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(file);
  });

  return {
    id: uid(),
    name: file.name,
    mimeType: file.type || 'application/octet-stream',
    dataUrl,
  };
}

async function buildAttachment(inputSel, previousAttachment = null) {
  const input = qs(inputSel);
  const file = input.files && input.files[0];
  if (!file) return previousAttachment;
  return fileToAttachment(file);
}

function previewAttachment(attachmentId) {
  const items = [...state.db.attendances, ...state.db.expenses];
  const found = items.find((item) => item.attachment && item.attachment.id === attachmentId);
  if (!found || !found.attachment) {
    showToast('Anexo não encontrado.');
    return;
  }

  const attachment = found.attachment;
  if ((attachment.mimeType || '').startsWith('image/')) {
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`<title>${escapeHtml(attachment.name)}</title><img style="max-width:100%" src="${attachment.dataUrl}" />`);
      win.document.close();
    } else {
      showToast('Não foi possível abrir a prévia.');
    }
  } else {
    showToast(`Arquivo salvo no registro: ${attachment.name}`);
  }
}

function resetFormById(formId) {
  qs(`#${formId}`).reset();

  const map = {
    'service-form': ['#service-id'],
    'collaborator-form': ['#collaborator-id'],
    'attendance-form': ['#attendance-id'],
    'expense-form': ['#expense-id'],
    'product-form': ['#product-id'],
  };
  (map[formId] || []).forEach((sel) => { qs(sel).value = ''; });

  qs('#attendance-date').value = today();
  qs('#expense-date').value = today();
  qs('#product-date').value = today();
  clearPreview('#attendance-proof-preview');
  clearPreview('#expense-proof-preview');
}

function findRecord(type, id) {
  const maps = {
    service: state.db.services,
    collaborator: state.db.collaborators,
    attendance: state.db.attendances,
    expense: state.db.expenses,
    product: state.db.products,
  };
  return (maps[type] || []).find((item) => item.id === id);
}

function editRecord(type, id) {
  const item = findRecord(type, id);
  if (!item) return;

  if (type === 'service') {
    qs('#service-id').value = item.id;
    qs('#service-name').value = item.name;
    qs('#service-category').value = item.category || '';
    qs('#service-price').value = item.price;
    qs('#service-commission').value = item.commissionPercent;
    qs('#service-notes').value = item.notes || '';
    showScreen('services');
  }

  if (type === 'collaborator') {
    qs('#collaborator-id').value = item.id;
    qs('#collaborator-name').value = item.name;
    qs('#collaborator-role').value = item.role;
    qs('#collaborator-commission').value = item.defaultCommission;
    qs('#collaborator-contact').value = item.contact || '';
    qs('#collaborator-status').value = item.status || 'ativo';
    showScreen('collaborators');
  }

  if (type === 'attendance') {
    qs('#attendance-id').value = item.id;
    qs('#attendance-date').value = item.date;
    qs('#attendance-client').value = item.client || '';
    qs('#attendance-service').value = item.serviceId;
    qs('#attendance-collaborator').value = item.collaboratorId;
    qs('#attendance-amount').value = item.amount;
    qs('#attendance-payment').value = item.paymentMethod;
    qs('#attendance-commission').value = item.commission;
    qs('#attendance-salon').value = item.salonValue;
    qs('#attendance-notes').value = item.notes || '';
    renderAttachmentPreview('#attendance-proof-preview', item.attachment || null);
    showScreen('attendances');
  }

  if (type === 'expense') {
    qs('#expense-id').value = item.id;
    qs('#expense-date').value = item.date;
    qs('#expense-category').value = item.category;
    qs('#expense-description').value = item.description;
    qs('#expense-amount').value = item.amount;
    qs('#expense-payment').value = item.paymentMethod;
    qs('#expense-vendor').value = item.vendor || '';
    renderAttachmentPreview('#expense-proof-preview', item.attachment || null);
    showScreen('expenses');
  }

  if (type === 'product') {
    qs('#product-id').value = item.id;
    qs('#product-date').value = item.date;
    qs('#product-name').value = item.name;
    qs('#product-category').value = item.category || '';
    qs('#product-quantity').value = item.quantity;
    qs('#product-unit-cost').value = item.unitCost;
    qs('#product-vendor').value = item.vendor || '';
    qs('#product-notes').value = item.notes || '';
    showScreen('products');
  }
}

function deleteRecord(type, id) {
  const confirmed = window.confirm('Excluir este registro?');
  if (!confirmed) return;

  const maps = {
    service: 'services',
    collaborator: 'collaborators',
    attendance: 'attendances',
    expense: 'expenses',
    product: 'products',
  };
  const key = maps[type];
  if (!key) return;

  state.db[key] = state.db[key].filter((item) => item.id !== id);
  saveDb();
  renderAllLists();
  showToast('Registro excluído.');
}

function monthMetrics(ym) {
  const attendances = byMonth(state.db.attendances, 'date', ym);
  const expenses = byMonth(state.db.expenses, 'date', ym);
  const products = byMonth(state.db.products, 'date', ym);

  const gross = attendances.reduce((sum, item) => sum + numberOrZero(item.amount), 0);
  const commissions = attendances.reduce((sum, item) => sum + numberOrZero(item.commission), 0);
  const salonNet = attendances.reduce((sum, item) => sum + numberOrZero(item.salonValue), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + numberOrZero(item.amount), 0);
  const productTotal = products.reduce((sum, item) => sum + numberOrZero(item.totalCost), 0);
  const outTotal = expenseTotal + productTotal;
  const result = salonNet - outTotal;
  const ticket = attendances.length ? gross / attendances.length : 0;

  return {
    ym,
    attendances,
    expenses,
    products,
    gross,
    commissions,
    salonNet,
    expenseTotal,
    productTotal,
    outTotal,
    result,
    ticket,
  };
}

function renderBreakdown(containerSel, rows) {
  const container = qs(containerSel);
  if (!rows.length) {
    container.innerHTML = '<small>Sem dados neste período.</small>';
    return;
  }

  const max = Math.max(...rows.map((r) => r.value), 1);
  container.innerHTML = rows.map((row) => `
    <div class="breakdown-item">
      <div class="breakdown-label">${escapeHtml(row.label)}</div>
      <div class="bar"><span style="width:${Math.max(6, (row.value / max) * 100)}%"></span></div>
      <div class="breakdown-value">${row.display || money(row.value)}</div>
    </div>
  `).join('');
}

function renderDashboard() {
  const ym = qs('#dashboard-month').value || currentMonth();
  state.chartMonth = ym;
  const data = monthMetrics(ym);

  qs('#dashboard-cards').innerHTML = [
    ['Entradas brutas', money(data.gross)],
    ['Comissões', money(data.commissions)],
    ['Receita do salão', money(data.salonNet)],
    ['Saídas totais', money(data.outTotal)],
    ['Resultado', money(data.result)],
    ['Ticket médio', money(data.ticket)],
  ].map(([label, value]) => `
      <div class="kpi-card">
        <span class="label">${label}</span>
        <span class="value">${value}</span>
      </div>
    `).join('');

  const serviceMap = {};
  data.attendances.forEach((item) => {
    const service = serviceById(item.serviceId);
    const key = service?.name || 'Serviço removido';
    serviceMap[key] = (serviceMap[key] || 0) + numberOrZero(item.amount);
  });

  const collabMap = {};
  data.attendances.forEach((item) => {
    const collaborator = collaboratorById(item.collaboratorId);
    const key = collaborator?.name || 'Colaborador removido';
    collabMap[key] = (collabMap[key] || 0) + numberOrZero(item.salonValue);
  });

  renderBreakdown('#dashboard-services-breakdown',
    Object.entries(serviceMap).map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6)
  );

  renderBreakdown('#dashboard-collab-breakdown',
    Object.entries(collabMap).map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value).slice(0, 6)
  );
}

function renderReport() {
  const ym = qs('#report-month').value || currentMonth();
  const data = monthMetrics(ym);

  qs('#report-summary').innerHTML = [
    ['Período', monthLabel(ym)],
    ['Entradas brutas', money(data.gross)],
    ['Comissões pagas', money(data.commissions)],
    ['Receita líquida do salão', money(data.salonNet)],
    ['Despesas operacionais', money(data.expenseTotal)],
    ['Produtos', money(data.productTotal)],
    ['Resultado do período', money(data.result)],
  ].map(([label, value]) => `
      <div class="report-line">
        <span>${label}</span>
        <strong>${value}</strong>
      </div>
    `).join('');

  qs('#report-attendances').innerHTML = data.attendances.length
    ? data.attendances.map((item) => {
        const service = serviceById(item.serviceId);
        const collaborator = collaboratorById(item.collaboratorId);
        return `
          <div class="record-card">
            <strong>${escapeHtml(item.date)} • ${escapeHtml(service?.name || 'Serviço')}</strong>
            <div class="mini-list">
              <div>Cliente: ${escapeHtml(item.client || 'Avulso')}</div>
              <div>Colaborador: ${escapeHtml(collaborator?.name || '-')}</div>
              <div>Entrada: ${money(item.amount)} | Comissão: ${money(item.commission)} | Salão: ${money(item.salonValue)}</div>
            </div>
          </div>
        `;
      }).join('')
    : '<small>Sem atendimentos no período.</small>';

  const expensesAndProducts = [
    ...data.expenses.map((item) => ({
      title: `Despesa • ${escapeHtml(item.category)}`,
      detail: `${escapeHtml(item.date)} • ${escapeHtml(item.description)} • ${money(item.amount)}`,
    })),
    ...data.products.map((item) => ({
      title: `Produto • ${escapeHtml(item.name)}`,
      detail: `${escapeHtml(item.date)} • ${item.quantity}x • ${money(item.totalCost)}`,
    })),
  ];

  qs('#report-expenses').innerHTML = expensesAndProducts.length
    ? expensesAndProducts.map((row) => `
        <div class="record-card">
          <strong>${row.title}</strong>
          <div class="mini-list"><div>${row.detail}</div></div>
        </div>
      `).join('')
    : '<small>Sem saídas no período.</small>';
}

function fillSettingsForm() {
  qs('#settings-salon-name').value = state.db.meta.salonName || '';
  qs('#settings-theme-color').value = state.db.meta.themeColor || '#6d28d9';
  qs('#settings-username').value = state.db.meta.auth.username;
  qs('#settings-password').value = state.db.meta.auth.password;
}

function toCsv(ym) {
  const data = monthMetrics(ym);
  const lines = [];
  lines.push('Resumo do período');
  lines.push(`Período;${monthLabel(ym)}`);
  lines.push(`Entradas brutas;${data.gross.toFixed(2).replace('.', ',')}`);
  lines.push(`Comissões;${data.commissions.toFixed(2).replace('.', ',')}`);
  lines.push(`Receita do salão;${data.salonNet.toFixed(2).replace('.', ',')}`);
  lines.push(`Despesas;${data.expenseTotal.toFixed(2).replace('.', ',')}`);
  lines.push(`Produtos;${data.productTotal.toFixed(2).replace('.', ',')}`);
  lines.push(`Resultado;${data.result.toFixed(2).replace('.', ',')}`);
  lines.push('');

  lines.push('Atendimentos');
  lines.push('Data;Cliente;Serviço;Colaborador;Valor;Comissão;Salão;Pagamento');
  data.attendances.forEach((item) => {
    const service = serviceById(item.serviceId);
    const collaborator = collaboratorById(item.collaboratorId);
    lines.push([
      item.date,
      (item.client || '').replace(/;/g, ','),
      (service?.name || '').replace(/;/g, ','),
      (collaborator?.name || '').replace(/;/g, ','),
      Number(item.amount).toFixed(2).replace('.', ','),
      Number(item.commission).toFixed(2).replace('.', ','),
      Number(item.salonValue).toFixed(2).replace('.', ','),
      (item.paymentMethod || '').replace(/;/g, ','),
    ].join(';'));
  });
  lines.push('');

  lines.push('Saídas');
  lines.push('Tipo;Data;Categoria;Descrição/Nome;Valor total');
  data.expenses.forEach((item) => {
    lines.push(['Despesa', item.date, item.category, item.description, Number(item.amount).toFixed(2).replace('.', ',')].join(';'));
  });
  data.products.forEach((item) => {
    lines.push(['Produto', item.date, item.category || '', item.name, Number(item.totalCost).toFixed(2).replace('.', ',')].join(';'));
  });

  return lines.join('\n');
}

function saveTextFile(filename, mimeType, text) {
  const base64 = btoa(unescape(encodeURIComponent(text)));

  if (isNativeApp() && window.AndroidApp.saveTextFile) {
    const ok = window.AndroidApp.saveTextFile(filename, mimeType, base64);
    showToast(ok ? 'Arquivo salvo em Downloads.' : 'Falha ao salvar arquivo.');
    return;
  }

  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
  showToast('Download iniciado no navegador.');
}

function exportCsv() {
  const ym = qs('#report-month').value || currentMonth();
  const csv = toCsv(ym);
  const filename = `salao_financeiro_${ym}.csv`;
  saveTextFile(filename, 'text/csv', csv);
}

function exportJson() {
  const raw = JSON.stringify(state.db, null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  saveTextFile(`backup_salao_financeiro_${stamp}.json`, 'application/json', raw);
}

function importJsonContent(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON inválido');
    state.db = {
      ...defaultDb(),
      ...parsed,
      meta: {
        ...defaultDb().meta,
        ...(parsed.meta || {}),
        auth: {
          ...defaultDb().meta.auth,
          ...((parsed.meta || {}).auth || {}),
        }
      }
    };
    saveDb();
    applyBranding();
    fillSettingsForm();
    renderAllLists();
    showToast('Backup importado com sucesso.');
    return true;
  } catch (err) {
    console.error(err);
    showToast('Falha ao importar JSON.');
    return false;
  }
}

function seedDemoData() {
  state.db.services = [
    { id: uid(), name: 'Corte feminino', category: 'Cabelo', price: 75, commissionPercent: 40, notes: '' },
    { id: uid(), name: 'Escova', category: 'Cabelo', price: 55, commissionPercent: 35, notes: '' },
    { id: uid(), name: 'Pé e mão', category: 'Unhas', price: 50, commissionPercent: 45, notes: '' },
  ];
  state.db.collaborators = [
    { id: uid(), name: 'Camila', role: 'Cabeleireira', defaultCommission: 40, contact: '', status: 'ativo' },
    { id: uid(), name: 'Rafaela', role: 'Manicure', defaultCommission: 45, contact: '', status: 'ativo' },
  ];
  const s1 = state.db.services[0];
  const s2 = state.db.services[2];
  const c1 = state.db.collaborators[0];
  const c2 = state.db.collaborators[1];
  const ym = currentMonth();
  state.db.attendances = [
    { id: uid(), date: `${ym}-05`, client: 'Ana', serviceId: s1.id, collaboratorId: c1.id, amount: 75, paymentMethod: 'PIX', commission: 30, salonValue: 45, notes: '' },
    { id: uid(), date: `${ym}-06`, client: 'Bianca', serviceId: s2.id, collaboratorId: c2.id, amount: 50, paymentMethod: 'Dinheiro', commission: 22.5, salonValue: 27.5, notes: '' },
  ];
  state.db.expenses = [
    { id: uid(), date: `${ym}-03`, category: 'Aluguel', description: 'Aluguel do espaço', amount: 900, paymentMethod: 'PIX', vendor: 'Imobiliária', attachment: null },
  ];
  state.db.products = [
    { id: uid(), date: `${ym}-02`, name: 'Tintura', category: 'Cabelo', quantity: 4, unitCost: 28, totalCost: 112, vendor: 'Distribuidora', notes: '' },
  ];
  saveDb();
  renderAllLists();
  showToast('Dados demo carregados.');
}


async function fileToDataUrl(file) {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function bindForms() {
  bindMoneyMask(qs('#attendance-amount'));
  bindMoneyMask(qs('#expense-amount'));
  bindMoneyMask(qs('#product-unit-cost'));
  qs('#login-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const username = qs('#login-username').value.trim();
    const password = qs('#login-password').value;
    if (login(username, password)) {
      setSession(true);
      toggleLogin(false);
      qs('#login-error').classList.add('hidden');
      renderAllLists();
    } else {
      qs('#login-error').classList.remove('hidden');
    }
  });

  // PIN login (if enabled)
  qs('#pin-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const pin = (qs('#login-pin').value || '').trim();
    if (!/^[0-9]{4}$/.test(pin)) {
      qs('#login-error').textContent = 'PIN inválido.';
      qs('#login-error').classList.remove('hidden');
      return;
    }
    const ok = await loginPin(pin);
    if (ok) {
      setSession(true);
      toggleLogin(false);
      qs('#login-error').classList.add('hidden');
      qs('#login-pin').value = '';
      renderAllLists();
    } else {
      qs('#login-error').textContent = 'PIN incorreto.';
      qs('#login-error').classList.remove('hidden');
    }
  });

  qs('#use-userpass-btn').addEventListener('click', () => {
    qs('#pin-form').classList.add('hidden');
    qs('#login-form').classList.remove('hidden');
    qs('#login-error').classList.add('hidden');
  });

  qs('#logout-btn').addEventListener('click', () => {
    setSession(false);
    toggleLogin(true);
    showToast('Sessão encerrada.');
  });

  qs('#service-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = qs('#service-id').value || uid();
    const payload = {
      id,
      name: qs('#service-name').value.trim(),
      category: qs('#service-category').value.trim(),
      price: numberOrZero(qs('#service-price').value),
      commissionPercent: numberOrZero(qs('#service-commission').value),
      notes: qs('#service-notes').value.trim(),
    };

    const idx = state.db.services.findIndex((x) => x.id === id);
    if (idx >= 0) state.db.services[idx] = payload;
    else state.db.services.push(payload);

    saveDb();
    resetFormById('service-form');
    renderAllLists();
    showToast('Serviço salvo.');
  });

  qs('#collaborator-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = qs('#collaborator-id').value || uid();
    const payload = {
      id,
      name: qs('#collaborator-name').value.trim(),
      role: qs('#collaborator-role').value.trim(),
      defaultCommission: numberOrZero(qs('#collaborator-commission').value),
      contact: qs('#collaborator-contact').value.trim(),
      status: qs('#collaborator-status').value,
    };

    const idx = state.db.collaborators.findIndex((x) => x.id === id);
    if (idx >= 0) state.db.collaborators[idx] = payload;
    else state.db.collaborators.push(payload);

    saveDb();
    resetFormById('collaborator-form');
    renderAllLists();
    showToast('Colaborador salvo.');
  });

  qs('#attendance-service').addEventListener('change', calcAttendanceFromInputs);
  qs('#attendance-collaborator').addEventListener('change', calcAttendanceFromInputs);
  qs('#attendance-amount').addEventListener('input', calcAttendanceFromInputs);

  qs('#attendance-proof').addEventListener('change', async () => {
    const file = qs('#attendance-proof').files?.[0];
    if (!file) return clearPreview('#attendance-proof-preview');
    const attachment = await fileToAttachment(file);
    renderAttachmentPreview('#attendance-proof-preview', attachment);
  });

  qs('#expense-proof').addEventListener('change', async () => {
    const file = qs('#expense-proof').files?.[0];
    if (!file) return clearPreview('#expense-proof-preview');
    const attachment = await fileToAttachment(file);
    renderAttachmentPreview('#expense-proof-preview', attachment);
  });

  qs('#attendance-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = qs('#attendance-id').value || uid();
    const prev = findRecord('attendance', id);
    const attachment = await buildAttachment('#attendance-proof', prev?.attachment || null);
    const payload = {
      id,
      date: qs('#attendance-date').value,
      client: qs('#attendance-client').value.trim(),
      serviceId: qs('#attendance-service').value,
      collaboratorId: qs('#attendance-collaborator').value,
      amount: parseBRL(qs('#attendance-amount').value),
      paymentMethod: qs('#attendance-payment').value,
      commission: numberOrZero(qs('#attendance-commission').value),
      salonValue: numberOrZero(qs('#attendance-salon').value),
      notes: qs('#attendance-notes').value.trim(),
      attachment,
    };

    const idx = state.db.attendances.findIndex((x) => x.id === id);
    if (idx >= 0) state.db.attendances[idx] = payload;
    else state.db.attendances.push(payload);

    saveDb();
    resetFormById('attendance-form');
    renderAllLists();
    showToast('Atendimento salvo.');
  });

  qs('#expense-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const id = qs('#expense-id').value || uid();
    const prev = findRecord('expense', id);
    const attachment = await buildAttachment('#expense-proof', prev?.attachment || null);
    const payload = {
      id,
      date: qs('#expense-date').value,
      category: qs('#expense-category').value.trim(),
      description: qs('#expense-description').value.trim(),
      amount: parseBRL(qs('#expense-amount').value),
      paymentMethod: qs('#expense-payment').value,
      vendor: qs('#expense-vendor').value.trim(),
      attachment,
    };

    const idx = state.db.expenses.findIndex((x) => x.id === id);
    if (idx >= 0) state.db.expenses[idx] = payload;
    else state.db.expenses.push(payload);

    saveDb();
    resetFormById('expense-form');
    renderAllLists();
    showToast('Despesa salva.');
  });

  qs('#product-form').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const id = qs('#product-id').value || uid();
    const qty = Math.max(1, Math.round(numberOrZero(qs('#product-quantity').value)));
    const unitCost = parseBRL(qs('#product-unit-cost').value);
    const payload = {
      id,
      date: qs('#product-date').value,
      name: qs('#product-name').value.trim(),
      category: qs('#product-category').value.trim(),
      quantity: qty,
      unitCost,
      totalCost: qty * unitCost,
      vendor: qs('#product-vendor').value.trim(),
      notes: qs('#product-notes').value.trim(),
    };

    const idx = state.db.products.findIndex((x) => x.id === id);
    if (idx >= 0) state.db.products[idx] = payload;
    else state.db.products.push(payload);

    saveDb();
    resetFormById('product-form');
    renderAllLists();
    showToast('Produto salvo.');
  });

  qs('#settings-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    state.db.meta.salonName = qs('#settings-salon-name').value.trim();
    state.db.meta.themeColor = qs('#settings-theme-color').value || '#6d28d9';
    state.db.meta.auth.username = qs('#settings-username').value.trim();
    state.db.meta.auth.password = qs('#settings-password').value;

    // Optional PIN update
    const pin = (qs('#settings-pin').value || '').trim();
    if (pin) {
      if (!/^[0-9]{4}$/.test(pin)) {
        showToast('PIN deve ter 4 dígitos.');
        return;
      }
      state.db.meta.auth.pinHash = await sha256Hex(pin);
      qs('#settings-pin').value = '';
    }

    saveDb();
    applyBranding();
    fillSettingsForm();
    renderAllLists();
    showToast('Configurações salvas.');
  });

  qs('#refresh-dashboard').addEventListener('click', renderDashboard);
  qs('#generate-report').addEventListener('click', renderReport);
  qs('#export-csv-btn').addEventListener('click', exportCsv);
  qs('#export-json-btn').addEventListener('click', exportJson);

  qs('#import-json-file').addEventListener('change', async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const raw = await file.text();
    importJsonContent(raw);
    ev.target.value = '';
  });

  qs('#import-json-btn').addEventListener('click', () => {
    const raw = qs('#import-json-text').value.trim();
    if (!raw) {
      showToast('Cole um JSON ou selecione um arquivo.');
      return;
    }
    if (window.confirm('Substituir toda a base local atual?')) {
      importJsonContent(raw);
      qs('#import-json-text').value = '';
    }
  });

  qs('#seed-demo-btn').addEventListener('click', () => {
    if (window.confirm('Carregar dados demo e substituir a base atual?')) {
      seedDemoData();
    }
  });
}

function bindNavigation() {
  qs('#menu-toggle').addEventListener('click', () => {
    const open = qs('#sidebar').classList.contains('open');
    if (open) closeMenu();
    else openMenu();
  });

  qs('#menu-overlay').addEventListener('click', closeMenu);

  qsa('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => showScreen(btn.dataset.screen));
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') closeMenu();
  });
}

function init() {
  state.db = readDb();
  applyBranding();
  setupDefaults();
  fillSettingsForm();
  bindNavigation();
  bindForms();
  renderSelectOptions();
  renderAllLists();

  if (isLoggedIn()) {
    toggleLogin(false);
  } else {
    toggleLogin(true);
  }

  showScreen('dashboard');
}

document.addEventListener('DOMContentLoaded', init);
