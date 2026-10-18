<template>
  <div class="dashboard">
    <div v-if="loading" class="skeleton-wrap">
      <el-skeleton :rows="5" animated />
    </div>
    <template v-else-if="latest">
      <div class="hero-card">
        <div class="hero-main">
          <div class="hero-label">{{ latest.current.period }} 实发工资</div>
          <div class="hero-amount">
            <span class="currency">¥</span>
            <span class="amount money">{{ animatedAmount }}</span>
          </div>
          <div class="hero-change" :class="changeClass">
            <el-icon v-if="latest.change > 0"><ArrowUp /></el-icon>
            <el-icon v-else-if="latest.change < 0"><ArrowDown /></el-icon>
            <span>环比上月 {{ latest.change > 0 ? '+' : '' }}{{ formatMoney(latest.change) }}</span>
            <el-button link type="primary" @click="$router.push('/comparison')" style="margin-left: 8px">查看详情</el-button>
          </div>
        </div>
        <div class="hero-summary">
          <div class="summary-item">
            <span class="summary-label">应发合计</span>
            <span class="summary-value money">¥{{ formatMoney(latest.current.salary) }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">扣款合计</span>
            <span class="summary-value money deduction">¥{{ formatMoney(latest.current.total_deduction) }}</span>
          </div>
        </div>
      </div>

      <div class="quick-cards">
        <div class="quick-card" @click="$router.push('/detail')">
          <el-icon :size="24" color="var(--primary-color)"><Document /></el-icon>
          <span>工资明细</span>
        </div>
        <div class="quick-card" @click="$router.push('/comparison')">
          <el-icon :size="24" color="var(--success-color)"><TrendCharts /></el-icon>
          <span>对比分析</span>
        </div>
      </div>

      <div class="chart-card card">
        <h3>近 6 个月实发工资趋势</h3>
        <div ref="chartRef" class="chart-container"></div>
      </div>
    </template>
    <template v-else>
      <div class="empty-state card">
        <el-empty description="暂无工资数据">
          <template #description>
            <p>还没有工资数据，请联系管理员导入</p>
          </template>
        </el-empty>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import * as echarts from 'echarts'
import api from '../utils/api'

const loading = ref(true)
const latest = ref<any>(null)
const summary = ref<any[]>([])
const chartRef = ref<HTMLElement>()
const animatedAmount = ref('0.00')

const changeClass = computed(() => {
  if (!latest.value) return ''
  if (latest.value.change > 0) return 'up'
  if (latest.value.change < 0) return 'down'
  return 'flat'
})

function formatMoney(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function animateNumber(target: number) {
  const duration = 600
  const start = performance.now()
  const from = 0
  
  function update(now: number) {
    const elapsed = now - start
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    const current = from + (target - from) * eased
    animatedAmount.value = formatMoney(current)
    if (progress < 1) requestAnimationFrame(update)
  }
  requestAnimationFrame(update)
}

function initChart() {
  if (!chartRef.value || summary.value.length === 0) return
  
  const chart = echarts.init(chartRef.value)
  const data = summary.value.slice(0, 6).reverse()
  
  chart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        const p = params[0]
        return `${p.name}<br/>实发工资: ¥${formatMoney(p.value)}`
      }
    },
    grid: { left: 60, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data.map((d: any) => d.period),
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisLabel: { color: '#646A73' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#F3F4F6' } },
      axisLabel: { color: '#646A73', formatter: (v: number) => `¥${(v/1000).toFixed(0)}k` }
    },
    series: [{
      type: 'line',
      data: data.map((d: any) => parseFloat(d.net_salary)),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { color: '#2563EB', width: 3 },
      itemStyle: { color: '#2563EB' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37, 99, 235, 0.15)' },
          { offset: 1, color: 'rgba(37, 99, 235, 0.01)' }
        ])
      }
    }]
  })

  window.addEventListener('resize', () => chart.resize())
}

onMounted(async () => {
  try {
    const [latestRes, summaryRes] = await Promise.all([
      api.get('/salary/latest'),
      api.get('/salary/summary')
    ]) as any[]
    
    latest.value = latestRes
    summary.value = summaryRes
    
    if (latestRes?.current?.net_performance_pay) {
      animateNumber(parseFloat(latestRes.current.net_performance_pay))
    }
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }

  await nextTick()
  initChart()
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
  margin: 0 auto;
}

.skeleton-wrap {
  padding: var(--spacing-xl);
}

.hero-card {
  background: var(--primary-gradient);
  border-radius: var(--radius-lg);
  padding: var(--spacing-2xl);
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  box-shadow: var(--shadow-lg);
}

.hero-label {
  font-size: var(--font-size-sm);
  opacity: 0.85;
  margin-bottom: var(--spacing-sm);
}

.hero-amount {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-md);
}

.currency {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.amount {
  font-size: 48px;
  font-weight: 700;
  line-height: 1;
}

.hero-change {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-size: var(--font-size-sm);
  opacity: 0.9;
}

.hero-change.up { color: #86EFAC; }
.hero-change.down { color: #FCA5A5; }

.hero-summary {
  display: flex;
  gap: var(--spacing-2xl);
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
}

.summary-label {
  font-size: var(--font-size-xs);
  opacity: 0.7;
}

.summary-value {
  font-size: var(--font-size-lg);
  font-weight: 600;
}

.summary-value.deduction {
  color: #FCA5A5;
}

.quick-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.quick-card {
  background: var(--card-bg);
  border-radius: var(--radius-md);
  padding: var(--spacing-xl);
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.quick-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.quick-card span {
  font-size: var(--font-size-md);
  font-weight: 500;
}

.chart-card {
  background: var(--card-bg);
}

.chart-card h3 {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}

.chart-container {
  height: 300px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 移动端适配 */
@media (max-width: 767px) {
  .hero-card {
    flex-direction: column;
    align-items: flex-start;
    padding: 24px 20px;
    gap: 20px;
  }

  .hero-main {
    width: 100%;
  }

  .hero-label {
    font-size: 14px;
  }

  .amount {
    font-size: 36px;
  }

  .currency {
    font-size: 20px;
  }

  .hero-change {
    flex-wrap: wrap;
    font-size: 13px;
  }

  .hero-summary {
    width: 100%;
    justify-content: space-between;
    gap: 16px;
  }

  .summary-value {
    font-size: 16px;
  }

  .quick-cards {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .quick-card {
    padding: 16px 20px;
    min-height: 56px;
  }

  .chart-container {
    height: 250px;
  }

  .chart-card {
    padding: 16px;
  }

  .chart-card h3 {
    font-size: 15px;
  }
}
</style>
