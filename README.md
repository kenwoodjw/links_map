# 人生清单 · 旅行地图 (links_map)

基于 YouTube 摄影频道 [@linksphotograph](https://www.youtube.com/@linksphotograph) 的
交互式旅行清单地图：把频道里去过的每个地点标在世界地图上，点击看视频，并标记「已打卡 / 想去」。

## 技术栈

- Next.js 16 App Router · React 19 · TypeScript
- Tailwind CSS v4
- MapLibre GL JS + OpenFreeMap tiles（无需 API key）
- `react-map-gl/maplibre` · `supercluster`（标记聚合）
- 打卡状态存在 `localStorage`

## 开发

```bash
pnpm install
pnpm dev       # http://localhost:3000
pnpm build     # 生产构建
```

## 数据流水线

前端从 `data/locations.json` 读取地点。当前仓库已附带 **30 个精挑细选的种子地点**
（覆盖冰岛、日本各地、挪威、瑞士、格陵兰、索科特拉、多洛米蒂等），可以直接跑起来。

要扩展到完整的 200+ 视频，三步走：

### 1. 抓取频道视频列表

```bash
yt-dlp --flat-playlist --dump-single-json \
  "https://www.youtube.com/@linksphotograph/videos" > raw/channel.json
```

（需要 `brew install yt-dlp`）

### 2. 用 AI 提取地点

把你的 key 放到 `.env.local`：

```
DEEPSEEK_API_KEY=sk-...
# 或
ANTHROPIC_API_KEY=sk-ant-...
```

然后：

```bash
pnpm tsx scripts/extract-locations.ts
```

输出到 `raw/locations-raw.json`（每 10 条 checkpoint，中断可续跑）。

### 3. 地理编码

```bash
pnpm tsx scripts/geocode.ts
```

用 Nominatim (OpenStreetMap) 批量把地点名转经纬度，1 req/s 限速。
输出最终 `data/locations.json`（前端会自动用）。

失败的条目记录在 `raw/geocode-cache.json`，可手工编辑 `data/locations.json` 补全。

## 目录

```
├── src/
│   ├── app/                  # Next.js App Router
│   ├── components/
│   │   ├── Map.tsx           # MapLibre + supercluster
│   │   ├── LocationLightbox.tsx   # 全屏灯箱 + YouTube iframe + 打卡按钮
│   │   └── FilterSidebar.tsx # 侧栏：tab + 搜索 + 按国家分组列表
│   └── lib/
│       ├── types.ts
│       ├── locations.ts      # 加载 JSON
│       └── bucketList.ts     # localStorage + React hooks
├── data/locations.json       # 最终地图数据（入 git）
├── scripts/
│   ├── extract-locations.ts  # AI 提取（DeepSeek/Anthropic）
│   └── geocode.ts            # Nominatim 批量 geocoding
└── raw/                      # pipeline 中间产物（gitignored）
```

## 部署

```bash
pnpm vercel --prod
```

无需任何环境变量 — 前端只读静态 JSON，没有 API 调用。

## 已知限制

- YouTube 嵌入在**自动化浏览器**里会弹「Sign in to confirm you're not a bot」。
  真实用户浏览器不受影响。
- Nominatim 免费额度需要自律（1 req/s，别并发）。地点极多时可换 MapTiler Geocoding。
- 当前种子数据 30 处，跑完完整 pipeline 后通常会达到 60–100 处。
