# 人生清单 · 旅行地图

基于 YouTube 摄影频道 [@linksphotograph](https://www.youtube.com/@linksphotograph) 的交互式旅行清单地图。把频道里去过的每个地点标在 3D 地球上，点击看视频，标记「已打卡 / 想去」，写下旅行手记。

## 功能

- **3D 交互地球** — 自动旋转，点击拖拽，支持深色矢量 / NASA 卫星图两种样式切换
- **左侧地点列表** — 显示所有地点，点击飞行定位
- **右侧详情面板** — 视频封面画廊、YouTube 嵌入播放、打卡按钮、旅行手记
- **打卡清单** — 已打卡（绿）/ 想去（橙）状态，统计可见
- **旅行路线** — 已打卡地点间自动绘制大圆弧（金色），按首次到访日期排序
- **昼夜晨昏线** — 实时日影叠加，每 60 秒更新
- **随机探索** — 「彩蛋」按钮随机飞往未访问地点
- **按地区 / 状态筛选** — 底部栏过滤，地图同步飞行至对应视图
- **纯净模式** — 按 `H` 键隐藏所有 HUD，适合截图

## 技术栈

- **框架：** Next.js 16 App Router · React 19 · TypeScript
- **样式：** Tailwind CSS v4
- **地图：** MapLibre GL JS v5 + react-map-gl
  - 深色矢量：CARTO Dark Matter（无需 API key）
  - 卫星图：NASA GIBS Blue Marble（无需 API key）
- **状态：** localStorage（无后端、无数据库）

## 本地开发

```bash
pnpm install
pnpm dev      # http://localhost:3000
pnpm build    # 生产构建
pnpm lint
```

前端**不需要任何环境变量**，直接读取静态 `data/locations.json`。

## 数据流水线

仓库已包含 30 个种子地点，可直接运行。要同步完整频道数据（200+ 视频），三步走：

### 1. 抓取频道视频列表

```bash
# 需要 brew install yt-dlp
yt-dlp --flat-playlist --dump-single-json \
  "https://www.youtube.com/@linksphotograph/videos" > raw/channel.json
```

### 2. AI 提取地点

在 `.env.local` 中填入 key（二选一）：

```
DEEPSEEK_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

```bash
pnpm tsx scripts/extract-locations.ts
# → raw/locations-raw.json（每 10 条 checkpoint，中断可续跑）
```

### 3. 地理编码

```bash
pnpm tsx scripts/geocode.ts
# → data/locations.json（Nominatim，1 req/s，自动去重合并）
```

`raw/geocode-cache.json` 记录失败条目，可手工编辑 `data/locations.json` 补全。

## 部署

```bash
pnpm vercel --prod
```

## 目录结构

```
├── src/
│   ├── app/                      # Next.js App Router
│   ├── components/
│   │   ├── GlobeMap.tsx          # MapLibre 3D 地球 + 标记 + 图层
│   │   ├── LocationList.tsx      # 左侧地点列表
│   │   ├── LocationLightbox.tsx  # 右侧详情滑入面板
│   │   ├── TopHeader.tsx         # 顶部统计栏
│   │   ├── BottomBar.tsx         # 底部地区 / 状态筛选
│   │   ├── SurpriseButton.tsx    # 随机探索按钮
│   │   └── StarField.tsx         # 背景星空
│   └── lib/
│       ├── types.ts              # Location, VideoRef, BucketStatus
│       ├── locations.ts          # 加载 data/locations.json
│       ├── bucketList.ts         # localStorage hooks
│       ├── notes.ts              # 旅行手记 hooks
│       ├── regions.ts            # 地区定义 + 视角
│       ├── terminator.ts         # 昼夜晨昏线 GeoJSON
│       ├── greatCircle.ts        # 大圆弧插值
│       └── videoFrames.ts        # YouTube 封面 URL 生成
├── data/locations.json           # 最终地图数据（入 git）
├── scripts/
│   ├── extract-locations.ts      # AI 提取（DeepSeek / Anthropic）
│   └── geocode.ts                # Nominatim 批量 geocoding
└── raw/                          # pipeline 中间产物（gitignored）
```

## 已知限制

- YouTube 嵌入在**自动化浏览器**（爬虫 / CI headless）中可能触发人机验证，真实用户浏览器不受影响。
- Nominatim 需遵守 1 req/s 使用条款，地点极多时可替换为 MapTiler Geocoding API。
