"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { locations } from "@/lib/locations";
import LocationLightbox from "@/components/LocationLightbox";
import LocationList from "@/components/LocationList";
import TopHeader, { StatsContent } from "@/components/TopHeader";
import BottomBar, { Filters, type StatusFilter } from "@/components/BottomBar";
import Panel from "@/components/Panel";
import StarField from "@/components/StarField";
import { regionOf, REGION_VIEW, type Region } from "@/lib/regions";
import { useAllBucketStatuses } from "@/lib/bucketList";
import { useAllNotes } from "@/lib/notes";
import type { Location } from "@/lib/types";

const GlobeMap = dynamic(() => import("@/components/GlobeMap"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      正在加载地球…
    </div>
  ),
});
const subscribeSize = (notify: () => void) => {
  const mq = matchMedia("(max-width: 1023px)");
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};
type Screen = "map" | "list" | "detail" | "filters" | "stats";
export default function Home() {
  const mobile = useSyncExternalStore(
    subscribeSize,
    () => matchMedia("(max-width: 1023px)").matches,
    () => false,
  );
  const [selected, setSelected] = useState<Location | null>(null);
  const [flyTarget, setFlyTarget] = useState<Location | null>(null);
  const [screen, setScreen] = useState<Screen>("map");
  const [listOpen, setListOpen] = useState(true);
  const [listFocusTarget, setListFocusTarget] = useState<string>();
  const [fromList, setFromList] = useState(false);
  const [filterFromList, setFilterFromList] = useState(false);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [region, setRegion] = useState<Region | "all">("all");
  const [hudHidden, setHudHidden] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const statsTrigger = useRef<HTMLButtonElement>(null);
  const restoreStatsFocus = useRef(false);
  const utilityTrigger = useRef<HTMLElement | null>(null);
  const bucketStatuses = useAllBucketStatuses();
  const allNotes = useAllNotes();
  const availableRegions = useMemo(
    () => [...new Set(locations.map(regionOf))],
    [],
  );
  const filtered = useMemo(
    () =>
      locations.filter(
        (l) =>
          (status === "all" || bucketStatuses[l.id] === status) &&
          (region === "all" || regionOf(l) === region),
      ),
    [bucketStatuses, status, region],
  );
  const counts = {
    visited: locations.filter((l) => bucketStatuses[l.id] === "visited").length,
    wishlist: locations.filter((l) => bucketStatuses[l.id] === "wishlist")
      .length,
  };
  const stats = {
    total: locations.length,
    ...counts,
    notes: Object.keys(allNotes).length,
  };
  const modal = mobile && screen !== "map";
  const restore = () =>
    requestAnimationFrame(() => {
      const el = trigger.current;
      if (
        el?.isConnected &&
        el.getClientRects().length &&
        !el.closest("[inert], [hidden]")
      )
        el.focus({ preventScroll: true });
      else
        document
          .querySelector<HTMLButtonElement>("[data-list-trigger]")
          ?.focus();
    });
  const open = (next: Screen) => {
    if (next === "list") setListFocusTarget(undefined);
    if (screen === "map")
      trigger.current = document.activeElement as HTMLElement;
    setScreen(next);
  };
  const closeStats = () => {
    restoreStatsFocus.current = true;
    setScreen("map");
  };
  useEffect(() => {
    if (screen === "map" && restoreStatsFocus.current) {
      restoreStatsFocus.current = false;
      // Wait for the remounted summary and the browser's inert update.
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => statsTrigger.current?.focus({ preventScroll: true }));
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [screen]);
  const close = () => {
    setScreen("map");
    setSelected(null);
    setFlyTarget(null);
    restore();
  };
  const handleSelect = (loc: Location, source: boolean) => {
    if (!source || !mobile)
      trigger.current = document.activeElement as HTMLElement;
    setFromList(source);
    setSelected(loc);
    setFlyTarget(loc);
    setScreen("detail");
  };
  const returnToList = () => {
    setListFocusTarget(`[data-location-id="${selected?.id}"]`);
    setSelected(null);
    setFlyTarget(null);
    setScreen("list");
  };
  const randomSource = useMemo(() => {
    const remaining = filtered.filter(
      (l) => l.id !== selected?.id && l.id !== flyTarget?.id,
    );
    const wished = remaining.filter((l) => bucketStatuses[l.id] === "wishlist");
    const unvisited = remaining.filter(
      (l) => bucketStatuses[l.id] !== "visited",
    );
    return wished.length ? wished : unvisited.length ? unvisited : remaining;
  }, [filtered, selected, flyTarget, bucketStatuses]);
  const onSurprise = () => {
    if (randomSource.length)
      handleSelect(
        randomSource[Math.floor(Math.random() * randomSource.length)],
        false,
      );
  };
  const reset = () => {
    setStatus("all");
    setRegion("all");
  };
  const openFilters = () => {
    utilityTrigger.current = document.activeElement as HTMLElement;
    setFilterFromList(mobile && screen === "list");
    open("filters");
  };
  const finishFilters = () => {
    if (filterFromList) setListFocusTarget(".list-count button");
    setScreen(filterFromList ? "list" : selected ? "detail" : "map");
    if (!filterFromList)
      requestAnimationFrame(() =>
        utilityTrigger.current?.focus({ preventScroll: true }),
      );
  };
  const toggleHud = useCallback(() => setHudHidden((value) => !value), []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() !== "h" ||
        screen !== "map" ||
        (e.target as HTMLElement)?.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
      )
        return;
      toggleHud();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [screen, toggleHud]);
  const listActive = !hudHidden && (mobile ? screen === "list" : listOpen);
  const detailActive =
    !hudHidden && selected !== null && (!mobile || screen === "detail");
  return (
    <main className="app-shell">
      <div className="map-background" inert={modal || hudHidden}>
        <GlobeMap
          locations={filtered}
          onSelect={(l) => handleSelect(l, false)}
          flyTarget={flyTarget}
          regionTarget={region === "all" ? null : REGION_VIEW[region]}
          autoRotate={screen === "map" && !flyTarget && region === "all"}
          lightboxOpen={Boolean(selected)}
        />
        <StarField />
        <div className="map-vignette" />
      </div>
      <div className="map-hud" hidden={hudHidden} inert={modal}>
        {(!listOpen || mobile) && (
          <div className="brand-block">
            <span className="brand-seal">清</span>
            <div>
              <strong>人生清单</strong>
              <p>世界很大，慢慢走。</p>
            </div>
            {!mobile && (
              <button
                data-list-trigger
                className="text-button"
                onClick={() => setListOpen(true)}
              >
                ☰ 地点 {filtered.length}
              </button>
            )}
          </div>
        )}
        {!selected && screen !== "stats" && (
          <TopHeader {...stats} buttonRef={statsTrigger} onOpen={() => open("stats")} />
        )}
        <div
          className={`map-caption ${listOpen ? "with-list" : ""}`}
          hidden={Boolean(selected)}
        >
          <p>THE WORLD IS YOURS TO EXPLORE</p>
          <h2>下一站，心之所向。</h2>
          <span>{locations.length} 个地点 · 无数种出发的理由</span>
        </div>
        <BottomBar
          onList={() => {
            open("list");
            setListOpen(true);
          }}
          onFilter={openFilters}
          onSurprise={onSurprise}
          count={filtered.length}
          canSurprise={randomSource.length > 0}
          listOpen={listOpen}
          detailOpen={Boolean(selected)}
        />
      </div>
      {modal && <div className="modal-backdrop" aria-hidden />}
      <Panel
        className="location-panel"
        autoFocus={mobile}
        initialFocusSelector={listFocusTarget}
        active={listActive}
        mobile={mobile}
        title="地点列表"
        onEscape={() => {
          if (mobile) close();
          else {
            setListOpen(false);
            if (!selected) setScreen("map");
            requestAnimationFrame(() =>
              document.activeElement === document.body && document
                .querySelector<HTMLButtonElement>(".brand-block button")
                ?.focus(),
            );
          }
        }}
      >
        <LocationList
          locations={filtered}
          selectedId={selected?.id ?? null}
          onSelect={(l) => handleSelect(l, true)}
          onClose={() => {
            if (mobile) close();
            else {
              setListOpen(false);
              if (!selected) setScreen("map");
              requestAnimationFrame(() =>
                document.activeElement === document.body && document
                  .querySelector<HTMLButtonElement>(".brand-block button")
                  ?.focus(),
              );
            }
          }}
          onFilter={openFilters}
          onReset={reset}
        />
      </Panel>
      <Panel
        className="detail-panel"
        active={detailActive}
        mobile={mobile}
        title={selected ? `${selected.name} 地点详情` : "地点详情"}
        onEscape={() => {
          if (mobile && fromList) returnToList();
          else close();
        }}
      >
        {selected && (
          <LocationLightbox
            location={selected}
            onClose={close}
            onBack={mobile && fromList ? returnToList : undefined}
          />
        )}
      </Panel>
      <Panel
        className="utility-panel"
        active={!hudHidden && screen === "filters"}
        mobile={mobile}
        title="筛选地点"
        onEscape={finishFilters}
      >
        <header className="panel-header">
          <h2>筛选地点</h2>
          <button
            className="icon-button"
            aria-label="关闭筛选"
            onClick={finishFilters}
          >
            ×
          </button>
        </header>
        <div className="utility-body">
          <Filters
            status={status}
            onStatus={setStatus}
            region={region}
            onRegion={setRegion}
            availableRegions={availableRegions}
          />
          <div className="filter-actions">
            <button className="text-button" onClick={reset}>
              重置地区与状态
            </button>
            <button className="primary-button" onClick={finishFilters}>
              {filterFromList ? "返回列表" : `查看 ${filtered.length} 个地点`}
            </button>
          </div>
        </div>
      </Panel>
      <Panel
        className="stats-panel"
        active={!hudHidden && screen === "stats"}
        mobile={mobile}
        title="旅程统计"
        onEscape={closeStats}
      >
        <header className="panel-header">
          <h2>我的足迹</h2>
          <button
            className="icon-button"
            aria-label="收起统计"
            onClick={closeStats}
          >
            ×
          </button>
        </header>
        <StatsContent {...stats} />
      </Panel>
      {hudHidden && (
        <button
          className="surface restore-ui"
          onClick={() => setHudHidden(false)}
        >
          恢复界面 · H
        </button>
      )}
    </main>
  );
}
