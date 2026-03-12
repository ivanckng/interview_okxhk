# Crypto Pulse

Crypto Pulse 是一个面向加密行业与市场研究场景的多页面情报看板。项目将新闻、宏观经济、竞对公告、加密货币行情与对话式问答整合到同一套前后端架构中，通过 Multi-Agent 方式生成面向业务分析的摘要、洞察和建议。

## 项目目标

- 用统一看板呈现加密市场的关键外部信息。
- 将原始数据源转换成适合阅读和决策的结构化内容。
- 通过多 Agent 协作，把“数据采集”与“分析生成”分开。
- 支持中英文界面，并提供部署到 GCP 的线上版本。
- 通过云端共享缓存与定时预热，降低首次打开时的等待时间。

## 技术架构

### 前端

- `React + TypeScript + Vite`
- 路由入口见 [frontend/src/App.tsx](/Users/ivanckng/repo/interview_okxhk/frontend/src/App.tsx)
- 页面位于 [frontend/src/pages](/Users/ivanckng/repo/interview_okxhk/frontend/src/pages)
- 公共组件位于 [frontend/src/components](/Users/ivanckng/repo/interview_okxhk/frontend/src/components)
- 前端负责：
  - 页面展示与交互
  - 本地展示缓存
  - 多语言切换
  - 与后端 API 通信
  - 渲染 AI 摘要模块 `CopilotHighlight`

### 后端

- `FastAPI`
- 入口见 [backend/main.py](/Users/ivanckng/repo/interview_okxhk/backend/main.py)
- Agent 位于 [backend/agents](/Users/ivanckng/repo/interview_okxhk/backend/agents)
- 数据源适配器位于 [backend/data_sources](/Users/ivanckng/repo/interview_okxhk/backend/data_sources)
- 工具与缓存位于 [backend/utils](/Users/ivanckng/repo/interview_okxhk/backend/utils)
- 后端负责：
  - 聚合外部数据源
  - 生成 AI 分析
  - 暴露统一 API
  - 管理服务端缓存
  - 提供聊天与综合分析能力

### 数据流

1. 前端页面请求后端 API。
2. 后端优先读取云端共享缓存；缓存缺失时再拉取外部数据源。
3. Agent 对原始数据进行筛选、摘要、结构化分析。
4. 重型分析接口采用“缓存优先 + 后台刷新”的方式返回结果。
5. 后端返回页面数据与 AI 分析结果。
6. 前端将原始数据和 AI 结果组合呈现。

## 页面说明

### 1. 市场脉搏 `PulsePage`

文件： [frontend/src/pages/PulsePage.tsx](/Users/ivanckng/repo/interview_okxhk/frontend/src/pages/PulsePage.tsx)

主旨：
- 作为全站总览页，综合新闻、宏观市场、竞对动向、加密货币四个维度。
- 输出一份“今日市场脉搏”式的综合摘要。
- 展示综合洞察、趋势预测、AI 推荐与风险提示。

适合场景：
- 用户进入产品后的第一屏总览。
- 快速把握当前市场环境与优先关注方向。

### 2. 行业新闻 `NewsPage`

文件： [frontend/src/pages/NewsPage.tsx](/Users/ivanckng/repo/interview_okxhk/frontend/src/pages/NewsPage.tsx)

主旨：
- 聚焦加密行业新闻流。
- 将新闻按监管、技术、市场、安全、采用、DeFi、NFT 等分类整理。
- 通过 AI 提供行业新闻层面的摘要与行动建议。

适合场景：
- 用户想快速理解过去一段时间的热点新闻。
- 从新闻角度判断行业主题和风险点。

### 3. 宏观市场 `MarketsPage`

文件： [frontend/src/pages/MarketsPage.tsx](/Users/ivanckng/repo/interview_okxhk/frontend/src/pages/MarketsPage.tsx)

主旨：
- 展示美国与中国经济指标。
- 展示地区股指、大宗商品与外汇。
- 结合宏观新闻和市场数据生成 AI 宏观总结。

适合场景：
- 从传统金融与宏观经济角度观察加密市场外部环境。
- 连接“经济指标变化”和“加密市场情绪”。

### 4. 竞对动向 `CompanyPage`

文件： [frontend/src/pages/CompanyPage.tsx](/Users/ivanckng/repo/interview_okxhk/frontend/src/pages/CompanyPage.tsx)

主旨：
- 跟踪 Binance、Bybit、Bitget 等交易所的公告与动作。
- 将公告按影响程度和类型归类。
- 通过 AI 输出竞对侧的情报摘要。

适合场景：
- 观察交易所层面的产品、规则、上币、维护、活动变化。
- 从竞对角度理解行业竞争态势。

### 5. 加密货币 `CryptoPage`

文件： [frontend/src/pages/CryptoPage.tsx](/Users/ivanckng/repo/interview_okxhk/frontend/src/pages/CryptoPage.tsx)

主旨：
- 展示主流币种价格、成交量、市值与涨跌幅。
- 展示全球加密市场概览数据。
- 结合币价与市场总量数据输出 AI 市场解读。

适合场景：
- 快速浏览主流币种行情。
- 从市场结构和主导率角度理解当前加密行情。

## Multi-Agent 系统

项目的核心不是单个模型，而是“多 Agent 分工协作”。

### 1. 数据采集与聚合 Agent

- `MarketsDataAggregator`
  文件： [backend/agents/markets_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/markets_agent.py)
- `CryptoDataAggregator`
  文件： [backend/agents/crypto_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/crypto_agent.py)

职责：
- 从多个 API 拉取原始数据。
- 把不同来源统一成适合分析的结构。
- 为上层分析 Agent 提供标准输入。

### 2. 分析与摘要 Agent

- `DeepSeekMarketsAgent`
- `DeepSeekCryptoAgent`
- `DeepSeekNewsAnalysisAgent`
- `CompetitorAgent`
- `DeepSeekAgent`

主要文件：
- [backend/agents/news_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/news_agent.py)
- [backend/agents/news_analysis_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/news_analysis_agent.py)
- [backend/agents/competitor_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/competitor_agent.py)
- [backend/agents/deepseek_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/deepseek_agent.py)

职责：
- 把结构化数据转成页面顶部的 AI 摘要。
- 输出 `market_pulse`、`key_insights`、`risk_alerts`、`trend_label` 等字段。
- 让每个页面都有对应领域的“专家视角”。

### 3. 综合决策 Agent

- `DeepSeekPulseAgent`
  文件： [backend/agents/pulse_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/pulse_agent.py)

职责：
- 汇总新闻、宏观、竞对、加密四个页面的分析结果。
- 生成市场脉搏页的综合结论。
- 负责跨模块关联分析。

### 4. 对话 Agent

- `QwenAgent`
  文件： [backend/agents/qwen_agent.py](/Users/ivanckng/repo/interview_okxhk/backend/agents/qwen_agent.py)

职责：
- 为聊天机器人提供问答能力。
- 基于站内已有数据回答用户问题。
- 充当看板之外的交互式入口。

## 数据源概览

项目目前主要接入以下几类数据源：

- 行业新闻：
  - BWE News
  - GNews
- 宏观经济：
  - FRED
  - Tushare
- 传统市场：
  - Yahoo Finance
- 加密货币行情：
  - CoinGecko
- 竞对公告：
  - Binance
  - Bybit
  - Bitget

### 数据源与页面关系

- `PulsePage`
  - 不直接连接单一数据源，而是汇总下列四个页面的缓存结果与 AI 分析结果。

- `NewsPage`
  - `BWE News`：作为站内新闻流与实时更新来源之一。
  - `GNews`：用于补充全球宏观与行业突发新闻。

- `MarketsPage`
  - `FRED`：提供美国 GDP、CPI、PPI、失业率等宏观指标。
  - `Tushare`：提供中国 GDP、CPI、PPI 等经济指标。
  - `akshare`：用于补充中国失业率等部分统计数据。
  - `Yahoo Finance`：提供地区股指、大宗商品与外汇行情。
  - `GNews`：提供宏观市场相关突发新闻。

- `CompanyPage`
  - `Bybit Official API`：获取 Bybit 公告。
  - `Binance Feed`：获取 Binance 公告。
  - `Bitget API`：获取 Bitget 公告。

- `CryptoPage`
  - `CoinGecko`：提供主流币种价格、市值、成交量、市场总览等数据。

### 线上系统当前使用的核心外部能力

- 模型与分析：
  - `DeepSeek`
  - `Qwen`
- 翻译：
  - `DeepL`
- GCP 基础设施：
  - `Firebase Hosting`
  - `Cloud Run`
  - `Memorystore Redis`
  - `Cloud Scheduler`
  - `Secret Manager`

## 目录结构

```text
.
├── backend
│   ├── agents
│   ├── data_sources
│   ├── models
│   ├── utils
│   └── main.py
├── frontend
│   ├── src
│   │   ├── components
│   │   ├── contexts
│   │   ├── hooks
│   │   ├── pages
│   │   └── services
├── DEPLOY_GCP.md
└── README.md
```

## 运行方式

### 本地前端

```bash
cd frontend
npm install
npm run dev
```

### 本地后端

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
```

## 部署形态

当前项目适合的线上部署方式为：

- 前端：Firebase Hosting
- 后端：Cloud Run
- 共享缓存：Memorystore Redis
- 预热任务：Cloud Scheduler
- Cloud Run：保持最少 1 个实例，减少冷启动影响
- 密钥：Secret Manager
- 自定义域名：Firebase Hosting 绑定子域名或主域名

当前线上入口示例：

- 前端主域名：[https://crypto.ivanwu.info](https://crypto.ivanwu.info)
- 前端默认 Hosting 域名：[https://interview-okx-ca9c3.web.app](https://interview-okx-ca9c3.web.app)
- 后端服务：[https://crypto-pulse-backend-456817012977.asia-east1.run.app](https://crypto-pulse-backend-456817012977.asia-east1.run.app)

## 适合继续扩展的方向

- 增加更多数据源与指标维度
- 丰富 Agent 间的数据版本一致性机制
- 增强聊天场景的上下文感知能力
- 增加面向业务运营的专题分析页
