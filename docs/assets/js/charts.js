/**
 * ═════════════════════════════════════════════════════════════
 * Chart.js 래퍼 (charts.js)
 *   다크 테마 + 한국어 친화적 차트 생성
 *   디자인 시스템 토큰(섹션 10) 기준 — CSS와 1:1 일치
 * ═════════════════════════════════════════════════════════════
 */

const Charts = (() => {

  // ─── 색상 (디자인 시스템 토큰값을 직접 박음) ─────────────
  const COLORS = {
    // 텍스트/배경/보더
    inkPrimary:   '#f0ede8',   // --ink
    inkMid:       '#9a9690',   // --ink-mid
    inkDim:       '#565250',   // --ink-dim
    border:       '#2a2926',   // --border
    borderStrong: '#353330',   // --border-mid
    bgCard:       '#161513',   // --card
    bgElevated:   '#1c1b19',   // --card-hi

    // 의미색
    pos:          '#00c98a',   // --pos (수익)
    neg:          '#f04d62',   // --neg (손실)
    accent:       '#e8b800',   // --accent (강조)
    info:         '#5aabf0',   // --info
    purple:       '#b8a8f0',   // --purple

    // 탭 시그니처 — 차트 라인 컬러
    wife:         '#b8a8f0',   // 아내 → 퍼플
    husband:      '#5aabf0',   // 남편 → 인포 블루

    // 도넛 차트 팔레트 (12색)
    palette: [
      '#5aabf0', '#00c98a', '#e8b800', '#f07a40',
      '#b8a8f0', '#6dc7c9', '#f04d62', '#9a9690',
      '#c4a374', '#7eb86b', '#d49ab3', '#5b87ad'
    ]
  };

  // 인스턴스 캐시 (canvas id → Chart 객체)
  const instances = {};

  /** 기존 차트 파괴 후 새로 생성 */
  function makeChart(canvasId, config) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (instances[canvasId]) instances[canvasId].destroy();
    // empty 메시지 제거
    const parent = ctx.parentElement;
    const oldMsg = parent && parent.querySelector('.empty-chart-msg');
    if (oldMsg) oldMsg.remove();
    instances[canvasId] = new Chart(ctx, config);
    return instances[canvasId];
  }

  /** 빈 차트 영역에 안내 메시지 표시 */
  function showEmpty(canvasId, message) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const parent = ctx.parentElement;
    if (!parent) return;
    if (instances[canvasId]) {
      instances[canvasId].destroy();
      delete instances[canvasId];
    }
    const oldMsg = parent.querySelector('.empty-chart-msg');
    if (oldMsg) oldMsg.remove();
    const msg = document.createElement('div');
    msg.className = 'empty-chart-msg';
    msg.textContent = message;
    parent.appendChild(msg);
  }

  // ─── 도넛 (섹터 비중) ─────────────────────────────────────
  function donut(canvasId, sectors) {
    const data = (sectors || []).filter(s => s.value > 0);
    if (!data.length) {
      showEmpty(canvasId, '데이터가 없어요');
      return;
    }
    return makeChart(canvasId, {
      type: 'doughnut',
      data: {
        labels: data.map(s => s.name),
        datasets: [{
          data: data.map(s => s.value),
          backgroundColor: COLORS.palette,
          borderColor: COLORS.bgCard,
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: COLORS.inkPrimary,
              font: { size: 12, family: 'Pretendard' },
              padding: 10,
              generateLabels: (chart) => {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((label, i) => {
                  const v = ds.data[i];
                  const total = ds.data.reduce((a, b) => a + b, 0);
                  const pct = total ? (v / total * 100).toFixed(1) : 0;
                  return {
                    text: `${label}  ${pct}%`,
                    fillStyle: ds.backgroundColor[i],
                    strokeStyle: ds.backgroundColor[i],
                    fontColor: COLORS.inkPrimary,
                    index: i
                  };
                });
              }
            }
          },
          tooltip: tooltipStyle({
            label: (ctx) => {
              const v = ctx.parsed;
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = (v / total * 100).toFixed(1);
              return `${ctx.label}: ${fmt(v)} (${pct}%)`;
            }
          })
        }
      }
    });
  }

  // ─── 라인: 부부 합산 자산 추이 (영역 누적) ──────────────────
  function coupleAssetLine(canvasId, snapshots) {
    if (!snapshots.length) {
      showEmpty(canvasId, '월말 스냅샷이 아직 없어요.\nApps Script의 takeSnapshotNow() 실행하면 점이 추가돼요.');
      return;
    }
    return makeChart(canvasId, {
      type: 'line',
      data: {
        labels: snapshots.map(s => s.date.slice(0, 7)),
        datasets: [
          areaDataset('🤵 남편', snapshots.map(s => Math.round(s.husbandValue / 10000)),
                      COLORS.husband, '#5aabf055'),
          areaDataset('👰 아내', snapshots.map(s => Math.round(s.wifeValue / 10000)),
                      COLORS.wife, '#b8a8f055')
        ]
      },
      options: lineOptions({
        tooltipLabel: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y * 10000)}`
      })
    });
  }

  // ─── 라인: 월별 수익률 추이 ───────────────────────────────
  function returnRateLine(canvasId, snapshots) {
    if (!snapshots.length) {
      showEmpty(canvasId, '월말 스냅샷이 아직 없어요.\nApps Script의 takeSnapshotNow() 실행하면 점이 추가돼요.');
      return;
    }
    const wifeRet = snapshots.map(s =>
      s.wifeCost > 0 ? ((s.wifeValue - s.wifeCost) / s.wifeCost * 100) : 0);
    const husbandRet = snapshots.map(s =>
      s.husbandCost > 0 ? ((s.husbandValue - s.husbandCost) / s.husbandCost * 100) : 0);

    return makeChart(canvasId, {
      type: 'line',
      data: {
        labels: snapshots.map(s => s.date.slice(0, 7)),
        datasets: [
          lineDataset('👰 아내 수익률(%)', wifeRet, COLORS.wife),
          lineDataset('🤵 남편 수익률(%)', husbandRet, COLORS.husband)
        ]
      },
      options: lineOptions({
        yFormat: (v) => v + '%',
        tooltipLabel: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
      })
    });
  }

  // ─── 라인: 개인 투입금 vs 평가금 ───────────────────────────
  //   평가금 = --accent (디자인 시스템 강조 컬러, 노란색)으로 통일
  //   투입금 = --ink-dim (회색, 점선) — 원본 그대로
  function costVsValueLine(canvasId, snapshots, who) {
    if (!snapshots.length) {
      showEmpty(canvasId, '월말 스냅샷이 아직 없어요.\nApps Script의 takeSnapshotNow() 실행하면 점이 추가돼요.');
      return;
    }
    const valueKey = who === 'wife' ? 'wifeValue' : 'husbandValue';
    const costKey  = who === 'wife' ? 'wifeCost'  : 'husbandCost';
    const valueColor = COLORS.accent;   // 평가금은 아내/남편 무관하게 강조 컬러

    return makeChart(canvasId, {
      type: 'line',
      data: {
        labels: snapshots.map(s => s.date.slice(0, 7)),
        datasets: [
          {
            label: '현재 평가금',
            data: snapshots.map(s => Math.round(s[valueKey] / 10000)),
            borderColor: valueColor,
            backgroundColor: valueColor + '33',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: valueColor
          },
          {
            label: '투입금 (실제 투입금)',
            data: snapshots.map(s => Math.round(s[costKey] / 10000)),
            borderColor: COLORS.inkDim,
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            borderWidth: 1.5,
            tension: 0.35,
            pointRadius: 2,
            pointBackgroundColor: COLORS.inkDim
          }
        ]
      },
      options: lineOptions({
        tooltipLabel: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y * 10000)}`
      })
    });
  }

  // ─── 헬퍼: 라인 데이터셋 ──────────────────────────────────
  function lineDataset(label, data, color) {
    return {
      label, data,
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2.5,
      fill: false,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: color
    };
  }

  function areaDataset(label, data, color, fillColor) {
    return {
      label, data,
      borderColor: color,
      backgroundColor: fillColor,
      borderWidth: 2.5,
      fill: true,
      tension: 0.35,
      pointRadius: 2.5,
      pointBackgroundColor: color
    };
  }

  // ─── 헬퍼: 공통 라인 옵션 ─────────────────────────────────
  function lineOptions({ yFormat, tooltipLabel }) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: COLORS.inkPrimary,
            font: { size: 12, family: 'Pretendard' },
            usePointStyle: true,
            padding: 12
          }
        },
        tooltip: tooltipStyle({ label: tooltipLabel })
      },
      scales: {
        x: {
          ticks: { color: COLORS.inkMid, font: { size: 10 } },
          grid: { color: COLORS.border, drawBorder: false }
        },
        y: {
          ticks: {
            color: COLORS.inkMid,
            font: { size: 10 },
            callback: yFormat || ((v) => v.toLocaleString())
          },
          grid: { color: COLORS.border, drawBorder: false }
        }
      }
    };
  }

  // ─── 헬퍼: 툴팁 스타일 ────────────────────────────────────
  function tooltipStyle({ label }) {
    return {
      backgroundColor: COLORS.bgElevated,
      titleColor: COLORS.inkPrimary,
      bodyColor: COLORS.inkPrimary,
      borderColor: COLORS.borderStrong,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      titleFont: { size: 12, family: 'Pretendard', weight: '600' },
      bodyFont: { size: 12, family: 'Pretendard' },
      callbacks: label ? { label } : undefined
    };
  }

  function fmt(n) {
    return '₩' + Math.round(n).toLocaleString('ko-KR');
  }

  return { donut, coupleAssetLine, returnRateLine, costVsValueLine };
})();
