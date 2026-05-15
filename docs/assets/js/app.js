/**
 * ═════════════════════════════════════════════════════════════
 * 메인 앱 (app.js) — v2 계좌 컬럼 + 스냅샷 버튼 지원
 * ═════════════════════════════════════════════════════════════
 */

(() => {

  const state = {
    portfolio: null,
    snapshots: null,
    activeTab: CONFIG.DEFAULT_TAB
  };

  async function loadAll() {
    UI.showLoader(true);
    UI.showError(null);
    try {
      const [portfolio, snapshots] = await Promise.all([
        API.getPortfolio('both'),
        API.getSnapshots()
      ]);

      state.portfolio = portfolio;
      state.snapshots = snapshots.slice(-CONFIG.CHART_HISTORY_MONTHS);

      renderAll();
    } catch (err) {
      UI.showError(err.message);
      console.error(err);
    } finally {
      UI.showLoader(false);
    }
  }

  function renderAll() {
    const p = state.portfolio;
    const snaps = state.snapshots;
    if (!p) return;

    UI.renderCouple(p);
    if (p.combined) Charts.donut('coupleSectorChart', p.combined.sectors);
    if (snaps.length) {
      Charts.coupleAssetLine('coupleAssetChart', snaps);
      Charts.returnRateLine('coupleReturnChart', snaps);
    }

    if (p.wife) {
      UI.renderPersonal('wife', p.wife);
      Charts.donut('wifeSectorChart', p.wife.sectors);
      if (snaps.length) Charts.costVsValueLine('wifeCostVsValueChart', snaps, 'wife');
    }

    if (p.husband) {
      UI.renderPersonal('husband', p.husband);
      Charts.donut('husbandSectorChart', p.husband.sectors);
      if (snaps.length) Charts.costVsValueLine('husbandCostVsValueChart', snaps, 'husband');
    }
  }

  function bindEvents() {

    // 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        UI.switchTab(state.activeTab);
      });
    });

    // 수정/추가/스냅샷 버튼 위임
    document.addEventListener('click', async (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const who = target.dataset.who;

      if (action === 'add') {
        UI.openModal('create', who, null);
      }
      if (action === 'edit') {
        const name = decodeURIComponent(target.dataset.name);
        const account = decodeURIComponent(target.dataset.account || '');
        const holding = findHolding(who, name, account);
        if (holding) UI.openModal('edit', who, holding);
      }
      if (action === 'snapshot') {
        const original = target.textContent;
        target.disabled = true;
        target.textContent = '📸 찍는 중...';
        try {
          await API.takeSnapshot();
          target.textContent = '✓ 저장됨';
          await loadAll();
          setTimeout(() => {
            target.textContent = original;
            target.disabled = false;
          }, 2000);
        } catch (err) {
          UI.showError('스냅샷 실패: ' + err.message);
          target.textContent = original;
          target.disabled = false;
        }
      }
    });

    // 모달 닫기
    document.addEventListener('click', (e) => {
      if (e.target.dataset.close === '1') UI.closeModal();
    });

    // 티커 검색
    document.getElementById('btn-findTicker').addEventListener('click', async () => {
      const name = document.getElementById('fld-name').value.trim();
      if (!name) { UI.showError('종목명을 먼저 입력하세요'); return; }
      try {
        const res = await API.lookupTicker(name);
        if (res.ticker) {
          document.getElementById('fld-ticker').value = res.ticker;
          document.getElementById('fld-market').value = 'KR';
        } else {
          UI.showError(`"${name}" 티커 검색 결과 없음. 직접 입력하세요.`);
        }
      } catch (err) { UI.showError(err.message); }
    });

    // 폼 제출
    document.getElementById('editForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const { mode, who, payload } = UI.getModalPayload();

      if (!payload.name) { UI.showError('종목명 필수'); return; }
      if (mode === 'create' && !payload.ticker) { UI.showError('티커 필수'); return; }
      if (payload.qty < 0)  { UI.showError('수량은 0 이상'); return; }
      if (payload.avg < 0)  { UI.showError('평단가는 0 이상'); return; }

      UI.showLoader(true);
      try {
        if (mode === 'create') {
          await API.createHolding(who, payload);
        } else {
          await API.updateHolding(who, {
            name: payload.name,
            account: payload.account,
            qty: payload.qty,
            avg: payload.avg,
            memo: payload.memo
          });
        }
        UI.closeModal();
        await loadAll();
      } catch (err) {
        UI.showError(err.message);
        UI.showLoader(false);
      }
    });

    // 삭제 버튼
    document.getElementById('btn-delete').addEventListener('click', async () => {
      const { who, payload } = UI.getModalPayload();
      if (!confirm(`정말 "${payload.name}" (${payload.account}) 종목을 삭제하시겠습니까?\n(시트에는 기록이 남고, HTML에서만 사라집니다)`)) return;

      UI.showLoader(true);
      try {
        await API.deleteHolding(who, payload.name, payload.account);
        UI.closeModal();
        await loadAll();
      } catch (err) {
        UI.showError(err.message);
        UI.showLoader(false);
      }
    });
  }

  function findHolding(who, name, account) {
    if (!state.portfolio) return null;
    const list = (state.portfolio[who] && state.portfolio[who].holdings) || [];
    const targetAccount = account || '일반';
    return list.find(h => h.name === name && (h.account || '일반') === targetAccount) || null;
  }

  function init() {
    if (!CONFIG.GAS_URL || CONFIG.GAS_URL.includes('PASTE_YOUR_DEPLOYMENT_ID')) {
      UI.showError('config.js의 GAS_URL을 본인 웹앱 URL로 교체하세요');
      UI.showLoader(false);
      return;
    }

    UI.switchTab(state.activeTab);
    bindEvents();
    loadAll();

    if (CONFIG.AUTO_REFRESH_SEC > 0) {
      setInterval(loadAll, CONFIG.AUTO_REFRESH_SEC * 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
