# 薪酬助手 - 员工薪酬查询系统

一个现代化的员工薪酬查询系统，让员工一眼看懂自己薪酬。

## 功能特性

- **员工端**：查看工资明细、对比分析、修改密码
- **管理员端**：Excel批量导入员工和工资数据、操作日志
- **安全特性**：JWT认证、权限控制、数据隔离、密码加密
- **设计系统**：统一的视觉设计、响应式布局、流畅动效

## 技术栈

- **前端**：Vue 3 + TypeScript + Vite + Element Plus + ECharts
- **后端**：Node.js + Express + TypeScript
- **数据库**：MySQL 8
- **部署**：Docker + Nginx

## 快速开始

### 1. 环境准备

- Docker 和 Docker Compose
- 域名 DNS 解析到服务器 IP

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 设置数据库密码和 JWT 密钥
```

### 3. 构建和启动

```bash
# 构建项目
./deploy.sh build

# 启动服务
./deploy.sh start
```

### 4. 访问系统

- 访问地址：http://salary.moxiaoyu.pro
- 默认管理员账号：ADMIN001 / admin123
- 示例员工账号：EMP001 / 123456

## 部署说明

### 服务器要求

- 阿里云 ECS 或其他 Linux 服务器
- 配置安全组放行 80/443 端口
- 域名 DNS A 记录指向服务器 IP

### HTTPS 配置（可选）

使用 Let's Encrypt 自动配置 HTTPS：

```bash
# 安装 certbot
apt-get install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d salary.moxiaoyu.pro

# 自动续期
certbot renew --dry-run
```

### 数据库备份

```bash
# 手动备份
./deploy.sh backup

# 自动备份（添加到 crontab）
0 2 * * * /path/to/deploy.sh backup
```

### 数据库恢复

```bash
./deploy.sh restore backup_20240101_120000.sql
```

## 常用命令

```bash
./deploy.sh start      # 启动服务
./deploy.sh stop       # 停止服务
./deploy.sh restart    # 重启服务
./deploy.sh logs       # 查看所有日志
./deploy.sh logs backend  # 查看后端日志
./deploy.sh status     # 查看服务状态
./deploy.sh backup     # 备份数据库
```

## 项目结构

```
salary/
├── backend/           # 后端 API
│   ├── src/
│   │   ├── routes/    # 路由
│   │   ├── middleware/ # 中间件
│   │   └── index.ts   # 入口
│   └── Dockerfile
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── views/     # 页面
│   │   ├── components/ # 组件
│   │   └── main.ts    # 入口
│   └── Dockerfile
├── docker/
│   └── mysql/
│       └── init.sql   # 数据库初始化
├── docker-compose.yml
├── deploy.sh
└── .env
```

## 安全说明

- 所有密码使用 bcrypt 加密存储
- JWT Token 24小时过期
- 敏感接口限流保护
- 数据归属严格校验，禁止越权访问
- Excel 上传安全扫描，防止公式注入
- 首次登录强制修改密码

## 开发

### 本地开发

```bash
# 后端
cd backend
npm install
npm run dev

# 前端
cd frontend
npm install
npm run dev
```

### 数据库初始化

```bash
mysql -u root -p < docker/mysql/init.sql
```

## 默认账号

- 系统管理员：ADMIN001 / admin123
- 技术部员工：EMP001 / 123456
- 技术部管理员：EMP002 / 123456
- 财务部员工：EMP003 / 123456
- 财务部员工：EMP004 / 123456

## 许可证

MIT
