<template>
  <div class="salary-detail">
    <div class="page-header">
      <h2>工资明细</h2>
      <div class="period-selector">
        <el-select v-model="selectedPeriod" placeholder="选择月份" @change="loadDetail">
          <el-option v-for="p in periods" :key="p" :label="p" :value="p" />
        </el-select>
      </div>
    </div>

    <div v-if="loading" class="skeleton-wrap">
      <el-skeleton :rows="8" animated />
    </div>

    <template v-else-if="salary">
      <div class="detail-cards">
        <div class="detail-group card income-group">
          <div class="group-header">
            <h3>应发项目</h3>
            <span class="group-total money">¥{{ formatMoney(salary.salary) }}</span>
          </div>
          <div class="group-items">
            <div class="detail-item" v-for="item in incomeItems" :key="item.key">
              <div class="item-info">
                <span class="item-label">{{ item.label }}</span>
                <el-tooltip :content="item.desc" placement="top">
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <span class="item-value money">¥{{ formatMoney(salary[item.key]) }}</span>
            </div>
          </div>
        </div>

        <div class="detail-group card deduction-group">
          <div class="group-header">
            <h3>扣款项目</h3>
            <span class="group-total money deduction">-¥{{ formatMoney(salary.total_deduction) }}</span>
          </div>
          <div class="group-items">
            <div class="detail-item" v-for="item in deductionItems" :key="item.key">
              <div class="item-info">
                <span class="item-label">{{ item.label }}</span>
                <el-tooltip :content="item.desc" placement="top">
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <span class="item-value money deduction">-¥{{ formatMoney(salary[item.key]) }}</span>
            </div>
          </div>
        </div>

        <div v-if="salary.target_linked_amount > 0" class="detail-group card other-group">
          <div class="group-header">
            <h3>其他项目</h3>
            <span class="group-total money deduction">-¥{{ formatMoney(salary.target_linked_amount) }}</span>
          </div>
          <div class="group-items">
            <div class="detail-item">
              <div class="item-info">
                <span class="item-label">目标挂钩部分</span>
                <el-tooltip content="与目标考核挂钩的金额部分" placement="top">
                  <el-icon class="info-icon"><InfoFilled /></el-icon>
                </el-tooltip>
              </div>
              <span class="item-value money deduction">-¥{{ formatMoney(salary.target_linked_amount) }}</span>
            </div>
          </div>
        </div>

        <div v-if="salary.remark" class="remark-card card">
          <div class="remark-header">
            <el-icon class="remark-icon"><InfoFilled /></el-icon>
            <h3>备注说明</h3>
          </div>
          <p class="remark-text">{{ salary.remark }}</p>
        </div>

        <div class="net-salary-card card">
          <div class="net-label">实发工资</div>
          <div class="net-amount">
            <span class="currency">¥</span>
            <span class="amount money">{{ formatMoney(salary.net_performance_pay) }}</span>
          </div>
        </div>
      </div>
    </template>

    <el-empty v-else description="暂无工资数据" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../utils/api'

const loading = ref(true)
const periods = ref<string[]>([])
const selectedPeriod = ref('')
const salary = ref<any>(null)

const incomeItems = [
  { key: 'salary', label: '薪酬', desc: '月度薪酬总额' }
]

const deductionItems = [
  { key: 'pension_insurance_1', label: '养老保险1', desc: '养老保险个人缴纳部分' },
  { key: 'pension_insurance_2', label: '养老保险2', desc: '养老保险个人缴纳部分（补充）' },
  { key: 'medical_insurance', label: '医疗保险', desc: '医疗保险个人缴纳部分' },
  { key: 'unemployment_insurance', label: '失业保险', desc: '失业保险个人缴纳部分' },
  { key: 'housing_fund_deduction', label: '代扣公积金', desc: '住房公积金代扣部分' },
  { key: 'income_tax', label: '代扣税', desc: '个人所得税代扣代缴' }
]

function formatMoney(val: number | string): string {
  const num = typeof val === 'string' ? parseFloat(val) : val
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function loadPeriods() {
  const res = await api.get('/salary/months') as any
  periods.value = res
  if (res.length > 0) {
    selectedPeriod.value = res[0]
    await loadDetail()
  }
}

async function loadDetail() {
  if (!selectedPeriod.value) return
  loading.value = true
  try {
    const res = await api.get(`/salary/detail/${selectedPeriod.value}`) as any
    salary.value = res
  } catch (err) {
    salary.value = null
  } finally {
    loading.value = false
  }
}

onMounted(loadPeriods)
</script>

<style scoped>
.salary-detail {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.page-header h2 {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.skeleton-wrap {
  padding: var(--spacing-xl);
  background: var(--card-bg);
  border-radius: var(--radius-md);
}

.detail-cards {
  display: grid;
  gap: var(--spacing-xl);
}

.detail-group {
  padding: var(--spacing-xl);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--border-color);
}

.group-header h3 {
  font-size: var(--font-size-md);
  font-weight: 600;
}

.group-total {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--success-color);
}

.group-total.deduction {
  color: var(--danger-color);
}

.group-items {
  display: grid;
  gap: var(--spacing-md);
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-sm) 0;
}

.item-info {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}

.item-label {
  color: var(--text-secondary);
}

.info-icon {
  color: var(--text-placeholder);
  cursor: help;
}

.item-value {
  font-size: var(--font-size-md);
  font-weight: 500;
}

.item-value.deduction {
  color: var(--danger-color);
}

.net-salary-card {
  background: var(--primary-gradient);
  color: white;
  text-align: center;
  padding: var(--spacing-2xl);
  border-radius: var(--radius-lg);
}

.net-label {
  font-size: var(--font-size-md);
  opacity: 0.9;
  margin-bottom: var(--spacing-md);
}

.net-amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: var(--spacing-xs);
}

.currency {
  font-size: var(--font-size-xl);
  font-weight: 600;
}

.amount {
  font-size: 48px;
  font-weight: 700;
}

.remark-card {
  padding: var(--spacing-lg) var(--spacing-xl);
  background: #F0F9FF;
  border-left: 3px solid var(--primary-color);
}

.remark-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-sm);
}

.remark-icon {
  color: var(--primary-color);
  font-size: 16px;
}

.remark-header h3 {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--primary-color);
  margin: 0;
}

.remark-text {
  font-size: var(--font-size-sm);
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
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

  .period-selector {
    width: 100%;
  }

  .period-selector :deep(.el-select) {
    width: 100%;
  }

  .period-selector :deep(.el-input__wrapper) {
    height: 44px;
  }

  .detail-group {
    padding: 16px;
  }

  .group-header h3 {
    font-size: 15px;
  }

  .group-total {
    font-size: 16px;
  }

  .detail-item {
    padding: 10px 0;
    min-height: 44px;
  }

  .item-label {
    font-size: 14px;
  }

  .item-value {
    font-size: 15px;
  }

  .info-icon {
    min-width: 20px;
    min-height: 20px;
  }

  .net-salary-card {
    padding: 24px 16px;
  }

  .net-label {
    font-size: 15px;
  }

  .net-salary-card .amount {
    font-size: 32px;
  }

  .net-salary-card .currency {
    font-size: 20px;
  }

  .remark-card {
    padding: 12px 16px;
  }

  .remark-text {
    font-size: 13px;
  }
}
</style>
