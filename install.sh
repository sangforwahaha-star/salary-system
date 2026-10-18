#!/bin/bash

###############################################################################
# 薪酬助手 - 一键部署脚本
# 适用于：CentOS 7/8, Ubuntu 18/20/22, Debian 10/11
# 使用方式：chmod +x install.sh && ./install.sh
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 打印横幅
print_banner() {
    echo ""
    echo "=========================================="
    echo "   集团信息技术中心 - 薪酬助手"
    echo "   一键部署脚本 v1.0"
    echo "=========================================="
    echo ""
}

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 root 用户或 sudo 运行此脚本"
        exit 1
    fi
}

# 检查操作系统
check_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
        log_info "检测到操作系统：$OS $VER"
    else
        log_error "无法检测操作系统类型"
        exit 1
    fi
}

# 安装 Docker
install_docker() {
    log_info "检查 Docker 安装..."
    
    if command -v docker &> /dev/null; then
        log_success "Docker 已安装：$(docker --version)"
        return 0
    fi
    
    log_info "开始安装 Docker..."
    
    case "$OS" in
        "CentOS Linux"|"CentOS Stream"|"Red Hat"*|"Fedora"*)
            # CentOS/RHEL/Fedora
            yum install -y yum-utils
            yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        "Ubuntu"|"Debian"*)
            # Ubuntu/Debian
            apt-get update
            apt-get install -y ca-certificates curl gnupg
            install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            chmod a+r /etc/apt/keyrings/docker.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") $VERSION_CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
            apt-get update
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        *)
            log_error "不支持的操作系统：$OS"
            exit 1
            ;;
    esac
    
    systemctl start docker
    systemctl enable docker
    log_success "Docker 安装完成：$(docker --version)"
}

# 安装 Docker Compose (如果 plugin 不可用)
install_docker_compose() {
    log_info "检查 Docker Compose..."
    
    if docker compose version &> /dev/null; then
        log_success "Docker Compose 已安装：$(docker compose version)"
        return 0
    fi
    
    log_info "安装 Docker Compose 插件..."
    
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
    
    log_success "Docker Compose 安装完成：$(docker compose version)"
}

# 创建项目目录
create_project_dir() {
    PROJECT_DIR="/opt/salary"
    
    if [ -d "$PROJECT_DIR" ]; then
        log_warn "项目目录已存在：$PROJECT_DIR"
        read -p "是否覆盖现有部署？(y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "备份现有数据..."
            BACKUP_DIR="/opt/salary_backup_$(date +%Y%m%d_%H%M%S)"
            mv "$PROJECT_DIR" "$BACKUP_DIR"
            log_success "已备份到：$BACKUP_DIR"
        else
            log_info "取消部署"
            exit 0
        fi
    fi
    
    log_info "创建项目目录：$PROJECT_DIR"
    mkdir -p "$PROJECT_DIR"
}

# 生成 .env 文件
generate_env() {
    log_info "生成配置文件..."
    
    DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
    JWT_SECRET=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
    
    # 获取服务器 IP
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    cat > "$PROJECT_DIR/.env" << EOF
# 数据库密码（自动生成，请妥善保管）
DB_PASSWORD=${DB_PASSWORD}

# JWT 密钥（自动生成）
JWT_SECRET=${JWT_SECRET}

# 跨域配置（根据实际域名修改）
CORS_ORIGIN=http://${SERVER_IP}:2890,http://localhost:2890
EOF
    
    log_success "配置文件已生成"
    log_warn "数据库密码：${DB_PASSWORD}"
    log_warn "请妥善保管此密码！"
}

# 创建项目文件（简化版，实际应从 Git 仓库克隆）
create_project_files() {
    log_info "创建项目文件..."
    
    # 这里应该从 Git 仓库克隆或复制项目文件
    # 为演示目的，创建基础目录结构
    mkdir -p "$PROJECT_DIR/backend"
    mkdir -p "$PROJECT_DIR/frontend"
    mkdir -p "$PROJECT_DIR/docker/mysql"
    mkdir -p "$PROJECT_DIR/scripts"
    
    log_warn "注意：实际部署时应从 Git 仓库克隆完整项目"
    log_info "git clone <repository_url> $PROJECT_DIR"
}

# 创建 Docker Compose 配置
create_docker_compose() {
    log_info "创建 Docker Compose 配置..."
    
    cat > "$PROJECT_DIR/docker-compose.yml" << 'EOF'
services:
  mysql:
    image: mysql:8.0
    container_name: salary-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: salary_system
      TZ: Asia/Shanghai
    volumes:
      - mysql_data:/var/lib/mysql
      - ./docker/mysql/init.sql:/docker-entrypoint-initdb.d/init.sql
      - ./docker/mysql/my.cnf:/etc/mysql/conf.d/my.cnf
    networks:
      - salary-network
    command: --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci --init-connect='SET NAMES utf8mb4'

  backend:
    build: ./backend
    container_name: salary-backend
    restart: always
    environment:
      PORT: 2890
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: salary_system
      JWT_SECRET: ${JWT_SECRET}
      CORS_ORIGIN: ${CORS_ORIGIN}
      TZ: Asia/Shanghai
    depends_on:
      - mysql
    networks:
      - salary-network

  frontend:
    build: ./frontend
    container_name: salary-frontend
    restart: always
    ports:
      - "2890:80"
    depends_on:
      - backend
    networks:
      - salary-network

volumes:
  mysql_data:

networks:
  salary-network:
    driver: bridge
EOF
    
    log_success "Docker Compose 配置已创建"
}

# 创建 MySQL 配置
create_mysql_config() {
    log_info "创建 MySQL 配置..."
    
    cat > "$PROJECT_DIR/docker/mysql/my.cnf" << 'EOF'
[mysqld]
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci
default-time-zone = '+08:00'
max_connections = 200
innodb_buffer_pool_size = 256M

[client]
default-character-set = utf8mb4
EOF
    
    log_success "MySQL 配置已创建"
}

# 创建数据库初始化脚本
create_init_sql() {
    log_info "创建数据库初始化脚本..."
    
    cat > "$PROJECT_DIR/docker/mysql/init.sql" << 'EOF'
CREATE DATABASE IF NOT EXISTS salary_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE salary_system;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_no VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'dept_admin', 'employee') DEFAULT 'employee',
  status TINYINT DEFAULT 1 COMMENT '1=在职 0=停用',
  must_change_password TINYINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_employee_no (employee_no),
  INDEX idx_department (department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 工资表
CREATE TABLE IF NOT EXISTS salaries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  period VARCHAR(7) NOT NULL COMMENT 'YYYY-MM',
  salary DECIMAL(12,2) DEFAULT 0 COMMENT '应发合计',
  pension_insurance_1 DECIMAL(12,2) DEFAULT 0 COMMENT '养老保险1',
  pension_insurance_2 DECIMAL(12,2) DEFAULT 0 COMMENT '养老保险2',
  medical_insurance DECIMAL(12,2) DEFAULT 0 COMMENT '医疗保险',
  unemployment_insurance DECIMAL(12,2) DEFAULT 0 COMMENT '失业保险',
  housing_fund_deduction DECIMAL(12,2) DEFAULT 0 COMMENT '代扣公积金',
  income_tax DECIMAL(12,2) DEFAULT 0 COMMENT '代扣税',
  target_linked_amount DECIMAL(12,2) DEFAULT 0 COMMENT '目标挂钩部分',
  net_performance_pay DECIMAL(12,2) DEFAULT 0 COMMENT '实发工资',
  total_deduction DECIMAL(12,2) DEFAULT 0 COMMENT '扣款合计',
  remark VARCHAR(500) DEFAULT NULL COMMENT '备注说明',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_period (user_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_period (period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  operation_type VARCHAR(50) NOT NULL,
  operation_content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 导入记录表
CREATE TABLE IF NOT EXISTS import_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  import_type ENUM('employees', 'salaries') NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  success_count INT DEFAULT 0,
  fail_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 初始管理员账号 (密码：admin123)
INSERT INTO users (employee_no, name, department, password_hash, role, must_change_password) VALUES
('ADMIN001', '系统管理员', '管理部', '$2a$10$n6KUWgcXLNa/.JccpInB5eSNV0qxPyddkDEInqW5dVvNVQkBhpAcm', 'admin', 1);

-- 示例员工账号 (密码均为：123456)
INSERT INTO users (employee_no, name, department, password_hash, role, must_change_password) VALUES
('EMP005', '陈薇', '信息技术中心', '$2a$10$pD7vea4694wd9yzjNFf8BeKi3GKkl/ZPLuqlTYJtfEzzcR4zBMKk2', 'employee', 0),
('EMP006', '李涛', '信息技术中心', '$2a$10$pD7vea4694wd9yzjNFf8BeKi3GKkl/ZPLuqlTYJtfEzzcR4zBMKk2', 'employee', 0),
('EMP008', '冯伟', '信息技术中心', '$2a$10$pD7vea4694wd9yzjNFf8BeKi3GKkl/ZPLuqlTYJtfEzzcR4zBMKk2', 'employee', 0);
EOF
    
    log_success "数据库初始化脚本已创建"
}

# 启动服务
start_services() {
    log_info "启动服务..."
    
    cd "$PROJECT_DIR"
    docker compose up -d --build
    
    log_success "服务已启动"
    
    # 等待服务就绪
    log_info "等待服务就绪..."
    sleep 10
    
    # 检查服务状态
    docker compose ps
}

# 生成示例数据
generate_sample_data() {
    log_info "生成示例数据..."
    
    # 等待 MySQL 完全就绪
    sleep 5
    
    # 生成示例工资数据的脚本
    cat > "$PROJECT_DIR/scripts/generate_sample_data.sh" << 'SCRIPT'
#!/bin/bash
cd /opt/salary
docker exec -i salary-mysql mysql -uroot -p"${DB_PASSWORD}" salary_system << 'SQL'
-- 为示例员工生成 2026 年 1-9 月工资数据
INSERT INTO salaries (user_id, period, salary, pension_insurance_1, pension_insurance_2, medical_insurance, unemployment_insurance, housing_fund_deduction, income_tax, target_linked_amount, net_performance_pay, total_deduction, remark) VALUES
-- 陈薇 2026 年 1-9 月
(2, '2026-01', 15450, 1236, 0, 309, 77.25, 1854, 173.75, 0, 11799.00, 3650.00, '年度调薪生效，基本工资上调 5%'),
(2, '2026-02', 15680, 1254, 0, 314, 78.40, 1882, 176.20, 0, 11975.40, 3704.60, '春节当月，含过节补贴'),
(2, '2026-03', 16200, 1296, 0, 324, 81.00, 1944, 184.00, 0, 12371.00, 3829.00, '季度绩效奖金发放'),
(2, '2026-04', 15520, 1242, 0, 310, 77.60, 1862, 174.80, 0, 11853.60, 3666.40, '社保基数年度调整，个人扣款略有变动'),
(2, '2026-05', 15450, 1236, 0, 309, 77.25, 1854, 173.75, 0, 11799.00, 3650.00, NULL),
(2, '2026-06', 15890, 1271, 0, 318, 79.45, 1907, 179.05, 0, 12135.50, 3754.50, '端午节加班，含加班工资'),
(2, '2026-07', 16500, 1320, 0, 330, 82.50, 1980, 188.00, 0, 12599.50, 3900.50, '半年度绩效奖金发放'),
(2, '2026-08', 15780, 1262, 0, 316, 78.90, 1894, 177.60, 0, 12051.50, 3728.50, '公积金基数年度调整'),
(2, '2026-09', 15450, 1236, 0, 309, 77.25, 1854, 173.75, 0, 11799.00, 3650.00, NULL);
SQL
SCRIPT
    
    chmod +x "$PROJECT_DIR/scripts/generate_sample_data.sh"
    "$PROJECT_DIR/scripts/generate_sample_data.sh"
    
    log_success "示例数据已生成"
}

# 显示部署信息
show_deployment_info() {
    SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
    
    echo ""
    echo "=========================================="
    echo "   部署完成！"
    echo "=========================================="
    echo ""
    echo "访问地址："
    echo "  - 前端：http://${SERVER_IP}:2890"
    echo "  - 后端 API：http://${SERVER_IP}:2890/api"
    echo ""
    echo "默认账号："
    echo "  - 管理员：ADMIN001 / admin123"
    echo "  - 员工：EMP005 / 123456（陈薇）"
    echo "  - 员工：EMP006 / 123456（李涛）"
    echo "  - 员工：EMP008 / 123456（冯伟）"
    echo ""
    echo "管理命令："
    echo "  cd /opt/salary"
    echo "  docker compose ps          # 查看服务状态"
    echo "  docker compose logs -f     # 查看日志"
    echo "  docker compose restart     # 重启服务"
    echo "  docker compose down        # 停止服务"
    echo ""
    echo "数据库信息："
    echo "  - 容器：salary-mysql"
    echo "  - 数据库：salary_system"
    echo "  - 密码：见 /opt/salary/.env"
    echo ""
    echo "=========================================="
    echo ""
}

# 主函数
main() {
    print_banner
    
    log_info "开始部署薪酬助手系统..."
    
    check_root
    check_os
    install_docker
    install_docker_compose
    create_project_dir
    generate_env
    create_docker_compose
    create_mysql_config
    create_init_sql
    start_services
    generate_sample_data
    show_deployment_info
    
    log_success "部署完成！"
}

# 执行主函数
main "$@"
