/**
 * ═════════════════════════════════════════════════════════════
 * API 래퍼 (api.js) — v2 계좌 컬럼 + 스냅샷 지원
 * ═════════════════════════════════════════════════════════════
 */

const API = (() => {

  function buildUrl(params) {
    const qs = new URLSearchParams(params).toString();
    return `${CONFIG.GAS_URL}${qs ? '?' + qs : ''}`;
  }

  async function get(params) {
    const res = await fetch(buildUrl(params), { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error(`GET 실패: HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error('서버 오류: ' + data.error);
    return data;
  }

  async function post(body) {
    const res = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`POST 실패: HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error('서버 오류: ' + data.error);
    if (data.ok === false) throw new Error('서버 오류: ' + (data.error || '알 수 없음'));
    return data;
  }

  return {
    getPortfolio: (who = 'both')         => get({ action: 'portfolio', who }),
    getSnapshots: ()                     => get({ action: 'snapshots' }),
    getHistory:   (limit = 100)          => get({ action: 'history', limit }),

    updateHolding: (who, payload)        => post({ action: 'update', who, payload }),
    createHolding: (who, payload)        => post({ action: 'create', who, payload }),
    deleteHolding: (who, name, account)  => post({ action: 'delete', who, payload: { name, account } }),
    lookupTicker:  (name)                => post({ action: 'lookup', payload: { name } }),
    takeSnapshot:  ()                    => post({ action: 'snapshot' })
  };
})();
