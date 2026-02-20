#!/bin/bash
# RepVet Batch Diagnosis Wrapper
# 30分おきに実行されるバッチ診断スクリプト

# スクリプトの場所から相対パスでリポジトリルートを解決
cd "$(dirname "$0")/.."

# ログディレクトリ作成
mkdir -p batch-results

# バッチ実行
node scripts/batch-diagnose.js >> batch-results/cron.log 2>&1

# Gitコミットとプッシュ（変更がある場合のみ）
if [ -n "$(git status --porcelain batch-results/ 2>/dev/null)" ]; then
    git add batch-results/
    git commit -m "batch: OSS診断結果追加 ($(date '+%Y-%m-%d %H:%M'))"
    git push origin HEAD:batch/diagnosis-results || echo "Push failed, will retry next time"
fi

echo "Batch completed at $(date)"
