-- ============================================
-- 薪酬助手二期数据库迁移脚本
-- 基于真实工资条模板重构数据模型
-- ============================================

USE salary_system;

-- 1. 备份旧表
RENAME TABLE salaries TO salaries_legacy;

-- 2. 创建新的 salaries 表（基于真实工资条结构）
CREATE TABLE salaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  period VARCHAR(7) NOT NULL COMMENT '发放月份 YYYY-MM',
  
  -- 收入项
  performance_base DECIMAL(12,2) DEFAULT 0 COMMENT '绩效',
  bonus DECIMAL(12,2) DEFAULT 0 COMMENT '奖励',
  performance_adjustment DECIMAL(12,2) DEFAULT 0 COMMENT '绩效调整',
  salary DECIMAL(12,2) DEFAULT 0 COMMENT '薪酬（=绩效+绩效调整）',
  
  -- 扣款项
  pension_insurance_1 DECIMAL(12,2) DEFAULT 0 COMMENT '养老保险1',
  pension_insurance_2 DECIMAL(12,2) DEFAULT 0 COMMENT '养老保险2',
  medical_insurance DECIMAL(12,2) DEFAULT 0 COMMENT '医疗保险',
  unemployment_insurance DECIMAL(12,2) DEFAULT 0 COMMENT '失业保险',
  supplementary_medical DECIMAL(12,2) DEFAULT 0 COMMENT '补充医保',
  housing_fund_deduction DECIMAL(12,2) DEFAULT 0 COMMENT '代扣公积金',
  housing_fund_supplement DECIMAL(12,2) DEFAULT 0 COMMENT '补扣公积金',
  income_tax DECIMAL(12,2) DEFAULT 0 COMMENT '代扣税',
  
  -- 其他
  target_linked_amount DECIMAL(12,2) DEFAULT 0 COMMENT '目标挂钩部分',
  net_performance_pay DECIMAL(12,2) DEFAULT 0 COMMENT '绩效实发数',
  
  -- 计算字段
  total_deduction DECIMAL(12,2) DEFAULT 0 COMMENT '扣款合计',
  
  -- 元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY uk_user_period (user_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 数据迁移：从旧表映射到新表
-- 字段映射关系：
-- performance_salary -> performance_base (绩效)
-- bonus -> bonus (奖励)
-- (无) -> performance_adjustment (绩效调整，旧数据为0)
-- gross_salary -> salary (薪酬)
-- pension_personal -> pension_insurance_1 (养老保险1)
-- (无) -> pension_insurance_2 (养老保险2，旧数据为0)
-- medical_personal -> medical_insurance (医疗保险)
-- unemployment_personal -> unemployment_insurance (失业保险)
-- (无) -> supplementary_medical (补充医保，旧数据为0)
-- housing_fund_personal -> housing_fund_deduction (代扣公积金)
-- (无) -> housing_fund_supplement (补扣公积金，旧数据为0)
-- income_tax -> income_tax (代扣税)
-- (无) -> target_linked_amount (目标挂钩部分，旧数据为0)
-- net_salary -> net_performance_pay (绩效实发数)

INSERT INTO salaries (
  user_id, period,
  performance_base, bonus, performance_adjustment, salary,
  pension_insurance_1, pension_insurance_2, medical_insurance, unemployment_insurance,
  supplementary_medical, housing_fund_deduction, housing_fund_supplement, income_tax,
  target_linked_amount, net_performance_pay, total_deduction
)
SELECT 
  user_id, period,
  COALESCE(performance_salary, 0) as performance_base,
  COALESCE(bonus, 0) as bonus,
  0 as performance_adjustment,
  COALESCE(gross_salary, 0) as salary,
  COALESCE(pension_personal, 0) as pension_insurance_1,
  0 as pension_insurance_2,
  COALESCE(medical_personal, 0) as medical_insurance,
  COALESCE(unemployment_personal, 0) as unemployment_insurance,
  0 as supplementary_medical,
  COALESCE(housing_fund_personal, 0) as housing_fund_deduction,
  0 as housing_fund_supplement,
  COALESCE(income_tax, 0) as income_tax,
  0 as target_linked_amount,
  COALESCE(net_salary, 0) as net_performance_pay,
  COALESCE(total_deduction, 0) as total_deduction
FROM salaries_legacy;

-- 4. 验证迁移结果
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT period) as unique_periods
FROM salaries;

-- 5. 创建视图用于回滚查询（可选）
CREATE OR REPLACE VIEW salaries_legacy_view AS
SELECT * FROM salaries_legacy;

SELECT '数据迁移完成！' as message;
SELECT CONCAT('旧表记录数: ', COUNT(*)) as legacy_count FROM salaries_legacy;
SELECT CONCAT('新表记录数: ', COUNT(*)) as new_count FROM salaries;
