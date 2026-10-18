import XLSX from 'xlsx';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

async function main() {
  const workbook = XLSX.readFile('/opt/salary/工资条.xlsx');
  
  // 连接到 Docker 容器中的 MySQL
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: 'Salary2024Secure!',
    database: 'salary_system',
    charset: 'utf8mb4'
  });

  const employees = new Map();
  
  // 从所有 Sheet 中提取员工信息
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    
    // 查找表头行
    let headerRow = -1;
    for (let i = 0; i < Math.min(10, data.length); i++) {
      if (data[i].some(cell => String(cell).includes('姓名'))) {
        headerRow = i;
        break;
      }
    }
    
    if (headerRow === -1) continue;
    
    const headers = data[headerRow];
    const nameColIdx = headers.findIndex(h => String(h).includes('姓名'));
    const deptColIdx = headers.findIndex(h => String(h).includes('部门'));
    
    // 提取员工信息
    for (let i = headerRow + 1; i < data.length; i++) {
      const row = data[i];
      const name = String(row[nameColIdx] || '').trim();
      
      if (!name || name === '合计' || name === '') continue;
      
      const department = deptColIdx >= 0 ? String(row[deptColIdx] || '信息技术中心').trim() : '信息技术中心';
      
      if (!employees.has(name)) {
        employees.set(name, { name, department });
      }
    }
  }
  
  console.log(`找到 ${employees.size} 个员工`);
  
  // 为每个员工创建账号
  let successCount = 0;
  let skipCount = 0;
  
  for (const [name, info] of employees) {
    // 检查是否已存在
    const [existing] = await connection.query(
      'SELECT id FROM users WHERE name = ?',
      [name]
    );
    
    if (existing.length > 0) {
      console.log(`跳过已存在员工: ${name}`);
      skipCount++;
      continue;
    }
    
    // 生成工号（EMP + 序号）
    const [maxNo] = await connection.query(
      "SELECT MAX(CAST(SUBSTRING(employee_no, 4) AS UNSIGNED)) as max_no FROM users WHERE employee_no LIKE 'EMP%'"
    );
    const nextNo = (maxNo[0].max_no || 4) + 1;
    const employee_no = `EMP${String(nextNo).padStart(3, '0')}`;
    
    // 生成默认密码
    const password = 'Salary2024!';
    const password_hash = await bcrypt.hash(password, 10);
    
    // 插入员工
    await connection.query(
      'INSERT INTO users (employee_no, name, department, role, password_hash, must_change_password, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [employee_no, name, info.department, 'employee', password_hash, 1, 1]
    );
    
    console.log(`✓ 创建员工: ${name} (${employee_no}) - 部门: ${info.department} - 初始密码: ${password}`);
    successCount++;
  }
  
  console.log(`\n导入完成: 成功 ${successCount} 人, 跳过 ${skipCount} 人`);
  
  await connection.end();
}

main().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
