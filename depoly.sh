#!/usr/bin/env sh

# 确保脚本抛出遇到的错误
set -e

# 生成静态文件
NODE_OPTIONS=--max_old_space_size=8192 yarn run docs:build

# 进入生成的文件夹
cd src/.vuepress/dist

# 如果是发布到自定义域名
# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'deploy'

git push -f git@github.com:topdeoo/topdeoo.github.io.git master:gh-pages


cd -
