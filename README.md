# EvalBench · 大模型评测系统

<p align="center">
  <b>An enterprise-grade LLM evaluation platform powered by EvalScope</b><br/>
  基于 <a href="https://github.com/modelscope/evalscope">EvalScope</a> 引擎构建的企业级大模型评测管理平台
</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license" />
  <img src="https://img.shields.io/badge/python-3.10%2B-blue" alt="python" />
  <img src="https://img.shields.io/badge/node-18%2B-green" alt="node" />
  <img src="https://img.shields.io/badge/powered%20by-EvalScope-orange" alt="evalscope" />
</p>

---

**[English](#english) · [中文](#中文)**

---

## English

### Overview

EvalBench is an enterprise-ready web platform for managing the full lifecycle of LLM evaluations. It wraps the [EvalScope](https://github.com/modelscope/evalscope) evaluation engine with a multi-user management interface, covering everything from model and dataset registration to task scheduling, result visualization, and cross-version A/B comparison.

### Features

| Category | Capabilities |
|----------|-------------|
| **Model Management** | Centrally manage OpenAI-compatible model APIs; encrypted API key storage with show/hide toggle |
| **Dataset Management** | Built-in EvalScope benchmark library + custom dataset upload (EvalScope format) |
| **Evaluation Tasks** | One-click task creation, async execution via Celery, real-time progress tracking |
| **LLM Judge** | Rule-based, LLM-as-a-judge, and hybrid evaluation strategies; customizable scoring prompts |
| **Result Analysis** | Per-sample detail, category/dimension breakdown, score distribution charts |
| **A/B Comparison** | Side-by-side comparison of 2–8 tasks: radar chart, category analysis, sample agreement matrix |
| **Webhook Notifications** | Subscribe to task lifecycle events (started / completed / failed / cancelled); HMAC-SHA256 signed payloads |
| **Enterprise Auth** | LDAP, OAuth2, and OIDC authentication — all database-driven, managed from the admin panel |
| **Team Collaboration** | Role-based access control; shared tasks and results within teams |
| **Sample Retry** | Per-sample retry with full response history and version rollback |

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + ECharts
- **Backend**: Python + FastAPI + SQLAlchemy + Celery + Redis
- **Database**: PostgreSQL 15
- **Evaluation Engine**: [EvalScope](https://github.com/modelscope/evalscope)
- **Deployment**: Docker Compose

### Quick Start

#### Prerequisites

- Docker & Docker Compose
- 8 GB+ RAM recommended

#### 1. Clone the repository

```bash
git clone https://github.com/D0n9/EvalBench.git
cd evalbench
```

#### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set database credentials, SECRET_KEY, and any model API keys
```

Key variables in `.env`:

```env
# Database
POSTGRES_USER=evalbench
POSTGRES_PASSWORD=your_password
POSTGRES_DB=evalbench

# Security
SECRET_KEY=your_secret_key_here

# Redis
REDIS_URL=redis://redis:6379/0
```

#### 3. Start services

```bash
# Production mode
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Development mode (hot-reload for both frontend and backend)
docker-compose up -d
```

#### 4. Access the platform

| Service | URL |
|---------|-----|
| Web UI | http://localhost |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Docs (ReDoc) | http://localhost:8000/redoc |

Default admin credentials are set via environment variables on first startup.

### Project Structure

```
evalbench/
├── frontend/          # React + Vite SPA
│   ├── src/
│   │   ├── pages/     # Route-level page components
│   │   ├── components/# Shared UI components
│   │   ├── store/     # Zustand state management
│   │   └── locales/   # i18n (zh / en)
│   └── Dockerfile
├── backend/           # FastAPI application
│   ├── app/
│   │   ├── api/       # REST endpoints
│   │   ├── core/      # Auth, security, Celery
│   │   ├── crud/      # Database operations
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── schemas/   # Pydantic schemas
│   │   └── services/  # EvalScope integration, webhooks
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.override.yml   # Dev overrides
└── docker-compose.prod.yml       # Prod overrides
```

### Admin Panel

Navigate to `/admin` after logging in as a superuser to configure:

- **SSO / LDAP** — LDAP server, OAuth2 provider, or OIDC issuer settings
- **Webhooks** — Register endpoints, select events, test delivery
- **User Management** — Create / manage users and team memberships

---

## 中文

### 概述

EvalBench 是一个企业级大模型评测管理平台，以 [EvalScope](https://github.com/modelscope/evalscope) 作为评测引擎，在其之上构建了完整的多用户 Web 管理界面，覆盖从模型接入、数据集管理、任务调度，到结果可视化、多版本 A-B 对比的完整评测工作流。

### 功能特性

| 模块 | 能力 |
|------|------|
| **模型管理** | 统一管理 OpenAI 兼容格式的模型 API；API Key 加密存储，支持明文查看切换 |
| **数据集管理** | 内置 EvalScope 基准数据集库 + 自定义数据集上传（EvalScope 标准格式） |
| **评测任务** | 可视化创建任务，Celery 异步执行，实时进度追踪 |
| **LLM Judge** | 规则匹配、LLM 裁判、混合三种评测策略；可自定义评分提示词 |
| **结果分析** | 逐题详情、分类/维度细分、得分分布图表 |
| **A-B 版本对比** | 同时对比 2–8 个任务：雷达图 + 分类分析 + 样本一致性矩阵 |
| **Webhook 通知** | 订阅任务生命周期事件（启动/完成/失败/取消）；HMAC-SHA256 签名校验 |
| **企业认证** | LDAP、OAuth2、OIDC 三种认证方式，全部由管理后台数据库驱动配置 |
| **团队协作** | 基于角色的权限管理；团队内共享任务与结果 |
| **单题重试** | 逐题重试并保留完整回答历史，支持版本回滚 |

### 技术栈

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + ECharts
- **后端**：Python + FastAPI + SQLAlchemy + Celery + Redis
- **数据库**：PostgreSQL 15
- **评测引擎**：[EvalScope](https://github.com/modelscope/evalscope)
- **部署**：Docker Compose

### 快速启动

#### 前置条件

- Docker & Docker Compose
- 推荐 8 GB 以上内存

#### 1. 克隆代码

```bash
git clone https://github.com/D0n9/EvalBench.git
cd evalbench
```

#### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，设置数据库密码、SECRET_KEY 等
```

`.env` 关键变量：

```env
# 数据库
POSTGRES_USER=evalbench
POSTGRES_PASSWORD=your_password
POSTGRES_DB=evalbench

# 安全密钥
SECRET_KEY=your_secret_key_here

# Redis
REDIS_URL=redis://redis:6379/0
```

#### 3. 启动服务

```bash
# 生产模式
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# 开发模式（前后端均支持热更新）
docker-compose up -d
```

#### 4. 访问平台

| 服务 | 地址 |
|------|------|
| Web 管理界面 | http://localhost |
| API 文档（Swagger） | http://localhost:8000/docs |
| API 文档（ReDoc） | http://localhost:8000/redoc |

首次启动时，管理员账号通过环境变量初始化。

### 项目结构

```
evalbench/
├── frontend/          # React + Vite 单页应用
│   ├── src/
│   │   ├── pages/     # 路由页面组件
│   │   ├── components/# 公共 UI 组件
│   │   ├── store/     # Zustand 状态管理
│   │   └── locales/   # 国际化（zh / en）
│   └── Dockerfile
├── backend/           # FastAPI 应用
│   ├── app/
│   │   ├── api/       # REST 接口
│   │   ├── core/      # 认证、安全、Celery
│   │   ├── crud/      # 数据库操作
│   │   ├── models/    # SQLAlchemy ORM 模型
│   │   ├── schemas/   # Pydantic 数据模式
│   │   └── services/  # EvalScope 集成、Webhook
│   └── Dockerfile
├── docker-compose.yml
├── docker-compose.override.yml   # 开发环境覆盖配置
└── docker-compose.prod.yml       # 生产环境覆盖配置
```

### 管理后台

以超级管理员身份登录后，访问 `/admin` 可配置：

- **SSO / LDAP** — LDAP 服务器、OAuth2 提供方或 OIDC Issuer 参数
- **Webhook** — 注册 Webhook 端点、选择订阅事件、发送测试请求
- **用户管理** — 创建和管理用户及团队成员关系

---

<p align="center">Powered by <a href="https://github.com/modelscope/evalscope">EvalScope</a> · Built with ❤️</p>
