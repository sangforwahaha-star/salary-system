#!/bin/bash

echo "========================================="
echo "  薪酬助手系统修复验证脚本"
echo "========================================="
echo ""

# 1. 检查容器状态
echo "1. 检查容器状态..."
docker compose ps --format "table {{.Name}}\t{{.Status}}" | grep -v warning
echo ""

# 2. 测试中文显示
echo "2. 测试中文显示..."
RESPONSE=$(curl -s -X POST https://salary.moxiaoyu.pro/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"employee_no":"EMP001","password":"123456"}')
if echo "$RESPONSE" | grep -q "张三"; then
  echo "✅ 中文显示正常"
else
  echo "❌ 中文显示异常"
fi
echo ""

# 3. 测试 HTTPS
echo "3. 测试 HTTPS..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://salary.moxiaoyu.pro)
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ HTTPS 访问正常 (HTTP $HTTP_CODE)"
else
  echo "❌ HTTPS 访问异常 (HTTP $HTTP_CODE)"
fi
echo ""

# 4. 测试 HTTP 重定向
echo "4. 测试 HTTP 重定向..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://salary.moxiaoyu.pro)
if [ "$HTTP_CODE" = "301" ]; then
  echo "✅ HTTP 自动跳转 HTTPS (HTTP $HTTP_CODE)"
else
  echo "❌ HTTP 重定向异常 (HTTP $HTTP_CODE)"
fi
echo ""

# 5. 测试密码强制修改
echo "5. 测试密码强制修改..."
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])" 2>/dev/null)
if [ -n "$TOKEN" ]; then
  API_RESPONSE=$(curl -s https://salary.moxiaoyu.pro/api/salary/latest \
    -H "Authorization: Bearer $TOKEN")
  if echo "$API_RESPONSE" | grep -q "MUST_CHANGE_PASSWORD"; then
    echo "✅ 首次登录强制改密生效"
  else
    echo "❌ 强制改密未生效"
  fi
else
  echo "⚠️  无法获取 token，跳过此测试"
fi
echo ""

# 6. 测试安全头
echo "6. 测试安全头..."
HEADERS=$(curl -sI https://salary.moxiaoyu.pro)
if echo "$HEADERS" | grep -q "X-Frame-Options"; then
  echo "✅ 安全头配置正常"
else
  echo "❌ 安全头缺失"
fi
echo ""

# 7. 测试 API 健康检查
echo "7. 测试 API 健康检查..."
HEALTH=$(curl -s https://salary.moxiaoyu.pro/api/health)
if echo "$HEALTH" | grep -q "ok"; then
  echo "✅ API 健康检查通过"
else
  echo "❌ API 健康检查失败"
fi
echo ""

echo "========================================="
echo "  验证完成"
echo "========================================="
