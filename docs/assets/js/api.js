/**
 * ═════════════════════════════════════════════════════════════
 * API 래퍼 (api.js)
 *   GAS Web App과 통신하는 fetch 함수들
 *
 *   ⚠️ POST는 CORS preflight 회피를 위해
 *      Content-Type: text/plain 으로 전송합니다.
 *      (GAS Web App은 어차피 e.postData.contents 로 받음)
 * ═════════════════════════════════════════════════════════════
 */

const API = (() => {

  function buildUrl(params) {
    const qs = new URLSearchParams(params).toString();
    return `${CONFIG.GAS_URL}${qs ? '?' + qs : ''}`;
  }

  /** GET 요청 */
  async function get(params) {
    const res = await fetch(buildUrl(params), { method: 'GET', redirect: 'follow' });
    if (!res.ok) throw new Error(`GET 실패: HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error('서버 오류: ' + data.error);
    return data;
  }

  /** POST 요청 (CORS 회피용 text/plain) */
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

  // ─── 도메인 API ───────────────────────────────────────────
  return {
    getPortfolio: (who = 'both')      => get({ action: 'portfolio', who }),
    getSnapshots: ()                  => get({ action: 'snapshots' }),
    getHistory:   (limit = 100)       => get({ action: 'history', limit }),

    updateHolding: (who, payload)     => post({ action: 'update', who, payload }),
    createHolding: (who, payload)     => post({ action: 'create', who, payload }),
    deleteHolding: (who, name)        => post({ action: 'delete', who, payload: { name } }),
    lookupTicker:  (name)             => post({ action: 'lookup', payload: { name } })
  };
})();
