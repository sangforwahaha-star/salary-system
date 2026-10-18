import { Router, Response } from 'express';
import pool from '../db.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.js';
import { clearLock } from '../services/loginLock.js';

const router = Router();

router.use(authenticate);

router.get('/', requireRole('admin', 'dept_admin'), async (req: AuthRequest, res: Response) => {
  const { page = 1, limit = 20, department, keyword } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = 'SELECT id, employee_no, name, department, role, status, must_change_password, created_at FROM users WHERE 1=1';
  const params: any[] = [];

  if (req.user!.role === 'dept_admin') {
    query += ' AND department = ?';
    params.push(req.user!.department);
  }

  if (department) {
    query += ' AND department = ?';
    params.push(department);
  }

  if (keyword) {
    query += ' AND (employee_no LIKE ? OR name LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }

  const countQuery = query.replace('SELECT id, employee_no, name, department, role, status, must_change_password, created_at', 'SELECT COUNT(*) as total');
  const [countResult] = await pool.query(countQuery, params);
  const total = (countResult as any[])[0].total;

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const [users] = await pool.query(query, params);

  res.json({
    data: users,
    total,
    page: Number(page),
    limit: Number(limit)
  });
});

router.get('/departments', authenticate, async (req: AuthRequest, res: Response) => {
  const [departments] = await pool.query(
    'SELECT DISTINCT department FROM users ORDER BY department'
  );
  res.json((departments as any[]).map(d => d.department));
});

router.post('/reset-password', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { user_id, new_password } = req.body;

  if (!user_id || !new_password) {
    return res.status(400).json({ error: '用户ID和新密码不能为空' });
  }

  const bcrypt = await import('bcryptjs');
  const hashedPassword = await bcrypt.default.hash(new_password, 10);

  await pool.query(
    'UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?',
    [hashedPassword, user_id]
  );

  await pool.query(
    'INSERT INTO operation_logs (user_id, operation_type, operation_content) VALUES (?, ?, ?)',
    [req.user!.id, 'RESET_PASSWORD', `管理员重置用户 ${user_id} 的密码`]
  );

  res.json({ message: '密码重置成功，用户下次登录需修改密码' });
});

router.put('/status', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { user_id, status } = req.body;

  await pool.query(
    'UPDATE users SET status = ? WHERE id = ?',
    [status, user_id]
  );

  await pool.query(
    'INSERT INTO operation_logs (user_id, operation_type, operation_content) VALUES (?, ?, ?)',
    [req.user!.id, 'UPDATE_STATUS', `管理员更新用户 ${user_id} 状态为 ${status === 1 ? '在职' : '停用'}`]
  );

  res.json({ message: '状态更新成功' });
});

router.post('/unlock', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  const { employee_no } = req.body;

  if (!employee_no) {
    return res.status(400).json({ error: '工号不能为空' });
  }

  clearLock(employee_no);

  await pool.query(
    'INSERT INTO operation_logs (user_id, operation_type, operation_content) VALUES (?, ?, ?)',
    [req.user!.id, 'UNLOCK_ACCOUNT', `管理员解锁账号 ${employee_no}`]
  );

  res.json({ message: '账号解锁成功' });
});

export default router;
