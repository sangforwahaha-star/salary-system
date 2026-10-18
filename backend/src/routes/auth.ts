import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { checkLoginLock, recordFailedAttempt, clearLock, getAttemptCount } from '../services/loginLock.js';

const router = Router();

function getClientIp(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.connection.remoteAddress || '';
}

router.post('/login', async (req, res) => {
  const { employee_no, name, password } = req.body;
  const clientIp = getClientIp(req);

  const loginId = employee_no || name;
  if (!loginId || !password) {
    return res.status(400).json({ error: '姓名/工号和密码不能为空' });
  }

  // Check lock status
  const lockStatus = checkLoginLock(loginId, clientIp);
  if (lockStatus.locked) {
    const minutes = Math.ceil(lockStatus.remainingSeconds / 60);
    return res.status(429).json({ 
      error: `账号已被锁定，请${minutes}分钟后再试`,
      locked: true,
      remaining_seconds: lockStatus.remainingSeconds
    });
  }

  // Support login by either employee_no or name
  let users;
  if (employee_no) {
    [users] = await pool.query(
      'SELECT * FROM users WHERE employee_no = ? AND status = 1',
      [employee_no]
    );
  } else {
    [users] = await pool.query(
      'SELECT * FROM users WHERE name = ? AND status = 1',
      [name]
    );
  }

  const user = (users as any[])[0];
  if (!user) {
    return res.status(401).json({ error: '姓名/工号或密码错误' });
  }

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    recordFailedAttempt(loginId, clientIp);
    const attempts = getAttemptCount(loginId, clientIp);
    const remaining = 5 - attempts;
    if (remaining > 0) {
      return res.status(401).json({ error: `姓名/工号或密码错误，还可尝试${remaining}次` });
    }
    return res.status(429).json({ error: '登录尝试次数过多，账号已被锁定5分钟' });
  }

  // Clear lock on successful login
  clearLock(loginId, clientIp);

  const token = jwt.sign(
    {
      id: user.id,
      employee_no: user.employee_no,
      name: user.name,
      role: user.role,
      department: user.department,
      must_change_password: user.must_change_password
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );

  await pool.query(
    'INSERT INTO operation_logs (user_id, operation_type, operation_content) VALUES (?, ?, ?)',
    [user.id, 'LOGIN', `用户 ${user.name} 登录系统`]
  );

  res.json({
    token,
    user: {
      id: user.id,
      employee_no: user.employee_no,
      name: user.name,
      role: user.role,
      department: user.department,
      must_change_password: user.must_change_password
    }
  });
});

router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const [users] = await pool.query(
    'SELECT id, employee_no, name, department, role, must_change_password, created_at FROM users WHERE id = ?',
    [req.user!.id]
  );

  const user = (users as any[])[0];
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json(user);
});

router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: '旧密码和新密码不能为空' });
  }

  // Password strength validation: >=8 chars, uppercase, lowercase, number, special char
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
  if (!passwordRegex.test(new_password)) {
    return res.status(400).json({ 
      error: '密码强度不足：至少8位，需包含大写字母、小写字母、数字和特殊字符' 
    });
  }

  const [users] = await pool.query(
    'SELECT password_hash FROM users WHERE id = ?',
    [req.user!.id]
  );

  const user = (users as any[])[0];
  const validPassword = await bcrypt.compare(old_password, user.password_hash);

  if (!validPassword) {
    return res.status(400).json({ error: '旧密码错误' });
  }

  const hashedPassword = await bcrypt.hash(new_password, 10);
  await pool.query(
    'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?',
    [hashedPassword, req.user!.id]
  );

  await pool.query(
    'INSERT INTO operation_logs (user_id, operation_type, operation_content) VALUES (?, ?, ?)',
    [req.user!.id, 'CHANGE_PASSWORD', `用户 ${req.user!.name} 修改密码`]
  );

  res.json({ message: '密码修改成功' });
});

export default router;
