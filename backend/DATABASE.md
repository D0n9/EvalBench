# 数据库结构与代码功能文档

## 一、数据库概述

本项目使用 PostgreSQL 作为主数据库，通过 SQLAlchemy ORM 进行数据库操作。表结构采用 UUID 作为主键，使用 `Base.metadata.create_all()` 自动创建所有表（不再依赖 Alembic 迁移）。

### 核心依赖

```toml
# pyproject.toml
sqlalchemy>=2.0.48
psycopg2-binary==2.9.9
```

### 表结构一览

| 表名 | 说明 | 主要关联 |
|------|------|----------|
| `teams` | 团队/租户 | 被 users, model_configs, datasets, tasks 引用 |
| `users` | 用户 | 属于 team，作为 creator 被其他表引用 |
| `model_configs` | 模型配置 | 属于 team，创建者为 user |
| `datasets` | 评测数据集 | 属于 team，创建者为 user |
| `tasks` | 评测任务 | 属于 team，创建者为 user |

---

## 二、数据表详细设计

### 2.1 Teams 表 (团队)

```python
# app/models/team.py
class Team(Base, UUIDMixin):
    __tablename__ = "teams"

    name = Column(String, index=True, nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    users = relationship("User", back_populates="team")
    model_configs = relationship("ModelConfig", back_populates="team")
    datasets = relationship("Dataset", back_populates="team")
    tasks = relationship("Task", back_populates="team")
```

**字段说明：**
- `id`: UUID 主键 (自动生成)
- `name`: 团队名称（唯一索引）
- `description`: 团队描述
- `created_at`: 创建时间 (自动)
- `updated_at`: 更新时间 (自动)

**业务逻辑：**
- 多租户隔离的核心，每个用户必须属于一个团队
- 团队内共享模型配置、数据集和任务

---

### 2.2 Users 表 (用户)

```python
# app/models/user.py
class User(Base, UUIDMixin):
    __tablename__ = "users"

    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, index=True)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    team_id = Column(String, ForeignKey("teams.id"))
    team = relationship("Team", back_populates="users")

    # Relationships
    created_models = relationship("ModelConfig", back_populates="creator")
    created_datasets = relationship("Dataset", back_populates="creator")
    created_tasks = relationship("Task", back_populates="creator")
```

**字段说明：**
- `id`: UUID 主键
- `email`: 邮箱（唯一索引，用于登录）
- `hashed_password`: 加密后的密码
- `full_name`: 显示名称
- `is_active`: 账户是否激活
- `is_superuser`: 是否为超级管理员
- `team_id`: 所属团队 ID

**业务逻辑：**
- 用户必须属于一个团队（team_id）才能创建模型、数据集和任务
- 超级管理员可以修改资源的公开状态和只读状态

---

### 2.3 ModelConfigs 表 (模型配置)

```python
# app/models/model_config.py
class ModelConfig(Base, UUIDMixin):
    __tablename__ = "model_configs"

    name = Column(String, index=True, nullable=False)        # 平台内别名
    evalscope_model_id = Column(String, nullable=False)     # EvalScope 模型 ID
    api_url = Column(String, nullable=True)                 # API 地址
    api_key = Column(String, nullable=True)                  # API 密钥
    generation_config = Column(JSON, nullable=True)          # 生成参数配置
    model_types = Column(JSON, nullable=True, default=["LLM"])  # 模型类型

    is_public = Column(Boolean, default=False)              # 是否公开
    is_readonly = Column(Boolean, default=False)             # 是否只读

    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    team = relationship("Team", back_populates="model_configs")

    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="created_models")
```

**字段说明：**
- `id`: UUID 主键
- `name`: 在平台内的显示名称
- `evalscope_model_id`: 对应 EvalScope 的模型标识符（如 `qwen-plus`）
- `api_url`: OpenAI 兼容的 API 地址
- `api_key`: API 密钥（建议后续加密存储）
- `generation_config`: 生成参数（temperature, max_tokens 等）
- `model_types`: 模型类型列表 `["LLM", "VLM", "Embedding", "CLIP"]`
- `is_public`: 是否对其他团队可见
- `is_readonly`: 是否只读（只有创建者可修改）

**业务逻辑：**
- 支持 OpenAI 兼容的 API 接口
- 提供连接测试功能 `/api/v1/models/test-connection`

---

### 2.4 Datasets 表 (数据集)

```python
# app/models/dataset.py
class Dataset(Base, UUIDMixin):
    __tablename__ = "datasets"

    name = Column(String, index=True, nullable=False)
    standard_name = Column(String, nullable=True)           # 标准名称
    category = Column(String, nullable=True, index=True)     # 分类
    tags = Column(JSON, nullable=True)                       # 标签列表
    link = Column(String, nullable=True)                     # 数据集链接
    is_builtin = Column(Boolean, default=False)              # 是否内置

    file_path = Column(String, nullable=True)                # 文件路径
    format_mapping = Column(JSON, nullable=True)            # 格式映射

    is_public = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)

    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    team = relationship("Team", back_populates="datasets")

    creator_id = Column(String, ForeignKey("users.id"), nullable=True)
    creator = relationship("User", back_populates="created_datasets")
```

**字段说明：**
- `id`: UUID 主键
- `name`: 数据集名称
- `standard_name`: EvalScope 标准名称（用于内置数据集）
- `category`: 分类（LLM评测集/VLM评测集/AGENT评测集/AIGC评测集/其他数据集）
- `tags`: 标签列表（如 `["MCQ", "QA"]`）
- `link`: 数据集来源链接
- `is_builtin`: 是否为内置数据集（内置不可删除）
- `file_path`: 自定义数据集文件路径
- `format_mapping`: EvalScope 格式映射配置

**业务逻辑：**
- 内置数据集在首次启动时自动导入（`seed_datasets.py`）
- 自定义数据集支持 .jsonl/.csv/.tsv 格式上传
- MCQ/QA 类型数据集文件名需以 `_val` 或 `_dev` 结尾

---

### 2.5 Tasks 表 (评测任务)

```python
# app/models/task.py
class Task(Base, UUIDMixin):
    __tablename__ = "tasks"

    name = Column(String, index=True, nullable=False)
    task_type = Column(String, nullable=False)              # "eval" or "perf"

    status = Column(String, default="pending")               # pending/running/completed/failed
    evalscope_job_id = Column(String, nullable=True)         # EvalScope 任务 ID
    output_dir = Column(String, nullable=True)                # 结果输出目录

    config = Column(JSON, nullable=False)                    # 任务配置

    is_public = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)              # 软删除标记

    team_id = Column(String, ForeignKey("teams.id"), nullable=False)
    team = relationship("Team", back_populates="tasks")

    creator_id = Column(String, ForeignKey("users.id"), nullable=False)
    creator = relationship("User", back_populates="created_tasks")
```

**字段说明：**
- `id`: UUID 主键
- `name`: 任务名称
- `task_type`: 任务类型 `eval`（评测）或 `perf`（性能测试）
- `status`: 任务状态
  - `pending`: 等待执行
  - `running`: 执行中
  - `completed`: 已完成
  - `failed`: 执行失败
- `evalscope_job_id`: EvalScope 返回的任务 ID
- `output_dir`: 结果文件存储目录
- `config`: 任务配置（包含 model, datasets 等）
- `is_deleted`: 软删除标记（查询时自动过滤）

**config 示例：**
```python
# 评测任务
{"model": "qwen-plus", "datasets": ["gsm8k"], "limit": 10}

# 性能测试任务
{"model": "qwen", "parallel": 10, "number": 100}
```

**业务逻辑：**
- 任务创建后自动通过 Celery 异步执行
- 支持重新运行任务（创建副本并执行）
- 软删除机制，删除操作只设置 `is_deleted=true`

---

## 三、API 端点

### 3.1 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/login/access-token` | OAuth2 登录，获取 JWT Token |
| POST | `/api/v1/users/` | 创建用户（公开） |
| GET | `/api/v1/users/me` | 获取当前用户信息 |

### 3.2 模型配置

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/models/` | 获取模型配置列表 |
| POST | `/api/v1/models/` | 创建模型配置 |
| POST | `/api/v1/models/test-connection` | 测试 API 连接 |
| PUT | `/api/v1/models/{model_id}` | 更新模型配置 |
| DELETE | `/api/v1/models/{model_id}` | 删除模型配置 |

### 3.3 数据集管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/datasets/` | 获取数据集列表 |
| GET | `/api/v1/datasets/grouped` | 按分类获取数据集 |
| POST | `/api/v1/datasets/upload` | 上传自定义数据集 |
| PATCH | `/api/v1/datasets/{dataset_id}` | 更新数据集 |
| POST | `/api/v1/datasets/{dataset_id}/file` | 更新数据集文件 |
| DELETE | `/api/v1/datasets/{dataset_id}` | 删除数据集 |

### 3.4 任务管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/tasks/` | 获取任务列表 |
| POST | `/api/v1/tasks/` | 创建任务并执行 |
| GET | `/api/v1/tasks/{task_id}` | 获取任务详情 |
| POST | `/api/v1/tasks/{task_id}/rerun` | 重新运行任务 |
| DELETE | `/api/v1/tasks/{task_id}` | 删除任务（软删除） |

---

## 四、代码结构

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/        # API 路由处理
│   │           ├── login.py      # 登录认证
│   │           ├── users.py      # 用户管理
│   │           ├── models.py     # 模型配置
│   │           ├── datasets.py   # 数据集管理
│   │           └── tasks.py      # 任务管理
│   ├── core/
│   │   ├── config.py             # 配置管理 (pydantic-settings)
│   │   └── security.py           # JWT/密码加密工具
│   ├── crud/                      # 数据库 CRUD 操作
│   │   ├── crud_user.py
│   │   ├── crud_model.py
│   │   ├── crud_dataset.py
│   │   └── crud_task.py
│   ├── db/
│   │   └── session.py            # 数据库连接会话
│   ├── models/                    # SQLAlchemy 模型定义
│   │   ├── base.py               # 基础类 (Base, UUIDMixin)
│   │   ├── team.py
│   │   ├── user.py
│   │   ├── model_config.py
│   │   ├── dataset.py
│   │   └── task.py
│   ├── schemas/                   # Pydantic 请求/响应模型
│   │   ├── user.py
│   │   ├── model_config.py
│   │   ├── dataset.py
│   │   └── task.py
│   └── services/
│       └── evalscope.py          # EvalScope 集成服务
├── scripts/
│   ├── entrypoint.sh             # 容器启动脚本 (创建表、初始化数据)
│   ├── init_db.py                # 创建管理员用户
│   ├── seed_datasets.py          # 导入内置数据集
│   └── celery-entrypoint.sh      # Celery worker 启动脚本
└── pyproject.toml                # 项目依赖
```

---

## 五、权限控制

### 5.1 资源可见性

- `is_public=true`: 跨团队可见
- `is_public=false`: 仅团队内可见

### 5.2 资源可修改性

- `is_readonly=true`: 只有创建者可修改，其他人无法删除或编辑
- `is_readonly=false`: 团队内成员可修改

### 5.3 超级管理员

- `is_superuser=true`: 可以修改任意资源的 `is_public` 和 `is_readonly` 状态

---

## 六、初始化流程

容器启动时 (`entrypoint.sh`) 按顺序执行：

1. **等待数据库就绪** - 检查 PostgreSQL 连接
2. **创建数据表** - `Base.metadata.create_all(engine)`
3. **创建管理员用户** - `init_db.py`（默认管理员 admin/admin123）
4. **导入内置数据集** - `seed_datasets.py`

---

## 七、关键配置

环境变量通过 `app/core/config.py` 管理：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接 URL | postgresql://user:pass@host:5432/db |
| `SECRET_KEY` | JWT 签名密钥 | - |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token 过期时间 | 1440 (24小时) |
| `POSTGRES_HOST/USER/DB/PASSWORD` | 数据库连接参数 | - |
| `REDIS_HOST/PORT` | Redis 连接参数 | - |
| `EVALSCOPE_OUTPUT_DIR` | EvalScope 结果目录 | /workspace/outputs |
| `EVALSCOPE_DATASET_DIR` | 数据集目录 | /workspace/datasets |

---

## 八、后续开发建议

### 8.1 敏感信息加密

当前 `api_key` 以明文存储，建议：
- 使用 `cryptography.fernet` 或 AWS KMS 加密
- 或使用环境变量注入

### 8.2 软删除查询

所有查询已自动过滤 `is_deleted=true` 的记录（在 `deps.py` 的 `get_resource_or_404` 中处理）。
