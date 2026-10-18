-- ============================================
-- 薪酬助手二期数据库回滚脚本
-- 如果需要回退到一期数据模型，执行此脚本
-- ============================================

USE salary_system;

-- 1. 删除新表
DROP TABLE IF EXISTS salaries;

-- 2. 恢复旧表
RENAME TABLE salaries_legacy TO salaries;

-- 3. 删除视图
DROP VIEW IF EXISTS salaries_legacy_view;

SELECT '回滚完成！已恢复到一期数据模型。' as message;
SELECT CONCAT('恢复记录数: ', COUNT(*)) as record_count FROM salaries;
