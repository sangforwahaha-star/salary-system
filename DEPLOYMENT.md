# 薪酬助手 - 部署指南

## 快速开始（推荐）

### 一键部署脚本

适用于 CentOS 7/8、Ubuntu 18/20/22、Debian 10/11

```bash
# 1. 下载或克隆项目
git clone <repository_url> /opt/salary
cd /opt/salary

# 2. 运行一键部署脚本
chmod +x install.sh
sudo ./install.sh
```

脚本会自动完成：
- ✅ 检测并安装 Docker 和 Docker Compose
- ✅ 生成随机数据库密码和 JWT 密钥
- ✅ 创建项目配置文件
- ✅ 构建并启动所有服务
- ✅ 生成示例数据
- ✅ 显示访问地址和默认账号

### 访问系统

部署完成后，脚本会显示访问地址：

```
访问地址：http://<服务器IP>:2890

默认账号：
  - 管理员：ADMIN001 / admin123
  - 员工：EMP005 / 123456（陈薇）
  - 员工：EMP006 / 123456（李涛）
  - 员工：EMP008 / 123456（冯伟）
```

---

## 手动部署（适合有经验的用户）

### 1. 系统要求

- 操作系统：CentOS 7/8, Ubuntu 18/20/22, Debian 10/11
- Docker 20.10+
- Docker Compose 2.0+
- 内存：≥ 2GB
- 磁盘：≥ 10GB

### 2. 安装 Docker

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

**CentOS/RHEL:**
```bash
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl start docker
sudo systemctl enable docker
```

### 3. 克隆项目

```bash
git clone <repository_url> /opt/salary
cd /opt/salary
```

### 4. 配置环境变量

```bash
# 复制示例配置
cp .env.example .env

# 编辑配置（修改密码和密钥）
nano .env
```

**.env 文件说明：**
```bash
# 数据库密码（请修改为强密码）
DB_PASSWORD=your_secure_password_here

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=your_jwt_secret_key_here

# 跨域配置（根据实际域名修改）
CORS_ORIGIN=http://your-domain.com:2890,http://localhost:2890
```

### 5. 构建并启动

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 查看日志
docker compose logs -f
```

### 6. 初始化数据

服务启动后，数据库会自动初始化。如需生成示例数据：

```bash
# 进入项目目录
cd /opt/salary

# 运行数据生成脚本（如果有）
./scripts/generate_sample_data.sh
```

---

## 常用管理命令

### 服务管理

```bash
cd /opt/salary

# 查看服务状态
docker compose ps

# 查看实时日志
docker compose logs -f

# 查看特定服务日志
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mysql

# 重启服务
docker compose restart

# 重启特定服务
docker compose restart backend

# 停止服务
docker compose down

# 停止并删除数据卷（谨慎使用）
docker compose down -v
```

### 数据库管理

```bash
# 进入 MySQL 容器
docker exec -it salary-mysql mysql -uroot -p

# 备份数据库
docker exec salary-mysql mysqldump -uroot -p<password> salary_system > backup.sql

# 恢复数据库
docker exec -i salary-mysql mysql -uroot -p<password> salary_system < backup.sql

# 查看数据库大小
docker exec salary-mysql mysql -uroot -p<password> -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)' FROM information_schema.tables GROUP BY table_schema;"
```

### 更新部署

```bash
cd /opt/salary

# 拉取最新代码
git pull

# 重新构建并启动
docker compose up -d --build

# 查看日志确认启动成功
docker compose logs -f
```

---

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker compose logs

# 检查端口占用
sudo netstat -tlnp | grep 2890

# 检查 Docker 状态
sudo systemctl status docker
```

### 数据库连接失败

```bash
# 检查 MySQL 容器状态
docker compose ps mysql

# 查看 MySQL 日志
docker compose logs mysql

# 测试数据库连接
docker exec salary-mysql mysql -uroot -p<password> -e "SELECT 1"
```

### 前端无法访问

```bash
# 检查前端容器状态
docker compose ps frontend

# 查看前端日志
docker compose logs frontend

# 检查防火墙
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=2890/tcp --permanent
sudo firewall-cmd --reload
```

### 重置管理员密码

```bash
# 进入 MySQL
docker exec -it salary-mysql mysql -uroot -p<password> salary_system

# 重置密码（新密码：admin123）
UPDATE users SET password_hash = '$2a$10$n6KUWgcXLNa/.JccpInB5eSNV0qxPyddkDEInqW5dVvNVQkBhpAcm', must_change_password = 1 WHERE employee_no = 'ADMIN001';
```

---

## 安全建议

### 生产环境部署

1. **修改默认密码**
   - 数据库密码：使用强密码（16 位以上，包含大小写字母、数字、特殊字符）
   - JWT 密钥：使用随机字符串（32 位以上）
   - 管理员密码：首次登录后立即修改

2. **配置 HTTPS**
   ```bash
   # 使用 Nginx 反向代理 + Let's Encrypt
   sudo apt-get install -y nginx certbot python3-certbot-nginx
   
   # 配置 SSL 证书
   sudo certbot --nginx -d your-domain.com
   ```

3. **防火墙配置**
   ```bash
   # 只开放必要端口
   sudo firewall-cmd --add-port=80/tcp --permanent
   sudo firewall-cmd --add-port=443/tcp --permanent
   sudo firewall-cmd --reload
   ```

4. **定期备份**
   ```bash
   # 添加定时备份任务
   crontab -e
   
   # 每天凌晨 3 点备份
   0 3 * * * cd /opt/salary && ./deploy.sh backup
   ```

5. **监控日志**
   ```bash
   # 查看异常日志
   docker compose logs --tail=100 | grep -i error
   ```

---

## 技术支持

- 项目文档：`/opt/salary/README.md`
- 部署日志：`/opt/salary/install.log`
- 问题反馈：提交 Issue 或联系技术支持

---

## 版本信息

- 当前版本：v1.0
- 最后更新：2026-10-18
- 兼容系统：CentOS 7/8, Ubuntu 18/20/22, Debian 10/11
