#!/bin/bash

set -e

echo "========================================="
echo "  薪酬助手部署脚本"
echo "========================================="

# 检查 .env 文件
if [ ! -f .env ]; then
    echo "创建 .env 文件..."
    cp .env.example .env
    echo "请编辑 .env 文件设置数据库密码和 JWT 密钥"
    exit 1
fi

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

case "$1" in
    "build")
        echo "构建后端..."
        cd backend
        npm install
        npm run build
        cd ..
        
        echo "构建并启动服务..."
        docker compose build
        ;;
    
    "start")
        echo "启动服务..."
        docker compose up -d
        echo "服务已启动"
        echo "访问地址: http://salary.moxiaoyu.pro"
        ;;
    
    "stop")
        echo "停止服务..."
        docker compose down
        ;;
    
    "restart")
        echo "重启服务..."
        docker compose restart
        ;;
    
    "logs")
        docker compose logs -f ${2:-}
        ;;
    
    "backup")
        echo "备份数据库..."
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)
        BACKUP_FILE="backup_${TIMESTAMP}.sql"
        docker compose exec -T mysql mysqldump -u root -p${DB_PASSWORD} salary_system > ${BACKUP_FILE}
        echo "备份完成: ${BACKUP_FILE}"
        
        # 保留最近7个备份
        ls -t backup_*.sql | tail -n +8 | xargs -r rm
        ;;
    
    "restore")
        if [ -z "$2" ]; then
            echo "用法: ./deploy.sh restore <备份文件>"
            exit 1
        fi
        echo "恢复数据库从: $2"
        docker compose exec -T mysql mysql -u root -p${DB_PASSWORD} salary_system < "$2"
        echo "恢复完成"
        ;;
    
    "status")
        docker compose ps
        ;;
    
    *)
        echo "用法: ./deploy.sh {build|start|stop|restart|logs|backup|restore|status}"
        echo ""
        echo "命令说明:"
        echo "  build    - 构建项目"
        echo "  start    - 启动服务"
        echo "  stop     - 停止服务"
        echo "  restart  - 重启服务"
        echo "  logs     - 查看日志 (可选: backend/frontend/mysql)"
        echo "  backup   - 备份数据库"
        echo "  restore  - 恢复数据库"
        echo "  status   - 查看服务状态"
        exit 1
        ;;
esac
