# 薪酬助手 - 小白部署指南

## 什么是薪酬助手？

薪酬助手是一个企业内部使用的工资查询系统，员工可以：
- 查看每月工资明细
- 对比历史工资变化
- 查看工资趋势图表
- 移动端随时随地查询

---

## 部署前准备

### 你需要准备：

1. **一台服务器**
   - 系统：CentOS 7/8 或 Ubuntu 18/20/22
   - 配置：2GB 内存，20GB 硬盘
   - 网络：能访问互联网

2. **一个域名（可选）**
   - 例如：salary.yourcompany.com
   - 如果没有域名，可以用服务器 IP 地址访问

3. **SSH 工具**
   - Windows 推荐：PuTTY 或 MobaXterm
   - Mac/Linux：自带终端

---

## 一键部署（5 分钟完成）

### 第 1 步：连接服务器

打开终端或 SSH 工具，连接到你的服务器：

```bash
ssh root@你的服务器IP
```

输入密码后，你应该看到类似这样的提示符：

```
[root@server ~]#
```

### 第 2 步：下载部署脚本

```bash
cd /opt
git clone <repository_url> salary
cd salary
```

### 第 3 步：运行部署脚本

```bash
chmod +x install.sh
./install.sh
```

脚本会自动：
- ✅ 安装 Docker（如果没有）
- ✅ 配置数据库密码
- ✅ 启动所有服务
- ✅ 生成示例数据

**等待约 3-5 分钟**，看到以下信息表示部署成功：

```
==========================================
   部署完成！
==========================================

访问地址：
  - 前端：http://123.45.67.89:2890

默认账号：
  - 管理员：ADMIN001 / admin123
  - 员工：EMP005 / 123456
```

### 第 4 步：访问系统

打开浏览器，访问脚本显示的地址：

```
http://你的服务器IP:2890
```

使用默认账号登录：
- 用户名：`EMP005`（或输入姓名 `陈薇`）
- 密码：`123456`

---

## 常见问题

### Q1: 提示"权限不够"怎么办？

```bash
# 确保使用 root 用户
sudo ./install.sh
```

### Q2: 访问不了页面怎么办？

**检查防火墙：**

CentOS:
```bash
firewall-cmd --add-port=2890/tcp --permanent
firewall-cmd --reload
```

Ubuntu:
```bash
ufw allow 2890
```

**检查服务状态：**
```bash
cd /opt/salary
docker compose ps
```

所有服务应该显示 `Up` 状态。

### Q3: 忘记密码怎么办？

```bash
cd /opt/salary
./manage.sh reset-admin
```

管理员密码会重置为：`admin123`

### Q4: 如何备份数据？

```bash
cd /opt/salary
./manage.sh backup
```

备份文件会保存在：`/opt/salary/backup_日期时间.sql`

### Q5: 如何更新系统？

```bash
cd /opt/salary
git pull
./manage.sh update
```

---

## 日常管理

### 查看服务状态

```bash
cd /opt/salary
./manage.sh status
```

### 查看日志

```bash
# 查看所有日志
./manage.sh logs

# 查看后端日志
./manage.sh logs backend

# 查看前端日志
./manage.sh logs frontend
```

### 重启服务

```bash
./manage.sh restart
```

### 停止服务

```bash
./manage.sh stop
```

### 启动服务

```bash
./manage.sh start
```

---

## 修改默认密码

首次登录后，建议立即修改默认密码：

1. 使用管理员账号登录
2. 点击右上角头像
3. 选择"修改密码"
4. 输入新密码（至少 8 位，包含大小写字母、数字和特殊字符）

---

## 导入真实工资数据

1. 登录管理员账号
2. 进入"数据管理" → "工资导入"
3. 下载模板文件
4. 按模板填写工资数据
5. 上传 Excel 文件

**模板格式说明：**
- 工号：员工工号（必须与员工信息一致）
- 月份：YYYY-MM 格式（如 2026-01）
- 薪酬：应发合计
- 养老保险 1/2：个人缴纳部分
- 医疗保险：个人缴纳部分
- 失业保险：个人缴纳部分
- 代扣公积金：个人缴纳部分
- 代扣税：个人所得税
- 实发工资：最终到手金额

---

## 技术支持

- 部署文档：`/opt/salary/DEPLOYMENT.md`
- 管理命令：`/opt/salary/manage.sh help`
- 问题反馈：提交 Issue 或联系技术支持

---

## 附录：命令速查表

| 命令 | 说明 |
|------|------|
| `./install.sh` | 一键部署 |
| `./manage.sh status` | 查看状态 |
| `./manage.sh logs` | 查看日志 |
| `./manage.sh restart` | 重启服务 |
| `./manage.sh backup` | 备份数据 |
| `./manage.sh reset-admin` | 重置密码 |
| `docker compose ps` | 查看容器 |
| `docker compose logs -f` | 实时日志 |

---

**祝你部署顺利！** 🎉
