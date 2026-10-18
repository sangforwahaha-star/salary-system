import { Router, Response } from 'express';
import multer from 'multer';
import XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import pool from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authenticate);
router.use(requireRole('admin', 'dept_admin'));

function generatePassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function sanitizeCell(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.startsWith('=') || str.startsWith('+') || str.startsWith('-') || str.startsWith('@')) {
    return "'" + str;
  }
  return str;
}

function parsePeriod(dateStr: any): string | null {
  if (!dateStr) return null;
  const str = String(dateStr).trim();
  
  // 支持格式: "2024.03", "2024-03", "2024年3月", "2024.3.12"
  const match = str.match(/^(\d{4})[.\-年](\d{1,2})(?:[.\-月](\d{1,2})日?)?$/);
  if (match) {
    const year = match[1];
    const month = match[2].padStart(2, '0');
    return `${year}-${month}`;
  }
  return null;
}

function parseNumber(val: any): number {
  if (val === '' || val === null || val === undefined) return 0;
  const num = parseFloat(String(val));
  return isNaN(num) ? 0 : num;
}

router.post('/employees', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  const ext = req.file.originalname.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls'].includes(ext || '')) {
    return res.status(400).json({ error: '仅支持 .xlsx 或 .xls 文件' });
  }
  if (req.file.originalname.toLowerCase().endsWith('.xlsm')) {
    return res.status(400).json({ error: '不支持宏文件' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellFormula: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const results = {
      success: [] as any[],
      failed: [] as any[],
      passwords: [] as any[]
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any;
      const rowNum = i + 2;

      const employee_no = sanitizeCell(row['工号'] || row['employee_no']);
      const name = sanitizeCell(row['姓名'] || row['name']);
      const department = sanitizeCell(row['部门'] || row['department']);
      const role = sanitizeCell(row['角色'] || row['role']) || 'employee';
      const password = sanitizeCell(row['初始密码'] || row['password']);

      if (!employee_no || !name || !department) {
        results.failed.push({ row: rowNum, employee_no, name, reason: '工号、姓名、部门不能为空' });
        continue;
      }

      if (!['admin', 'dept_admin', 'employee'].includes(role)) {
        results.failed.push({ row: rowNum, employee_no, name, reason: '角色必须是 admin/dept_admin/employee' });
        continue;
      }

      const [existing] = await pool.query(
        'SELECT id FROM users WHERE employee_no = ?',
        [employee_no]
      );

      let finalPassword = password || generatePassword();
      const hashedPassword = await bcrypt.hash(finalPassword, 10);

      if ((existing as any[]).length > 0) {
        await pool.query(
          'UPDATE users SET name = ?, department = ?, role = ?, password_hash = ?, must_change_password = 1 WHERE employee_no = ?',
          [name, department, role, hashedPassword, employee_no]
        );
        results.success.push({ row: rowNum, employee_no, name, action: '更新' });
      } else {
        const [result] = await pool.query(
          'INSERT INTO users (employee_no, name, department, role, password_hash, must_change_password, status) VALUES (?, ?, ?, ?, ?, 1, 1)',
          [employee_no, name, department, role, hashedPassword]
        );
        results.success.push({ row: rowNum, employee_no, name, action: '新增' });
      }

      results.passwords.push({ employee_no, name, password: finalPassword });
    }

    await pool.query(
      'INSERT INTO operation_logs (user_id, operation_type, operation_content) VALUES (?, ?, ?)',
      [req.user!.id, 'IMPORT_EMPLOYEES', `导入员工信息：成功 ${results.success.length} 条，失败 ${results.failed.length} 条`]
    );

    await pool.query(
      'INSERT INTO import_records (user_id, import_type, file_name, success_count, fail_count) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, 'employees', req.file.originalname, results.success.length, results.failed.length]
    );

    res.json({
      message: '导入完成',
      summary: {
        total: data.length,
        success: results.success.length,
        failed: results.failed.length
      },
      details: results
    });
  } catch (err: any) {
    res.status(400).json({ error: '文件解析失败: ' + err.message });
  }
});

// 新增：获取 Excel 中可导入的月份列表
router.post('/salaries/preview', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellFormula: false });
    const sheets = workbook.SheetNames;
    
    const availablePeriods: any[] = [];
    
    for (const sheetName of sheets) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      
      if (data.length < 2) continue;
      
      // 查找表头行
      let headerRow = -1;
      for (let i = 0; i < Math.min(10, data.length); i++) {
        if (data[i].some(cell => String(cell).includes('姓名'))) {
          headerRow = i;
          break;
        }
      }
      
      if (headerRow === -1) continue;
      
      // 从数据行中提取发放日期
      const periods = new Set<string>();
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0] || String(row[0]).trim() === '' || String(row[0]) === '合计') continue;
        
        // 查找发放日期列
        const headers = data[headerRow];
        const dateColIdx = headers.findIndex((h: any) => String(h).includes('发放日期'));
        if (dateColIdx >= 0 && row[dateColIdx]) {
          const period = parsePeriod(row[dateColIdx]);
          if (period) periods.add(period);
        }
      }
      
      if (periods.size > 0) {
        availablePeriods.push({
          sheet: sheetName,
          periods: Array.from(periods).sort(),
          recordCount: data.length - headerRow - 1
        });
      }
    }
    
    res.json({ sheets: availablePeriods });
  } catch (err: any) {
    res.status(400).json({ error: '文件解析失败: ' + err.message });
  }
});

router.post('/salaries', upload.single('file'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  const ext = req.file.originalname.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls'].includes(ext || '')) {
    return res.status(400).json({ error: '仅支持 .xlsx 或 .xls 文件' });
  }

  const targetSheets = req.body.sheets ? JSON.parse(req.body.sheets) : null;

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellFormula: false });
    const sheetsToProcess = targetSheets || workbook.SheetNames;
    
    const results = {
      success: [] as any[],
      failed: [] as any[],
      warnings: [] as any[]
    };

    for (const sheetName of sheetsToProcess) {
      if (!workbook.Sheets[sheetName]) continue;
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];
      
      if (data.length < 2) continue;
      
      // 查找表头行
      let headerRow = -1;
      for (let i = 0; i < Math.min(10, data.length); i++) {
        if (data[i].some(cell => String(cell).includes('姓名'))) {
          headerRow = i;
          break;
        }
      }
      
      if (headerRow === -1) continue;
      
      const headers = data[headerRow].map((h: any) => String(h).trim());
      
      // 列名映射
      const colMap: any = {};
      headers.forEach((h: string, idx: number) => {
        if (h.includes('姓名')) colMap.name = idx;
        else if (h.includes('部门')) colMap.department = idx;
        else if (h === '薪酬') colMap.salary = idx;
        else if (h.includes('养老保险1')) colMap.pension_insurance_1 = idx;
        else if (h.includes('养老保险2')) colMap.pension_insurance_2 = idx;
        else if (h.includes('医疗保险')) colMap.medical_insurance = idx;
        else if (h.includes('失业保险')) colMap.unemployment_insurance = idx;
        else if (h.includes('代扣公积金')) colMap.housing_fund_deduction = idx;
        else if (h.includes('代扣税')) colMap.income_tax = idx;
        else if (h.includes('目标挂钩')) colMap.target_linked_amount = idx;
        else if (h.includes('绩效实发')) colMap.net_performance_pay = idx;
        else if (h.includes('发放日期')) colMap.period = idx;
      });
      
      // 处理每一行数据
      for (let i = headerRow + 1; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 1;
        
        // 跳过空行和合计行
        const name = colMap.name !== undefined ? sanitizeCell(row[colMap.name]) : '';
        if (!name || name === '合计' || name.trim() === '') continue;
        
        // 解析发放日期
        let period = '';
        if (colMap.period !== undefined && row[colMap.period]) {
          period = parsePeriod(row[colMap.period]) || '';
        }
        if (!period) {
          // 尝试从 Sheet 名称推断
          const match = sheetName.match(/(\d{1,2})月/);
          if (match) {
            const month = match[1].padStart(2, '0');
            period = `2024-${month}`;
          }
        }
        
        if (!period) {
          results.failed.push({ row: rowNum, sheet: sheetName, name, reason: '无法确定发放月份' });
          continue;
        }
        
        // 通过姓名查找员工
        const [users] = await pool.query(
          'SELECT id, employee_no FROM users WHERE name = ? AND status = 1',
          [name]
        );
        
        if ((users as any[]).length === 0) {
          results.failed.push({ row: rowNum, sheet: sheetName, name, period, reason: '员工不存在' });
          continue;
        }
        
        if ((users as any[]).length > 1) {
          results.failed.push({ row: rowNum, sheet: sheetName, name, period, reason: '存在同名员工，无法确定' });
          continue;
        }
        
        const user = (users as any[])[0];
        const user_id = user.id;
        const employee_no = user.employee_no;
        
        // 解析各字段
        const salary = parseNumber(colMap.salary !== undefined ? row[colMap.salary] : 0);
        const pension_insurance_1 = parseNumber(colMap.pension_insurance_1 !== undefined ? row[colMap.pension_insurance_1] : 0);
        const pension_insurance_2 = parseNumber(colMap.pension_insurance_2 !== undefined ? row[colMap.pension_insurance_2] : 0);
        const medical_insurance = parseNumber(colMap.medical_insurance !== undefined ? row[colMap.medical_insurance] : 0);
        const unemployment_insurance = parseNumber(colMap.unemployment_insurance !== undefined ? row[colMap.unemployment_insurance] : 0);
        const housing_fund_deduction = parseNumber(colMap.housing_fund_deduction !== undefined ? row[colMap.housing_fund_deduction] : 0);
        const income_tax = parseNumber(colMap.income_tax !== undefined ? row[colMap.income_tax] : 0);
        const target_linked_amount = parseNumber(colMap.target_linked_amount !== undefined ? row[colMap.target_linked_amount] : 0);
        const net_performance_pay = parseNumber(colMap.net_performance_pay !== undefined ? row[colMap.net_performance_pay] : 0);
        
        // 计算扣款合计
        const total_deduction = pension_insurance_1 + pension_insurance_2 + medical_insurance + 
          unemployment_insurance + housing_fund_deduction + income_tax;
        
        // 校验公式: 绩效实发数 = 薪酬 - 扣款合计 - 目标挂钩部分
        const calc_net = salary - total_deduction - target_linked_amount;
        if (Math.abs(calc_net - net_performance_pay) > 0.01 && net_performance_pay > 0) {
          results.warnings.push({ row: rowNum, sheet: sheetName, name, period, reason: `实发计算不一致: 应为 ${calc_net.toFixed(2)}，实际为 ${net_performance_pay}` });
        }
        
        // 插入或更新
        const [existing] = await pool.query(
          'SELECT id FROM salaries WHERE user_id = ? AND period = ?',
          [user_id, period]
        );
        
        if ((existing as any[]).length > 0) {
          await pool.query(
            `UPDATE salaries SET 
              salary = ?,
              pension_insurance_1 = ?, pension_insurance_2 = ?, medical_insurance = ?, 
              unemployment_insurance = ?, housing_fund_deduction = ?, income_tax = ?,
              target_linked_amount = ?, net_performance_pay = ?, total_deduction = ?
            WHERE user_id = ? AND period = ?`,
            [
              salary,
              pension_insurance_1, pension_insurance_2, medical_insurance,
              unemployment_insurance, housing_fund_deduction, income_tax,
              target_linked_amount, net_performance_pay, total_deduction,
              user_id, period
            ]
          );
          results.success.push({ row: rowNum, sheet: sheetName, employee_no, name, period, action: '更新' });
        } else {
          await pool.query(
            `INSERT INTO salaries (
              user_id, period, salary,
              pension_insurance_1, pension_insurance_2, medical_insurance, unemployment_insurance,
              housing_fund_deduction, income_tax,
              target_linked_amount, net_performance_pay, total_deduction
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              user_id, period, salary,
              pension_insurance_1, pension_insurance_2, medical_insurance, unemployment_insurance,
              housing_fund_deduction, income_tax,
              target_linked_amount, net_performance_pay, total_deduction
            ]
          );
          results.success.push({ row: rowNum, sheet: sheetName, employee_no, name, period, action: '新增' });
        }
      }
    }

    await pool.query(
      'INSERT INTO operation_logs (user_id, operation_type, operation_content) VALUES (?, ?, ?)',
      [req.user!.id, 'IMPORT_SALARIES', `导入工资数据：成功 ${results.success.length} 条，失败 ${results.failed.length} 条，警告 ${results.warnings.length} 条`]
    );

    await pool.query(
      'INSERT INTO import_records (user_id, import_type, file_name, success_count, fail_count) VALUES (?, ?, ?, ?, ?)',
      [req.user!.id, 'salaries', req.file.originalname, results.success.length, results.failed.length]
    );

    res.json({
      message: '导入完成',
      summary: {
        success: results.success.length,
        failed: results.failed.length,
        warnings: results.warnings.length
      },
      details: results
    });
  } catch (err: any) {
    res.status(400).json({ error: '文件解析失败: ' + err.message });
  }
});

router.get('/templates/:type', async (req: AuthRequest, res: Response) => {
  const { type } = req.params;

  if (type === 'employees') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['工号', '姓名', '部门', '角色', '初始密码'],
      ['EMP001', '张三', '技术部', 'employee', ''],
      ['EMP002', '李四', '财务部', 'dept_admin', 'Initial123'],
      ['', '', '', '', ''],
      ['说明：', '', '', '', ''],
      ['工号：必填，唯一标识', '', '', '', ''],
      ['姓名：必填', '', '', '', ''],
      ['部门：必填', '', '', '', ''],
      ['角色：可选，admin/dept_admin/employee，默认employee', '', '', '', ''],
      ['初始密码：可选，留空则自动生成', '', '', '', '']
    ]);
    XLSX.utils.book_append_sheet(wb, ws, '员工信息');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=employee_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } else if (type === 'salaries') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['说明：请直接使用公司工资条模板导入', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['支持多月份 Sheet，每个 Sheet 为一个月份', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ['系统会自动识别列名并匹配员工', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, '使用说明');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', 'attachment; filename=salary_template_guide.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } else {
    res.status(404).json({ error: '模板类型不存在' });
  }
});

router.get('/logs', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const [logs] = await pool.query(
    `SELECT l.*, u.name as user_name 
     FROM operation_logs l 
     LEFT JOIN users u ON l.user_id = u.id 
     ORDER BY l.created_at DESC 
     LIMIT ? OFFSET ?`,
    [Number(limit), offset]
  );

  const [countResult] = await pool.query('SELECT COUNT(*) as total FROM operation_logs');
  const total = (countResult as any[])[0].total;

  res.json({ data: logs, total, page: Number(page), limit: Number(limit) });
});

export default router;
