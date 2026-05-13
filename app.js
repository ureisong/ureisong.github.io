(() => {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const API_URL = CONFIG.API_URL || "";
  const DATA_URL = CONFIG.DATA_URL || "./data.json";
  const SONGS_CSV_URL = CONFIG.SONGS_CSV_URL || "";
  const LIKES_SMR_CSV_URL = CONFIG.LIKES_SMR_CSV_URL || "";
  const NOTICE_CSV_URL = CONFIG.NOTICE_CSV_URL || "";
  const SETTINGS_CSV_URL = CONFIG.SETTINGS_CSV_URL || "";
  const SEARCH_ALIASES_CSV_URL = CONFIG.SEARCH_ALIASES_CSV_URL || "";
  const CSV_CACHE_PREFIX = "csv_cache_";
  const SETTINGS_VERSION_SONGS = "version_songs";
  const SETTINGS_VERSION_SEARCH_ALIASES = "version_search_aliases";
  const LIKE_COOLDOWN_MS = Number(CONFIG.LIKE_COOLDOWN_MS || 60000);
  let searchAliases = {};
  let currentSettingsRows = [];
  const DEFAULT_NOTICE_TEXT = CONFIG.NOTICE_TEXT || "다시보레이 채널 기준으로 작성된 데이터의 추천순, 날짜순, 검색/필터를 제공합니다.";
  const FOOTER_TEXT = CONFIG.FOOTER_TEXT || "";

  const RECOMMEND_LIMITS = {
    random: 5,
    likes_last_1d: 10,
    likes_last_7d: 10,
    likes_last_30d: 10,
    likes_total: 30,
    my_liked: 10
  };
  const RECOMMEND_MORE_STEP = 10;
  const DATE_INITIAL_COUNT = 10;
  const DATE_RECOMMEND_INITIAL_GROUPS = 5;
  const DATE_RECOMMEND_MORE_STEP = 5;

  const els = {
    dataStatus: document.getElementById("dataStatus"),
    cooldownStatus: document.getElementById("cooldownStatus"),
    pageTitle: document.getElementById("pageTitle"),
    searchInput: document.getElementById("searchInput"),
    searchMode: document.getElementById("searchMode"),
    yearFilter: document.getElementById("yearFilter"),
    monthFilter: document.getElementById("monthFilter"),
    dayFilter: document.getElementById("dayFilter"),
    categoryFilter: document.getElementById("categoryFilter"),
    countryFilter: document.getElementById("countryFilter"),
    resetButton: document.getElementById("resetButton"),
    resultCount: document.getElementById("resultCount"),
    recommendDescription: document.getElementById("recommendDescription"),
    recommendList: document.getElementById("recommendList"),
    recommendMoreButton: document.getElementById("recommendMoreButton"),
    dateDescription: document.getElementById("dateDescription"),
    dateList: document.getElementById("dateList"),
    dateMoreButton: document.getElementById("dateMoreButton"),
    sungDescription: document.getElementById("sungDescription"),
    sungList: document.getElementById("sungList"),
    recommendDetails: document.getElementById("recommendDetails"),
    dateDetails: document.getElementById("dateDetails"),
    sungDetails: document.getElementById("sungDetails"),
    coverDetails: document.getElementById("coverDetails"),
    coverDescription: document.getElementById("coverDescription"),
    coverEmpty: document.getElementById("coverEmpty"),
    coverCarousel: document.getElementById("coverCarousel"),
    coverTrack: document.getElementById("coverTrack"),
    coverPrevButton: document.getElementById("coverPrevButton"),
    coverNextButton: document.getElementById("coverNextButton"),
    youtubeModal: document.getElementById("youtubeModal"),
    youtubeModalClose: document.getElementById("youtubeModalClose"),
    youtubeFrameWrap: document.getElementById("youtubeFrameWrap"),
    filterDetails: document.getElementById("filterDetails"),
    filterSummaryHelp: document.querySelector("#filterDetails .summary-help"),
    faviconLink: document.getElementById("faviconLink"),
    modalSongTitle: document.getElementById("modalSongTitle"),
    modalSongArtist: document.getElementById("modalSongArtist"),
    modalSongFooter: document.getElementById("modalSongFooter"),
    modalLikePanel: document.getElementById("modalLikePanel"),
    likeDisabledModal: document.getElementById("likeDisabledModal"),
    likeDisabledModalClose: document.getElementById("likeDisabledModalClose"),
    likeNoticeModalMessage: document.getElementById("likeNoticeModalMessage"),
    pageLoading: document.getElementById("pageLoading"),
    pageLoadingText: document.getElementById("pageLoadingText"),
    pageLoadingSubText: document.getElementById("pageLoadingSubText"),    
    youtubeLoading: document.getElementById("youtubeLoading"),
    noticeText: document.getElementById("noticeText"),
    footerText: document.getElementById("footerText")
  };
  
  const DEFAULT_DOCUMENT_TITLE = document.title || "들어줄레이🍇👻";
  const DEFAULT_H1_TEXT = els.pageTitle ? els.pageTitle.textContent : DEFAULT_DOCUMENT_TITLE;

  let allSongs = [];
  let filteredSongs = [];
  let recommendMode = "random";
  let recommendVisibleCount = RECOMMEND_LIMITS.random;
  let randomPoolIds = [];
  let dateVisibleDateCount = 1;
  let dateSortMode = "desc";
  let sungMode = "song";
  let coverItems = [];
  let coverIndex = 0;
  let coverMoving = false;
  let coverHover = false;
  let coverAutoTimer = null;
  let likePostEnabled = true;
  let currentModalSongId = "";
  let likeDisabledModalTimer = null;
  const collapsedGroups = new Set();
  let currentNoticeItems = [{ text: DEFAULT_NOTICE_TEXT, link: "" }];
  let currentFooterText = FOOTER_TEXT;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    showPageLoading("...LOADING...", "초기화면 준비 중.");
    bindEvents();
    setupFavicon();
    showPageLoading("...LOADING...", "공지사항 읽는 중..");
    renderNotice([{ text: DEFAULT_NOTICE_TEXT, link: "" }]);
    renderFooter();
    showPageLoading("...LOADING...", "필터 만드는 중...");
    updateFilterSummaryHelp();
    startCooldownTimer();
    startCoverAutoTimer();
    bindResponsiveRender();
    showPageLoading("...LOADING...", "설정 불러오는 중....");
    currentSettingsRows = await loadSettingsRows();
    showPageLoading("...LOADING...", "설정 불러오는 중.....");
    await loadSearchAliases(false, currentSettingsRows);
    await loadData(false, currentSettingsRows);
  }
  
  function bindResponsiveRender() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 560px)");
    const rerender = () => {
      if (recommendMode === "random") renderRecommendSection();
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", rerender);
    } else if (typeof mq.addListener === "function") {
      mq.addListener(rerender);
    }
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", () => {
      collapseCoverSection();
      applyAndRender(true);
    });
    els.searchInput.addEventListener("blur", () => els.searchInput.classList.remove("input-active"));
    els.searchInput.addEventListener("focus", () => {
      collapseCoverSection();
      els.searchInput.classList.add("input-active");
    });
    window.addEventListener("scroll", deactivateSearchIfFilterOutOfView, { passive: true });
    window.addEventListener("wheel", deactivateSearchIfFilterOutOfView, { passive: true });
    window.addEventListener("touchmove", deactivateSearchIfFilterOutOfView, { passive: true });
    if (els.searchMode) els.searchMode.addEventListener("change", () => {
      collapseCoverSection();
      applyAndRender(true);
    });

    if (els.filterDetails) {
      els.filterDetails.addEventListener("toggle", updateFilterSummaryHelp);
    }
    els.yearFilter.addEventListener("change", event => handleAllOption(event.currentTarget));
    els.monthFilter.addEventListener("change", event => handleAllOption(event.currentTarget));
    els.dayFilter.addEventListener("change", event => handleAllOption(event.currentTarget));
    els.categoryFilter.addEventListener("change", event => handleAllOption(event.currentTarget));
    els.countryFilter.addEventListener("change", event => handleAllOption(event.currentTarget));

    [els.yearFilter, els.monthFilter, els.categoryFilter, els.countryFilter].forEach(select => {
      select.addEventListener("change", () => {
        collapseCoverSection();
        refreshDayFilterOptions();
        applyAndRender(true);
      });
    });
    els.dayFilter.addEventListener("change", () => {
      collapseCoverSection();
      applyAndRender(true);
    });

    els.resetButton.addEventListener("click", () => {
      collapseCoverSection();
      resetFilters();
      applyAndRender(true);
    });


    document.querySelectorAll("[data-date-sort]").forEach(button => {
      button.addEventListener("click", () => {
        dateSortMode = button.dataset.dateSort || "desc";
        dateVisibleDateCount = getDateInitialVisibleCount(dateSortMode);
        document.querySelectorAll("[data-date-sort]").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        renderDateSection();
      });
    });

    document.querySelectorAll("[data-recommend-mode]").forEach(button => {
      button.addEventListener("click", () => {
        recommendMode = button.dataset.recommendMode;
        recommendVisibleCount = RECOMMEND_LIMITS[recommendMode] || 10;
        if (recommendMode === "random") randomPoolIds = makeRandomUniqueLinkedPoolIds(filteredSongs);

        document.querySelectorAll("[data-recommend-mode]").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        renderRecommendSection();
      });
    });

    els.recommendMoreButton.addEventListener("click", () => {
      if (recommendMode === "random") {
        randomPoolIds = makeRandomUniqueLinkedPoolIds(filteredSongs);
      } else {
        recommendVisibleCount += RECOMMEND_MORE_STEP;
      }
      renderRecommendSection();
    });

    els.dateMoreButton.addEventListener("click", () => {
      dateVisibleDateCount += getDateMoreStep(dateSortMode);
      renderDateSection();
    });

    document.querySelectorAll("[data-sung-mode]").forEach(button => {
      button.addEventListener("click", () => {
        sungMode = button.dataset.sungMode || "song";
        document.querySelectorAll("[data-sung-mode]").forEach(btn => btn.classList.remove("active"));
        button.classList.add("active");
        renderSungSection();
      });
    });

    if (els.sungDetails) {
      els.sungDetails.addEventListener("toggle", () => {
        if (els.sungDetails.open) {
          if (els.filterDetails) els.filterDetails.open = false;
          if (els.recommendDetails) els.recommendDetails.open = false;
          if (els.dateDetails) els.dateDetails.open = false;

          window.setTimeout(() => {
            els.sungDetails.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }, 80);
        }
      });
    }

    if (els.coverDetails) {
      els.coverDetails.addEventListener("toggle", () => {
        if (els.coverDetails.open) renderCoverSection();
      });
    }

    if (els.coverCarousel) {
      els.coverCarousel.addEventListener("mouseenter", () => { coverHover = true; });
      els.coverCarousel.addEventListener("mouseleave", () => { coverHover = false; });
      els.coverCarousel.addEventListener("touchstart", () => { coverHover = true; }, { passive: true });
      els.coverCarousel.addEventListener("touchend", () => {
        window.setTimeout(() => { coverHover = false; }, 1200);
      }, { passive: true });
    }

    if (els.coverPrevButton) {
      els.coverPrevButton.addEventListener("click", () => moveCoverCarousel(-1));
    }

    if (els.coverNextButton) {
      els.coverNextButton.addEventListener("click", () => moveCoverCarousel(1));
    }

    els.youtubeModal.addEventListener("click", event => {
      if (event.target === els.youtubeModal) closeYoutubeModal();
    });

    els.youtubeModalClose.addEventListener("click", closeYoutubeModal);

    if (els.likeDisabledModal) {
      els.likeDisabledModal.addEventListener("click", event => {
        if (event.target === els.likeDisabledModal) closeLikeDisabledModal();
      });
    }
    if (els.likeDisabledModalClose) {
      els.likeDisabledModalClose.addEventListener("click", closeLikeDisabledModal);
    }

    document.addEventListener("keydown", event => {
      const key = event.key;

      if (key === "Escape") {
        if (!els.youtubeModal.hidden) closeYoutubeModal();
        resetFilters();
        if (els.filterDetails) els.filterDetails.open = false;
        applyAndRender(true);
        return;
      }

      if (key && key.toLowerCase() === "f" && !isEditableTarget(event.target) && els.youtubeModal.hidden) {
        event.preventDefault();
        collapseCoverSection();
        if (els.filterDetails) els.filterDetails.open = true;
        window.setTimeout(() => {
          els.searchInput.focus();
          els.searchInput.select();
        }, 30);
      }
    });
  }


  async function loadSearchAliases(forceNetwork = false, settingsRows = null) {
    const fallback = window.SEARCH_ALIASES || {};

    if (!SEARCH_ALIASES_CSV_URL) {
      searchAliases = normalizeSearchAliasesObject(fallback);
      return;
    }

    try {
      const rows = settingsRows || currentSettingsRows || await loadSettingsRows();
      const version = getSettingValue(rows, SETTINGS_VERSION_SEARCH_ALIASES);
      const aliasRows = await loadVersionedCsvRows({
        cacheName: "search_aliases",
        url: SEARCH_ALIASES_CSV_URL,
        version,
        forceNetwork
      });

      searchAliases = normalizeSearchAliasesRows(aliasRows);
    } catch (err) {
      console.warn("[search_aliases 로딩 실패]", err);
      const cached = readVersionedCsvCache("search_aliases");
      searchAliases = cached ? normalizeSearchAliasesRows(cached.rows || []) : normalizeSearchAliasesObject(fallback);
    }
  }

  function normalizeSearchAliasesRows(rows) {
    const result = {};

    rows.forEach(row => {
      const word = String(row.word || "").trim();
      if (!word) return;

      const aliases = parseAliasesCell(row.aliases);
      result[word] = aliases;
    });

    return result;
  }

  function normalizeSearchAliasesObject(obj) {
    const result = {};

    Object.entries(obj || {}).forEach(([word, aliases]) => {
      const key = String(word || "").trim();
      if (!key) return;
      result[key] = Array.isArray(aliases)
        ? aliases.map(v => String(v || "").trim()).filter(Boolean)
        : parseAliasesCell(aliases);
    });

    return result;
  }

  function parseAliasesCell(value) {
    const text = String(value || "").trim();
    if (!text) return [];

    const parsed = parseCsvRows(text);
    const firstRow = parsed && parsed[0] ? parsed[0] : [];

    if (firstRow.length > 1) {
      return firstRow.map(cleanAliasValue).filter(Boolean);
    }

    return text
      .split(",")
      .map(cleanAliasValue)
      .filter(Boolean);
  }

  function cleanAliasValue(value) {
    return String(value || "")
      .trim()
      .replace(/^"+|"+$/g, "")
      .replace(/""/g, '"')
      .trim();
  }

  async function loadSettingsRows() {
    if (!SETTINGS_CSV_URL) return [];

    try {
      const text = await fetchText(SETTINGS_CSV_URL, true);
      return parseCsv(text);
    } catch (err) {
      console.warn("[settings 로딩 실패]", err);
      return [];
    }
  }

  function getSettingValue(rows, keyName) {
    const target = String(keyName || "").trim();
    const row = (rows || []).find(item => String(item.key || "").trim() === target);
    return row ? String(row.value || "").trim() : "";
  }

  async function loadVersionedCsvRows({ cacheName, url, version, forceNetwork = false }) {
    const normalizedVersion = String(version || "").trim();
    const cached = readVersionedCsvCache(cacheName);

    if (!forceNetwork && normalizedVersion && cached && cached.version && compareVersionText(cached.version, normalizedVersion) >= 0) {
      return cached.rows || [];
    }

    const text = await fetchText(url, true);
    const rows = parseCsv(text);
    writeVersionedCsvCache(cacheName, rows, normalizedVersion || String(Date.now()));
    return rows;
  }

  function readVersionedCsvCache(cacheName) {
    try {
      const raw = localStorage.getItem(CSV_CACHE_PREFIX + cacheName);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeVersionedCsvCache(cacheName, rows, version) {
    try {
      localStorage.setItem(CSV_CACHE_PREFIX + cacheName, JSON.stringify({
        version: String(version || ""),
        saved_at: Date.now(),
        rows
      }));
    } catch {
      //
    }
  }

  function compareVersionText(a, b) {
    const aa = String(a || "").trim();
    const bb = String(b || "").trim();
    if (aa === bb) return 0;
    return aa > bb ? 1 : -1;
  }

  async function loadData(forceNetwork = false, settingsRows = null) {
    showPageLoading("...LOADING...", forceNetwork ? "노래들을 새로 불러오고 있어요!" : "노래들을 불러오고 있어요!");
    setStatus("데이터 로딩 중...");

    try {
      if (!forceNetwork) {
        const cached = readLocalJsonCache();
        if (cached) {
          allSongs = normalizeSongs(cached.data || cached);
          currentNoticeItems = normalizeNoticeItems(cached.notices || cached.notice || DEFAULT_NOTICE_TEXT);
          currentFooterText = normalizeFooterText(cached.footerText || cached.footer || FOOTER_TEXT);
          applyPageTitleValues(cached.title || cached.pageTitle || "", cached.h1 || cached.pageH1 || "", cached.h1Visible);
          coverItems = normalizeCoverItems(cached.covers || []);
          likePostEnabled = normalizeLikePostEnabled(cached.settings || null, true);
          renderNotice(currentNoticeItems);
          renderFooter();
          renderCoverSection();
          buildFilters(allSongs);
          applyAndRender(true);
          setStatus(`${formatStatusDate(new Date(cached.saved_at || Date.now()))} · ${allSongs.length}개`);
        }
      }

      const payload = await fetchSongsPayload(forceNetwork, settingsRows);
      allSongs = normalizeSongs(payload.data || payload || []);
      currentNoticeItems = normalizeNoticeItems(payload.notices || payload.notice || DEFAULT_NOTICE_TEXT);
      currentFooterText = normalizeFooterText(payload.footerText || payload.footer || FOOTER_TEXT);
      applyPageTitleValues(payload.title || payload.pageTitle || "", payload.h1 || payload.pageH1 || "", payload.h1Visible);
      coverItems = normalizeCoverItems(payload.covers || []);
      likePostEnabled = normalizeLikePostEnabled(payload.settings || null, true);
      renderNotice(currentNoticeItems);
      renderFooter();
      renderCoverSection();
      writeLocalJsonCache({ 
        data: allSongs,
        notices: currentNoticeItems,
        footerText: currentFooterText,
        title: document.title,
        h1: els.pageTitle ? els.pageTitle.textContent : "",
        h1Visible: els.pageTitle ? els.pageTitle.style.display !== "none" : true,
        covers: coverItems,
        settings: { like_post_enabled: likePostEnabled },
        saved_at: Date.now()
      });

      buildFilters(allSongs);
      applyAndRender(true);
      setStatus(`${formatStatusDate(new Date())} · ${allSongs.length}개`);
    } catch (err) {
      console.error("[데이터 로딩 실패]", err);
      const cached = readLocalJsonCache();
      if (cached) {
        allSongs = normalizeSongs(cached.data || cached);
        currentNoticeItems = normalizeNoticeItems(cached.notices || cached.notice || DEFAULT_NOTICE_TEXT);
        currentFooterText = normalizeFooterText(cached.footerText || cached.footer || FOOTER_TEXT);
        applyPageTitleValues(cached.title || cached.pageTitle || "", cached.h1 || cached.pageH1 || "", cached.h1Visible);
        coverItems = normalizeCoverItems(cached.covers || []);
        likePostEnabled = normalizeLikePostEnabled(cached.settings || null, true);
        renderNotice(currentNoticeItems);
        renderFooter();
        renderCoverSection();
        buildFilters(allSongs);
        applyAndRender(true);
        setStatus(`${formatStatusDate(new Date(cached.saved_at || Date.now()))} · ${allSongs.length}개 · 캐시 사용`);
      } else {
        allSongs = [];
        filteredSongs = [];
        buildFilters(allSongs);
        setStatus("데이터 로딩 실패");
        els.resultCount.textContent = "0";
        els.recommendList.innerHTML = `<div class="empty error-box"><strong>데이터를 읽지 못했습니다.</strong><br>네트워크 상태를 확인하세요.</div>`;
        els.dateList.innerHTML = `<div class="empty error-box">일시적인 오류일 수 있습니다. 새로고침 후에도 반복되면 제보해주세요.</div>`;
        if (els.sungList) els.sungList.innerHTML = `<div class="empty error-box">데이터를 읽지 못해 표시할 수 없습니다.</div>`;
      }
    } finally {
      hidePageLoading();
    }
  }

  async function fetchSongsPayload(forceNetwork, settingsRows = null) {
    if (SONGS_CSV_URL && LIKES_SMR_CSV_URL) {
      const effectiveSettingsRows = settingsRows || currentSettingsRows || await loadSettingsRows();
      currentSettingsRows = effectiveSettingsRows;

      const songsVersion = getSettingValue(effectiveSettingsRows, SETTINGS_VERSION_SONGS);

      const tasks = [
        loadVersionedCsvRows({
          cacheName: "songs",
          url: SONGS_CSV_URL,
          version: songsVersion,
          forceNetwork
        }),
        fetchText(LIKES_SMR_CSV_URL, forceNetwork).then(parseCsv)
      ];

      if (NOTICE_CSV_URL) {
        tasks.push(fetchText(NOTICE_CSV_URL, forceNetwork).then(parseCsv).catch(err => {
          console.warn("[notice CSV 로딩 실패]", err);
          return [];
        }));
      } else {
        tasks.push(Promise.resolve([]));
      }

      const [songsRows, likesRows, noticeRows = []] = await Promise.all(tasks);
      const notices = extractNoticeItemsFromRows(noticeRows);
      const covers = extractCoverItemsFromRows(noticeRows);
      const footerText = extractFooterTextFromRows(noticeRows);
      const pageMeta = extractPageMetaFromRows(noticeRows);
      const settings = extractSettingsFromRows(effectiveSettingsRows);

      return {
        data: mergeSongsAndLikes(songsRows, likesRows),
        notices,
        covers,
        footerText,
        title: pageMeta.title,
        h1: pageMeta.h1,
        h1Visible: pageMeta.h1Visible,
        settings
      };
    }

    const res = await fetch(DATA_URL, { cache: forceNetwork ? "reload" : "no-cache" });
    if (!res.ok) throw new Error(`data.json 응답 오류: ${res.status}`);

    const json = await res.json();
    const data = Array.isArray(json) ? json : json.data;
    if (!Array.isArray(data)) throw new Error("data.json 형식 오류: 배열이 아닙니다.");
    return {
      data,
      notices: Array.isArray(json) ? [] : (json.notices || json.notice || ""),
      covers: Array.isArray(json) ? [] : (json.covers || []),
      footerText: Array.isArray(json) ? "" : (json.footerText || json.footer || ""),
      title: Array.isArray(json) ? "" : (json.title || json.pageTitle || ""),
      h1: Array.isArray(json) ? "" : (json.h1 || json.pageH1 || ""),
      h1Visible: Array.isArray(json) ? true : (json.h1Visible !== false),
      settings: Array.isArray(json) ? null : (json.settings || null)
    };
  }

  async function fetchText(url, forceNetwork) {
    const res = await fetch(url, { cache: forceNetwork ? "reload" : "no-cache" });
    if (!res.ok) throw new Error(`CSV 응답 오류: ${res.status}`);
    return await res.text();
  }

  function mergeSongsAndLikes(songsRows, likesRows) {
    const likesMap = new Map();
    likesRows.forEach(row => {
      const id = String(row.id || "").trim();
      if (id) likesMap.set(id, row);
    });

    return songsRows
      .filter(row => String(row.id || "").trim())
      .map(row => {
        const like = likesMap.get(String(row.id).trim()) || {};
        return {
          id: row.id,
          year: row.year,
          month: row.month,
          day: row.day,
          day_p: row.day_p,
          artist: row.artist,
          title: row.title,
          category: row.category,
          country: row.country,
          timeline: row.timeline,
          link: row.link,
          sub1: row.sub1,
          sub2: row.sub2,
          sub3: row.sub3,
          likes_total: like.likes_total,
          updated_at: like.updated_at,
          likes_last_1d: like.likes_last_1d,
          likes_last_7d: like.likes_last_7d,
          likes_last_30d: like.likes_last_30d
        };
      });
  }


  function extractCsvCell(text, rowIndex, colIndex) {
    const rows = parseCsvRows(text);
    return String((rows[rowIndex] && rows[rowIndex][colIndex]) || "").trim();
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < String(text || "").length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (quoted) {
        if (char === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
        continue;
      }

      if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        row.push(cell);
        cell = "";
      } else if (char === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (char !== '\r') {
        cell += char;
      }
    }

    if (cell !== "" || row.length) {
      row.push(cell);
      rows.push(row);
    }

    return rows;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (quoted) {
        if (char === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
        continue;
      }

      if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        row.push(cell);
        cell = "";
      } else if (char === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (char !== '\r') {
        cell += char;
      }
    }

    if (cell !== "" || row.length) {
      row.push(cell);
      rows.push(row);
    }

    if (!rows.length) return [];
    const headers = rows[0].map(v => String(v || "").trim().replace(/^\uFEFF/, ""));
    return rows.slice(1).map(values => {
      const obj = {};
      headers.forEach((key, index) => {
        if (key) obj[key] = String(values[index] || "").trim();
      });
      return obj;
    });
  }

  function normalizeSongs(songs) {
    return songs
      .filter(item => item && item.id)
      .map(item => {
        const id = String(item.id || "").trim();

        return {
          id,
          year: toNumber(item.year),
          month: toNumber(item.month),
          day: toNumber(item.day),
          day_p: String(item.day_p || ""),
          artist: String(item.artist || ""),
          title: String(item.title || ""),
          category: String(item.category || ""),
          country: String(item.country || ""),
          artistValues: splitMultiValue(item.artist),
          titleValues: splitMultiValue(item.title),
          categoryValues: splitMultiValue(item.category),
          countryValues: splitMultiValue(item.country),
          timeline: String(item.timeline || ""),
          link: String(item.link || ""),
          sub1: String(item.sub1 || ""),
          sub2: String(item.sub2 || ""),
          sub3: String(item.sub3 || ""),
          likes_total: toNumber(item.likes_total),
          updated_at: String(item.updated_at || ""),
          likes_last_1d: toNumber(item.likes_last_1d),
          likes_last_7d: toNumber(item.likes_last_7d),
          likes_last_30d: toNumber(item.likes_last_30d),
          _localBoosted: false
        };
      });
  }

  function buildFilters(songs) {
    fillSelectWithAll(els.yearFilter, uniqueSorted(songs.map(s => s.year).filter(Boolean), true));
    fillSelectWithAll(els.monthFilter, uniqueSorted(songs.map(s => s.month).filter(Boolean), false, true));
    fillSelectWithAll(els.countryFilter, uniqueSorted(songs.flatMap(getCountryValues)));
    fillSelectWithAll(els.categoryFilter, uniqueSorted(songs.flatMap(getCategoryValues)));
    refreshDayFilterOptions();
  }

  function applyAndRender(resetVisible) {
    if (resetVisible) {
      recommendVisibleCount = RECOMMEND_LIMITS[recommendMode] || 10;
      dateVisibleDateCount = getDateInitialVisibleCount(dateSortMode);
      if (recommendMode === "random") randomPoolIds = [];
    }

    const keyword = normalizeSearchText(els.searchInput.value);
    const keywordTerms = expandSearchTerms(keyword);
    const searchMode = els.searchMode ? els.searchMode.value : "all";
    const years = getFilterValues(els.yearFilter).map(Number);
    const months = getFilterValues(els.monthFilter).map(Number);
    const days = getFilterValues(els.dayFilter).map(Number);
    const categories = getFilterValues(els.categoryFilter);
    const countries = getFilterValues(els.countryFilter);

    filteredSongs = allSongs.filter(song => {
      if (years.length && !years.includes(song.year)) return false;
      if (months.length && !months.includes(song.month)) return false;
      if (days.length && !days.includes(song.day)) return false;
      if (categories.length && !hasAnyMultiValue(getCategoryValues(song), categories)) return false;
      if (countries.length && !hasAnyMultiValue(getCountryValues(song), countries)) return false;

      if (keywordTerms.length) {
        const haystack = getSearchHaystack(song, searchMode);
        if (!keywordTerms.some(term => haystack.includes(term))) return false;
      }

      return true;
    });

    els.resultCount.textContent = String(filteredSongs.length);
    renderRecommendSection();
    renderDateSection();
    renderSungSection();
  }

  function renderRecommendSection() {
    const items = getRecommendItems();
    els.recommendDescription.textContent = getRecommendDescription(items.length);

    if (!items.length) {
      els.recommendList.innerHTML = `<div class="empty">추천순에 표시할 항목이 없습니다.</div>`;
      els.recommendMoreButton.hidden = true;
      return;
    }

    els.recommendList.innerHTML = items.map(renderSongCard).join("");
    bindLikeButtons(els.recommendList);
    bindYoutubeButtons(els.recommendList);
    bindFilterButtons(els.recommendList);

    if (recommendMode === "random") {
      els.recommendMoreButton.hidden = getRandomUniqueLinkedCandidates(filteredSongs).length <= getRandomRecommendLimit();
      els.recommendMoreButton.textContent = "다시 추천";
    } else if (recommendMode === "my_liked") {
      const totalMyLiked = getMyLikedRecommendItems(filteredSongs).length;
      els.recommendMoreButton.hidden = recommendVisibleCount >= totalMyLiked;
      els.recommendMoreButton.textContent = "더 보기";
    } else {
      els.recommendMoreButton.hidden = recommendVisibleCount >= filteredSongs.length;
      els.recommendMoreButton.textContent = "더 보기";
    }
  }

  function getRecommendItems() {
    if (recommendMode === "random") {
      if (!randomPoolIds.length) randomPoolIds = makeRandomUniqueLinkedPoolIds(filteredSongs);

      const songMap = new Map(filteredSongs.map(song => [song.id, song]));
      const items = [];
      const usedKeys = new Set();

      for (const id of randomPoolIds) {
        const song = songMap.get(id);
        if (!isRandomRecommendCandidate(song)) continue;

        const key = normalizeSongArtistKey(song);
        if (!key || usedKeys.has(key)) continue;

        usedKeys.add(key);
        items.push(song);

        if (items.length >= getRandomRecommendLimit()) break;
      }

      return items;
    }

    if (recommendMode === "my_liked") {
      return getMyLikedRecommendItems(filteredSongs).slice(0, recommendVisibleCount);
    }

    return [...filteredSongs]
      .sort((a, b) => compareRecommend(a, b, recommendMode))
      .slice(0, recommendVisibleCount);
  }

  function getMyLikedRecommendItems(songs) {
    return [...songs]
      .filter(song => isLocallyLiked(song.id))
      .sort((a, b) => {
        const byLikes = toNumber(b.likes_total) - toNumber(a.likes_total);
        if (byLikes) return byLikes;
        return compareDateDesc(a, b);
      });
  }

  function getRecommendDescription(count) {
    const labels = {
      random: `무작위 추천 ${count}개를 표시합니다.`,
      likes_last_1d: `최근 1일 추천순 ${count}개를 표시합니다.`,
      likes_last_7d: `최근 7일 추천순 ${count}개를 표시합니다.`,
      likes_last_30d: `최근 30일 추천순 ${count}개를 표시합니다.`,
      likes_total: `전체 추천순 ${count}개를 표시합니다.`,
      my_liked: `내가 추천한 곡들을 전체 추천수순으로 ${count}개 표시합니다.`
    };
    return labels[recommendMode] || "추천순으로 표시합니다.";
  }

  function renderDateSection() {
    const groups = getDateGroupsBySortMode(filteredSongs);
    els.dateDescription.textContent = getDateDescription(groups.length);
    const visibleGroups = groups.slice(0, dateVisibleDateCount);

    if (!visibleGroups.length) {
      els.dateList.innerHTML = `<div class="empty">날짜순에 표시할 항목이 없습니다.</div>`;
      els.dateMoreButton.hidden = true;
      return;
    }

    if (dateSortMode !== "likes_total") {
      let renderedCount = visibleGroups.reduce((sum, group) => sum + group.items.length, 0);

      if (renderedCount < DATE_INITIAL_COUNT && dateVisibleDateCount < groups.length) {
        while (renderedCount < DATE_INITIAL_COUNT && dateVisibleDateCount < groups.length) {
          dateVisibleDateCount += 1;
          const group = groups[dateVisibleDateCount - 1];
          renderedCount += group.items.length;
        }
      }
    }

    const finalGroups = groups.slice(0, dateVisibleDateCount);
    els.dateList.innerHTML = finalGroups.map(group => {
      const key = group.key;
      const collapsed = isGroupCollapsed("date", key, dateSortMode === "likes_total");
      const countText = dateSortMode === "likes_total"
        ? `${group.items.length}개 · 추천 ${group.likesTotal}`
        : `${group.items.length}개`;
      
      return `
        <section class="date-group">
          <button class="date-group-title ${collapsed ? "collapsed" : ""}" type="button" data-date-group-toggle="${escapeHtml(key)}">
            <span>${escapeHtml(group.label)}</span>
            <span class="date-group-count">${escapeHtml(countText)}</span>
          </button>
          <div class="song-list compact ${collapsed ? "collapsed" : ""}" data-date-group-body="${escapeHtml(key)}">${group.items.map(renderSongCard).join("")}</div>
        </section>
      `;
    }).join("");

    bindLikeButtons(els.dateList);
    bindYoutubeButtons(els.dateList);
    bindFilterButtons(els.dateList);
    bindDateGroupToggles(els.dateList, "date");
    els.dateMoreButton.hidden = dateVisibleDateCount >= groups.length;
    els.dateMoreButton.textContent = dateSortMode === "likes_total" ? "더 보기" : "더 보기";
  }
  
  function getDateGroupsBySortMode(songs) {
    const sortedSongs = [...songs].sort(dateSortMode === "asc" ? compareDateAsc : compareDateDesc);
    const groups = groupByDate(sortedSongs);

    if (dateSortMode !== "likes_total") {
      return groups;
    }
    
    groups.forEach(group => {
      group.items.sort(compareDateSongLikesDesc);
    });

    return groups.sort(compareDateGroupLikesDesc);
  }

  function getDateDescription(groupCount) {
    if (dateSortMode === "asc") {
      return "가장 오래된 방송부터 표시합니다.";
    }

    if (dateSortMode === "likes_total") {
      return `가장 추천을 받은 방송부터 표시합니다.`;
    }

    return "가장 최신 방송부터 표시합니다.";
  }
  
  function getDateInitialVisibleCount(mode = dateSortMode) {
    return mode === "likes_total" ? DATE_RECOMMEND_INITIAL_GROUPS : 1;
  }

  function getDateMoreStep(mode = dateSortMode) {
    return mode === "likes_total" ? DATE_RECOMMEND_MORE_STEP : 1;
  }

  function renderSungSection() {
    if (!els.sungList) return;

    const groups = groupBySung(filteredSongs, sungMode);
    els.sungDescription.textContent = sungMode === "artist"
      ? `아티스트 기준 ${groups.length}개 그룹을 표시합니다.`
      : `곡＋아티스트 기준 ${groups.length}개 그룹을 표시합니다.`;

    if (!groups.length) {
      els.sungList.innerHTML = `<div class="empty">부른순에 표시할 항목이 없습니다.</div>`;
      return;
    }

    els.sungList.innerHTML = groups.map(group => {
      const key = group.key;
      const collapsed = isGroupCollapsed("sung", key, true);
      return `
        <section class="date-group sung-group">
          <button class="date-group-title ${collapsed ? "collapsed" : ""}" type="button" data-date-group-toggle="${escapeHtml(key)}">
            <span>${escapeHtml(group.label)}</span>
            <span class="date-group-count">${group.items.length}곡</span>
          </button>
          <div class="song-list compact ${collapsed ? "collapsed" : ""}" data-date-group-body="${escapeHtml(key)}">${group.items.map(renderSongCard).join("")}</div>
        </section>
      `;
    }).join("");

    bindLikeButtons(els.sungList);
    bindYoutubeButtons(els.sungList);
    bindFilterButtons(els.sungList);
    bindDateGroupToggles(els.sungList, "sung");
  }

  function groupBySung(songs, mode) {
    const map = new Map();

    [...songs].sort(compareDateDesc).forEach(song => {
      const titleText = getDisplayTitle(song);
      const artistValues = getArtistValues(song);

      if (mode === "artist") {
        artistValues.forEach(artist => {
          const key = `artist:${normalizeSearchText(artist)}`;
          const label = artist;

          if (!map.has(key)) {
            map.set(key, { key, label, items: [] });
          }

          map.get(key).items.push(song);
        });
        return;
      }

      const artistText = artistValues.join(" ") || getDisplayArtist(song);
      const key = `song:${normalizeSearchText(titleText)}:${normalizeSearchText(artistText)}`;
      const label = `${titleText} - ${artistText}`;

      if (!map.has(key)) {
        map.set(key, { key, label, items: [] });
      }
      map.get(key).items.push(song);
    });

    return [...map.values()].sort((a, b) => {
      return b.items.length - a.items.length || a.label.localeCompare(b.label, "ko");
    });
  }
  
  function splitMultiValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return [];

    const values = raw
      .split(" & ")
      .map(item => item.trim())
      .filter(Boolean);

    return values.length ? [...new Set(values)] : [];
  }

  function getTitleValues(song) {
    const values = splitMultiValue(song.artist);
    return values.length
      ? values
      : [String(song.artist || "").trim()].filter(Boolean);
  }

  function getArtistValues(song) {
    const values = splitMultiValue(song.title);
    return values.length
      ? values
      : [String(song.title || "").trim()].filter(Boolean);
  }

  function getCategoryValues(song) {
    const values = Array.isArray(song.categoryValues) ? song.categoryValues : splitMultiValue(song.category);
    return values.length ? values : [String(song.category || "").trim()].filter(Boolean);
  }

  function getCountryValues(song) {
    const values = Array.isArray(song.countryValues) ? song.countryValues : splitMultiValue(song.country);
    return values.length ? values : [String(song.country || "").trim()].filter(Boolean);
  }

  function hasAnyMultiValue(values, selected) {
    const set = new Set((values || []).map(value => String(value)));
    return selected.some(value => set.has(String(value)));
  }

  function renderMultiValueBadges(values, filterType, extraClass = "", fallback = "") {
    const list = (values && values.length ? values : [fallback]).filter(Boolean);
    const className = ["badge", "badge-button", extraClass].filter(Boolean).join(" ");

    return list.map(value => `
      <button class="${escapeHtml(className)}" type="button" data-filter-type="${escapeHtml(filterType)}" data-filter-value="${escapeHtml(value)}">${escapeHtml(value)}</button>
    `).join("");
  }

  function getDisplayTitle(song) {
    const values = getTitleValues(song);
    return values.length ? values.join(" ") : "곡명 없음";
  }

  function getDisplayArtist(song) {
    const values = getArtistValues(song);
    return values.length ? values.join(" ") : "아티스트 없음";
  }
  
  function formatPopupMultiText(value) {
    return String(value || "").replaceAll(" & ", ", ");
  }

  function bindLikeButtons(root) {
    root.querySelectorAll("[data-like-id]").forEach(button => {
      button.addEventListener("click", () => {
        if (button.dataset.likeDisabled === "maintenance") {
          addLikeClickFeedback(button);
          showLikeDisabledModal();
          return;
        }
        handleLike(button.dataset.likeId, button);
      });
    });
  }

  function bindYoutubeButtons(root) {
    root.querySelectorAll("[data-youtube-url]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        blurSearchInput();
        openYoutubeModal(button.dataset.youtubeUrl || "", {
          title: button.dataset.songTitle || "",
          artist: button.dataset.songArtist || "",
          date: button.dataset.songDate || "",
          timeline: button.dataset.songTimeline || "",
          id: button.dataset.songId || ""
        });
      });
    });
  }

  function bindFilterButtons(root) {
    root.querySelectorAll("[data-filter-type]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        applyFilterFromButton(button);
      });
    });
  }

  function bindDateGroupToggles(root, namespace) {
    root.querySelectorAll("[data-date-group-toggle]").forEach(button => {
      button.addEventListener("click", () => {
        const key = button.dataset.dateGroupToggle || "";
        const body = root.querySelector(`[data-date-group-body="${cssEscape(key)}"]`);
        if (!body) return;
        const collapsed = body.classList.toggle("collapsed");
        button.classList.toggle("collapsed", collapsed);
        setGroupCollapsed(namespace, key, collapsed);
      });
    });
  }

  function applyFilterFromButton(button) {
    const type = button.dataset.filterType || "";
    const value = button.dataset.filterValue || "";

    const fromSungSection = Boolean(button.closest("#sungDetails"));
    collapseCoverSection();
    if (els.filterDetails) els.filterDetails.open = true;

    if (type === "search" || type === "artist") {
      els.searchInput.value = value;
      if (els.searchMode) els.searchMode.value = type === "artist" ? "artist" : "title";
    } else if (type === "category") {
      setSingleSelectValue(els.categoryFilter, value);
      refreshDayFilterOptions();
    } else if (type === "country") {
      setSingleSelectValue(els.countryFilter, value);
      refreshDayFilterOptions();
    } else if (type === "date") {
      setSingleSelectValue(els.yearFilter, String(button.dataset.filterYear || ""));
      setSingleSelectValue(els.monthFilter, String(Number(button.dataset.filterMonth || 0)));
      refreshDayFilterOptions();
      setSingleSelectValue(els.dayFilter, String(Number(button.dataset.filterDay || 0)));
      els.searchInput.value = button.dataset.filterDate || "";
      if (els.searchMode) els.searchMode.value = "date";
    }

    applyAndRender(true);
    collapseNonDateSections();
    scrollToFilterSection();
  }

  function collapseNonDateSections() {
    if (els.coverDetails) els.coverDetails.open = false;
    if (els.recommendDetails) els.recommendDetails.open = false;
    if (els.sungDetails) els.sungDetails.open = false;
    if (els.dateDetails) els.dateDetails.open = true;
  }

  function scrollToFilterSection() {
    if (!els.filterDetails) return;
    window.requestAnimationFrame(() => {
      els.filterDetails.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function setSingleSelectValue(select, value) {
    const normalizedValue = String(value || "");
    let found = false;

    Array.from(select.options).forEach(option => {
      const matched = option.value === normalizedValue;
      option.selected = matched;
      if (matched) found = true;
    });

    if (!found) selectAllOption(select);
  }

  function renderLikeControls(song, liked = isLocallyLiked(song.id), compact = false) {
    const countsHtml = `
      <div class="like-counts">
        <div>전체 ${song.likes_total}</div>
        <div>1일 ${song.likes_last_1d} · 7일 ${song.likes_last_7d} · 30일 ${song.likes_last_30d}</div>
      </div>
    `;

    let buttonHtml = "";
    if (!song.link) {
      buttonHtml = `<button class="like-button disabled" type="button" disabled title="다시보기가 없는 항목은 좋아요를 누를 수 없습니다">♡ 좋아요</button>`;
    } else if (!likePostEnabled) {
      buttonHtml = `<button class="like-button disabled disabled-front" type="button" data-like-id="${escapeHtml(song.id)}" data-like-disabled="maintenance" title="좋아요 기능이 비활성화 상태입니다">♡ 좋아요</button>`;
    } else {
      buttonHtml = `<button class="like-button ${liked ? "liked" : ""}" type="button" data-like-id="${escapeHtml(song.id)}">${liked ? "♥ 추천됨" : "♡ 좋아요"}</button>`;
    }

    return compact
      ? `<div class="like-panel modal-like-controls">${countsHtml}${buttonHtml}</div>`
      : `${buttonHtml}${countsHtml}`;
  }

  function renderSubLinks(song) {
    const subs = [
      { key: "sub1", label: "①" },
      { key: "sub2", label: "②" },
      { key: "sub3", label: "③" }
    ];

    return subs
      .map(item => {
        const url = String(song[item.key] || "").trim();
        if (!url) return "";
        return `<a class="badge badge-link sub-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="${item.label}">${item.label}</a>`;
      })
      .join("");
  }

  function renderSongCard(song) {
    const liked = isLocallyLiked(song.id);
    const dateText = formatSongDate(song);

    const titleText = String(song.artist || "").trim() || "곡명 없음";
    const artistText = String(song.title || "").trim() || "아티스트 없음";

    const timelineUrl = song.link && song.timeline ? makeTimelineLink(song.link, song.timeline) : "";
    const youtubeUrl = song.link ? makeTimelineLink(song.link, song.timeline) : "";
    const titleCoreHtml = song.link
      ? `<button class="song-title-button" type="button" data-youtube-url="${escapeHtml(youtubeUrl)}" data-song-title="${escapeHtml(titleText)}" data-song-artist="${escapeHtml(artistText)}" data-song-date="${escapeHtml(dateText)}" data-song-timeline="${escapeHtml(song.timeline || "")}" data-song-id="${escapeHtml(song.id)}">${escapeHtml(titleText)}</button>`
      : `<span class="song-title-missing" title="다시보기가 없습니다">${escapeHtml(titleText)}</span>`;

    const titleFilterButton = `<button class="inline-filter-button title-filter desktop-title-filter" type="button" title="이 곡명으로 검색" data-filter-type="search" data-filter-value="${escapeHtml(titleText)}">ⓕ</button>`;
    const mobileTitleFilterButton = `<button class="inline-filter-button title-filter mobile-title-filter" type="button" title="이 곡명으로 검색" data-filter-type="search" data-filter-value="${escapeHtml(titleText)}">ⓕ</button>`;
    const title = `${titleCoreHtml}<button class="inline-filter-button title-filter" type="button" title="이 곡명으로 검색" data-filter-type="search" data-filter-value="${escapeHtml(titleText)}">ⓕ</button>`;
    const titleHtml = `${titleCoreHtml}${titleFilterButton}`;

    const timelineHtml = song.timeline
      ? timelineUrl
        ? `<a class="badge badge-link" href="${escapeHtml(timelineUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(song.timeline)}</a>`
        : `<span class="badge">${escapeHtml(song.timeline)}</span>`
      : "";

    const subLinksHtml = renderSubLinks(song);
    const artistBadgesHtml = renderMultiValueBadges(getArtistValues(song), "artist", "artist", "아티스트 정보 없음");
    const categoryBadgesHtml = renderMultiValueBadges(getCategoryValues(song), "category", "", "미분류");
    const countryBadgesHtml = renderMultiValueBadges(getCountryValues(song), "country", "", "미분류");

    const likeButtonHtml = renderLikeControls(song, liked);

    return `
      <article class="song-card" data-id="${escapeHtml(song.id)}">
        <div>
          <h3 class="song-title">${titleHtml}</h3>
          <div class="meta">
            ${artistBadgesHtml}
            <button class="badge badge-button" type="button" data-filter-type="date" data-filter-year="${escapeHtml(song.year)}" data-filter-month="${escapeHtml(song.month)}" data-filter-day="${escapeHtml(song.day)}" data-filter-date="${escapeHtml(formatPlainDate(song))}">${escapeHtml(dateText)}</button>
            ${categoryBadgesHtml}
            ${countryBadgesHtml}
            ${timelineHtml}
            ${mobileTitleFilterButton}
            ${subLinksHtml}
          </div>
        </div>
        <div class="like-panel">
          ${likeButtonHtml}
        </div>
      </article>
    `;
  }

  async function handleLike(id, button) {
    const song = findSongById(id);
    const label = makeLikeLogLabel(song);

    addLikeClickFeedback(button);

    if (!likePostEnabled) {
      console.log(`[❌] ${label} · like_post_disabled-front`);
      showLikeDisabledModal();
      return;
    }

    if (isLocallyLiked(id)) {
      console.log(`[❌] ${label} · duplicate-local`);
      showCooldownText("이미 추천한 항목입니다.");
      return;
    }

    const remain = getLikeCooldownRemainingMs();
    if (remain > 0) {
      const remainSec = Math.ceil(remain / 1000);
      console.log(`[❌] ${label} · cooldown-local ${remainSec}s`);
      showCooldownText(`${remainSec}초 후 다시 누를 수 있습니다.`);
      showLikeNoticeModal("[알림]", `${remainSec}초 후 가능합니다`);
      return;
    }

    if (!API_URL || API_URL.includes("PASTE_APPS_SCRIPT")) {
      console.log(`[❌] ${label} · API_URL 미설정`);
      showCooldownText("config.js에 Apps Script API_URL을 입력해야 합니다.");
      return;
    }

    const waitingTimer = startLikeWaitingFeedback(button);
    showCooldownText("추천 요청 전달중...");

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({
          action: "like",
          id,
          user_key: getUserKey()
        })
      });

      let json = null;
      try {
        json = await res.json();
      } catch (parseErr) {
        throw new Error(`POST 응답 JSON 파싱 실패: ${parseErr.message || parseErr}`);
      }

      if (!res.ok) {
        console.log(`[❌] ${label} · HTTP ${res.status}`);
        showCooldownText(`추천 실패: HTTP ${res.status}`);
        return;
      }

      if (json.ok) {
        console.log(`[⭕] ${label}`);
        markLocalLiked(id);
        setLikeCooldown();
        boostSongLocally(id);
        applyAndRender(false);
        updateModalLikePanel(id);
        showCooldownText("추천이 반영되었습니다.");
        return;
      }

      console.log(`[❌] ${label} · ${json.reason || "unknown"}`, json);

      if (json.reason === "duplicate") {
        markLocalLiked(id);
        applyAndRender(false);
        updateModalLikePanel(id);
        showCooldownText("이미 추천한 항목입니다.");
        return;
      }

      if (json.reason === "cooldown") {
        const ms = Number(json.cooldown_remaining_ms || json.cooldown_remaining_sec * 1000 || LIKE_COOLDOWN_MS);
        setLikeCooldown(Date.now() + ms);
        showCooldownText(`${Math.ceil(ms / 1000)}초 후 다시 누를 수 있습니다.`);
        return;
      }

      showCooldownText(`추천 실패: ${json.reason || "unknown"}`);
    } catch (err) {
      console.error(`[❌] ${label} · 요청 예외`, err);
      showCooldownText("추천 요청 실패");
    } finally {
      stopLikeWaitingFeedback(button, waitingTimer);
    }
  }

  function startLikeWaitingFeedback(button) {
    if (!button) return null;

    const originalText = button.textContent || "♡ 좋아요";
    let heartOn = false;

    button.dataset.originalText = originalText;
    button.classList.add("liking");
    button.disabled = true;
    button.textContent = "♡ 전달중";

    const timer = window.setInterval(() => {
      heartOn = !heartOn;
      button.textContent = heartOn ? "♥ 전달중" : "♡ 전달중";
    }, 420);

    return timer;
  }

  function stopLikeWaitingFeedback(button, timer) {
    if (timer) {
      window.clearInterval(timer);
    }

    if (!button) return;

    button.classList.remove("liking");

    if (button.dataset.likeDisabled !== "maintenance") {
      button.disabled = false;
    }

    const originalText = button.dataset.originalText || "♡ 좋아요";
    button.textContent = originalText;
    delete button.dataset.originalText;
  }

  function addLikeClickFeedback(button) {
    if (!button) return;
    button.classList.remove("like-pop");
    void button.offsetWidth;
    button.classList.add("like-pop");
    window.setTimeout(() => button.classList.remove("like-pop"), 420);
  }

  function findSongById(id) {
    return allSongs.find(song => song.id === id) || filteredSongs.find(song => song.id === id) || null;
  }

  function makeLikeLogLabel(song) {
    if (!song) return "알 수 없는 곡 - 알 수 없는 아티스트 (날짜 없음／시간 없음)";
    const titleText = getDisplayTitle(song);
    const artistText = getDisplayArtist(song);
    const dateText = formatSongDate(song) || "날짜 없음";
    const timeText = song.timeline || "시간 없음";
    return `${titleText} - ${artistText} (${dateText}／${timeText})`;
  }

  function boostSongLocally(id) {
    for (const song of allSongs) {
      if (song.id === id && !song._localBoosted) {
        song.likes_total += 1;
        song.likes_last_1d += 1;
        song.likes_last_7d += 1;
        song.likes_last_30d += 1;
        song._localBoosted = true;
      }
    }
    writeLocalJsonCache({ data: allSongs, saved_at: Date.now() });
  }

  function compareRecommend(a, b, key) {
    return toNumber(b[key]) - toNumber(a[key]) || b.likes_total - a.likes_total || compareDateDesc(a, b);
  }

  function compareDateDesc(a, b) {
    return dateValue(b) - dateValue(a) || String(b.id).localeCompare(String(a.id));
  }

  function compareDateAsc(a, b) {
    return dateValue(a) - dateValue(b) || String(a.id).localeCompare(String(b.id));
  }
  
  function compareDateGroupLikesDesc(a, b) {
    return b.likesTotal - a.likesTotal || b.dateValue - a.dateValue || String(b.key).localeCompare(String(a.key));
  }
  
  function compareDateSongLikesDesc(a, b) {
    const byLikes = toNumber(b.likes_total) - toNumber(a.likes_total);
    if (byLikes) return byLikes;
    return compareDateDesc(a, b);
  }

  function dateValue(item) {
    return Number(`${item.year || 0}${pad2(item.month) || "00"}${pad2(item.day) || "00"}`);
  }

  function groupByDate(songs) {
    const map = new Map();
    songs.forEach(song => {
      const dayPart = String(song.day_p || "").trim() || "1";
      const key = `${song.year}-${pad2(song.month)}-${pad2(song.day)}-${dayPart}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: formatSongDate(song),
          dateValue: dateValue(song),
          likesTotal: 0,
          items: []
        });
      }
      const group = map.get(key);
      group.items.push(song);
      group.likesTotal += toNumber(song.likes_total);
    });
    return [...map.values()];
  }

  function formatSongDate(song) {
    const dateText = [song.year, pad2(song.month), pad2(song.day)].filter(Boolean).join(".");
    const dayPart = String(song.day_p || "").trim();

    if (!dayPart || dayPart === "1") {
      return dateText;
    }

    return `${dateText} (${escapeTextOnly_(dayPart)}번째 방송)`;
  }

  function formatPlainDate(song) {
    return [song.year, pad2(song.month), pad2(song.day)].filter(Boolean).join(".");
  }

  function formatStatusDate(date) {
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${yy}/${mm}/${dd} ${hh}:${mi}:${ss}`;
  }
  
  function getRandomRecommendLimit() {
    return isMobileViewport() ? 3 : RECOMMEND_LIMITS.random;
  }

  function isMobileViewport() {
    return window.matchMedia && window.matchMedia("(max-width: 560px)").matches;
  }

  function makeRandomPoolIds(songs) {
    return [...songs]
      .sort(() => Math.random() - 0.5)
      .map(song => song.id);
  }

  function hasPlayableLink(song) {
    return isRandomRecommendCandidate(song);
  }

  function isRandomRecommendCandidate(song) {
    if (!song) return false;

    const link = String(song.link || "").trim();
    const timeline = String(song.timeline || "").trim();

    return link.includes("https://youtu.be/") && timeline !== "";
  }

  function makeRandomUniqueLinkedPoolIds(songs) {
    return getRandomUniqueLinkedCandidates(songs).map(song => song.id);
  }

  function getRandomUniqueLinkedCandidates(songs) {
    const used = new Set();
    const result = [];
    const candidates = shuffleArray([...songs].filter(isRandomRecommendCandidate));

    for (const song of candidates) {
      const key = normalizeSongArtistKey(song);
      if (!key || used.has(key)) continue;

      used.add(key);
      result.push(song);
    }

    return result;
  }

  function normalizeSongArtistKey(song) {
    return normalizeSearchText([getDisplayTitle(song), getDisplayArtist(song)].join("||"));
  }

  function makeTimelineLink(link, timeline) {
    const base = String(link || "").trim();
    if (!base) return "#";

    if (hasYoutubeTimeParam(base)) return base;

    const sec = timelineToSeconds(timeline);
    if (!sec) return base;

    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}t=${sec}`;
  }

  function hasYoutubeTimeParam(link) {
    return /[?&]t=/i.test(String(link || "")) || /[?&]start=/i.test(String(link || ""));
  }

  function timelineToSeconds(value) {
    const text = String(value || "").trim();
    if (!text) return 0;

    const parts = text.split(":").map(v => Number(v));
    if (parts.some(v => !Number.isFinite(v))) return 0;

    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }


  function updateModalLikePanel(id = currentModalSongId) {
    if (!els.modalLikePanel) return;
    const song = findSongById(id);
    if (!song) {
      els.modalLikePanel.innerHTML = "";
      return;
    }
    els.modalLikePanel.innerHTML = renderLikeControls(song, isLocallyLiked(song.id), true);
    bindLikeButtons(els.modalLikePanel);
  }

  function openYoutubeModal(url, meta = {}) {
    const embedUrl = makeYoutubeEmbedUrl(url);

    if (!embedUrl) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    currentModalSongId = meta.id || "";
    els.modalSongTitle.textContent = meta.title || "";
    els.modalSongArtist.textContent = meta.artist || "";
    els.modalSongFooter.textContent = [meta.date || "", meta.timeline || ""].filter(Boolean).join(" ／ ");
    updateModalLikePanel(currentModalSongId);

    showYoutubeLoading();
    els.youtubeFrameWrap.innerHTML = `
      <iframe
        src="${escapeHtml(embedUrl)}"
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen></iframe>
    `;

    const iframe = els.youtubeFrameWrap.querySelector("iframe");
    if (iframe) {
      iframe.addEventListener("load", () => {
        hideYoutubeLoading();
      }, { once: true });
    }

    els.youtubeModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeYoutubeModal() {
    els.youtubeModal.hidden = true;
    els.youtubeFrameWrap.innerHTML = "";
    hideYoutubeLoading();
    els.modalSongTitle.textContent = "";
    els.modalSongArtist.textContent = "";
    els.modalSongFooter.textContent = "";
    currentModalSongId = "";
    if (els.modalLikePanel) els.modalLikePanel.innerHTML = "";
    document.body.classList.remove("modal-open");
  }

  function makeYoutubeEmbedUrl(url) {
    const raw = normalizeYoutubeUrlForParse(String(url || "").trim());
    if (!raw) return "";

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return "";
    }

    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      const firstPath = parsed.pathname.split("/").filter(Boolean)[0] || "";
      videoId = firstPath.split(/[?&]/)[0] || "";
    } else if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") || "";
      } else if (parsed.pathname.startsWith("/shorts/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
      } else if (parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
      }
    }

    videoId = videoId.split(/[?&]/)[0];
    if (!videoId) return "";

    const start = getYoutubeStartSecondsFromUrl(raw, parsed);
    const params = new URLSearchParams();
    params.set("autoplay", "1");
    params.set("playsinline", "1");
    params.set("rel", "0");
    params.set("vq", "hd1080");
    params.set("hd", "1");
    if (start > 0) params.set("start", String(start));

    return `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;
  }

  function extractYoutubeVideoId(url) {
    const raw = normalizeYoutubeUrlForParse(String(url || "").trim());
    if (!raw) return "";

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return "";
    }

    const host = parsed.hostname.replace(/^www\./, "");
    let videoId = "";

    if (host === "youtu.be") {
      videoId = parsed.pathname.split("/").filter(Boolean)[0] || "";
    } else if (host.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") {
        videoId = parsed.searchParams.get("v") || "";
      } else if (parsed.pathname.startsWith("/shorts/") || parsed.pathname.startsWith("/embed/")) {
        videoId = parsed.pathname.split("/").filter(Boolean)[1] || "";
      }
    }

    return String(videoId || "").split(/[?&]/)[0];
  }

  function normalizeYoutubeUrlForParse(raw) {
    if (!raw) return "";
    if (/^https?:\/\/([^/]+\.)?youtu\.be\/[^?]+&/i.test(raw)) {
      return raw.replace(/&/, "?");
    }
    return raw;
  }

  function getYoutubeStartSecondsFromUrl(raw, parsed) {
    const direct = parsed.searchParams.get("t") || parsed.searchParams.get("start");
    if (direct) return parseYoutubeStartSeconds(direct);

    const rawMatch = String(raw || "").match(/[?&](?:t|start)=([^&#]+)/i);
    if (rawMatch) return parseYoutubeStartSeconds(decodeURIComponent(rawMatch[1]));

    return 0;
  }

  function parseYoutubeStartSeconds(value) {
    const text = String(value || "").trim().toLowerCase();
    if (!text) return 0;

    if (/^\d+$/.test(text)) return Number(text);
    if (/^\d+s$/.test(text)) return Number(text.replace("s", ""));

    const h = Number((text.match(/(\d+)h/) || [])[1] || 0);
    const m = Number((text.match(/(\d+)m/) || [])[1] || 0);
    const s = Number((text.match(/(\d+)s/) || [])[1] || 0);
    return h * 3600 + m * 60 + s;
  }



  function getSearchHaystack(song, mode) {
    const titleValues = [getDisplayTitle(song), ...getTitleValues(song)];
    const artistValues = [getDisplayArtist(song), ...getArtistValues(song)];
    const categoryValues = getCategoryValues(song);
    const countryValues = getCountryValues(song);

    if (mode === "title") {
      return normalizeSearchText(titleValues.join(" "));
    }

    if (mode === "artist") {
      return normalizeSearchText(artistValues.join(" "));
    }

    if (mode === "date") {
      return normalizeSearchText([formatPlainDate(song), formatSongDate(song), `${song.year}-${song.month}-${song.day}`].join(" "));
    }

    return normalizeSearchText([
      ...titleValues,
      ...artistValues,
      ...categoryValues,
      ...countryValues,
      song.id,
      song.day_p,
      song.timeline,
      formatPlainDate(song),
      formatSongDate(song),
      `${song.year}-${song.month}-${song.day}`
    ].join(" "));
  }

  function refreshDayFilterOptions() {
    if (!els.dayFilter) return;

    const selectedDays = new Set(getSelectedValuesRaw(els.dayFilter));
    const years = getFilterValues(els.yearFilter).map(Number);
    const months = getFilterValues(els.monthFilter).map(Number);
    const categories = getFilterValues(els.categoryFilter);
    const countries = getFilterValues(els.countryFilter);

    const days = allSongs
      .filter(song => {
        if (years.length && !years.includes(song.year)) return false;
        if (months.length && !months.includes(song.month)) return false;
        if (categories.length && !hasAnyMultiValue(getCategoryValues(song), categories)) return false;
        if (countries.length && !hasAnyMultiValue(getCountryValues(song), countries)) return false;
        return Boolean(song.day);
      })
      .map(song => song.day);

    fillSelectWithAll(els.dayFilter, uniqueSorted(days, false, true));

    if (selectedDays.size && !selectedDays.has("__ALL__")) {
      let restored = false;
      Array.from(els.dayFilter.options).forEach(option => {
        const matched = selectedDays.has(option.value);
        option.selected = matched;
        if (matched) restored = true;
      });
      if (!restored) selectAllOption(els.dayFilter);
    }
  }

  function groupCollapseKey(namespace, key) {
    return `${namespace}:${key}`;
  }

  function isGroupCollapsed(namespace, key, defaultCollapsed = false) {
    const storageKey = groupCollapseKey(namespace, key);
    if (collapsedGroups.has(storageKey)) return true;
    if (collapsedGroups.has(`open:${storageKey}`)) return false;
    return defaultCollapsed;
  }

  function setGroupCollapsed(namespace, key, collapsed) {
    const storageKey = groupCollapseKey(namespace, key);
    collapsedGroups.delete(storageKey);
    collapsedGroups.delete(`open:${storageKey}`);
    collapsedGroups.add(collapsed ? storageKey : `open:${storageKey}`);
  }

  function renderNotice(input) {
    if (!els.noticeText) return;
    const items = normalizeNoticeItems(input);
    const normalizedItems = items.length ? items : [{ text: DEFAULT_NOTICE_TEXT, link: "" }];
    const lineHtml = normalizedItems.map(formatNoticeItemHtml).join(`<span class="notice-separator">　　／　　</span>`);

    els.noticeText.innerHTML = `
      <span class="notice-track">
        <span class="notice-content">${lineHtml}</span>
        <span class="notice-content" aria-hidden="true">${lineHtml}</span>
        <span class="notice-content" aria-hidden="true">${lineHtml}</span>
      </span>
    `;
  }

  function normalizeNoticeItems(input) {
    if (Array.isArray(input)) {
      return input
        .map(item => {
          if (typeof item === "string") return { text: item.trim(), link: "" };
          return {
            text: String(item && item.text || item && item.value || "").trim(),
            link: String(item && item.link || "").trim()
          };
        })
        .filter(item => item.text);
    }

    const text = String(input || "").trim();
    if (!text) return [];
    return [{ text, link: "" }];
  }

  function extractSettingsFromRows(rows) {
    const settings = {};
    rows.forEach(row => {
      const key = String(row.key || "").trim();
      if (!key) return;
      settings[key] = String(row.value || "").trim();
    });
    return settings;
  }

  function normalizeLikePostEnabled(settings, fallback = true) {
    if (!settings || typeof settings !== "object") return fallback;
    if (!("like_post_enabled" in settings)) return fallback;
    const value = String(settings.like_post_enabled || "").trim().toLowerCase();
    if (["false", "0", "no", "off", "n", "비활성", "중지"].includes(value)) return false;
    if (["true", "1", "yes", "on", "y", "활성"].includes(value)) return true;
    return fallback;
  }
 
  function extractPageMetaFromRows(rows) {
    const titleRow = findNoticeRowByKey(rows, "title");
    const h1Row = findNoticeRowByKey(rows, "h1");
    const h1VisibleRaw = h1Row ? String(h1Row.link || "").trim().toUpperCase() : "";

    return {
      title: titleRow ? String(titleRow.value || "").trim() : "",
      h1: h1Row ? String(h1Row.value || "").trim() : "",
      h1Visible: h1VisibleRaw === "FALSE" ? false : true
    };
  }

  function findNoticeRowByKey(rows, keyName) {
    const targetKey = String(keyName || "").trim().toLowerCase();
    return rows.find(row =>
      String(row.key || "").trim().toLowerCase() === targetKey &&
      String(row.value || "").trim()
    ) || null;
  }

  function applyPageTitleValues(titleValue, h1Value, h1Visible = true) {
    const titleText = String(titleValue || "").trim();
    const h1Text = String(h1Value || "").trim();

    document.title = titleText || DEFAULT_DOCUMENT_TITLE;

    if (els.pageTitle) {
      els.pageTitle.textContent = h1Text || DEFAULT_H1_TEXT;
      els.pageTitle.style.display = h1Visible === false ? "none" : "";
    }
  }

  function extractNoticeItemsFromRows(rows) {
    return rows
      .filter(row => String(row.key || "").trim().toLowerCase() === "notice")
      .map(row => ({
        text: String(row.value || "").trim(),
        link: String(row.link || "").trim()
      }))
      .filter(item => item.text);
  }

  function extractFooterTextFromRows(rows) {
    const found = rows.find(row =>
      String(row.key || "").trim().toLowerCase() === "footer" &&
      String(row.value || "").trim()
    );

    return found ? String(found.value || "").trim() : "";
  }

  function normalizeFooterText(value) {
    const text = String(value || "");
    return text.trim() ? text : FOOTER_TEXT;
  }

  function extractCoverItemsFromRows(rows) {
    return rows
      .filter(row => String(row.key || "").trim().toLowerCase() === "cover")
      .map(row => makeCoverItemFromUrl(String(row.value || "").trim()))
      .filter(Boolean);
  }

  function makeCoverItemFromUrl(url) {
    const normalizedUrl = normalizeYoutubeUrlForParse(url);
    if (!normalizedUrl) return null;
    const videoId = extractYoutubeVideoId(normalizedUrl);
    if (!videoId) return null;

    return {
      id: videoId,
      url: normalizedUrl,
      title: "커버곡을 불러오는 중...",
      thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`,
      fallbackThumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
    };
  }

  function normalizeCoverItems(input) {
    if (!Array.isArray(input)) return [];
    return shuffleArray(input
      .map(item => {
        if (typeof item === "string") return makeCoverItemFromUrl(item);
        const url = String(item && item.url || item && item.value || "").trim();
        const made = makeCoverItemFromUrl(url);
        if (!made) return null;
        return {
          ...made,
          title: String(item && item.title || made.title || "커버곡").trim() || "커버곡",
          thumbnail: String(item && item.thumbnail || made.thumbnail || "").trim() || made.thumbnail,
          fallbackThumbnail: String(item && item.fallbackThumbnail || made.fallbackThumbnail || "").trim() || made.fallbackThumbnail
        };
      })
      .filter(Boolean));
  }

  function formatNoticeItemHtml(item) {
    const body = formatNoticeTextHtml(item.text);
    if (item.link) {
      return `<a class="notice-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">${body}</a>`;
    }
    return `<span class="notice-item">${body}</span>`;
  }

  function formatNoticeTextHtml(text) {
    return escapeHtml(text).replace(/\[[^\]]+\]/g, match => `<strong>${match}</strong>`);
  }

  function renderCoverSection() {
    if (!els.coverDetails || !els.coverTrack) return;

    const count = coverItems.length;
    if (els.coverDescription) {
      els.coverDescription.textContent = count ? `커버곡 ${count}개를 표시합니다.` : "표시할 커버곡이 없습니다.";
    }

    if (!count) {
      if (els.coverEmpty) els.coverEmpty.hidden = false;
      if (els.coverCarousel) els.coverCarousel.hidden = true;
      els.coverTrack.innerHTML = "";
      return;
    }

    if (els.coverEmpty) els.coverEmpty.hidden = true;
    if (els.coverCarousel) els.coverCarousel.hidden = false;

    coverIndex = wrapIndex(coverIndex, count);
    const visible = getVisibleCoverItems();
    els.coverTrack.innerHTML = visible.map(renderCoverCard).join("");
    bindCoverCards();
    enrichCoverTitles(visible);
  }

  function getVisibleCoverItems() {
    const count = coverItems.length;
    if (!count) return [];
    return [-1, 0, 1].map(offset => {
      const actualIndex = wrapIndex(coverIndex + offset, count);
      return { ...coverItems[actualIndex], _actualIndex: actualIndex, _slot: offset };
    });
  }

  function renderCoverCard(item) {
    const isCenter = item._slot === 0;
    return `
      <a class="cover-card ${isCenter ? "active" : "side"}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" data-cover-index="${escapeHtml(item._actualIndex)}">
        <div class="cover-thumb-wrap">
          <img class="cover-thumb" src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" onerror="if(this.dataset.fallback){this.onerror=null;this.src=this.dataset.fallback;}" data-fallback="${escapeHtml(item.fallbackThumbnail || "")}" />
        </div>
        <div class="cover-title" data-cover-title="${escapeHtml(item.id)}">${escapeHtml(item.title || "커버곡")}</div>
      </a>
    `;
  }

  function bindCoverCards() {
    if (!els.coverTrack) return;
    els.coverTrack.querySelectorAll("[data-cover-index]").forEach(card => {
      card.addEventListener("click", event => {
        const index = Number(card.dataset.coverIndex || 0);
        if (index !== coverIndex) {
          event.preventDefault();
          moveCoverCarousel(index > coverIndex ? 1 : -1);
        }
      });
    });
  }

  async function enrichCoverTitles(items) {
    const uniqueItems = items.filter(item => item && item.url && (!coverItems[item._actualIndex] || coverItems[item._actualIndex].title === "커버곡을 불러오는 중..."));
    await Promise.all(uniqueItems.map(async item => {
      try {
        const title = await fetchYoutubeOembedTitle(item.url);
        if (!title) return;
        const target = coverItems[item._actualIndex];
        if (target) target.title = title;
        if (els.coverTrack) {
          els.coverTrack.querySelectorAll(`[data-cover-title="${cssEscape(item.id)}"]`).forEach(el => {
            el.textContent = title;
          });
        }
      } catch (err) {
        const target = coverItems[item._actualIndex];
        if (target && target.title === "커버곡을 불러오는 중...") target.title = "YouTube 커버곡";
      }
    }));
  }

  async function fetchYoutubeOembedTitle(url) {
    const endpoints = [
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`,
      `https://noembed.com/embed?url=${encodeURIComponent(url)}`
    ];

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, { cache: "force-cache" });
        if (!res.ok) continue;
        const json = await res.json();
        const title = String(json.title || "").trim();
        if (title) return title;
      } catch (err) {
        //
      }
    }

    return "";
  }

  function moveCoverCarousel(direction) {
    if (!coverItems.length || coverMoving) return;
    coverMoving = true;
    if (els.coverTrack) {
      els.coverTrack.classList.remove("move-left", "move-right");
      void els.coverTrack.offsetWidth;
      els.coverTrack.classList.add(direction > 0 ? "move-left" : "move-right");
    }

    window.setTimeout(() => {
      coverIndex = wrapIndex(coverIndex + direction, coverItems.length);
      if (els.coverTrack) els.coverTrack.classList.remove("move-left", "move-right");
      coverMoving = false;
      renderCoverSection();
    }, 260);
  }

  function wrapIndex(index, length) {
    if (!length) return 0;
    return ((index % length) + length) % length;
  }

  function shuffleArray(items) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function startCoverAutoTimer() {
    if (coverAutoTimer) window.clearInterval(coverAutoTimer);
    coverAutoTimer = window.setInterval(() => {
      if (!shouldAutoMoveCover()) return;
      moveCoverCarousel(-1);
    }, 10000);
  }

  function shouldAutoMoveCover() {
    if (!els.coverDetails || !els.coverDetails.open) return false;
    if (!els.coverCarousel || els.coverCarousel.hidden) return false;
    if (coverHover || coverMoving) return false;
    if (coverItems.length <= 1) return false;
    return isElementFullyVisible(els.coverDetails);
  }

  function collapseCoverSection() {
    if (els.coverDetails && els.coverDetails.open) els.coverDetails.open = false;
  }

  function updateFilterSummaryHelp() {
    if (!els.filterSummaryHelp) return;
    els.filterSummaryHelp.textContent = els.filterDetails && els.filterDetails.open ? "클릭해서 접기" : "클릭해서 펼치기";
  }

  function renderFooter() {
    if (!els.footerText) return;
    const text = String(currentFooterText || FOOTER_TEXT || "");
    if (!text.trim()) {
      els.footerText.hidden = true;
      return;
    }
    els.footerText.hidden = false;
    els.footerText.innerHTML = formatFooterHtml(text);
  }

  function formatFooterHtml(text) {
    const source = String(text || "");
    let html = "";
    let index = 0;
    const pattern = /\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+)\]\{([^}]*)\}/gs;
    let match;

    while ((match = pattern.exec(source)) !== null) {
      html += escapeHtml(source.slice(index, match.index)).replace(/\\n|\n/g, "<br>");

      if (match[1] !== undefined) {
        const label = match[1];
        const url = match[2];
        html += `<a class="footer-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
      } else {
        const label = match[3];
        const tooltip = String(match[4] || "").replace(/\\n/g, "\n");
        html += `<span class="footer-tip" title="${escapeHtml(tooltip)}">${escapeHtml(label)}</span>`;
      }

      index = pattern.lastIndex;
    }

    html += escapeHtml(source.slice(index)).replace(/\\n|\n/g, "<br>");
    return html;
  }

  function blurSearchInput() {
    if (!els.searchInput) return;
    if (document.activeElement === els.searchInput) els.searchInput.blur();
    els.searchInput.classList.remove("input-active");
  }

  function deactivateSearchIfFilterOutOfView() {
    if (!els.searchInput || document.activeElement !== els.searchInput) return;
    if (!els.filterDetails || !isElementMostlyVisible(els.filterDetails)) {
      blurSearchInput();
    }
  }

  function isElementMostlyVisible(el) {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return rect.bottom > 0 && rect.top < viewportHeight && rect.right > 0 && rect.left < viewportWidth;
  }

  function isElementFullyVisible(el) {
    const rect = el.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    return rect.top >= 0 && rect.left >= 0 && rect.bottom <= viewportHeight && rect.right <= viewportWidth;
  }
  
  function escapeHtmlWithBr(value) {
    return escapeHtml(value).replace(/\r?\n/g, "<br>");
  }

  function showLikeNoticeModal(title, message) {
    if (!els.likeDisabledModal) {
      showCooldownText(String(message || ""));
      return;
    }
    const safeTitle = String(title || "[알림]");
    const safeMessage = String(message || "");

    if (els.likeNoticeModalMessage) {
      els.likeNoticeModalMessage.innerHTML = `<strong>${escapeHtml(safeTitle)}</strong><br>${escapeHtmlWithBr(safeMessage)}`;
    }
    window.clearTimeout(likeDisabledModalTimer);
    els.likeDisabledModal.hidden = false;
    document.body.classList.add("modal-open");
    likeDisabledModalTimer = window.setTimeout(closeLikeDisabledModal, 3000);
  }
  
  function showLikeDisabledModal() {
    showLikeNoticeModal("[점검]", "지금은 좋아요 를 누를 수 없습니다");
  }

  function closeLikeDisabledModal() {
    if (!els.likeDisabledModal) return;
    window.clearTimeout(likeDisabledModalTimer);
    els.likeDisabledModal.hidden = true;
    if (els.youtubeModal && els.youtubeModal.hidden) document.body.classList.remove("modal-open");
  }

  function resetFilters() {
    els.searchInput.value = "";
    if (els.searchMode) els.searchMode.value = "all";
    selectAllOption(els.yearFilter);
    selectAllOption(els.monthFilter);
    selectAllOption(els.dayFilter);
    selectAllOption(els.categoryFilter);
    selectAllOption(els.countryFilter);
  }

  function isEditableTarget(target) {
    if (!target) return false;
    const tag = String(target.tagName || "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || target.isContentEditable;
  }

  function showPageLoading(message, sub="") {
    if (!els.pageLoading) return;
    if (els.pageLoadingText) els.pageLoadingText.textContent = message || "로딩 중...";
    if (els.pageLoadingSubText) els.pageLoadingSubText.textContent = sub || "";
    els.pageLoading.hidden = false;
    document.body.classList.add("page-loading-open");
  }

  function hidePageLoading() {
    if (!els.pageLoading) return;
    els.pageLoading.hidden = true;
    document.body.classList.remove("page-loading-open");
  }

  function showYoutubeLoading() {
    if (!els.youtubeLoading) return;
    els.youtubeLoading.innerHTML = makeLoadingMarkup("영상을 불러오는 중...");
    els.youtubeLoading.hidden = false;
  }

  function hideYoutubeLoading() {
    if (!els.youtubeLoading) return;
    els.youtubeLoading.hidden = true;
    els.youtubeLoading.innerHTML = "";
  }

  function makeLoadingMarkup(text) {
    return `
      <div class="loader-box">
        <img class="loader-image" src="./loading" alt="" onerror="this.remove(); this.parentElement.classList.add('use-default-loader');" />
        <div class="default-spinner" aria-hidden="true"></div>
        <div class="loader-text">${escapeHtml(text || "로딩 중...")}</div>
      </div>
    `;
  }

  function setupFavicon() {
    if (!els.faviconLink) return;

    const candidates = ["./icon.ico", "./icon.png", "./icon.svg", "./icon.webp", "./icon"];
    let index = 0;

    const tryNext = () => {
      if (index >= candidates.length) {
        els.faviconLink.removeAttribute("href");
        return;
      }
      els.faviconLink.href = candidates[index];
      index += 1;
    };

    els.faviconLink.addEventListener("error", tryNext);
    tryNext();
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") {
      return window.CSS.escape(value);
    }
    return String(value).replace(/"/g, '\\"');
  }

  function handleAllOption(select) {
    const selected = getSelectedValuesRaw(select);

    if (selected.length === 0) {
      selectAllOption(select);
      return;
    }

    if (selected.includes("__ALL__") && selected.length > 1) {
      Array.from(select.options).forEach(option => {
        if (option.value === "__ALL__") option.selected = false;
      });
    }
  }

  function fillSelectWithAll(select, values) {
    const prev = new Set(getSelectedValuesRaw(select));
    const hadSelection = prev.size > 0;
    const shouldSelectAll = !hadSelection || prev.has("__ALL__");

    select.innerHTML = ["__ALL__", ...values].map(value => {
      const label = value === "__ALL__" ? "전체" : String(value);
      const selected = shouldSelectAll ? value === "__ALL__" : prev.has(String(value));
      return `<option value="${escapeHtml(String(value))}" ${selected ? "selected" : ""}>${escapeHtml(label)}</option>`;
    }).join("");
  }

  function selectAllOption(select) {
    Array.from(select.options).forEach(option => {
      option.selected = option.value === "__ALL__";
    });
  }

  function getFilterValues(select) {
    const values = getSelectedValuesRaw(select);
    if (!values.length || values.includes("__ALL__")) return [];
    return values;
  }

  function getSelectedValuesRaw(select) {
    return Array.from(select.selectedOptions).map(option => option.value);
  }

  function getUserKey() {
    let key = localStorage.getItem("songs_user_key");
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem("songs_user_key", key);
    }
    return key;
  }

  function getLikedSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem("songs_liked_ids") || "[]"));
    } catch {
      return new Set();
    }
  }

  function isLocallyLiked(id) {
    return getLikedSet().has(id);
  }

  function markLocalLiked(id) {
    const set = getLikedSet();
    set.add(id);
    localStorage.setItem("songs_liked_ids", JSON.stringify([...set]));
  }

  function getLikeCooldownRemainingMs() {
    const until = Number(localStorage.getItem("songs_like_cooldown_until") || "0");
    return Math.max(0, until - Date.now());
  }

  function setLikeCooldown(until = Date.now() + LIKE_COOLDOWN_MS) {
    localStorage.setItem("songs_like_cooldown_until", String(until));
  }

  function startCooldownTimer() {
    setInterval(() => {
      const remain = getLikeCooldownRemainingMs();
      if (remain > 0) {
        els.cooldownStatus.textContent = `좋아요 쿨타임: ${Math.ceil(remain / 1000)}초`;
      } else if (els.cooldownStatus.textContent.startsWith("좋아요 쿨타임")) {
        els.cooldownStatus.textContent = "";
      }
    }, 250);
  }

  function showCooldownText(text) {
    els.cooldownStatus.textContent = text;
    window.clearTimeout(showCooldownText._timer);
    showCooldownText._timer = window.setTimeout(() => {
      if (!els.cooldownStatus.textContent.startsWith("좋아요 쿨타임")) {
        els.cooldownStatus.textContent = "";
      }
    }, 3500);
  }

  function readLocalJsonCache() {
    try {
      return JSON.parse(localStorage.getItem("songs_data_cache") || "null");
    } catch {
      return null;
    }
  }

  function writeLocalJsonCache(obj) {
    try {
      localStorage.setItem("songs_data_cache", JSON.stringify(obj));
    } catch {
      //
    }
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/\s+/g, "")
      .trim();
  }

  function expandSearchTerms(keyword) {
    if (!keyword) return [];

    const terms = new Set([keyword]);

    Object.entries(searchAliases).forEach(([base, aliases]) => {
      const normalizedBase = normalizeSearchText(base);
      const normalizedAliases = [base, ...(Array.isArray(aliases) ? aliases : [])]
        .map(normalizeSearchText)
        .filter(Boolean);

      const matched =
        normalizedBase.includes(keyword) ||
        keyword.includes(normalizedBase);

      if (matched) {
        normalizedAliases.forEach(term => {
          if (term) terms.add(term);
        });
      }
    });

    return [...terms];
  }

  function uniqueSorted(values, numericDesc = false, numericAsc = false) {
    const arr = [...new Set(values.map(v => String(v)).filter(Boolean))];
    if (numericDesc) return arr.sort((a, b) => Number(b) - Number(a));
    if (numericAsc) return arr.sort((a, b) => Number(a) - Number(b));
    return arr.sort((a, b) => a.localeCompare(b, "ko"));
  }

  function toNumber(value) {
    const n = Number(String(value ?? "").replaceAll(",", ""));
    return Number.isFinite(n) ? n : 0;
  }

  function pad2(value) {
    const n = Number(value);
    if (!n) return "";
    return String(n).padStart(2, "0");
  }

  function setStatus(text) {
    els.dataStatus.textContent = text;
  }

  function escapeTextOnly_(value) {
    return String(value).replace(/[<>]/g, "");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function applyDarkMode(enabled) {
    document.documentElement.classList.toggle("dark-mode", enabled);
    localStorage.setItem("darkModeEnabled", enabled ? "1" : "0");
  }

  function setupDarkModeToggle() {
    const statusBox = document.querySelector(".status-box");
    if (!statusBox) return;

    const wrap = document.createElement("label");
    wrap.className = "darkmode-toggle";
    wrap.innerHTML = '<input type="checkbox" id="darkModeToggle"> 다크모드';

    statusBox.appendChild(wrap);

    const checkbox = wrap.querySelector("input");

    const saved = localStorage.getItem("darkModeEnabled") === "1";
    checkbox.checked = saved;
    applyDarkMode(saved);

    checkbox.addEventListener("change", () => {
      applyDarkMode(checkbox.checked);
    });
  }

  setupDarkModeToggle();

})();
