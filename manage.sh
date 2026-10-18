#!/bin/bash

###############################################################################
# 薪酬助手 - 快速管理脚本
# 使用方式：./manage.sh <命令>
###############################################################################

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

PROJECT_DIR="/opt/salary"

show_help() {
    echo ""
    echo "薪酬助手 - 快速管理工具"
    echo ""
    echo "用法：./manage.sh <命令>"
    echo ""
    echo "可用命令："
    echo "  status      - 查看服务状态"
    echo "  logs        - 查看实时日志"
    echo "  restart     - 重启所有服务"
    echo "  stop        - 停止所有服务"
    echo "  start       - 启动所有服务"
    echo "  backup      - 备份数据库"
    echo "  restore     - 恢复数据库"
    echo "  reset-admin - 重置管理员密码"
    echo "  shell       - 进入容器 Shell"
    echo "  update      - 更新部署"
    echo "  clean       - 清理日志和临时文件"
    echo "  help        - 显示帮助"
    echo ""
}

check_project() {
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "项目目录不存在：$PROJECT_DIR"
        exit 1
    fi
    cd "$PROJECT_DIR"
}

case "$1" in
    "status")
        check_project
        log_info "服务状态："
        docker compose ps
        echo ""
        log_info "资源使用："
        docker stats --no-stream
        ;;
    
    "logs")
        check_project
        SERVICE=${2:-}
        if [ -z "$SERVICE" ]; then
            docker compose logs -f --tail=100
        else
            docker compose logs -f --tail=100 "$SERVICE"
        fi
        ;;
    
    "restart")
        check_project
        log_info "重启服务..."
        docker compose restart
        log_success "服务已重启"
        ;;
    
    "stop")
        check_project
        log_info "停止服务..."
        docker compose down
        log_success "服务已停止"
        ;;
    
    "start")
        check_project
        log_info "启动服务..."
        docker compose up -d
        log_success "服务已启动"
        ;;
    
    "backup")
        check_project
        if [ ! -f .env ]; then
            log_error ".env 文件不存在"
            exit 1
        fi
        
        source .env
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backup_${TIMESTAMP}.sql"
        
        log_info "备份数据库..."
        docker exec salary-mysql mysqldump -uroot -p"${DB_PASSWORD}" salary_system > "$BACKUP_FILE"
        
        log_success "备份完成：$BACKUP_FILE"
        log_info "保留最近 7 个备份..."
        ls -t backup_*.sql 2>/dev/null | tail -n +8 | xargs -r rm
        ;;
    
    "restore")
        check_project
        if [ -z "$2" ]; then
            log_error "用法：./manage.sh restore <备份文件>"
            exit 1
        fi
        
        if [ ! -f "$2" ]; then
            log_error "备份文件不存在：$2"
            exit 1
        fi
        
        if [ ! -f .env ]; then
            log_error ".env 文件不存在"
            exit 1
        fi
        
        source .env
        
        log_warn "警告：这将覆盖当前数据库！"
        read -p "确认恢复？(y/N): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "恢复数据库..."
            docker exec -i salary-mysql mysql -uroot -p"${DB_PASSWORD}" salary_system < "$2"
            log_success "恢复完成"
        else
            log_info "取消恢复"
        fi
        ;;
    
    "reset-admin")
        check_project
        if [ ! -f .env ]; then
            log_error ".env 文件不存在"
            exit 1
        fi
        
        source .env
        
        log_info "重置管理员密码..."
        docker exec salary-mysql mysql -uroot -p"${DB_PASSWORD}" salary_system << 'SQL'
UPDATE users SET password_hash = '$2a$10$n6KUWgcXLNa/.JccpInB5eSNV0qxPyddkDEInqW5dVvNVQkBhpAcm', must_change_password = 1 WHERE employee_no = 'ADMIN001';
SQL
        
        log_success "管理员密码已重置为：admin123"
        ;;
    
    "shell")
        check_project
        SERVICE=${2:-backend}
        log_info "进入 $SERVICE 容器..."
        docker exec -it "salary-${SERVICE}" /bin/bash
        ;;
    
    "update")
        check_project
        log_info "更新部署..."
        git pull || log_warn "Git 拉取失败，请手动更新"
        docker compose up -d --build
        log_success "更新完成"
        ;;
    
    "clean")
        check_project
        log_info "清理日志和临时文件..."
        
        # 清理 Docker 日志
        docker compose logs --tail=0
        
        # 清理临时文件
        rm -f /tmp/*.sql
        rm -f *.tmp
        
        log_success "清理完成"
        ;;
    
    "help"|"-h"|"--help")
        show_help
        ;;
    
    *)
        log_error "未知命令：$1"
        show_help
        exit 1
        ;;
esac
