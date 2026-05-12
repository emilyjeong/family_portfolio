/**
 * ═════════════════════════════════════════════════════════════
 * 설정 파일 (config.js)
 * ═════════════════════════════════════════════════════════════
 *
 * ⚠️ 사용 전 GAS_URL을 본인의 Apps Script 웹앱 URL로 교체!
 *    (Apps Script 배포 → 새 배포 → 웹 앱 → URL 복사)
 *
 *    예시 형태:
 *    https://script.google.com/macros/s/AKfycby.../exec
 *
 * 이 파일만 수정하면 전체 앱이 새 URL을 사용합니다.
 * 다른 .js 파일은 건드릴 필요 없음.
 * ═════════════════════════════════════════════════════════════
 */

const CONFIG = {
  // ⬇️⬇️⬇️ 여기에 본인 GAS Web App URL 붙여넣기 ⬇️⬇️⬇️
  GAS_URL: 'https://script.google.com/macros/s/AKfycbylMsbFICN_KFh5POESYLSwGK4MmjATuCkc96V98_wDF9WSFXM4906lHo8XHqWxZ2kRIg/exec',

  // ─── 동작 옵션 ──────────────────────────────────────────────
  DEFAULT_TAB: 'couple',           // 첫 로딩 시 활성 탭: couple|wife|husband
  AUTO_REFRESH_SEC: 0,             // 자동 새로고침 주기 (초). 0이면 비활성
  CHART_HISTORY_MONTHS: 18,        // 자산 추이 표시할 최대 개월 수
  CURRENCY: '₩',
  LOCALE: 'ko-KR',
  TZ: 'Asia/Seoul'
};
