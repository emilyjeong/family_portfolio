/**
 * ═════════════════════════════════════════════════════════════
 * 메인 앱 (app.js)
 *   초기화 + 이벤트 바인딩 + 데이터 로딩
 * ═════════════════════════════════════════════════════════════
 */

(() => {

  // 마지막 로딩한 포트폴리오·스냅샷 캐시
  const state = {
    portfolio: null,
    snapshots: null,
    activeTab: CONFIG.DEFAULT_TAB
  };

  // ─── 데이터 로딩 ──────────────────────────────────────────
  async function loadAll() {
    UI.showLoader(true);
    UI.showError(null);
    try {
      // 두 API 병렬 호출
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

    // ── 부부 합산 ────────────────────────────────────────
    UI.renderCouple(p);
    if (p.combined) Charts.donut('coupleSectorChart', p.combined.sectors);
    if (snaps.length) {
      Charts.coupleAssetLine('coupleAssetChart', snaps);
      Charts.returnRateLine('coupleReturnChart', snaps);
    }

    // ── 아내 ────────────────────────────────────────────
    if (p.wife) {
      UI.renderPersonal('wife', p.wife);
      Charts.donut('wifeSectorChart', p.wife.sectors);
      if (snaps.length) Charts.costVsValueLine('wifeCostVsValueChart', snaps, 'wife');
    }

    // ── 남편 ────────────────────────────────────────────
    if (p.husband) {
      UI.renderPersonal('husband', p.husband);
      Charts.donut('husbandSectorChart', p.husband.sectors);
      if (snaps.length) Charts.costVsValueLine('husbandCostVsValueChart', snaps, 'husband');
    }
  }

  // ─── 이벤트 핸들러 ────────────────────────────────────────
  function bindEvents() {

    // 탭 전환
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = btn.dataset.tab;
        UI.switchTab(state.activeTab);
      });
    });

    // 위임된 클릭 (수정/추가 버튼)
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;
      const who = target.dataset.who;

      if (action === 'add') {
        UI.openModal('create', who, null);
      }
      if (action === 'edit') {
        const name = decodeURIComponent(target.dataset.name);
        const holding = findHolding(who, name);
        if (holding) UI.openModal('edit', who, holding);
      }
    });

    // 모달 닫기 (배경/X)
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

    // 폼 제출 (저장)
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
            qty: payload.qty,
            avg: payload.avg,
            memo: payload.memo
          });
        }
        UI.closeModal();
        await loadAll();      // 시트 → JSON → 화면 갱신
      } catch (err) {
        UI.showError(err.message);
        UI.showLoader(false);
      }
    });

    // 삭제 버튼
    document.getElementById('btn-delete').addEventListener('click', async () => {
      const { who, payload } = UI.getModalPayload();
      if (!confirm(`정말 "${payload.name}" 종목을 삭제하시겠습니까?\n(시트에는 기록이 남고, HTML에서만 사라집니다)`)) return;

      UI.showLoader(true);
      try {
        await API.deleteHolding(who, payload.name);
        UI.closeModal();
        await loadAll();
      } catch (err) {
        UI.showError(err.message);
        UI.showLoader(false);
      }
    });
  }

  // ─── 헬퍼 ─────────────────────────────────────────────────
  function findHolding(who, name) {
    if (!state.portfolio) return null;
    const list = (state.portfolio[who] && state.portfolio[who].holdings) || [];
    return list.find(h => h.name === name) || null;
  }

  // ─── 초기화 ───────────────────────────────────────────────
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

  // DOM 준비되면 시작
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
