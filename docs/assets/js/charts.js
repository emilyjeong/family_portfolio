/**
 * ═════════════════════════════════════════════════════════════
 * Chart.js 래퍼 (charts.js)
 *   다크 테마 + 한국어 친화적 차트 생성
 * ═════════════════════════════════════════════════════════════
 */

const Charts = (() => {

  // 인스턴스 캐시 (canvas id → Chart 객체)
  const instances = {};

  // CSS 변수에서 색상 읽기
  const cssVar = (name) => getComputedStyle(document.documentElement)
    .getPropertyValue(name).trim() || '#888';

  // 도넛 팔레트
  const palette = () => [
    cssVar('--chart-1'),  cssVar('--chart-2'),  cssVar('--chart-3'),
    cssVar('--chart-4'),  cssVar('--chart-5'),  cssVar('--chart-6'),
    cssVar('--chart-7'),  cssVar('--chart-8'),  cssVar('--chart-9'),
    cssVar('--chart-10'), cssVar('--chart-11'), cssVar('--chart-12')
  ];

  /** 기존 차트 파괴 후 새로 생성 */
  function makeChart(canvasId, config) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    if (instances[canvasId]) instances[canvasId].destroy();
    instances[canvasId] = new Chart(ctx, config);
    return instances[canvasId];
  }

  // ─── 도넛 (섹터 비중) ─────────────────────────────────────
  function donut(canvasId, sectors) {
    const data = (sectors || []).filter(s => s.value > 0);
    if (!data.length) {
      const ctx = document.getElementById(canvasId);
      if (ctx) {
        const parent = ctx.parentElement;
        parent.innerHTML = '<div class="empty-state">데이터 없음</div>';
      }
      return;
    }
    return makeChart(canvasId, {
      type: 'doughnut',
      data: {
        labels: data.map(s => s.name),
        datasets: [{
          data: data.map(s => s.value),
          backgroundColor: palette(),
          borderColor: cssVar('--bg-card'),
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
              color: cssVar('--text-primary'),
              font: { size: 12, family: 'Noto Serif KR' },
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
    if (!snapshots.length) return;
    return makeChart(canvasId, {
      type: 'line',
      data: {
        labels: snapshots.map(s => s.date.slice(0, 7)),
        datasets: [
          areaDataset('🤵 남편', snapshots.map(s => Math.round(s.husbandValue / 10000)),
                      cssVar('--c-husband'), '#F472B655'),
          areaDataset('👰 아내', snapshots.map(s => Math.round(s.wifeValue / 10000)),
                      cssVar('--c-wife'), '#34D39955')
        ]
      },
      options: lineOptions({
        yLabel: '만원',
        tooltipLabel: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y * 10000)}`
      })
    });
  }

  // ─── 라인: 월별 수익률 추이 ───────────────────────────────
  function returnRateLine(canvasId, snapshots) {
    if (!snapshots.length) return;
    const wifeRet = snapshots.map(s =>
      s.wifeCost > 0 ? ((s.wifeValue - s.wifeCost) / s.wifeCost * 100) : 0);
    const husbandRet = snapshots.map(s =>
      s.husbandCost > 0 ? ((s.husbandValue - s.husbandCost) / s.husbandCost * 100) : 0);

    return makeChart(canvasId, {
      type: 'line',
      data: {
        labels: snapshots.map(s => s.date.slice(0, 7)),
        datasets: [
          lineDataset('👰 아내 수익률(%)', wifeRet, cssVar('--c-wife')),
          lineDataset('🤵 남편 수익률(%)', husbandRet, cssVar('--c-husband'))
        ]
      },
      options: lineOptions({
        yLabel: '%',
        yFormat: (v) => v + '%',
        tooltipLabel: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}%`
      })
    });
  }

  // ─── 라인: 개인 투입금 vs 평가금 ───────────────────────────
  function costVsValueLine(canvasId, snapshots, who) {
    if (!snapshots.length) return;
    const valueKey = who === 'wife' ? 'wifeValue' : 'husbandValue';
    const costKey  = who === 'wife' ? 'wifeCost'  : 'husbandCost';
    const color    = who === 'wife' ? cssVar('--c-wife') : cssVar('--c-husband');

    return makeChart(canvasId, {
      type: 'line',
      data: {
        labels: snapshots.map(s => s.date.slice(0, 7)),
        datasets: [
          {
            label: '현재 평가금',
            data: snapshots.map(s => Math.round(s[valueKey] / 10000)),
            borderColor: color,
            backgroundColor: color + '33',
            borderWidth: 2.5,
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: color
          },
          {
            label: '투입금 (실제 투입금)',
            data: snapshots.map(s => Math.round(s[costKey] / 10000)),
            borderColor: cssVar('--text-muted'),
            backgroundColor: 'transparent',
            borderDash: [5, 4],
            borderWidth: 1.5,
            tension: 0.35,
            pointRadius: 2,
            pointBackgroundColor: cssVar('--text-muted')
          }
        ]
      },
      options: lineOptions({
        yLabel: '만원',
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
  function lineOptions({ yLabel, yFormat, tooltipLabel }) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: cssVar('--text-primary'),
            font: { size: 12, family: 'Noto Serif KR' },
            usePointStyle: true,
            padding: 12
          }
        },
        tooltip: tooltipStyle({ label: tooltipLabel })
      },
      scales: {
        x: {
          ticks: { color: cssVar('--text-secondary'), font: { size: 10 } },
          grid: { color: cssVar('--border'), drawBorder: false }
        },
        y: {
          ticks: {
            color: cssVar('--text-secondary'),
            font: { size: 10 },
            callback: yFormat || ((v) => v.toLocaleString())
          },
          grid: { color: cssVar('--border'), drawBorder: false },
          title: yLabel ? {
            display: true,
            text: yLabel,
            color: cssVar('--text-muted'),
            font: { size: 10 }
          } : undefined
        }
      }
    };
  }

  // ─── 헬퍼: 툴팁 스타일 ────────────────────────────────────
  function tooltipStyle({ label }) {
    return {
      backgroundColor: cssVar('--bg-elevated'),
      titleColor: cssVar('--text-primary'),
      bodyColor: cssVar('--text-primary'),
      borderColor: cssVar('--border-strong'),
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      titleFont: { size: 12, family: 'Noto Serif KR', weight: '600' },
      bodyFont: { size: 12, family: 'Noto Serif KR' },
      callbacks: label ? { label } : undefined
    };
  }

  // 외부에서도 사용할 포맷터
  function fmt(n) {
    return CONFIG.CURRENCY + Math.round(n).toLocaleString(CONFIG.LOCALE);
  }

  return { donut, coupleAssetLine, returnRateLine, costVsValueLine };
})();
