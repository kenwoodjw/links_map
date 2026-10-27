"use client";
/* eslint-disable @next/next/no-img-element -- Remote video covers need runtime fallbacks. */

import { useState, type KeyboardEvent } from "react";
import type { Location } from "@/lib/types";
import { useBucketStatus } from "@/lib/bucketList";
import { getNote, setNote, type Note } from "@/lib/notes";
import { REGION_LABEL, regionOf } from "@/lib/regions";

export default function LocationLightbox({
  location,
  onClose,
  onBack,
}: {
  location: Location;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <Detail
      key={location.id}
      location={location}
      onClose={onClose}
      onBack={onBack}
    />
  );
}
function Cover({ videoId, title }: { videoId: string; title: string }) {
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="detail-cover">
      <p role="status">
        {attempt >= 2 ? "暂时无法加载封面" : !loaded ? "封面加载中…" : ""}
      </p>
      {attempt < 2 && (
        <img
          src={`https://i.ytimg.com/vi/${videoId}/${attempt ? "hqdefault" : "maxresdefault"}.jpg`}
          alt={title}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth <= 200 && !attempt) {
              setAttempt(1);
              return;
            }
            setLoaded(true);
          }}
          onError={() => {
            setLoaded(false);
            setAttempt((n) => n + 1);
          }}
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}
function Detail({
  location,
  onClose,
  onBack,
}: {
  location: Location;
  onClose: () => void;
  onBack?: () => void;
}) {
  const videos = location.videos.filter(
    (v, i, all) => all.findIndex((other) => other.id === v.id) === i,
  );
  const [index, setIndex] = useState(0);
  const [status, updateStatus] = useBucketStatus(location.id);
  const [statusError, setStatusError] = useState("");
  const video = videos[index];
  const move = (delta: number) => {
    if (videos.length > 1)
      setIndex((i) => (i + delta + videos.length) % videos.length);
  };
  const onKey = (e: KeyboardEvent) => {
    if (
      (e.target as HTMLElement).closest(
        'input, textarea, select, [contenteditable="true"]',
      )
    )
      return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      move(e.key === "ArrowLeft" ? -1 : 1);
    }
  };
  return (
    <div className="detail-layout" onKeyDown={onKey}>
      <header className="panel-header">
        <button
          className="text-button"
          data-initial-focus
          onClick={onBack ?? onClose}
        >
          {onBack ? "← 返回地点列表" : "地点详情"}
        </button>
        <button className="icon-button" aria-label="关闭详情" onClick={onClose}>
          ×
        </button>
      </header>
      <div className="detail-scroll">
        {video ? (
          <>
            <div className="gallery">
              <Cover key={video.id} videoId={video.id} title={video.title} />
              <span className="cover-counter">
                {index + 1} / {videos.length}
              </span>
              {videos.length > 1 && (
                <div className="gallery-arrows">
                  <button aria-label="上一个视频" onClick={() => move(-1)}>
                    ‹
                  </button>
                  <button aria-label="下一个视频" onClick={() => move(1)}>
                    ›
                  </button>
                </div>
              )}
            </div>
            {videos.length > 1 && (
              <div className="video-thumbs">
                {videos.map((v, i) => (
                  <button
                    key={v.id}
                    aria-label={`查看视频 ${i + 1}：${v.title}`}
                    aria-pressed={index === i}
                    onClick={() => setIndex(i)}
                  >
                    <img src={v.thumbnail} alt="" loading="lazy" />
                    <span>{i + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="detail-cover">
            <p>暂无关联视频</p>
          </div>
        )}
        <div className="detail-body">
          <p className="eyebrow">
            {location.country} · {REGION_LABEL[regionOf(location)]}
          </p>
          <h2 className="place-title">{location.name}</h2>
          <section className="video-section">
            <p className="eyebrow">旅行影像</p>
            {video ? (
              <>
                <p className="video-title">{video.title}</p>
                <div className="video-links">
                  <a
                    className="primary-button"
                    href={`https://www.youtube.com/watch?v=${video.id}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="在 YouTube 观看（新标签页）"
                  >
                    ▶ 在 YouTube 观看 ↗
                  </a>
                  <a
                    className="text-button"
                    href="https://www.youtube.com/@linksphotograph"
                    target="_blank"
                    rel="noreferrer"
                    aria-label="频道（新标签页）"
                  >
                    频道 ↗
                  </a>
                </div>
              </>
            ) : (
              <p className="muted">暂无关联视频</p>
            )}
            <details className="source-details">
              <summary>地点来源</summary>
              <p>
                关联频道 @linksphotograph 的旅行视频 · 位置提取可信度：
                {location.confidence === "high"
                  ? "高"
                  : location.confidence === "medium"
                    ? "中"
                    : "低"}
                。
              </p>
            </details>
          </section>
          <section className="personal-section">
            <h3>我的清单</h3>
            <div className="bucket-buttons">
              {(["wishlist", "visited"] as const).map((value) => (
                <button
                  key={value}
                  className={value}
                  aria-pressed={status === value}
                  onClick={() => {
                    try {
                      updateStatus(status === value ? null : value);
                      setStatusError("");
                    } catch {
                      setStatusError("未能保存标记，请重试");
                    }
                  }}
                >
                  {value === "visited" ? "✓ 已去" : "♡ 想去"}
                </button>
              ))}
            </div>
            {statusError && (
              <p role="alert" className="save-error">
                {statusError}
              </p>
            )}
          </section>
          <NoteEditor locationId={location.id} />
        </div>
      </div>
    </div>
  );
}

// Keep unsaved text recoverable when storage is full and the user switches places.
const unsavedDrafts = new Map<string, { text: string; visitedAt: string }>();
function NoteEditor({ locationId }: { locationId: string }) {
  const [initial] = useState(() => getNote(locationId));
  const [draft, setDraft] = useState(
    () =>
      unsavedDrafts.get(locationId) ?? {
        text: initial?.text ?? "",
        visitedAt: initial?.visitedAt ?? "",
      },
  );
  const [expanded, setExpanded] = useState(() =>
    Boolean(initial || unsavedDrafts.has(locationId)),
  );
  const [message, setMessage] = useState(() =>
    unsavedDrafts.has(locationId)
      ? "未能保存，请保留文字后重试"
      : initial
        ? "已保存到此浏览器"
        : "",
  );
  const [failed, setFailed] = useState(() => unsavedDrafts.has(locationId));
  const [confirmClear, setConfirmClear] = useState(false);
  const save = (next: typeof draft) => {
    setDraft(next);
    unsavedDrafts.set(locationId, next);
    try {
      const note: Note = {
        text: next.text,
        visitedAt: next.visitedAt || null,
        updatedAt: Date.now(),
      };
      setNote(locationId, note);
      unsavedDrafts.delete(locationId);
      setFailed(false);
      setMessage("已保存到此浏览器");
      return true;
    } catch {
      setFailed(true);
      setMessage("未能保存，请保留文字后重试");
      return false;
    }
  };
  return (
    <section className="note-section">
      <button
        className="note-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
      >
        <h3>我的手记</h3>
        <span>{expanded ? "收起 −" : "写一笔 +"}</span>
      </button>
      {expanded && (
        <div className="note-fields">
          <label htmlFor={`note-${locationId}`}>旅行手记</label>
          <textarea
            id={`note-${locationId}`}
            value={draft.text}
            rows={4}
            placeholder="记录想去的理由或旅行感想"
            onChange={(e) => save({ ...draft, text: e.target.value })}
            onBlur={() => {
              if (failed) save(draft);
            }}
          />
          <label htmlFor={`date-${locationId}`}>
            到访日期 <span className="muted">（可选）</span>
          </label>
          <input
            id={`date-${locationId}`}
            type="date"
            value={draft.visitedAt}
            onChange={(e) => save({ ...draft, visitedAt: e.target.value })}
          />
          <div className="note-actions">
            {draft.text || draft.visitedAt ? (
              confirmClear ? (
                <>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (save({ text: "", visitedAt: "" }))
                        setConfirmClear(false);
                    }}
                  >
                    确认清空
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setConfirmClear(false)}
                  >
                    取消
                  </button>
                </>
              ) : (
                <button
                  className="text-button"
                  onClick={() => setConfirmClear(true)}
                >
                  清空手记
                </button>
              )
            ) : null}
            {failed && (
              <button className="secondary-button" onClick={() => save(draft)}>
                重试保存
              </button>
            )}
          </div>
        </div>
      )}
      <p role="status" className={failed ? "save-error" : "saved-message"}>
        {message}
      </p>
    </section>
  );
}
