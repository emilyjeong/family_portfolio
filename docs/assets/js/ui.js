/**
 * ═════════════════════════════════════════════════════════════
 * UI 렌더링 (ui.js) — 계좌별 그룹화
 * ═════════════════════════════════════════════════════════════
 */

const UI = (() => {

  const fmtKRW = (n) => CONFIG.CURRENCY + Math.round(n || 0).toLocaleString(CONFIG.LOCALE);
  const fmtPct = (n) => (n * 100).toFixed(2) + '%';
  const fmtDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toISOString().slice(0, 10);
  };

  function pnlClass(n) {
    if (n > 0) return 'success-color';
    if (n < 0) return 'danger-color';
    return 'text-secondary';
  }

  function pnlText(n) {
    if (n > 0) return '+' + fmtKRW(n);
    return fmtKRW(n);
  }

  function pctText(n) {
    if (n > 0) return '+' + fmtPct(n);
    return fmtPct(n);
  }

  function renderCouple(data) {
    if (!data || !data.combined) return;
    setText('coupleTotalValue', fmtKRW(data.combined.totalValue));
    const pnlEl = document.getElementById('coupleTotalPnl');
    pnlEl.textContent = pnlText(data.combined.totalPnl);
    pnlEl.className = 'card-value ' + pnlClass(data.combined.totalPnl);
    setText('coupleAsOf', fmtDate(data.generatedAt));
  }

  function renderPersonal(who, data) {
    if (!data) return;
    const prefix = who;
    setText(`${prefix}TotalValue`, fmtKRW(data.totalValue));
    setText(`${prefix}TotalCost`,  fmtKRW(data.totalCost));

    const pnlEl = document.getElementById(`${prefix}TotalPnl`);
    pnlEl.textContent = pnlText(data.totalPnl);
    pnlEl.className = 'card-value-md ' + pnlClass(data.totalPnl);

    const retEl = document.getElementById(`${prefix}Return`);
    retEl.textContent = pctText(data.returnRate);
    retEl.className = 'card-value-md ' + pnlClass(data.returnRate);

    setText(`${prefix}AsOf`, `기준일: ${fmtDate(new Date().toISOString())}`);
    renderHoldingsTable(`${prefix}Holdings`, who, data.holdings);
  }

  // ─── 보유 종목 테이블 (계좌별 그룹화) ────────────────────
  function renderHoldingsTable(containerId, who, holdings) {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (!holdings || !holdings.length) {
      el.innerHTML = '<div class="empty-state">보유 종목이 없습니다.<br>+ 종목 추가 버튼으로 시작하세요.</div>';
      return;
    }

    // 1) 계좌순 → 2) 종목명순 정렬
    const sorted = [...holdings].sort((a, b) => {
      const accountA = a.account || '일반';
      const accountB = b.account || '일반';
      if (accountA !== accountB) return accountA.localeCompare(accountB, 'ko');
      return a.name.localeCompare(b.name, 'ko');
    });

    // 계좌별 통계 미리 계산
    const accountStats = {};
    sorted.forEach(h => {
      const acc = h.account || '일반';
      if (!accountStats[acc]) accountStats[acc] = { count: 0, value: 0 };
      accountStats[acc].count += 1;
      accountStats[acc].value += (h.value || 0);
    });

    let html = `
      <div class="holdings-header">
        <span>종목명</span>
        <span class="value">평가금액 · 수익률</span>
        <span class="edit-btn">.</span>
      </div>
    `;

    let currentAccount = null;
    sorted.forEach(h => {
      const account = h.account || '일반';

      // 계좌가 바뀌면 그룹 헤더 삽입
      if (account !== currentAccount) {
        currentAccount = account;
        const stat = accountStats[account];
        html += `
          <div class="holdings-group-header">
            <span class="group-name">📁 ${escapeHtml(account)}</span>
            <span class="group-meta">${stat.count}종목 · ${fmtKRW(stat.value)}</span>
          </div>
        `;
      }

      const retCls = pnlClass(h.returnRate);
      html += `
        <div class="holdings-row">
          <div class="name">
            ${escapeHtml(h.name)}
            <span class="ticker">${escapeHtml(String(h.ticker))} · ${escapeHtml(h.sector || '')}</span>
          </div>
          <div class="value">
            ${fmtKRW(h.value)}
            <span class="sub ${retCls}">${pctText(h.returnRate)}</span>
          </div>
          <button class="edit-btn"
                  data-action="edit"
                  data-who="${who}"
                  data-name="${encodeURIComponent(h.name)}"
                  data-account="${encodeURIComponent(h.account || '')}">수정</button>
        </div>
      `;
    });

    el.innerHTML = html;
  }

  function switchTab(name) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach(p => {
      p.classList.toggle('active', p.id === `tab-${name}`);
    });
  }

  function showLoader(show) {
    document.getElementById('globalLoader').classList.toggle('hidden', !show);
  }
  function showError(msg) {
    const el = document.getElementById('globalError');
    if (!msg) { el.classList.add('hidden'); return; }
    el.textContent = '⚠️ ' + msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 6000);
  }

  function openModal(mode, who, holding) {
    const titleEl   = document.getElementById('modalTitle');
    const modeEl    = document.getElementById('fld-mode');
    const whoEl     = document.getElementById('fld-who');
    const nameEl    = document.getElementById('fld-name');
    const accountEl = document.getElementById('fld-account');
    const tickerEl  = document.getElementById('fld-ticker');
    const marketEl  = document.getElementById('fld-market');
    const qtyEl     = document.getElementById('fld-qty');
    const avgEl     = document.getElementById('fld-avg');
    const sectorEl  = document.getElementById('fld-sector');
    const memoEl    = document.getElementById('fld-memo');
    const delBtn    = document.getElementById('btn-delete');

    modeEl.value = mode;
    whoEl.value  = who;
    titleEl.textContent = (mode === 'edit' ? '종목 수정' : '종목 추가') +
                          (who === 'wife' ? ' · Em 🐰' : ' · Fabio 🦊');

    if (mode === 'edit' && holding) {
      nameEl.value    = holding.name;
      accountEl.value = holding.account || '일반';
      tickerEl.value  = String(holding.ticker || '');
      marketEl.value  = holding.market || 'KR';
      qtyEl.value     = holding.qty;
      avgEl.value     = holding.avg;
      sectorEl.value  = holding.sector || '기타';
      memoEl.value    = holding.memo || '';
      nameEl.readOnly = true;
      accountEl.readOnly = true;
      tickerEl.readOnly = true;
      marketEl.disabled = true;
      delBtn.classList.remove('hidden');
    } else {
      nameEl.value = accountEl.value = tickerEl.value = memoEl.value = '';
      qtyEl.value = avgEl.value = '';
      marketEl.value = 'KR';
      sectorEl.value = '기타';
      nameEl.readOnly = accountEl.readOnly = tickerEl.readOnly = false;
      marketEl.disabled = false;
      delBtn.classList.add('hidden');
    }

    document.getElementById('editModal').classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('editModal').classList.add('hidden');
  }

  function getModalPayload() {
    return {
      mode: document.getElementById('fld-mode').value,
      who:  document.getElementById('fld-who').value,
      payload: {
        name:    document.getElementById('fld-name').value.trim(),
        account: document.getElementById('fld-account').value.trim() || '일반',
        ticker:  document.getElementById('fld-ticker').value.trim(),
        market:  document.getElementById('fld-market').value,
        qty:     Number(document.getElementById('fld-qty').value),
        avg:     Number(document.getElementById('fld-avg').value),
        sector:  document.getElementById('fld-sector').value,
        memo:    document.getElementById('fld-memo').value.trim()
      }
    };
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  return {
    renderCouple, renderPersonal,
    switchTab, showLoader, showError,
    openModal, closeModal, getModalPayload
  };
})();
