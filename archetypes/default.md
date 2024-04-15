---
title: {{ replace .File.ContentBaseName "-" " " | title }}
date: {{ .Date }}
draft: true
math: true
categories:
    - {{replace .File.ContentBaseName "-" " " | title}}
keywords:
    - keywords
cover: wallpaper/default.png
description: "abstract here"
---
