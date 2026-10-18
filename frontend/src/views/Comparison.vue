<template>
  <div class="comparison">
    <div class="page-header">
      <h2>对比分析</h2>
      <div class="range-selector">
        <el-radio-group v-model="rangeType">
          <el-radio-button label="3">近3月</el-radio-button>
          <el-radio-button label="6">近6月</el-radio-button>
          <el-radio-button label="12">近12月</el-radio-button>
          <el-radio-button label="custom">自定义</el-radio-button>
        </el-radio-group>
        <div v-if="rangeType === 'custom'" class="custom-range">
          <el-date-picker v-model="dateRange" type="monthrange" range-separator="至" start-placeholder="开始月份" end-placeholder="结束月份" format="YYYY-MM" value-format="YYYY-MM" @change="loadData" />
        </div>
      </div>
    </div>

    <div v-if="loading" class="skeleton-wrap">
      <el-skeleton :rows="10" animated />
    </div>

    <template v-else-if="data">
      <div class="stats-cards">
        <div class="stat-card card">
          <div class="stat-label">期间收入总额</div>
          <div class="stat-value money">¥{{ formatMoney(stats.total_net) }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">月均实发</div>
          <div class="stat-value money">¥{{ formatMoney(stats.avg_net) }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">最高月</div>
          <div class="stat-value money">¥{{ formatMoney(stats.max_net) }}</div>
        </div>
        <div class="stat-card card">
          <div class="stat-label">最低月</div>
          <div class="stat-value money">¥{{ formatMoney(stats.min_net) }}</div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="chart-card card">
          <h3>实发工资趋势</h3>
          <div ref="trendChartRef" class="chart-container"></div>
        </div>
        <div class="chart-card card">
          <h3>应发 vs 实发对比</h3>
          <div ref="barChartRef" class="chart-container"></div>
        </div>
        <div class="chart-card card">
          <h3>工资构成</h3>
          <div ref="pieChartRef" class="chart-container"></div>
        </div>
        <div class="chart-card card">
          <h3>五险一金与个税</h3>
          <div ref="stackChartRef" class="chart-container"></div>
        </div>
      </div>

      <div class="table-card card">
        <h3>明细对比表</h3>
        <el-table :data="tableData" stripe style="width: 100%">
          <el-table-column prop="period" label="月份" width="100" fixed />
          <el-table-column label="应发合计" width="120" align="right">
            <template #default="{ row }">
              <span class="money">¥{{ formatMoney(row.salary) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="扣款合计" width="120" align="right">
            <template #default="{ row }">
              <span class="money deduction">¥{{ formatMoney(row.total_deduction) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="实发工资" width="120" align="right">
            <template #default="{ row }">
              <span class="money net">¥{{ formatMoney(row.net_performance_pay) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="环比变化" width="120" align="right">
            <template #default="{ row, $index }">
              <span v-if="$index > 0" :class="getChangeClass(row, $index)">
                {{ getChangeText(row, $index) }}
              </span>
              <span v-else>-</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <el-empty v-else description="暂无工资数据">
      <template #description>
        <p>当前时间范围内暂无数据</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px">试试切换时间范围或选择"自定义"查看其他月份</p>
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import * as echarts from 'echarts'
import api from '../utils/api'

const loading = ref(true)
const rangeType = ref('3')
const dateRange = ref<[string, string]>()
const data = ref<any>(null)
const stats = ref<any>({})
const tableData = ref<any[]>([])

const trendChartRef = ref<HTMLElement>()
const barChartRef = ref<HTMLElement>()
const pieChartRef = ref<HTMLElement>()
const stackChartRef = ref<HTMLElement>()

let trendChart: echarts.ECharts | null = null
let barChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null
let stackChart: echarts.ECharts | null = null

function formatMoney(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadData() {
  loading.value = true
  try {
    const months = await api.get('/salary/months') as any
    
    if (!months || months.length === 0) {
      data.value = null
      loading.value = false
      return
    }

    let url = '/salary/comparison?'
    if (rangeType.value === 'custom' && dateRange.value) {
      url += `start=${dateRange.value[0]}&end=${dateRange.value[1]}`
    } else {
      const availableMonths = parseInt(rangeType.value)
      const latestMonth = months[0]
      const earliestMonth = months[months.length - 1]
      
      const end = new Date(latestMonth + '-01')
      const start = new Date(end)
      start.setMonth(start.getMonth() - availableMonths + 1)
      
      const startStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`
      const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`
      
      const actualStart = startStr < earliestMonth ? earliestMonth : startStr
      url += `start=${actualStart}&end=${endStr}`
    }

    const res = await api.get(url) as any
    data.value = res
    stats.value = {
      total_net: res.total_net,
      avg_net: res.avg_net,
      max_net: res.max_net,
      min_net: res.min_net
    }
    tableData.value = res.data
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }

  await nextTick()
  initCharts()
}

function initCharts() {
  if (!data.value?.data?.length) return

  trendChart?.dispose()
  barChart?.dispose()
  pieChart?.dispose()
  stackChart?.dispose()

  const chartData = data.value.data
  const periods = chartData.map((d: any) => d.period)
  const netSalaries = chartData.map((d: any) => parseFloat(d.net_performance_pay))
  const grossSalaries = chartData.map((d: any) => parseFloat(d.salary))

  if (trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    trendChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const p = params[0]
          return `${p.name}<br/>实发工资: ¥${formatMoney(p.value)}`
        }
      },
      grid: { left: 60, right: 20, top: 20, bottom: 50 },
      xAxis: { type: 'category', data: periods, axisLabel: { rotate: periods.length > 6 ? 45 : 0 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `¥${(v/1000).toFixed(0)}k` } },
      dataZoom: periods.length > 6 ? [{
        type: 'inside',
        start: 0,
        end: 100,
        zoomLock: false
      }, {
        type: 'slider',
        show: true,
        height: 20,
        bottom: 5,
        start: 0,
        end: 100
      }] : undefined,
      series: [{
        type: 'line',
        data: netSalaries,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: { color: '#2563EB' },
        areaStyle: { color: 'rgba(37, 99, 235, 0.1)' }
      }]
    })
  }

  if (barChartRef.value) {
    barChart = echarts.init(barChartRef.value)
    barChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: { data: ['应发', '实发'], top: 0, textStyle: { fontSize: 12 } },
      grid: { left: 60, right: 20, top: 40, bottom: 50 },
      xAxis: { type: 'category', data: periods, axisLabel: { rotate: periods.length > 6 ? 45 : 0 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `¥${(v/1000).toFixed(0)}k` } },
      dataZoom: periods.length > 6 ? [{
        type: 'inside',
        start: 0,
        end: 100
      }, {
        type: 'slider',
        show: true,
        height: 20,
        bottom: 5,
        start: 0,
        end: 100
      }] : undefined,
      series: [
        { name: '应发', type: 'bar', data: grossSalaries, itemStyle: { color: '#3B82F6' } },
        { name: '实发', type: 'bar', data: netSalaries, itemStyle: { color: '#10B981' } }
      ]
    })
  }

  if (pieChartRef.value && chartData.length > 0) {
    pieChart = echarts.init(pieChartRef.value)
    const latest = chartData[chartData.length - 1]
    pieChart.setOption({
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ¥{c} ({d}%)'
      },
      legend: { orient: 'vertical', right: 10, top: 'center', textStyle: { fontSize: 12 } },
      series: [{
        type: 'pie',
        radius: ['35%', '65%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: 'bold' },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' }
        },
        data: [
          { value: parseFloat(latest.net_performance_pay), name: '实发工资', itemStyle: { color: '#10B981' } },
          { value: parseFloat(latest.pension_insurance_1) + parseFloat(latest.pension_insurance_2), name: '养老保险', itemStyle: { color: '#3B82F6' } },
          { value: parseFloat(latest.medical_insurance), name: '医疗保险', itemStyle: { color: '#F59E0B' } },
          { value: parseFloat(latest.unemployment_insurance), name: '失业保险', itemStyle: { color: '#8B5CF6' } },
          { value: parseFloat(latest.housing_fund_deduction), name: '公积金', itemStyle: { color: '#EC4899' } },
          { value: parseFloat(latest.income_tax), name: '个税', itemStyle: { color: '#EF4444' } }
        ].filter(d => d.value > 0)
      }]
    })
  }

  if (stackChartRef.value) {
    stackChart = echarts.init(stackChartRef.value)
    stackChart.setOption({
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: { data: ['养老', '医疗', '失业', '公积金', '个税'], top: 0, textStyle: { fontSize: 11 } },
      grid: { left: 60, right: 20, top: 40, bottom: 50 },
      xAxis: { type: 'category', data: periods, axisLabel: { rotate: periods.length > 6 ? 45 : 0 } },
      yAxis: { type: 'value', axisLabel: { formatter: (v: number) => `¥${v}` } },
      dataZoom: periods.length > 6 ? [{
        type: 'inside',
        start: 0,
        end: 100
      }, {
        type: 'slider',
        show: true,
        height: 20,
        bottom: 5,
        start: 0,
        end: 100
      }] : undefined,
      series: [
        { name: '养老', type: 'line', stack: 'total', data: chartData.map((d: any) => parseFloat(d.pension_insurance_1) + parseFloat(d.pension_insurance_2)), areaStyle: {} },
        { name: '医疗', type: 'line', stack: 'total', data: chartData.map((d: any) => parseFloat(d.medical_insurance)), areaStyle: {} },
        { name: '失业', type: 'line', stack: 'total', data: chartData.map((d: any) => parseFloat(d.unemployment_insurance)), areaStyle: {} },
        { name: '公积金', type: 'line', stack: 'total', data: chartData.map((d: any) => parseFloat(d.housing_fund_deduction)), areaStyle: {} },
        { name: '个税', type: 'line', stack: 'total', data: chartData.map((d: any) => parseFloat(d.income_tax)), areaStyle: {} }
      ]
    })
  }
}

function getChangeClass(row: any, index: number) {
  if (index === 0) return ''
  const prev = tableData.value[index - 1]
  const change = parseFloat(row.net_performance_pay) - parseFloat(prev.net_performance_pay)
  return change > 0 ? 'change-up' : change < 0 ? 'change-down' : ''
}

function getChangeText(row: any, index: number) {
  if (index === 0) return '-'
  const prev = tableData.value[index - 1]
  const change = parseFloat(row.net_performance_pay) - parseFloat(prev.net_performance_pay)
  const pct = (change / parseFloat(prev.net_performance_pay) * 100).toFixed(1)
  return `${change > 0 ? '+' : ''}${pct}%`
}

onMounted(loadData)

window.addEventListener('resize', () => {
  trendChart?.resize()
  barChart?.resize()
  pieChart?.resize()
  stackChart?.resize()
})

watch(() => [rangeType.value, dateRange.value], () => {
  if (rangeType.value !== 'custom' || dateRange.value) {
    loadData()
  }
})
</script>

<style scoped>
.comparison {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
  flex-wrap: wrap;
  gap: var(--spacing-lg);
}

.page-header h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.range-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.skeleton-wrap {
  padding: var(--spacing-xl);
  background: var(--card-bg);
  border-radius: var(--radius-md);
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--spacing-lg);
  margin-bottom: var(--spacing-xl);
}

.stat-card {
  text-align: center;
  padding: var(--spacing-xl);
}

.stat-label {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  margin-bottom: var(--spacing-sm);
}

.stat-value {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--primary-color);
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: var(--spacing-xl);
  margin-bottom: var(--spacing-xl);
}

.chart-card {
  padding: var(--spacing-xl);
}

.chart-card h3 {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}

.chart-container {
  height: 300px;
}

.table-card {
  padding: var(--spacing-xl);
}

.table-card h3 {
  font-size: var(--font-size-md);
  font-weight: 600;
  margin-bottom: var(--spacing-lg);
}

.money {
  font-variant-numeric: tabular-nums;
}

.deduction {
  color: var(--danger-color);
}

.net {
  color: var(--success-color);
  font-weight: 600;
}

.change-up {
  color: var(--success-color);
}

.change-down {
  color: var(--danger-color);
}

/* 移动端适配 */
@media (max-width: 767px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .page-header h2 {
    font-size: 18px;
  }

  .range-selector {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .range-selector :deep(.el-radio-group) {
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
    width: 100%;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }

  .range-selector :deep(.el-radio-button) {
    flex-shrink: 0;
  }

  .range-selector :deep(.el-radio-button__inner) {
    padding: 10px 16px;
    font-size: 14px;
    border-radius: 20px !important;
    border: 1px solid var(--border-color) !important;
    background: white !important;
    color: var(--text-primary) !important;
    white-space: nowrap;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .range-selector :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: var(--primary-color) !important;
    color: white !important;
    border-color: var(--primary-color) !important;
  }

  .custom-range {
    width: 100%;
  }

  .custom-range :deep(.el-date-editor) {
    width: 100% !important;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .stat-card {
    padding: 16px 12px;
  }

  .stat-label {
    font-size: 12px;
  }

  .stat-value {
    font-size: 16px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .chart-card {
    padding: 16px;
  }

  .chart-card h3 {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .chart-container {
    height: 240px;
  }

  .table-card {
    padding: 16px;
  }

  .table-card h3 {
    font-size: 15px;
    margin-bottom: 12px;
  }

  .table-card :deep(.el-table) {
    font-size: 13px;
  }

  .table-card :deep(.el-table th) {
    padding: 8px 0;
    font-size: 12px;
  }

  .table-card :deep(.el-table td) {
    padding: 8px 0;
  }

  .table-card :deep(.el-table .cell) {
    padding: 0 8px;
    word-break: break-word;
  }
}

/* 小屏手机适配 (375px以下) */
@media (max-width: 374px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 14px;
  }

  .chart-container {
    height: 200px;
  }

  .range-selector :deep(.el-radio-button__inner) {
    font-size: 12px;
    padding: 8px 4px;
  }
}
</style>
