import { Router, Response } from 'express';
import pool from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requirePasswordChanged } from '../middleware/password.js';

const router = Router();

router.use(authenticate);
router.use(requirePasswordChanged);

router.get('/months', async (req: AuthRequest, res: Response) => {
  const [months] = await pool.query(
    'SELECT DISTINCT period FROM salaries WHERE user_id = ? ORDER BY period DESC',
    [req.user!.id]
  );
  res.json((months as any[]).map(m => m.period));
});

router.get('/detail/:period', async (req: AuthRequest, res: Response) => {
  const { period } = req.params;
  
  const [salaries] = await pool.query(
    'SELECT * FROM salaries WHERE user_id = ? AND period = ?',
    [req.user!.id, period]
  );

  const salary = (salaries as any[])[0];
  if (!salary) {
    return res.status(404).json({ error: '工资记录不存在' });
  }

  res.json(salary);
});

router.get('/summary', async (req: AuthRequest, res: Response) => {
  const [result] = await pool.query(
    `SELECT 
      period,
      salary as gross_salary,
      total_deduction,
      net_performance_pay as net_salary
    FROM salaries 
    WHERE user_id = ? 
    ORDER BY period DESC 
    LIMIT 12`,
    [req.user!.id]
  );

  res.json(result);
});

router.get('/comparison', async (req: AuthRequest, res: Response) => {
  const { start, end } = req.query;

  let query = 'SELECT * FROM salaries WHERE user_id = ?';
  const params: any[] = [req.user!.id];

  if (start && end) {
    query += ' AND period >= ? AND period <= ?';
    params.push(start, end);
  }

  query += ' ORDER BY period ASC';

  const [salaries] = await pool.query(query, params);

  const stats: any = {
    total_net: 0,
    total_gross: 0,
    count: (salaries as any[]).length,
    max_net: 0,
    min_net: Infinity,
    data: salaries
  };

  (salaries as any[]).forEach(s => {
    stats.total_net += parseFloat(s.net_performance_pay);
    stats.total_gross += parseFloat(s.salary);
    stats.max_net = Math.max(stats.max_net, parseFloat(s.net_performance_pay));
    stats.min_net = Math.min(stats.min_net, parseFloat(s.net_performance_pay));
  });

  if (stats.count > 0) {
    stats.total_net = Math.round(stats.total_net * 100) / 100;
    stats.total_gross = Math.round(stats.total_gross * 100) / 100;
    stats.avg_net = Math.round((stats.total_net / stats.count) * 100) / 100;
  } else {
    stats.avg_net = 0;
    stats.min_net = 0;
  }

  res.json(stats);
});

router.get('/analysis/:period', async (req: AuthRequest, res: Response) => {
  const { period } = req.params;
  
  // 获取当前月份和上一个月的数据
  const [currentSalaries] = await pool.query(
    'SELECT * FROM salaries WHERE user_id = ? AND period = ?',
    [req.user!.id, period]
  );
  
  const current = (currentSalaries as any[])[0];
  if (!current) {
    return res.status(404).json({ error: '工资记录不存在' });
  }
  
  // 获取上一个月数据
  const [prevSalaries] = await pool.query(
    'SELECT * FROM salaries WHERE user_id = ? AND period < ? ORDER BY period DESC LIMIT 1',
    [req.user!.id, period]
  );
  
  const prev = (prevSalaries as any[])[0];
  
  // 获取去年同期数据
  const [yearAgoSalaries] = await pool.query(
    'SELECT * FROM salaries WHERE user_id = ? AND period = ?',
    [req.user!.id, period.replace(/\d{4}/, m => String(parseInt(m) - 12))]
  );
  
  const yearAgo = (yearAgoSalaries as any[])[0];
  
  // 分析变化
  const analysis: any = {
    period,
    current: {
      salary: parseFloat(current.salary),
      net_pay: parseFloat(current.net_performance_pay),
      total_deduction: parseFloat(current.total_deduction)
    },
    changes: [],
    highlights: [],
    warnings: []
  };
  
  if (prev) {
    const prevSalary = parseFloat(prev.salary);
    const prevNet = parseFloat(prev.net_performance_pay);
    const currSalary = parseFloat(current.salary);
    const currNet = parseFloat(current.net_performance_pay);
    
    // 环比变化
    const salaryChange = currSalary - prevSalary;
    const salaryChangePct = (salaryChange / prevSalary * 100).toFixed(1);
    const netChange = currNet - prevNet;
    const netChangePct = (netChange / prevNet * 100).toFixed(1);
    
    if (Math.abs(salaryChange) > 0.01) {
      analysis.changes.push({
        type: 'month_over_month',
        metric: '薪酬',
        change: salaryChange,
        change_pct: parseFloat(salaryChangePct),
        description: salaryChange > 0 
          ? `薪酬环比上涨¥${salaryChange.toFixed(2)}（${salaryChangePct}%）`
          : `薪酬环比下降¥${Math.abs(salaryChange).toFixed(2)}（${salaryChangePct}%）`
      });
    }
    
    if (Math.abs(netChange) > 0.01) {
      analysis.changes.push({
        type: 'month_over_month',
        metric: '实发工资',
        change: netChange,
        change_pct: parseFloat(netChangePct),
        description: netChange > 0
          ? `实发工资环比增加¥${netChange.toFixed(2)}（${netChangePct}%）`
          : `实发工资环比减少¥${Math.abs(netChange).toFixed(2)}（${netChangePct}%）`
      });
    }
    
    // 扣款变化分析
    const prevDeduction = parseFloat(prev.total_deduction);
    const currDeduction = parseFloat(current.total_deduction);
    const deductionChange = currDeduction - prevDeduction;
    
    if (Math.abs(deductionChange) > 10) {
      analysis.highlights.push({
        type: 'deduction_change',
        description: `扣款项环比变化¥${deductionChange.toFixed(2)}，可能因社保基数调整或个税跳档`
      });
    }
  }
  
  if (yearAgo) {
    const yearAgoNet = parseFloat(yearAgo.net_performance_pay);
    const currNet = parseFloat(current.net_performance_pay);
    const yoyChange = currNet - yearAgoNet;
    const yoyChangePct = (yoyChange / yearAgoNet * 100).toFixed(1);
    
    analysis.changes.push({
      type: 'year_over_year',
      metric: '实发工资',
      change: yoyChange,
      change_pct: parseFloat(yoyChangePct),
      description: yoyChange > 0
        ? `同比去年上涨¥${yoyChange.toFixed(2)}（${yoyChangePct}%）`
        : `同比去年下降¥${Math.abs(yoyChange).toFixed(2)}（${yoyChangePct}%）`
    });
  }
  
  // 生成一句话总结
  if (analysis.changes.length > 0) {
    const mainChange = analysis.changes[0];
    analysis.summary = `本月实发工资¥${analysis.current.net_pay.toFixed(2)}，${mainChange.description}`;
  } else {
    analysis.summary = `本月实发工资¥${analysis.current.net_pay.toFixed(2)}，与上月持平`;
  }
  
  // 警告信息
  const taxRate = parseFloat(current.income_tax) / parseFloat(current.salary) * 100;
  if (taxRate > 15) {
    analysis.warnings.push({
      type: 'high_tax',
      description: '个税占比较高，建议关注专项附加扣除申报'
    });
  }
  
  res.json(analysis);
});

router.get('/annual-report/:year', async (req: AuthRequest, res: Response) => {
  const { year } = req.params;
  
  // 获取该年度所有工资数据
  const [salaries] = await pool.query(
    `SELECT * FROM salaries 
     WHERE user_id = ? AND period LIKE ?
     ORDER BY period ASC`,
    [req.user!.id, `${year}-%`]
  );
  
  if ((salaries as any[]).length === 0) {
    return res.status(404).json({ error: '该年度无工资数据' });
  }
  
  // 计算年度统计
  let totalSalary = 0;
  let totalNet = 0;
  let totalDeduction = 0;
  let totalTax = 0;
  let maxNet = 0;
  let minNet = Infinity;
  let maxMonth = '';
  let minMonth = '';
  
  (salaries as any[]).forEach(s => {
    const salary = parseFloat(s.salary);
    const net = parseFloat(s.net_performance_pay);
    const deduction = parseFloat(s.total_deduction);
    const tax = parseFloat(s.income_tax);
    
    totalSalary += salary;
    totalNet += net;
    totalDeduction += deduction;
    totalTax += tax;
    
    if (net > maxNet) {
      maxNet = net;
      maxMonth = s.period;
    }
    if (net < minNet) {
      minNet = net;
      minMonth = s.period;
    }
  });
  
  const avgNet = totalNet / (salaries as any[]).length;
  
  // 计算年度增幅（与上一年对比）
  const prevYear = String(parseInt(year) - 1);
  const [prevYearSalaries] = await pool.query(
    `SELECT SUM(net_performance_pay) as total 
     FROM salaries 
     WHERE user_id = ? AND period LIKE ?`,
    [req.user!.id, `${prevYear}-%`]
  );
  
  const prevYearTotal = (prevYearSalaries as any[])[0]?.total || 0;
  const yoyGrowth = prevYearTotal > 0 
    ? ((totalNet - prevYearTotal) / prevYearTotal * 100).toFixed(1)
    : null;
  
  res.json({
    year,
    months_count: (salaries as any[]).length,
    summary: {
      total_salary: Math.round(totalSalary * 100) / 100,
      total_net: Math.round(totalNet * 100) / 100,
      total_deduction: Math.round(totalDeduction * 100) / 100,
      total_tax: Math.round(totalTax * 100) / 100,
      avg_net: Math.round(avgNet * 100) / 100,
      max_net: Math.round(maxNet * 100) / 100,
      max_month: maxMonth,
      min_net: Math.round(minNet * 100) / 100,
      min_month: minMonth,
      yoy_growth: yoyGrowth ? parseFloat(yoyGrowth) : null
    },
    monthly_data: (salaries as any[]).map(s => ({
      period: s.period,
      salary: parseFloat(s.salary),
      net_pay: parseFloat(s.net_performance_pay),
      deduction: parseFloat(s.total_deduction)
    })),
    highlights: [
      `全年实发工资总计¥${(totalNet / 10000).toFixed(2)}万`,
      `月均实发¥${avgNet.toFixed(2)}`,
      maxMonth ? `最高月份：${maxMonth}（¥${maxNet.toFixed(2)}）` : '',
      minMonth ? `最低月份：${minMonth}（¥${minNet.toFixed(2)}）` : '',
      yoyGrowth ? `同比增长${yoyGrowth}%` : ''
    ].filter(Boolean)
  });
});

router.get('/latest', async (req: AuthRequest, res: Response) => {
  const [salaries] = await pool.query(
    'SELECT * FROM salaries WHERE user_id = ? ORDER BY period DESC LIMIT 1',
    [req.user!.id]
  );

  const salary = (salaries as any[])[0];
  if (!salary) {
    return res.json(null);
  }

  const [prevSalaries] = await pool.query(
    'SELECT net_performance_pay FROM salaries WHERE user_id = ? AND period < ? ORDER BY period DESC LIMIT 1',
    [req.user!.id, salary.period]
  );

  const prev = (prevSalaries as any[])[0];
  const change = prev ? parseFloat(salary.net_performance_pay) - parseFloat(prev.net_performance_pay) : 0;

  res.json({
    current: salary,
    previous: prev || null,
    change: Math.round(change * 100) / 100
  });
});

export default router;
