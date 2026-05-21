(() => {
  "use strict";

  const CONFIG = window.APP_CONFIG || {};
  const API_URL = CONFIG.API_URL || "";
  const COUNTER = String(CONFIG.COUNTER || "").trim();
  const DATA_URL = CONFIG.DATA_URL || "./data.json";
  const SONGS_CSV_URL = CONFIG.SONGS_CSV_URL || "";
  const LIKES_SMR_CSV_URL = CONFIG.LIKES_SMR_CSV_URL || "";
  const NOTICE_CSV_URL = CONFIG.NOTICE_CSV_URL || "";
  const SETTINGS_CSV_URL = CONFIG.SETTINGS_CSV_URL || "";
  const SEARCH_ALIASES_CSV_URL = CONFIG.SEARCH_ALIASES_CSV_URL || "";
  const CSV_CACHE_PREFIX = "csv_cache_";
  const SONGS_CSV_CACHE_NAME = "songs_title_artist";
  const LOCAL_DATA_CACHE_KEY = "songs_data_cache";
  const SETTINGS_VERSION_SONGS = "version_songs";
  const SETTINGS_VERSION_SEARCH_ALIASES = "version_search_aliases";
  const LIKE_COOLDOWN_MS = Number(CONFIG.LIKE_COOLDOWN_MS || 60000);
  let searchAliases = {};
  let currentSettingsRows = [];
  const DEFAULT_NOTICE_TEXT = CONFIG.NOTICE_TEXT || "다시보레이 채널 기준으로 작성된 데이터의 추천순, 날짜순, 검색/필터를 제공합니다.";
  const FOOTER_TEXT = CONFIG.FOOTER_TEXT || "";
  const YOUTUBE_LOADING_WORDS = ["불러오는", "소환하는", "읽어오는", "가져오는", "준비하는"];
  const YOUTUBE_API_SRC = "https://www.youtube.com/iframe_api";
  const YOUTUBE_SLOW_FIRST_MESSAGE_MS = 8000;
  const YOUTUBE_SLOW_SECOND_MESSAGE_MS = 2000;
  const YOUTUBE_NO_RESPONSE_CLOSE_MS = 10000;
  const YOUTUBE_NO_RESPONSE_NOTICE_MS = 3000;

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
  const SUNG_INITIAL_GROUP_COUNT = 50;
  const SUNG_MORE_STEP = 50;
  const PLAYLIST_STORAGE_KEY = "urei_playlists";
  const PLAYLIST_SELECTED_KEY = "urei_selected_playlist";
  const PLAYLIST_END_CHECK_INTERVAL_MS = 250;
  const PLAYLIST_ERROR_SKIP_MS = 1600;
  const PLAYLIST_FADE_DURATION_MS = 2000;
  const DEFAULT_PLAYLIST_NAME = "기본";
  const DEFAULT_PLAYLIST_SEED_ITEMS = [
    {
      type: "external",
      key: "external:aHNedgujLXo",
      url: "https://youtu.be/aHNedgujLXo",
      videoId: "aHNedgujLXo",
      title: "IRIS OUT / 米津玄師 - Urei Cover",
      section: "커버곡"
    },
    "20251104_1_016", "20251021_1_013",
    {
      type: "external",
      key: "external:d68gIXrr_yY",
      url: "https://youtu.be/d68gIXrr_yY",
      videoId: "d68gIXrr_yY",
      title: "스타드림(StarDream)「Break it Out」Official MV",
      section: "오리지널 곡"
    }
    /*
      완전히 처음 접속해서 localStorage에 플레이리스트 데이터가 없을 때만
      기본 플레이리스트에 자동으로 넣을 항목 예시

      일반 곡은 songs 시트의 id 문자열만
      "20250101_1_001",

      커버곡/추천 팬 영상처럼 songs 시트에 없는 YouTube 영상은 아래 형식으로
      {
        type: "external",
        key: "external:cover-example-video-id",
        url: "https://youtu.be/cover-example-video-id",
        videoId: "cover-example-video-id",
        title: "기본 커버곡 예시 제목",
        section: "커버곡"
      },
      {
        type: "external",
        key: "external:rec-example-video-id",
        url: "https://youtu.be/rec-example-video-id",
        videoId: "rec-example-video-id",
        title: "기본 추천 팬 영상 예시 제목",
        section: "추천 팬 영상"
      }
    */
  ];

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
    recDetails: document.getElementById("recDetails"),
    recDescription: document.getElementById("recDescription"),
    recEmpty: document.getElementById("recEmpty"),
    recCarousel: document.getElementById("recCarousel"),
    recTrack: document.getElementById("recTrack"),
    recPrevButton: document.getElementById("recPrevButton"),
    recNextButton: document.getElementById("recNextButton"),
    playlistOpenButton: document.getElementById("playlistOpenButton"),
    playlistSummaryName: document.getElementById("playlistSummaryName"),
    playlistModal: document.getElementById("playlistModal"),
    playlistModalClose: document.getElementById("playlistModalClose"),
    playlistNameInput: document.getElementById("playlistNameInput"),
    playlistCreateButton: document.getElementById("playlistCreateButton"),
    playlistSelect: document.getElementById("playlistSelect"),
    playlistRenameButton: document.getElementById("playlistRenameButton"),
    playlistDeleteButton: document.getElementById("playlistDeleteButton"),
    playlistItems: document.getElementById("playlistItems"),
    playlistEmpty: document.getElementById("playlistEmpty"),
    playlistPlaySequentialButton: document.getElementById("playlistPlaySequentialButton"),
    playlistPlayRandomButton: document.getElementById("playlistPlayRandomButton"),
    playlistRepeatToggle: document.getElementById("playlistRepeatToggle"),
    playlistRemoveSelectedButton: document.getElementById("playlistRemoveSelectedButton"),
    playlistClearButton: document.getElementById("playlistClearButton"),
    playlistFeatureElements: Array.from(document.querySelectorAll("[data-playlist-feature]")),
    playlistActionRow: document.getElementById("playlistActionRow"),
    youtubeModal: document.getElementById("youtubeModal"),
    youtubeModalClose: document.getElementById("youtubeModalClose"),
    youtubeFrameWrap: document.getElementById("youtubeFrameWrap"),
    filterDetails: document.getElementById("filterDetails"),
    filterSummaryHelp: document.querySelector("#filterDetails .summary-help"),
    faviconLink: document.getElementById("faviconLink"),
    modalSongTitle: document.getElementById("modalSongTitle"),
    modalSongArtist: document.getElementById("modalSongArtist"),
    modalSongFooter: document.getElementById("modalSongFooter"),
    modalSongFooterText: document.getElementById("modalSongFooterText"),
    modalFooterLikePanel: document.getElementById("modalFooterLikePanel"),
    modalFooterPlaylistPanel: document.getElementById("modalFooterPlaylistPanel"),
    modalLikePanel: document.getElementById("modalLikePanel"),
    playlistPlaybackBanner: document.getElementById("playlistPlaybackBanner"),
    playlistPlayerControls: document.getElementById("playlistPlayerControls"),
    playlistPlayerName: document.getElementById("playlistPlayerName"),
    playlistPrevTrackButton: document.getElementById("playlistPrevTrackButton"),
    playlistNextTrackButton: document.getElementById("playlistNextTrackButton"),
    playlistShowListButton: document.getElementById("playlistShowListButton"),
    playlistOrderToggleButton: document.getElementById("playlistOrderToggleButton"),
    playlistRepeatPlayerToggle: document.getElementById("playlistRepeatPlayerToggle"),
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
  let sungVisibleGroupCount = SUNG_INITIAL_GROUP_COUNT;
  let currentSungGroups = new Map();
  let currentDateGroups = new Map();
  let coverItems = [];
  let coverIndex = 0;
  let coverMoving = false;
  let coverHover = false;
  let coverAutoTimer = null;
  let recItems = [];
  let recIndex = 0;
  let recMoving = false;
  let recHover = false;
  let recAutoTimer = null;
  let likePostEnabled = true;
  let currentModalSongId = "";
  let youtubePlayer = null;
  let youtubePlayerToken = 0;
  let youtubeApiReadyPromise = null;
  let youtubeLoadingFadeTimer = null;
  let youtubeLoadingStatusTimer = null;
  let youtubeBufferingTimer = null;
  let youtubeSlowSecondTimer = null;
  let youtubeNoResponseTimer = null;
  let youtubeStartedPlaying = false;
  let youtubeInitialLoadingSuppressed = false;
  let currentYoutubeLoadingText = "";
  let likeDisabledModalTimer = null;
  const collapsedGroups = new Set();
  let currentNoticeItems = [{ text: DEFAULT_NOTICE_TEXT, link: "" }];
  let currentFooterText = FOOTER_TEXT;
  let playlistEnabled = false;
  let pendingPlaylistNameAction = "";
  let currentDataStatusText = "데이터 로딩 중...";
  let visitorCount = "…";
  let playlists = [];
  let selectedPlaylistId = "";
  let playlistPlayback = null;
  let playlistSegmentTimer = null;
  let playlistSkipTimer = null;
  let playlistVolumeFadeTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    showPageLoading("...LOADING...", "초기화면 준비 중.");
    bindEvents();
    loadPlaylists();
    applyPlaylistEnabledState(false);
    renderPlaylistSummary();
    setupFavicon();
    showPageLoading("...LOADING...", "공지사항 읽는 중..");
    renderNotice([{ text: DEFAULT_NOTICE_TEXT, link: "" }]);
    renderFooter();
    setupCounterTracking();
    loadVisitorCount();
    showPageLoading("...LOADING...", "필터 만드는 중...");
    updateFilterSummaryHelp();
    startCooldownTimer();
    startCoverAutoTimer();
    startRecAutoTimer();
    bindResponsiveRender();
    showPageLoading("...LOADING...", "설정 불러오는 중....");
    currentSettingsRows = await loadSettingsRows();
    playlistEnabled = normalizePlaylistEnabled(extractSettingsFromRows(currentSettingsRows));
    applyPlaylistEnabledState(playlistEnabled);
    showPageLoading("...LOADING...", "설정 불러오는 중.....");
    await loadSearchAliases(false, currentSettingsRows);
    await loadData(false, currentSettingsRows);
    handleInitialSongIdQuery_();
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
      applyFilterResultPanelState();
      applyAndRender(true);
    });
    els.searchInput.addEventListener("blur", () => els.searchInput.classList.remove("input-active"));
    els.searchInput.addEventListener("focus", () => {
      els.searchInput.classList.add("input-active");
    });
    window.addEventListener("scroll", deactivateSearchIfFilterOutOfView, { passive: true });
    window.addEventListener("wheel", deactivateSearchIfFilterOutOfView, { passive: true });
    window.addEventListener("touchmove", deactivateSearchIfFilterOutOfView, { passive: true });
    if (els.searchMode) els.searchMode.addEventListener("change", () => {
      applyFilterResultPanelState();
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
        applyFilterResultPanelState();
        refreshDayFilterOptions();
        applyAndRender(true);
      });
    });
    els.dayFilter.addEventListener("change", () => {
      applyFilterResultPanelState();
      applyAndRender(true);
    });

    els.resetButton.addEventListener("click", () => {
      applyFilterResultPanelState();
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
        sungVisibleGroupCount = SUNG_INITIAL_GROUP_COUNT;
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
      bindCarouselSwipe(els.coverCarousel, direction => moveCoverCarousel(direction));
    }

    if (els.coverPrevButton) {
      els.coverPrevButton.addEventListener("click", () => moveCoverCarousel(-1));
    }

    if (els.coverNextButton) {
      els.coverNextButton.addEventListener("click", () => moveCoverCarousel(1));
    }

    if (els.recDetails) {
      els.recDetails.addEventListener("toggle", () => {
        if (els.recDetails.open) renderRecSection();
      });
    }

    if (els.recCarousel) {
      els.recCarousel.addEventListener("mouseenter", () => { recHover = true; });
      els.recCarousel.addEventListener("mouseleave", () => { recHover = false; });
      els.recCarousel.addEventListener("touchstart", () => { recHover = true; }, { passive: true });
      els.recCarousel.addEventListener("touchend", () => {
        window.setTimeout(() => { recHover = false; }, 1200);
      }, { passive: true });
      bindCarouselSwipe(els.recCarousel, direction => moveRecCarousel(direction));
    }

    if (els.recPrevButton) {
      els.recPrevButton.addEventListener("click", () => moveRecCarousel(-1));
    }

    if (els.recNextButton) {
      els.recNextButton.addEventListener("click", () => moveRecCarousel(1));
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

    bindPlaylistManagerEvents();
    bindPlaylistPlayerEvents();

    document.addEventListener("keydown", event => {
      const key = event.key;

      if (key === "Escape") {
        if (!els.youtubeModal.hidden) closeYoutubeModal();
        resetFilters();
        applyEscResultPanelState();
        applyAndRender(true);
        scrollToRecommendSection();
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
      const exact = normalizeBoolean(row.exact ?? row.exact_match ?? row.unanimous ?? row.perfect);
      result[word] = { aliases, exact };
    });

    return result;
  }

  function normalizeSearchAliasesObject(obj) {
    const result = {};

    Object.entries(obj || {}).forEach(([word, aliases]) => {
      const key = String(word || "").trim();
      if (!key) return;

      if (aliases && typeof aliases === "object" && !Array.isArray(aliases)) {
        result[key] = {
          aliases: Array.isArray(aliases.aliases)
            ? aliases.aliases.map(v => String(v || "").trim()).filter(Boolean)
            : parseAliasesCell(aliases.aliases),
          exact: normalizeBoolean(aliases.exact ?? aliases.exact_match ?? aliases.unanimous ?? aliases.perfect)
        };
        return;
      }

      result[key] = {
        aliases: Array.isArray(aliases)
          ? aliases.map(v => String(v || "").trim()).filter(Boolean)
          : parseAliasesCell(aliases),
        exact: false
      };
    });

    return result;
  }

  function normalizeBoolean(value) {
    return String(value ?? "").trim().toLowerCase() === "true";
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
          recItems = normalizeRecItems(cached.recs || cached.recommendVideos || []);
          likePostEnabled = normalizeLikePostEnabled(cached.settings || null, true);
          playlistEnabled = normalizePlaylistEnabled(cached.settings || null);
          applyPlaylistEnabledState(playlistEnabled);
          renderNotice(currentNoticeItems);
          renderFooter();
          renderCoverSection();
          renderRecSection();
          buildFilters(allSongs);
          applyAndRender(true);
          setStatus(`${formatStatusDate(new Date(cached.saved_at || Date.now()))} · ${allSongs.length}`);
        }
      }

      const payload = await fetchSongsPayload(forceNetwork, settingsRows);
      allSongs = normalizeSongs(payload.data || payload || []);
      currentNoticeItems = normalizeNoticeItems(payload.notices || payload.notice || DEFAULT_NOTICE_TEXT);
      currentFooterText = normalizeFooterText(payload.footerText || payload.footer || FOOTER_TEXT);
      applyPageTitleValues(payload.title || payload.pageTitle || "", payload.h1 || payload.pageH1 || "", payload.h1Visible);
      coverItems = normalizeCoverItems(payload.covers || []);
      recItems = normalizeRecItems(payload.recs || payload.recommendVideos || []);
      likePostEnabled = normalizeLikePostEnabled(payload.settings || null, true);
      playlistEnabled = normalizePlaylistEnabled(payload.settings || null);
      applyPlaylistEnabledState(playlistEnabled);
      renderNotice(currentNoticeItems);
      renderFooter();
      renderCoverSection();
      renderRecSection();
      writeLocalJsonCache({ 
        data: allSongs,
        notices: currentNoticeItems,
        footerText: currentFooterText,
        title: document.title,
        h1: els.pageTitle ? els.pageTitle.textContent : "",
        h1Visible: els.pageTitle ? els.pageTitle.style.display !== "none" : true,
        covers: coverItems,
        recs: recItems,
        settings: { like_post_enabled: likePostEnabled, playlist_enabled: playlistEnabled ? "TRUE" : "FALSE" },
        saved_at: Date.now()
      });

      buildFilters(allSongs);
      applyAndRender(true);
      setStatus(`${formatStatusDate(new Date())} · ${allSongs.length}`);
    } catch (err) {
      console.error("[데이터 로딩 실패]", err);
      const cached = readLocalJsonCache();
      if (cached) {
        allSongs = normalizeSongs(cached.data || cached);
        currentNoticeItems = normalizeNoticeItems(cached.notices || cached.notice || DEFAULT_NOTICE_TEXT);
        currentFooterText = normalizeFooterText(cached.footerText || cached.footer || FOOTER_TEXT);
        applyPageTitleValues(cached.title || cached.pageTitle || "", cached.h1 || cached.pageH1 || "", cached.h1Visible);
        coverItems = normalizeCoverItems(cached.covers || []);
        recItems = normalizeRecItems(cached.recs || cached.recommendVideos || []);
        likePostEnabled = normalizeLikePostEnabled(cached.settings || null, true);
        playlistEnabled = normalizePlaylistEnabled(cached.settings || null);
        applyPlaylistEnabledState(playlistEnabled);
        renderNotice(currentNoticeItems);
        renderFooter();
        renderCoverSection();
        renderRecSection();
        buildFilters(allSongs);
        applyAndRender(true);
        setStatus(`${formatStatusDate(new Date(cached.saved_at || Date.now()))} · ${allSongs.length} · ⓒ`);
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
          cacheName: SONGS_CSV_CACHE_NAME,
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
      const recs = extractRecItemsFromRows(noticeRows);
      const footerText = extractFooterTextFromRows(noticeRows);
      const pageMeta = extractPageMetaFromRows(noticeRows);
      const settings = extractSettingsFromRows(effectiveSettingsRows);

      return {
        data: mergeSongsAndLikes(songsRows, likesRows),
        notices,
        covers,
        recs,
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
      recs: Array.isArray(json) ? [] : (json.recs || json.recommendVideos || []),
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
          end: row.end,
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
          end: String(item.end || ""),
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

  function applyAndRender(resetVisible, options = {}) {
    const shouldUpdatePanelState = options.updatePanelState === true;

    if (resetVisible) {
      recommendVisibleCount = RECOMMEND_LIMITS[recommendMode] || 10;
      dateVisibleDateCount = getDateInitialVisibleCount(dateSortMode);
      sungVisibleGroupCount = SUNG_INITIAL_GROUP_COUNT;
      if (shouldUpdatePanelState) applyFilterResultPanelState();
      if (recommendMode === "random") randomPoolIds = [];
    }

    const keyword = normalizeSearchText(els.searchInput.value);
    const searchQuery = buildSearchQuery(keyword);
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

      if (hasSearchQuery(searchQuery)) {
        if (!matchesSearchQuery(song, searchMode, searchQuery)) return false;
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
    bindPlaylistAddButtons(els.recommendList);

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
      random: `무작위 추천 ${count}곡을 표시합니다.`,
      likes_last_1d: `최근 1일 추천순 ${count}곡을 표시합니다.`,
      likes_last_7d: `최근 7일 추천순 ${count}곡을 표시합니다.`,
      likes_last_30d: `최근 30일 추천순 ${count}곡을 표시합니다.`,
      likes_total: `전체 추천순 ${count}곡을 표시합니다.`,
      my_liked: `내가 추천한 곡들을 전체 추천순으로 ${count}곡을 표시합니다.`
    };
    return labels[recommendMode] || "추천순으로 표시합니다.";
  }

  function renderDateSection() {
    const groups = getDateGroupsBySortMode(filteredSongs);
    currentDateGroups = new Map(groups.map(group => [group.key, group]));
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
      const defaultCollapsed = getDateGroupDefaultCollapsed_(group);
      const collapsed = isGroupCollapsed("date", key, defaultCollapsed);
      const countText = dateSortMode === "likes_total"
        ? `${group.items.length}곡 · 추천 ${group.likesTotal}`
        : `${group.items.length}곡`;
      const bodyHtml = collapsed ? "" : renderDateGroupItems(group);
      
      return `
        <section class="date-group">
          <button class="date-group-title ${collapsed ? "collapsed" : ""}" type="button" data-date-group-toggle="${escapeHtml(key)}">
            <span>${escapeHtml(group.label)}</span>
            <span class="date-group-count">${escapeHtml(countText)}</span>
          </button>
          <div class="song-list compact ${collapsed ? "collapsed" : ""}" data-date-group-body="${escapeHtml(key)}">${bodyHtml}</div>
        </section>
      `;
    }).join("");

    bindLikeButtons(els.dateList);
    bindYoutubeButtons(els.dateList);
    bindFilterButtons(els.dateList);
    bindPlaylistAddButtons(els.dateList);
    bindDateGroupToggles(els.dateList, "date");
    els.dateMoreButton.hidden = dateVisibleDateCount >= groups.length;
    els.dateMoreButton.textContent = dateSortMode === "likes_total" ? "더 보기" : "더 보기";
  }

  function renderDateGroupItems(group) {
    if (!group || !Array.isArray(group.items)) return "";
    return group.items.map(renderSongCard).join("");
  }

  function getDateGroupDefaultCollapsed_(group) {
    if (dateSortMode === "likes_total") return true;
    return !hasDateGroupReplayLink_(group);
  }

  function hasDateGroupReplayLink_(group) {
    return Boolean(group && Array.isArray(group.items) && group.items.some(song => String(song && song.link || "").trim()));
  }

  function renderDateGroupBody(key, body) {
    const group = currentDateGroups.get(key);
    if (!group || !body) return;
    if (!body.innerHTML.trim()) {
      body.innerHTML = renderDateGroupItems(group);
    }
    bindLikeButtons(body);
    bindYoutubeButtons(body);
    bindFilterButtons(body);
    bindPlaylistAddButtons(body);
  }
  
  function isDesktopContextCopyEnabled() {
    if (window.matchMedia) {
      if (window.matchMedia("(max-width: 720px)").matches) return false;
      if (window.matchMedia("(pointer: coarse)").matches) return false;
    }
    return true;
  }

  async function copyDateGroupInfoToClipboard(key) {
    const group = currentDateGroups.get(key);
    const dateText = getDateGroupCopyDateText(group);

    if (!group || !Array.isArray(group.items) || !group.items.length) {
      console.warn(`👉 ${dateText || key || "날짜 그룹"} 의 곡 정보를 복사 실패 했습니다`, { reason: "empty_group" });
      return;
    }

    const text = makeDateGroupCopyText(group);

    try {
      await writeTextToClipboard(text);
      console.log(`👉 ${dateText} 의 곡 정보를 복사 성공 했습니다`);
    } catch (err) {
      console.warn(`👉 ${dateText} 의 곡 정보를 복사 실패 했습니다`, err);
    }
  }

  function makeDateGroupCopyText(group) {
    const dateText = getDateGroupCopyDateText(group);
    const items = [...(group.items || [])].sort(compareSongIdAsc);
    const hasAnyTimeline = items.some(song => String(song.timeline || "").trim());
    const lines = [`[${dateText}]`];

    items.forEach(song => {
      const artist = String(song.artist || "").trim() || getDisplayArtist(song);
      const title = String(song.title || "").trim() || getDisplayTitle(song);
      const timeline = hasAnyTimeline ? formatTimelineForCopy(song.timeline) : "";
      const prefix = timeline ? `${timeline} ` : "";
      lines.push(`${prefix}${artist} - ${title}`);
    });

    return lines.join("\n");
  }

  function getDateGroupCopyDateText(group) {
    const first = group && Array.isArray(group.items) ? group.items[0] : null;
    if (first) return formatPlainDate(first);

    const rawKey = String(group && group.key || "");
    const match = rawKey.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : rawKey;
  }

  function compareSongIdAsc(a, b) {
    return String(a && a.id || "").localeCompare(String(b && b.id || ""), "ko", {
      numeric: true,
      sensitivity: "base"
    });
  }

  function formatTimelineForCopy(value) {
    const text = String(value || "").trim();
    if (!text) return "";

    const colonParts = text.split(":").map(part => Number(part));
    if (colonParts.length >= 1 && colonParts.length <= 3 && colonParts.every(Number.isFinite)) {
      let h = 0;
      let m = 0;
      let s = 0;

      if (colonParts.length === 3) {
        [h, m, s] = colonParts;
      } else if (colonParts.length === 2) {
        [m, s] = colonParts;
      } else {
        [s] = colonParts;
      }

      return secondsToHmsForCopy(h * 3600 + m * 60 + s);
    }

    const parsed = timelineToSeconds(text);
    if (parsed > 0 || /^0+s?$/i.test(text)) return secondsToHmsForCopy(parsed);

    return text;
  }

  function secondsToHmsForCopy(totalSeconds) {
    const total = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  async function writeTextToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);

    try {
      const ok = document.execCommand("copy");
      if (!ok) throw new Error("document.execCommand('copy') returned false");
    } finally {
      textarea.remove();
    }
  }

  function getDateGroupsBySortMode(songs) {
    const sortedSongs = [...songs].sort(dateSortMode === "asc" ? compareDateAsc : compareDateDesc);
    const groups = groupByDate(sortedSongs);

    if (dateSortMode !== "likes_total") {
      groups.forEach(group => {
        group.items.sort(dateSortMode === "asc" ? compareDateAsc : compareDateDesc);
      });
      return groups;
    }
    
    groups.forEach(group => {
      group.items.sort(compareDateSongLikesDesc);
    });

    return groups.sort(compareDateGroupLikesDesc);
  }

  function getDateDescription(groupCount) {
    if (dateSortMode === "asc") {
      return "가장 과거 날짜부터 표시합니다.";
    }

    if (dateSortMode === "likes_total") {
      return `가장 추천받은 날짜부터 표시합니다.`;
    }

    return "가장 최신 날짜부터 표시합니다.";
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
    currentSungGroups = new Map(groups.map(group => [group.key, group]));
    const visibleGroups = groups.slice(0, sungVisibleGroupCount);
    const hasMore = sungVisibleGroupCount < groups.length;

    els.sungDescription.textContent = sungMode === "artist"
      ? `아티스트 기준 ${groups.length}개 그룹 중, ${visibleGroups.length}개를 표시합니다.`
      : `곡 기준 ${groups.length}개 그룹 중, ${visibleGroups.length}개를 표시합니다.`;

    if (!groups.length) {
      els.sungList.innerHTML = `<div class="empty">부른순에 표시할 항목이 없습니다.</div>`;
      return;
    }

    const groupHtml = visibleGroups.map(group => {
      const key = group.key;
      const collapsed = isGroupCollapsed("sung", key, true);
      return `
        <section class="date-group sung-group">
          <button class="date-group-title ${collapsed ? "collapsed" : ""}" type="button" data-date-group-toggle="${escapeHtml(key)}">
            <span>${escapeHtml(group.label)}</span>
            <span class="date-group-count">${group.items.length}곡</span>
          </button>
          <div class="song-list compact ${collapsed ? "collapsed" : ""}" data-date-group-body="${escapeHtml(key)}">${collapsed ? "" : group.items.map(renderSongCard).join("")}</div>
        </section>
      `;
    }).join("");

    els.sungList.innerHTML = `
      ${groupHtml}
      ${hasMore ? `
        <div class="load-more-wrap sung-more-wrap">
          <button id="sungMoreButton" type="button">더 보기</button>
        </div>
      ` : ""}
    `;

    bindLikeButtons(els.sungList);
    bindYoutubeButtons(els.sungList);
    bindFilterButtons(els.sungList);
    bindPlaylistAddButtons(els.sungList);
    bindDateGroupToggles(els.sungList, "sung");
    bindSungMoreButton();
  }

  function renderSungGroupBody(key, body) {
    const group = currentSungGroups.get(key);
    if (!group || !body) return;
    if (!body.innerHTML.trim()) {
      body.innerHTML = group.items.map(renderSongCard).join("");
    }
    bindLikeButtons(body);
    bindYoutubeButtons(body);
    bindFilterButtons(body);
    bindPlaylistAddButtons(body);
  }

  function bindSungMoreButton() {
    const button = document.getElementById("sungMoreButton");
    if (!button) return;

    button.addEventListener("click", () => {
      sungVisibleGroupCount += SUNG_MORE_STEP;
      renderSungSection();
    });
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

    return [...map.values()]
      .map(group => ({
        ...group,
        items: [...group.items].sort(compareDateSongLikesDesc)
      }))
      .sort((a, b) => {
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
    const values = splitMultiValue(song.title);
    return values.length
      ? values
      : [String(song.title || "").trim()].filter(Boolean);
  }

  function getArtistValues(song) {
    const values = splitMultiValue(song.artist);
    return values.length
      ? values
      : [String(song.artist || "").trim()].filter(Boolean);
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

    root.querySelectorAll(".song-title-clickable").forEach(title => {
      title.addEventListener("click", event => {
        if (event.target.closest("button, a, input, select, textarea")) return;
        const button = title.querySelector("[data-youtube-url]");
        if (button) button.click();
      });
    });
  }

  function bindPlaylistAddButtons(root) {
    root.querySelectorAll("[data-playlist-add-id]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        handlePlaylistAddButton(button);
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

        if (namespace === "sung") {
          if (collapsed) {
            body.innerHTML = "";
          } else {
            renderSungGroupBody(key, body);
          }
        } else if (namespace === "date") {
          if (collapsed) {
            body.innerHTML = "";
          } else {
            renderDateGroupBody(key, body);
          }
        }
      });

      if (namespace === "date") {
        button.addEventListener("contextmenu", event => {
          if (!isDesktopContextCopyEnabled()) return;
          event.preventDefault();
          const key = button.dataset.dateGroupToggle || "";
          copyDateGroupInfoToClipboard(key);
        });
      }
    });
  }

  function applyFilterFromButton(button) {
    const type = button.dataset.filterType || "";
    const value = button.dataset.filterValue || "";

    resetFilters();
    applyFilterResultPanelState();
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
    if (els.recDetails) els.recDetails.open = false;
    if (els.dateDetails) els.dateDetails.open = true;
  }

  function applyFilterResultPanelState() {
    collapseNonDateSections();
  }

  function applyEscResultPanelState() {
    recommendMode = "random";
    recommendVisibleCount = RECOMMEND_LIMITS.random;
    randomPoolIds = [];
    dateSortMode = "desc";
    dateVisibleDateCount = getDateInitialVisibleCount(dateSortMode);
    sungVisibleGroupCount = SUNG_INITIAL_GROUP_COUNT;
    setActiveModeButton("data-recommend-mode", recommendMode);
    setActiveModeButton("data-date-sort", dateSortMode);

    if (els.filterDetails) els.filterDetails.open = false;
    if (els.recommendDetails) els.recommendDetails.open = true;
    if (els.dateDetails) els.dateDetails.open = true;
    if (els.sungDetails) els.sungDetails.open = false;
    if (els.recDetails) els.recDetails.open = false;
  }

  function setActiveModeButton(attributeName, value) {
    document.querySelectorAll(`[${attributeName}]`).forEach(button => {
      button.classList.toggle("active", button.getAttribute(attributeName) === value);
    });
  }

  function scrollToPageTop() {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });
  }

  function scrollToRecommendSection() {
    if (!els.recommendDetails) {
      scrollToPageTop();
      return;
    }

    window.requestAnimationFrame(() => {
      els.recommendDetails.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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

  function renderPlaylistAddButton(song, options = {}) {
    if (!playlistEnabled) return "";
    const enabled = canAddSongToPlaylist(song);
    const reason = getPlaylistAddDisabledReason(song);
    const title = enabled ? "현재 플레이리스트에 추가" : reason;
    const extraClass = options.modal ? " modal-playlist-add-button" : "";

    return `<button class="playlist-add-button${enabled ? "" : " disabled disabled-front"}${extraClass}" type="button" data-playlist-add-id="${escapeHtml(song.id)}" data-playlist-disabled="${enabled ? "" : "1"}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></button>`;
  }

  function canAddSongToPlaylist(song) {
    if (!song) return false;
    const link = String(song.link || "").trim();
    const timeline = String(song.timeline || "").trim();
    const end = String(song.end || "").trim();
    if (!link || !timeline || !end) return false;
    const startSeconds = timelineToSeconds(timeline);
    const endSeconds = timelineToSeconds(end);
    return Boolean(extractYoutubeVideoId(link)) && endSeconds > startSeconds;
  }

  function getPlaylistAddDisabledReason(song) {
    if (!song) return "플레이리스트에 추가할 수 없습니다";
    if (!String(song.link || "").trim()) return "다시보기 링크가 없어 플레이리스트에 추가할 수 없습니다";
    if (!String(song.timeline || "").trim()) return "시작 시간이 없어 플레이리스트에 추가할 수 없습니다";
    if (!String(song.end || "").trim()) return "입력된 데이터가 부족하여\n이 곡은 플레이리스트에 추가할 수 없습니다";
    const startSeconds = timelineToSeconds(song.timeline);
    const endSeconds = timelineToSeconds(song.end);
    if (!extractYoutubeVideoId(song.link)) return "YouTube 영상만 플레이리스트에 추가할 수 있습니다";
    if (!(endSeconds > startSeconds)) return "끝 시간이 시작 시간보다 커야 합니다";
    return "플레이리스트에 추가할 수 없습니다";
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

    const titleText = getDisplayTitle(song);
    const artistText = getDisplayArtist(song);
    const modalArtistText = String(song.artist || "").trim() || artistText;

    const timelineUrl = song.link && song.timeline ? makeTimelineLink(song.link, song.timeline) : "";
    const youtubeUrl = song.link ? makeTimelineLink(song.link, song.timeline) : "";
    const titleCoreHtml = song.link
      ? `<button class="song-title-button" type="button" data-youtube-url="${escapeHtml(youtubeUrl)}" data-song-title="${escapeHtml(titleText)}" data-song-artist="${escapeHtml(modalArtistText)}" data-song-date="${escapeHtml(dateText)}" data-song-timeline="${escapeHtml(song.timeline || "")}" data-song-id="${escapeHtml(song.id)}">${escapeHtml(titleText)}</button>`
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
    const playlistButtonHtml = renderPlaylistAddButton(song);

    return `
      <article class="song-card" data-id="${escapeHtml(song.id)}">
        <div>
          <h3 class="song-title ${song.link ? "song-title-clickable" : ""}">${titleHtml}</h3>
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
          ${playlistButtonHtml}
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

  function handleInitialSongIdQuery_() {
    let requestedId = "";

    try {
      const params = new URLSearchParams(window.location.search || "");
      requestedId = String(params.get("id") || "").trim();
    } catch {
      requestedId = "";
    }

    if (!requestedId) return;

    clearInitialSongIdQuery_();

    const song = findSongById(requestedId);
    if (!song) {
      showLikeNoticeModal("[알림]", `해당 곡을 찾을 수 없습니다.\n${requestedId}`);
      return;
    }

    if (!String(song.link || "").trim()) {
      showLikeNoticeModal("[알림]", `다시보기가 없는 곡입니다.\n${getDisplayTitle(song)}`);
      return;
    }

    const youtubeUrl = makeTimelineLink(song.link, song.timeline);
    window.setTimeout(() => {
      openYoutubeModal(youtubeUrl, {
        title: getDisplayTitle(song),
        artist: String(song.artist || "").trim() || getDisplayArtist(song),
        date: formatSongDate(song),
        timeline: song.timeline || "",
        id: song.id
      }, { fromShareLink: true, suppressInitialLoading: true });
    }, 120);
  }

  function clearInitialSongIdQuery_() {
    if (!window.history || typeof window.history.replaceState !== "function") return;

    try {
      const cleanUrl = `${window.location.origin}${window.location.pathname}${window.location.hash || ""}`;
      window.history.replaceState(null, document.title, cleanUrl);
    } catch {}
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
    const song = findSongById(id);
    const isPlaylistMode = Boolean(playlistPlayback && playlistPlayback.active);

    if (!song) {
      if (els.modalLikePanel) els.modalLikePanel.innerHTML = "";
      if (els.modalFooterLikePanel) els.modalFooterLikePanel.innerHTML = "";
      if (els.modalFooterPlaylistPanel) els.modalFooterPlaylistPanel.innerHTML = "";
      return;
    }

    setExternalModalPanelsHidden_(false);

    if (els.modalLikePanel) {
      els.modalLikePanel.innerHTML = isPlaylistMode
        ? `<div class="like-panel modal-like-controls">${renderLikeControls(song, isLocallyLiked(song.id), false)}</div>`
        : `<div class="like-panel modal-like-controls">${renderLikeControls(song, isLocallyLiked(song.id), false)}${renderPlaylistAddButton(song, { modal: true })}</div>`;
      bindLikeButtons(els.modalLikePanel);
      if (!isPlaylistMode) bindPlaylistAddButtons(els.modalLikePanel);
    }

    if (els.modalFooterLikePanel) {
      els.modalFooterLikePanel.innerHTML = renderLikeControls(song, isLocallyLiked(song.id), false);
      bindLikeButtons(els.modalFooterLikePanel);
    }

    if (els.modalFooterPlaylistPanel) {
      els.modalFooterPlaylistPanel.innerHTML = isPlaylistMode ? "" : renderPlaylistAddButton(song, { modal: true });
      bindPlaylistAddButtons(els.modalFooterPlaylistPanel);
    }
  }

  function setModalScrollingText_(el, text) {
    if (!el) return;

    const value = String(text || "");
    el.innerHTML = "";
    el.classList.remove("modal-marquee-active");
    el.style.removeProperty("--modal-marquee-distance");
    el.style.removeProperty("--modal-marquee-duration");

    const inner = document.createElement("span");
    inner.className = "modal-marquee-inner";
    inner.textContent = value;
    el.appendChild(inner);

    window.requestAnimationFrame(() => {
      const distance = Math.ceil(inner.scrollWidth - el.clientWidth);
      if (distance <= 2) return;

      const moveSeconds = Math.max(2.4, Math.min(12, distance / 38));
      const totalSeconds = 4 + moveSeconds * 2;
      el.style.setProperty("--modal-marquee-distance", `${distance}px`);
      el.style.setProperty("--modal-marquee-duration", `${totalSeconds}s`);
      el.classList.add("modal-marquee-active");
    });
  }

  function setModalTitleText_(text) {
    setModalScrollingText_(els.modalSongTitle, text);
  }

  function setModalArtistText_(text) {
    setModalScrollingText_(els.modalSongArtist, text);
  }

  function setModalFooterText(text) {
    const value = String(text || "");
    const target = els.modalSongFooterText || els.modalSongFooter;
    if (!target) return;

    target.textContent = "";

    if (els.modalSongFooterText && value.includes("／") && currentModalSongId) {
      const parts = value.split("／");
      parts.forEach((part, index) => {
        if (index > 0) {
          const shareButton = document.createElement("button");
          shareButton.type = "button";
          shareButton.className = "modal-share-separator";
          shareButton.title = "공유링크 복사";
          shareButton.textContent = "／";
          shareButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            copySongShareLink_(currentModalSongId);
          });
          target.appendChild(shareButton);
        }

        target.appendChild(document.createTextNode(part));
      });
      return;
    }

    target.textContent = value;
  }

  async function copySongShareLink_(songId) {
    const id = String(songId || "").trim();
    if (!id) {
      console.warn("[공유링크 복사 실패] 곡 id가 없습니다.");
      return false;
    }

    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const shareUrl = `${baseUrl}?id=${encodeURIComponent(id)}`;

    try {
      await writeTextToClipboard(shareUrl);
      console.log(`[공유링크 복사 성공] ${id} → ${shareUrl}`);
      showCooldownText("공유링크를 복사했습니다");
      return true;
    } catch (err) {
      console.warn(`[공유링크 복사 실패] ${id}`, err);
      showCooldownText("공유링크 복사에 실패했습니다");
      return false;
    }
  }


  function setExternalModalPanelsHidden_(hidden) {
    if (els.modalLikePanel) {
      els.modalLikePanel.innerHTML = "";
      els.modalLikePanel.hidden = Boolean(hidden);
    }
    if (els.modalFooterLikePanel) {
      els.modalFooterLikePanel.innerHTML = "";
      els.modalFooterLikePanel.hidden = Boolean(hidden);
    }
    if (els.modalFooterPlaylistPanel) {
      els.modalFooterPlaylistPanel.innerHTML = "";
      els.modalFooterPlaylistPanel.hidden = Boolean(hidden);
    }
    if (els.modalSongFooterText) {
      els.modalSongFooterText.hidden = Boolean(hidden);
    }
  }

  function setupMediaSessionPlaybackControls_() {
    if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setActionHandler !== "function") return;

    setMediaSessionActionHandler_("play", () => {
      if (youtubePlayer && typeof youtubePlayer.playVideo === "function") {
        try { youtubePlayer.playVideo(); } catch (err) { console.warn("Media Session 재생 처리 실패", err); }
      }
    });

    setMediaSessionActionHandler_("pause", () => {
      if (youtubePlayer && typeof youtubePlayer.pauseVideo === "function") {
        try { youtubePlayer.pauseVideo(); } catch (err) { console.warn("Media Session 일시정지 처리 실패", err); }
      }
    });
  }

  function setMediaSessionActionHandler_(action, handler) {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (err) {
      console.warn(`Media Session ${action} 핸들러 설정 실패`, err);
    }
  }

  function setMediaSessionPlaybackState_(state) {
    if (!("mediaSession" in navigator) || !("playbackState" in navigator.mediaSession)) return;

    try {
      navigator.mediaSession.playbackState = state;
    } catch (err) {
      console.warn("Media Session 재생 상태 설정 실패", err);
    }
  }

  function clearMediaSessionPlaybackControls_() {
    if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setActionHandler !== "function") return;

    setMediaSessionActionHandler_("play", null);
    setMediaSessionActionHandler_("pause", null);
    setMediaSessionPlaybackState_("none");
  }

  function openYoutubeModal(url, meta = {}, options = {}) {
    const modalOptions = options || {};
    playlistPlayback = null;
    clearPlaylistSegmentWatcher_();
    clearPlaylistSkipTimer_();
    renderPlaylistPlaybackUi_();
    const videoId = extractYoutubeVideoId(url);

    if (!videoId) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const startSeconds = getYoutubeStartSecondsFromRawUrl(url);
    const token = ++youtubePlayerToken;
    youtubeStartedPlaying = false;
    youtubeInitialLoadingSuppressed = modalOptions.suppressInitialLoading === true;

    destroyYoutubePlayer_(false);
    currentModalSongId = meta.id || "";
    setModalTitleText_(meta.title || "");
    setModalArtistText_(meta.artist || "");
    setModalFooterText([meta.date || "", meta.timeline || ""].filter(Boolean).join(" ／ "));
    updateModalLikePanel(currentModalSongId);
    setupMediaSessionPlaybackControls_();

    els.youtubeFrameWrap.innerHTML = `<div id="youtubePlayerMount" class="youtube-player-mount"></div>`;
    els.youtubeModal.hidden = false;
    document.body.classList.add("modal-open");

    if (youtubeInitialLoadingSuppressed) {
      hideYoutubeLoading(true);
    } else {
      showYoutubeLoading();
      scheduleYoutubeLoadingStatus_(token);
    }

    ensureYouTubeIframeApi_()
      .then(() => {
        if (!isCurrentYoutubeToken_(token)) return;
        createYoutubePlayer_(videoId, startSeconds, token, 0, { suppressInitialLoading: youtubeInitialLoadingSuppressed });
      })
      .catch(err => {
        if (!isCurrentYoutubeToken_(token)) return;
        console.error("[YouTube API 로딩 실패]", err);
        showYoutubeLoadingMessage("YouTube 플레이어를 불러오지 못했습니다.", { error: true });
      });
  }

  function closeYoutubeModal() {
    youtubePlayerToken += 1;
    els.youtubeModal.hidden = true;
    destroyYoutubePlayer_(true);
    hideYoutubeLoading(true);
    setModalTitleText_("");
    setModalArtistText_("");
    setModalFooterText("");
    currentModalSongId = "";
    youtubeInitialLoadingSuppressed = false;
    clearPlaylistSegmentWatcher_();
    clearPlaylistVolumeFade_();
    playlistPlayback = null;
    renderPlaylistPlaybackUi_();
    if (els.modalLikePanel) els.modalLikePanel.innerHTML = "";
    if (els.modalFooterLikePanel) els.modalFooterLikePanel.innerHTML = "";
    if (els.modalFooterPlaylistPanel) els.modalFooterPlaylistPanel.innerHTML = "";
    clearMediaSessionPlaybackControls_();
    if (
      (!els.playlistModal || els.playlistModal.hidden) &&
      (!els.likeDisabledModal || els.likeDisabledModal.hidden)
    ) document.body.classList.remove("modal-open");
  }

  function ensureYouTubeIframeApi_() {
    if (window.YT && typeof window.YT.Player === "function") {
      return Promise.resolve(window.YT);
    }

    if (youtubeApiReadyPromise) {
      return youtubeApiReadyPromise;
    }

    youtubeApiReadyPromise = new Promise((resolve, reject) => {
      const previousReady = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => {
        reject(new Error("YouTube IFrame API 로딩 시간이 초과되었습니다."));
      }, 12000);

      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        if (typeof previousReady === "function") {
          try { previousReady(); } catch (err) { console.warn("기존 YouTube API 콜백 실행 실패", err); }
        }
        resolve(window.YT);
      };

      const existingScript = document.querySelector(`script[src="${YOUTUBE_API_SRC}"]`);
      if (existingScript) {
        existingScript.addEventListener("error", () => {
          window.clearTimeout(timeout);
          reject(new Error("YouTube IFrame API 스크립트 로딩 실패"));
        }, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = YOUTUBE_API_SRC;
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("YouTube IFrame API 스크립트 로딩 실패"));
      };
      document.head.appendChild(script);
    });

    return youtubeApiReadyPromise;
  }

  function createYoutubePlayer_(videoId, startSeconds, token, endSeconds = 0, options = {}) {
    const mount = document.getElementById("youtubePlayerMount");
    if (!mount) return;

    if (options && options.suppressInitialLoading) {
      hideYoutubeLoading(true);
    } else {
      showYoutubeLoadingMessage(getCurrentYoutubeLoadingText_(), { preserveInitial: true });
    }

    const playerVars = {
      autoplay: 1,
      playsinline: 1,
      rel: 0,
      vq: "hd1080",
      hd: 1,
      start: Math.max(0, Number(startSeconds) || 0),
      origin: window.location.origin
    };

    if (options && options.playlistId && !videoId) {
      playerVars.listType = "playlist";
      playerVars.list = options.playlistId;
    }

    youtubePlayer = new YT.Player(mount, {
      videoId: videoId || undefined,
      width: "100%",
      height: "100%",
      playerVars,
      events: {
        onReady: event => {
          if (!isCurrentYoutubeToken_(token)) return;
          try {
            if (playlistPlayback && playlistPlayback.active && event.target.setVolume) {
              try {
                const currentVolume = Number(event.target.getVolume && event.target.getVolume());
                if (Number.isFinite(currentVolume) && currentVolume > 0) playlistPlayback.baseVolume = currentVolume;
              } catch {}
              event.target.setVolume(0);
            }
            event.target.playVideo();
          } catch (err) {
            console.warn("YouTube 자동 재생 요청 실패", err);
            if (!(options && options.suppressInitialLoading)) {
              showYoutubeLoadingMessage("재생 버튼 입력을 기다리는 중...");
            }
          }
        },
        onStateChange: event => handleYoutubePlayerStateChange_(event, token),
        onError: event => handleYoutubePlayerError_(event, token)
      }
    });
  }

  function activateYoutubeLoadingAfterUserOrAutoplay_(token) {
    if (!isCurrentYoutubeToken_(token) || youtubeStartedPlaying) return;

    youtubeInitialLoadingSuppressed = false;
    showYoutubeLoading();
    scheduleYoutubeLoadingStatus_(token);
  }

  function handleYoutubePlayerStateChange_(event, token) {
    if (!isCurrentYoutubeToken_(token) || !window.YT || !YT.PlayerState) return;

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        setMediaSessionPlaybackState_("playing");
        youtubeInitialLoadingSuppressed = false;
        youtubeStartedPlaying = true;
        clearYoutubeLoadingStatusTimer_();
        clearYoutubeBufferingTimer_();
        hideYoutubeLoading(false, 180);
        if (playlistPlayback && playlistPlayback.active) startPlaylistVolumeFadeIn_();
        startPlaylistSegmentWatcher_();
        break;
      case YT.PlayerState.BUFFERING:
        if (youtubeStartedPlaying) {
          scheduleYoutubeBufferingStatus_(token);
        } else if (youtubeInitialLoadingSuppressed) {
          activateYoutubeLoadingAfterUserOrAutoplay_(token);
        }
        break;
      case YT.PlayerState.CUED:
        clearYoutubeBufferingTimer_();
        break;
      case YT.PlayerState.PAUSED:
        setMediaSessionPlaybackState_("paused");
        clearYoutubeLoadingStatusTimer_();
        clearYoutubeBufferingTimer_();
        hideYoutubeLoading(false, 0);
        break;
      case YT.PlayerState.ENDED:
        setMediaSessionPlaybackState_("none");
        clearYoutubeLoadingStatusTimer_();
        clearYoutubeBufferingTimer_();
        hideYoutubeLoading(false, 180);
        if (playlistPlayback && playlistPlayback.active) {
          playNextPlaylistItem_("ended");
        }
        break;
      default:
        break;
    }
  }

  function handleYoutubePlayerError_(event, token) {
    if (!isCurrentYoutubeToken_(token)) return;

    const code = event && typeof event.data !== "undefined" ? event.data : "unknown";
    console.warn("YouTube 플레이어 오류", { code });
    showYoutubeLoadingMessage("영상 재생에 문제가 생겼습니다.", { error: true });
    if (playlistPlayback && playlistPlayback.active) {
      schedulePlaylistSkipAfterError_();
    }
  }

  function destroyYoutubePlayer_(clearFrame = true) {
    clearYoutubeLoadingTimers_();
    clearPlaylistSkipTimer_();
    clearPlaylistSegmentWatcher_();
    clearPlaylistVolumeFade_();

    if (youtubePlayer) {
      try {
        youtubePlayer.stopVideo && youtubePlayer.stopVideo();
      } catch (err) {}

      try {
        youtubePlayer.destroy && youtubePlayer.destroy();
      } catch (err) {
        console.warn("YouTube 플레이어 정리 실패", err);
      }

      youtubePlayer = null;
    }

    if (clearFrame && els.youtubeFrameWrap) {
      els.youtubeFrameWrap.innerHTML = "";
    }
  }

  function isCurrentYoutubeToken_(token) {
    return token === youtubePlayerToken && els.youtubeModal && !els.youtubeModal.hidden;
  }

  function scheduleYoutubeLoadingStatus_(token) {
    clearYoutubeLoadingStatusTimer_();
    youtubeLoadingStatusTimer = window.setTimeout(() => {
      if (!isCurrentYoutubeToken_(token) || youtubeStartedPlaying) return;
      showYoutubeLoadingMessage("영상의 응답이 느린 것 같아요…");

      youtubeSlowSecondTimer = window.setTimeout(() => {
        if (!isCurrentYoutubeToken_(token) || youtubeStartedPlaying) return;
        showYoutubeLoadingMessage("영상의 응답을 조금 더 기다려 보는 중……");

        youtubeNoResponseTimer = window.setTimeout(() => {
          if (!isCurrentYoutubeToken_(token) || youtubeStartedPlaying) return;
          showYoutubeLoadingMessage("영상이 응답하지 않아 팝업을 닫을게요…", { error: true });
          youtubeNoResponseTimer = window.setTimeout(() => {
            if (!isCurrentYoutubeToken_(token) || youtubeStartedPlaying) return;
            if (playlistPlayback && playlistPlayback.active) {
              playNextPlaylistItem_("no_response");
            } else {
              closeYoutubeModal();
            }
          }, YOUTUBE_NO_RESPONSE_NOTICE_MS);
        }, YOUTUBE_NO_RESPONSE_CLOSE_MS);
      }, YOUTUBE_SLOW_SECOND_MESSAGE_MS);
    }, YOUTUBE_SLOW_FIRST_MESSAGE_MS);
  }

  function scheduleYoutubeBufferingStatus_(token) {
    clearYoutubeBufferingTimer_();
    if (!youtubeStartedPlaying) return;
    youtubeBufferingTimer = window.setTimeout(() => {
      if (!isCurrentYoutubeToken_(token) || !youtubeStartedPlaying) return;
      showYoutubeLoadingMessage("버퍼링 중…");
    }, 1500);
  }

  function clearYoutubeLoadingTimers_() {
    clearYoutubeLoadingStatusTimer_();
    clearYoutubeBufferingTimer_();
    if (youtubeLoadingFadeTimer) {
      window.clearTimeout(youtubeLoadingFadeTimer);
      youtubeLoadingFadeTimer = null;
    }
  }

  function clearYoutubeLoadingStatusTimer_() {
    if (youtubeLoadingStatusTimer) {
      window.clearTimeout(youtubeLoadingStatusTimer);
      youtubeLoadingStatusTimer = null;
    }
    if (youtubeSlowSecondTimer) {
      window.clearTimeout(youtubeSlowSecondTimer);
      youtubeSlowSecondTimer = null;
    }
    if (youtubeNoResponseTimer) {
      window.clearTimeout(youtubeNoResponseTimer);
      youtubeNoResponseTimer = null;
    }
  }

  function clearYoutubeBufferingTimer_() {
    if (youtubeBufferingTimer) {
      window.clearTimeout(youtubeBufferingTimer);
      youtubeBufferingTimer = null;
    }
  }

  function getYoutubeStartSecondsFromRawUrl(url) {
    const raw = normalizeYoutubeUrlForParse(String(url || "").trim());
    if (!raw) return 0;

    try {
      const parsed = new URL(raw);
      return getYoutubeStartSecondsFromUrl(raw, parsed);
    } catch {
      return 0;
    }
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



  function getSearchFieldValues(song, mode) {
    const titleValues = [getDisplayTitle(song), ...getTitleValues(song)];
    const artistValues = [getDisplayArtist(song), ...getArtistValues(song)];
    const dateValues = [formatPlainDate(song), formatSongDate(song), `${song.year}-${song.month}-${song.day}`];
    const idValues = [song && song.id];

    if (mode === "title") return titleValues;
    if (mode === "artist") return artistValues;
    if (mode === "date") return dateValues;

    return [
      ...titleValues,
      ...artistValues,
      ...dateValues,
      ...idValues
    ].filter(Boolean);
  }

  function getSearchHaystack(song, mode) {
    return normalizeSearchText(getSearchFieldValues(song, mode).join(" "));
  }

  function matchesSearchQuery(song, mode, query) {
    const exactTerms = Array.isArray(query.exactTerms) ? query.exactTerms : [];
    const terms = Array.isArray(query.terms) ? query.terms : [];

    if (exactTerms.length) {
      const exactValues = new Set(getSearchFieldValues(song, mode).map(normalizeSearchText).filter(Boolean));
      if (exactTerms.some(term => exactValues.has(term))) return true;
      if (query.exactOnly) return false;
    }

    if (!terms.length) return false;
    const haystack = getSearchHaystack(song, mode);
    return terms.some(term => haystack.includes(term));
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

  function normalizePlaylistEnabled(settings) {
    if (!settings || typeof settings !== "object") return false;
    return String(settings.playlist_enabled || "").trim() === "TRUE";
  }

  function applyPlaylistEnabledState(enabled) {
    document.documentElement.classList.toggle("playlist-disabled", !enabled);
    (els.playlistFeatureElements || []).forEach(element => {
      if (element === els.playlistModal) {
        if (!enabled) element.hidden = true;
        return;
      }

      element.hidden = !enabled;
    });

    if (!enabled) {
      closePlaylistModal();
      if (playlistPlayback && playlistPlayback.active) {
        closeYoutubeModal();
      }
    }
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
      .map(row => makeCoverItemFromUrl(
        String(row.value || "").trim(),
        { section: String(row.link || "").trim() === "TRUE" ? "오리지널 곡" : "커버곡" }
      ))
      .filter(Boolean);
  }

  function makeCoverItemFromUrl(url, options = {}) {
    const normalizedUrl = normalizeYoutubeUrlForParse(url);
    if (!normalizedUrl) return null;
    const videoId = extractYoutubeVideoId(normalizedUrl);
    if (!videoId) return null;
    const section = String(options.section || "커버곡").trim() || "커버곡";

    return {
      id: videoId,
      url: normalizedUrl,
      title: "커버곡을 불러오는 중...",
      section,
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
          section: String(item && item.section || made.section || "커버곡").trim() || "커버곡",
          thumbnail: String(item && item.thumbnail || made.thumbnail || "").trim() || made.thumbnail,
          fallbackThumbnail: String(item && item.fallbackThumbnail || made.fallbackThumbnail || "").trim() || made.fallbackThumbnail
        };
      })
      .filter(Boolean));
  }


  function extractRecItemsFromRows(rows) {
    return rows
      .filter(row => String(row.key || "").trim().toLowerCase() === "rec")
      .map(row => makeRecItemFromUrl(
        String(row.value || "").trim(),
        String(row.link || row.title || "").trim()
      ))
      .filter(Boolean);
  }

  function makeRecItemFromUrl(url, title = "") {
    const normalizedUrl = normalizeYoutubeUrlForParse(String(url || "").trim());
    if (!normalizedUrl) return null;

    const videoId = extractYoutubeVideoId(normalizedUrl);
    const playlistId = extractYoutubePlaylistId(normalizedUrl);
    if (!videoId && !playlistId) return null;

    return {
      id: videoId || playlistId,
      url: normalizedUrl,
      title: String(title || "").trim() || "추천 팬 영상을 불러오는 중...",
      thumbnail: videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg` : "",
      fallbackThumbnail: videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "",
      type: playlistId && !videoId ? "playlist" : "video"
    };
  }

  function normalizeRecItems(input) {
    if (!Array.isArray(input)) return [];
    return shuffleArray(input
      .map(item => {
        if (typeof item === "string") return makeRecItemFromUrl(item);
        const url = String(item && item.url || item && item.value || "").trim();
        const made = makeRecItemFromUrl(url, String(item && item.title || "").trim());
        if (!made) return null;
        return {
          ...made,
          title: String(item && item.title || made.title || "추천 팬 영상").trim() || "추천 팬 영상",
          thumbnail: String(item && item.thumbnail || made.thumbnail || "").trim() || made.thumbnail,
          fallbackThumbnail: String(item && item.fallbackThumbnail || made.fallbackThumbnail || "").trim() || made.fallbackThumbnail,
          type: String(item && item.type || made.type || "video").trim() || "video"
        };
      })
      .filter(Boolean));
  }

  function extractYoutubePlaylistId(url) {
    const raw = normalizeYoutubeUrlForParse(String(url || "").trim());
    if (!raw) return "";

    try {
      const parsed = new URL(raw);
      const host = parsed.hostname.replace(/^www\./, "");
      if (!host.endsWith("youtube.com") && host !== "youtu.be") return "";
      return String(parsed.searchParams.get("list") || "").trim();
    } catch {
      return "";
    }
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
      els.coverDescription.textContent = count ? `커버곡 ${count}곡을 표시합니다.` : "표시할 커버곡이 없습니다.";
    }

    if (!count) {
      if (els.coverEmpty) els.coverEmpty.hidden = false;
      if (els.coverCarousel) els.coverCarousel.hidden = true;
      setCoverNavHidden(true);
      els.coverTrack.innerHTML = "";
      return;
    }

    if (els.coverEmpty) els.coverEmpty.hidden = true;
    if (els.coverCarousel) els.coverCarousel.hidden = false;
    setCoverNavHidden(false);

    coverIndex = wrapIndex(coverIndex, count);
    const visible = getVisibleCoverItems();
    els.coverTrack.innerHTML = visible.map(renderCoverCard).join("");
    bindCoverCards();
    enrichCoverTitles(visible);
  }

  function setCoverNavHidden(hidden) {
    if (els.coverPrevButton) els.coverPrevButton.hidden = Boolean(hidden);
    if (els.coverNextButton) els.coverNextButton.hidden = Boolean(hidden);
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
      <a class="cover-card ${isCenter ? "active" : "side"}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" data-cover-index="${escapeHtml(item._actualIndex)}" data-carousel-playlist-kind="cover" data-playlist-section="${escapeHtml(item.section || "커버곡")}" data-playlist-hint="우클릭하면 플레이리스트에 추가할 수 있어요!" title="우클릭하면 플레이리스트에 추가할 수 있어요!">
        <div class="cover-thumb-wrap">
          <img class="cover-thumb" src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" onerror="if(this.dataset.fallback){this.onerror=null;this.src=this.dataset.fallback;}" data-fallback="${escapeHtml(item.fallbackThumbnail || "")}" />
        </div>
        <div class="cover-title" data-cover-title="${escapeHtml(item.id)}">${escapeHtml(item.title || "커버곡")}</div>
      </a>
    `;
  }

  function bindCoverCards() {
    bindCarouselPlaylistAddCards_(els.coverTrack, "cover");
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

  function collapseRecSection() {
    if (els.recDetails && els.recDetails.open) els.recDetails.open = false;
  }

  function renderRecSection() {
    if (!els.recDetails || !els.recTrack) return;

    const count = recItems.length;
    if (els.recDescription) {
      els.recDescription.textContent = count ? `추천 팬 영상 ${count}개를 표시합니다.` : "표시할 추천 팬 영상이 없습니다.";
    }

    if (!count) {
      if (els.recEmpty) els.recEmpty.hidden = false;
      if (els.recCarousel) els.recCarousel.hidden = true;
      setRecNavHidden(true);
      els.recTrack.innerHTML = "";
      return;
    }

    if (els.recEmpty) els.recEmpty.hidden = true;
    if (els.recCarousel) els.recCarousel.hidden = false;
    setRecNavHidden(false);

    recIndex = wrapIndex(recIndex, count);
    const visible = getVisibleRecItems();
    els.recTrack.innerHTML = visible.map(item => renderCarouselMediaCard(item, "rec")).join("");
    bindRecCards();
    enrichRecTitles(visible);
  }

  function setRecNavHidden(hidden) {
    if (els.recPrevButton) els.recPrevButton.hidden = Boolean(hidden);
    if (els.recNextButton) els.recNextButton.hidden = Boolean(hidden);
  }

  function getVisibleRecItems() {
    const count = recItems.length;
    if (!count) return [];
    return [-1, 0, 1].map(offset => {
      const actualIndex = wrapIndex(recIndex + offset, count);
      return { ...recItems[actualIndex], _actualIndex: actualIndex, _slot: offset };
    });
  }

  function renderCarouselMediaCard(item, kind) {
    const isCenter = item._slot === 0;
    const title = item.title || (kind === "rec" ? "추천 팬 영상" : "커버곡");
    const indexAttr = kind === "rec" ? "data-rec-index" : "data-cover-index";
    const titleAttr = kind === "rec" ? "data-rec-title" : "data-cover-title";
    const thumb = item.thumbnail
      ? `<img class="cover-thumb" src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" onerror="if(this.dataset.fallback){this.onerror=null;this.src=this.dataset.fallback;}else{this.remove();this.parentElement.classList.add('cover-thumb-placeholder');}" data-fallback="${escapeHtml(item.fallbackThumbnail || "")}" />`
      : `<div class="cover-thumb-placeholder-content">${item.type === "playlist" ? "▶ LIST" : "▶"}</div>`;
    const thumbClass = item.thumbnail ? "cover-thumb-wrap" : "cover-thumb-wrap cover-thumb-placeholder";

    return `
      <a class="cover-card ${isCenter ? "active" : "side"}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" ${indexAttr}="${escapeHtml(item._actualIndex)}" data-carousel-playlist-kind="${escapeHtml(kind)}" data-playlist-hint="우클릭하면 플레이리스트에 추가할 수 있어요!" title="우클릭하면 플레이리스트에 추가할 수 있어요!">
        <div class="${thumbClass}">
          ${thumb}
        </div>
        <div class="cover-title" ${titleAttr}="${escapeHtml(item.id)}">${escapeHtml(title)}</div>
      </a>
    `;
  }

  function bindRecCards() {
    bindCarouselPlaylistAddCards_(els.recTrack, "rec");
  }

  async function enrichRecTitles(items) {
    const uniqueItems = items.filter(item => item && item.url && (!recItems[item._actualIndex] || recItems[item._actualIndex].title === "추천 팬 영상을 불러오는 중..."));
    await Promise.all(uniqueItems.map(async item => {
      try {
        const title = await fetchYoutubeOembedTitle(item.url);
        if (!title) return;
        const target = recItems[item._actualIndex];
        if (target) target.title = title;
        if (els.recTrack) {
          els.recTrack.querySelectorAll(`[data-rec-title="${cssEscape(item.id)}"]`).forEach(el => {
            el.textContent = title;
          });
        }
      } catch (err) {
        const target = recItems[item._actualIndex];
        if (target && target.title === "추천 팬 영상을 불러오는 중...") target.title = target.type === "playlist" ? "YouTube 플레이리스트" : "YouTube 추천 팬 영상";
      }
    }));
  }

  function moveRecCarousel(direction) {
    if (!recItems.length || recMoving) return;
    recMoving = true;
    if (els.recTrack) {
      els.recTrack.classList.remove("move-left", "move-right");
      void els.recTrack.offsetWidth;
      els.recTrack.classList.add(direction > 0 ? "move-left" : "move-right");
    }

    window.setTimeout(() => {
      recIndex = wrapIndex(recIndex + direction, recItems.length);
      if (els.recTrack) els.recTrack.classList.remove("move-left", "move-right");
      recMoving = false;
      renderRecSection();
    }, 260);
  }

  function startRecAutoTimer() {
    if (recAutoTimer) window.clearInterval(recAutoTimer);
    recAutoTimer = window.setInterval(() => {
      if (!shouldAutoMoveRec()) return;
      moveRecCarousel(-1);
    }, 10000);
  }

  function shouldAutoMoveRec() {
    if (!els.recDetails || !els.recDetails.open) return false;
    if (!els.recCarousel || els.recCarousel.hidden) return false;
    if (recHover || recMoving) return false;
    if (recItems.length <= 1) return false;
    return isElementFullyVisible(els.recDetails);
  }

  function bindCarouselPlaylistAddCards_(root, fallbackKind) {
    if (!root) return;

    root.querySelectorAll(".cover-card[data-carousel-playlist-kind]").forEach(card => {
      let longPressTimer = null;
      let longPressTriggered = false;

      card.addEventListener("contextmenu", event => {
        if (!isDesktopContextCopyEnabled()) return;
        event.preventDefault();
        handleCarouselPlaylistAdd_(card, card.dataset.carouselPlaylistKind || fallbackKind);
      });

      card.addEventListener("touchstart", () => {
        longPressTriggered = false;
        if (!playlistEnabled) return;
        longPressTimer = window.setTimeout(() => {
          longPressTriggered = true;
          handleCarouselPlaylistAdd_(card, card.dataset.carouselPlaylistKind || fallbackKind);
        }, 700);
      }, { passive: true });

      ["touchend", "touchcancel", "touchmove"].forEach(type => {
        card.addEventListener(type, event => {
          if (longPressTimer) {
            window.clearTimeout(longPressTimer);
            longPressTimer = null;
          }
          if (type === "touchend" && longPressTriggered) {
            event.preventDefault();
          }
        }, { passive: false });
      });

      card.addEventListener("click", event => {
        if (longPressTriggered) {
          event.preventDefault();
          longPressTriggered = false;
        }
      });
    });
  }

  function handleCarouselPlaylistAdd_(card, kind) {
    if (!playlistEnabled) return;

    const entry = makeExternalPlaylistEntryFromCard_(card, kind);
    if (!entry) {
      showLikeNoticeModal("[알림]", "YouTube 영상만 플레이리스트에 추가할 수 있습니다.");
      return;
    }

    const selected = getSelectedPlaylist();
    if (!selected) {
      openPlaylistModal();
      showLikeNoticeModal("[알림]", "먼저 플레이리스트를 생성하거나 선택해주세요.");
      return;
    }

    if (playlistHasItem_(selected, entry)) {
      showCooldownText("이미 플레이리스트에 포함된 영상입니다.");
      return;
    }

    selected.items.push(entry);
    savePlaylists();
    renderPlaylistSummary();
    renderPlaylistManager();
    showCooldownText(`${entry.title} 영상을 ${selected.name}에 추가했습니다.`);
    openPlaylistModal();
  }

  function bindCarouselSwipe(element, moveFn) {
    if (!element || typeof moveFn !== "function") return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchTracking = false;
    let suppressNextClick = false;
    let lastWheelAt = 0;

    const shouldMove = (dx, dy) => {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      return absX >= 46 && absX >= absY * 1.25;
    };

    const moveFromDelta = dx => {
      moveFn(dx < 0 ? 1 : -1);
    };

    element.addEventListener("click", event => {
      if (!suppressNextClick) return;
      event.preventDefault();
      event.stopPropagation();
      if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
      suppressNextClick = false;
    }, true);

    element.addEventListener("wheel", event => {
      const dominant = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      if (Math.abs(dominant) < 18) return;

      const now = Date.now();
      if (now - lastWheelAt < 420) return;
      lastWheelAt = now;
      event.preventDefault();
      moveFn(dominant > 0 ? 1 : -1);
    }, { passive: false });

    element.addEventListener("touchstart", event => {
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchTracking = true;
    }, { passive: true });

    element.addEventListener("touchend", event => {
      if (!touchTracking) return;
      touchTracking = false;
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;

      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      if (!shouldMove(dx, dy)) return;

      event.preventDefault();
      suppressNextClick = true;
      moveFromDelta(dx);
      window.setTimeout(() => { suppressNextClick = false; }, 120);
    }, { passive: false });
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
      els.likeNoticeModalMessage.innerHTML = `
        <strong class="mini-modal-title">${escapeHtml(safeTitle)}</strong>
        <span class="mini-modal-separator" aria-hidden="true"></span>
        <span class="mini-modal-body">${escapeHtmlWithBr(safeMessage)}</span>
      `;
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
    if (
      els.youtubeModal && els.youtubeModal.hidden &&
      (!els.playlistModal || els.playlistModal.hidden)
    ) document.body.classList.remove("modal-open");
  }

  function loadPlaylists() {
    try {
      const raw = localStorage.getItem(PLAYLIST_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      playlists = Array.isArray(parsed) ? parsed.map(normalizePlaylist_).filter(Boolean) : [];
    } catch (err) {
      console.warn("[플레이리스트 로딩 실패]", err);
      playlists = [];
    }

    if (!playlists.length) {
      playlists = [{ id: makePlaylistId_(), name: DEFAULT_PLAYLIST_NAME, items: getDefaultPlaylistSeedItems_() }];
      selectedPlaylistId = playlists[0].id;
      savePlaylists();
      return;
    }

    selectedPlaylistId = String(localStorage.getItem(PLAYLIST_SELECTED_KEY) || "");
    if (!playlists.some(list => list.id === selectedPlaylistId)) {
      selectedPlaylistId = playlists[0] ? playlists[0].id : "";
      writeSelectedPlaylistId_();
    }
  }

  function getDefaultPlaylistSeedItems_() {
    const seen = new Set();
    return (DEFAULT_PLAYLIST_SEED_ITEMS || [])
      .map(normalizePlaylistItem_)
      .filter(Boolean)
      .filter(item => {
        const key = getPlaylistItemKey_(item);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normalizePlaylist_(list) {
    if (!list || typeof list !== "object") return null;
    const id = String(list.id || "").trim() || makePlaylistId_();
    const name = String(list.name || "").trim() || "새 플레이리스트";
    const seen = new Set();
    const items = Array.isArray(list.items)
      ? list.items.map(normalizePlaylistItem_).filter(Boolean).filter(value => {
          const key = getPlaylistItemKey_(value);
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      : [];
    return { id, name, items };
  }

  function savePlaylists() {
    try {
      localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlists));
      writeSelectedPlaylistId_();
    } catch (err) {
      console.warn("[플레이리스트 저장 실패]", err);
      showLikeNoticeModal("[알림]", "플레이리스트 저장에 실패했습니다.");
    }
  }

  function writeSelectedPlaylistId_() {
    try {
      if (selectedPlaylistId) localStorage.setItem(PLAYLIST_SELECTED_KEY, selectedPlaylistId);
      else localStorage.removeItem(PLAYLIST_SELECTED_KEY);
    } catch {}
  }

  function makePlaylistId_() {
    return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getSelectedPlaylist() {
    return playlists.find(list => list.id === selectedPlaylistId) || null;
  }


  function getPlaylistItemKey_(item) {
    if (typeof item === "string") return `song:${item}`;
    if (item && typeof item === "object") {
      return String(item.key || item.id || item.url || "").trim();
    }
    return "";
  }

  function normalizePlaylistItem_(item) {
    if (typeof item === "string") return item.trim();
    if (!item || typeof item !== "object") return "";

    const type = String(item.type || "").trim();
    if (type !== "external") return String(item.id || "").trim();

    const url = String(item.url || "").trim();
    const videoId = String(item.videoId || extractYoutubeVideoId(url) || "").trim();
    const playlistId = String(item.playlistId || extractYoutubePlaylistId(url) || "").trim();
    const title = String(item.title || "YouTube 영상").trim();
    const section = String(item.section || "외부 영상").trim();
    const key = String(item.key || `external:${videoId || playlistId || url}`).trim();

    if (!url || (!videoId && !playlistId)) return "";

    return {
      type: "external",
      key,
      url,
      videoId,
      playlistId,
      title,
      section
    };
  }

  function playlistHasItem_(list, itemOrKey) {
    if (!list || !Array.isArray(list.items)) return false;
    const key = typeof itemOrKey === "string" && itemOrKey.includes(":")
      ? itemOrKey
      : getPlaylistItemKey_(itemOrKey);
    if (!key) return false;
    return list.items.some(item => getPlaylistItemKey_(item) === key);
  }

  function makeExternalPlaylistEntryFromCard_(card, kind) {
    const url = String(card && card.href || "").trim();
    const title = String(card && card.querySelector(".cover-title") && card.querySelector(".cover-title").textContent || "").trim()
      || (kind === "rec" ? "추천 팬 영상" : "커버곡");
    const section = kind === "rec"
      ? "추천 팬 영상"
      : String(card && card.dataset && card.dataset.playlistSection || "커버곡").trim() || "커버곡";
    const videoId = extractYoutubeVideoId(url);
    const playlistId = extractYoutubePlaylistId(url);

    if (!url || (!videoId && !playlistId)) return null;

    return {
      type: "external",
      key: `external:${videoId || playlistId || url}`,
      url,
      videoId,
      playlistId,
      title,
      section
    };
  }

  function getPlaylistPlayableItem_(item) {
    if (typeof item === "string") {
      const song = findSongById(item);
      if (!song || !canAddSongToPlaylist(song)) return null;
      return {
        type: "song",
        key: getPlaylistItemKey_(item),
        song,
        title: getDisplayTitle(song),
        artist: String(song.artist || "").trim() || getDisplayArtist(song),
        section: "",
        url: song.link,
        videoId: extractYoutubeVideoId(song.link),
        playlistId: "",
        start: timelineToSeconds(song.timeline),
        end: timelineToSeconds(song.end),
        hasSegment: true
      };
    }

    const normalized = normalizePlaylistItem_(item);
    if (!normalized || typeof normalized !== "object") return null;

    return {
      type: "external",
      key: getPlaylistItemKey_(normalized),
      song: null,
      title: normalized.title || "YouTube 영상",
      artist: normalized.section || "외부 영상",
      section: normalized.section || "외부 영상",
      url: normalized.url,
      videoId: normalized.videoId || extractYoutubeVideoId(normalized.url),
      playlistId: normalized.playlistId || extractYoutubePlaylistId(normalized.url),
      start: 0,
      end: 0,
      hasSegment: false
    };
  }

  function renderPlaylistSummary() {
    const selected = getSelectedPlaylist();
    if (els.playlistSummaryName) {
      els.playlistSummaryName.textContent = selected ? selected.name : "플레이리스트 없음";
    }
  }

  function renderPlaylistManager() {
    renderPlaylistSummary();
    if (!els.playlistSelect) return;

    els.playlistSelect.innerHTML = playlists.map(list => `
      <option value="${escapeHtml(list.id)}" ${list.id === selectedPlaylistId ? "selected" : ""}>${escapeHtml(list.name)} (${list.items.length})</option>
    `).join("");

    const selected = getSelectedPlaylist();
    resetPlaylistNameInputUi_();

    if (els.playlistEmpty) els.playlistEmpty.hidden = Boolean(selected && selected.items.length);

    if (!els.playlistItems) return;
    if (!selected || !selected.items.length) {
      els.playlistItems.innerHTML = "";
      updatePlaylistBulkButtons_();
      return;
    }

    els.playlistItems.innerHTML = selected.items.map((item, index) => {
      const playable = getPlaylistPlayableItem_(item);
      const key = getPlaylistItemKey_(item);
      const title = playable ? playable.title : key;
      const meta = playable && playable.type === "song"
        ? [getDisplayArtist(playable.song), formatSongDateIso_(playable.song), [playable.song.timeline || "", playable.song.end || ""].filter(Boolean).join(" ~ ")].filter(Boolean).join(" · ")
        : playable
          ? playable.section
          : "재생할 수 없는 항목";

      return `
        <div class="playlist-item-row" draggable="true" data-playlist-item-id="${escapeHtml(key)}" data-playlist-item-index="${index}">
          <label class="playlist-item-check-wrap" title="선택">
            <input class="playlist-item-check" type="checkbox" data-playlist-check-id="${escapeHtml(key)}" aria-label="선택" />
          </label>
          <div class="playlist-item-main">
            <strong>${index + 1}. ${escapeHtml(title)}</strong>
            <span>${escapeHtml(meta)}</span>
          </div>
          <div class="playlist-item-mobile-move" aria-label="모바일 순서 변경">
            <button class="playlist-item-move-button" type="button" data-playlist-move-id="${escapeHtml(key)}" data-playlist-move-step="-1" ${index === 0 ? "disabled" : ""} aria-label="위로 이동">↑</button>
            <button class="playlist-item-move-button" type="button" data-playlist-move-id="${escapeHtml(key)}" data-playlist-move-step="1" ${index === selected.items.length - 1 ? "disabled" : ""} aria-label="아래로 이동">↓</button>
          </div>
          <button class="playlist-item-remove" type="button" data-playlist-remove-id="${escapeHtml(key)}" aria-label="삭제">×</button>
        </div>
      `;
    }).join("");

    bindPlaylistItemRowEvents_();
    updatePlaylistBulkButtons_();
  }

  function bindPlaylistItemRowEvents_() {
    if (!els.playlistItems) return;

    els.playlistItems.querySelectorAll("[data-playlist-remove-id]").forEach(button => {
      button.addEventListener("click", () => {
        removeSongFromSelectedPlaylist(button.dataset.playlistRemoveId || "");
      });
    });

    els.playlistItems.querySelectorAll("[data-playlist-check-id]").forEach(input => {
      input.addEventListener("change", updatePlaylistBulkButtons_);
      input.addEventListener("click", event => event.stopPropagation());
    });

    els.playlistItems.querySelectorAll("[data-playlist-move-id]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const id = String(button.dataset.playlistMoveId || "").trim();
        const step = Number(button.dataset.playlistMoveStep || 0);
        moveSelectedPlaylistItemByStep_(id, step);
      });
    });

    els.playlistItems.querySelectorAll(".playlist-item-row").forEach(row => {
      row.addEventListener("dragstart", event => {
        const target = event.target;
        if (target && target.closest && target.closest("button,input,label")) {
          event.preventDefault();
          return;
        }
        row.classList.add("dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", row.dataset.playlistItemId || "");
      });

      row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        els.playlistItems.querySelectorAll(".playlist-item-row.drag-over").forEach(item => item.classList.remove("drag-over"));
      });

      row.addEventListener("dragover", event => {
        event.preventDefault();
        row.classList.add("drag-over");
        event.dataTransfer.dropEffect = "move";
      });

      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over");
      });

      row.addEventListener("drop", event => {
        event.preventDefault();
        row.classList.remove("drag-over");
        const fromId = event.dataTransfer.getData("text/plain");
        const toId = row.dataset.playlistItemId || "";
        reorderSelectedPlaylistItem_(fromId, toId);
      });
    });
  }

  function updatePlaylistBulkButtons_() {
    const selected = getSelectedPlaylist();
    const checkedCount = els.playlistItems
      ? els.playlistItems.querySelectorAll("[data-playlist-check-id]:checked").length
      : 0;

    if (els.playlistRemoveSelectedButton) {
      els.playlistRemoveSelectedButton.disabled = checkedCount === 0;
      els.playlistRemoveSelectedButton.textContent = checkedCount ? `선택삭제 (${checkedCount})` : "선택삭제";
    }

    if (els.playlistClearButton) {
      els.playlistClearButton.disabled = !(selected && selected.items.length);
    }
  }

  function getCheckedPlaylistItemIds_() {
    if (!els.playlistItems) return [];
    return Array.from(els.playlistItems.querySelectorAll("[data-playlist-check-id]:checked"))
      .map(input => String(input.dataset.playlistCheckId || "").trim())
      .filter(Boolean);
  }

  function findPlaylistItemIndexByKey_(list, key) {
    if (!list || !Array.isArray(list.items)) return -1;
    return list.items.findIndex(item => getPlaylistItemKey_(item) === key);
  }

  function reorderSelectedPlaylistItem_(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return;
    const selected = getSelectedPlaylist();
    if (!selected) return;
    const fromIndex = findPlaylistItemIndexByKey_(selected, fromId);
    const toIndex = findPlaylistItemIndexByKey_(selected, toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const [item] = selected.items.splice(fromIndex, 1);
    selected.items.splice(toIndex, 0, item);
    savePlaylists();
    renderPlaylistManager();
  }

  function moveSelectedPlaylistItemByStep_(id, step) {
    const selected = getSelectedPlaylist();
    const itemId = String(id || "").trim();
    const direction = Number(step || 0);

    if (!selected || !itemId || !direction) return;

    const fromIndex = findPlaylistItemIndexByKey_(selected, itemId);
    const toIndex = fromIndex + direction;

    if (fromIndex < 0 || toIndex < 0 || toIndex >= selected.items.length) return;

    const [item] = selected.items.splice(fromIndex, 1);
    selected.items.splice(toIndex, 0, item);
    savePlaylists();
    renderPlaylistManager();
  }

  function removeSelectedPlaylistItems_() {
    const selected = getSelectedPlaylist();
    if (!selected) return;
    const ids = getCheckedPlaylistItemIds_();
    if (!ids.length) return;
    if (!window.confirm(`선택한 ${ids.length}곡을 플레이리스트에서 삭제할까요?`)) return;
    const removeSet = new Set(ids);
    selected.items = selected.items.filter(item => !removeSet.has(getPlaylistItemKey_(item)));
    savePlaylists();
    renderPlaylistManager();
  }

  function clearSelectedPlaylistItems_() {
    const selected = getSelectedPlaylist();
    if (!selected || !selected.items.length) return;
    if (!window.confirm(`${selected.name}의 모든 곡을 삭제할까요?`)) return;
    selected.items = [];
    savePlaylists();
    renderPlaylistManager();
  }

  function formatSongDateIso_(song) {
    if (!song) return "";
    const year = Number(song.year || 0);
    const month = Number(song.month || 0);
    const day = Number(song.day || 0);
    if (!year || !month || !day) return "";
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function resetPlaylistNameInputUi_() {
    pendingPlaylistNameAction = "";
    if (els.playlistNameInput) {
      els.playlistNameInput.value = "";
      els.playlistNameInput.hidden = true;
      els.playlistNameInput.dataset.action = "";
    }
    updatePlaylistDeleteButtonText_();
  }

  function showPlaylistNameInput_(action) {
    pendingPlaylistNameAction = action;
    if (!els.playlistNameInput) return;
    els.playlistNameInput.value = "";
    els.playlistNameInput.dataset.action = action;
    els.playlistNameInput.hidden = false;
    updatePlaylistDeleteButtonText_();
    window.setTimeout(() => els.playlistNameInput && els.playlistNameInput.focus(), 20);
  }

  function isPlaylistNameInputVisible_() {
    return Boolean(els.playlistNameInput && !els.playlistNameInput.hidden);
  }

  function updatePlaylistDeleteButtonText_() {
    if (!els.playlistDeleteButton) return;

    if (isPlaylistNameInputVisible_()) {
      els.playlistDeleteButton.textContent = "취소";
      els.playlistDeleteButton.disabled = false;
      return;
    }

    els.playlistDeleteButton.textContent = "삭제";
    els.playlistDeleteButton.disabled = playlists.length <= 1;
  }

  function playlistNameExists_(name, excludeId = "") {
    const target = normalizeSearchText(name);
    if (!target) return false;

    return playlists.some(list => {
      if (excludeId && list.id === excludeId) return false;
      return normalizeSearchText(list.name) === target;
    });
  }

  function consumePlaylistNameAction_(action) {
    if (!els.playlistNameInput || els.playlistNameInput.hidden || pendingPlaylistNameAction !== action) {
      showPlaylistNameInput_(action);
      return "";
    }

    const name = String(els.playlistNameInput.value || "").trim();
    if (!name) {
      showLikeNoticeModal("[알림]", "플레이리스트 이름을 입력해주세요.");
      return "";
    }

    resetPlaylistNameInputUi_();
    return name;
  }

  function bindPlaylistManagerEvents() {
    if (els.playlistOpenButton) {
      els.playlistOpenButton.addEventListener("click", openPlaylistModal);
    }

    if (els.playlistModal) {
      els.playlistModal.addEventListener("click", event => {
        if (event.target === els.playlistModal) closePlaylistModal();
      });
    }

    if (els.playlistModalClose) {
      els.playlistModalClose.addEventListener("click", closePlaylistModal);
    }

    if (els.playlistCreateButton) {
      els.playlistCreateButton.addEventListener("click", () => {
        const name = consumePlaylistNameAction_("create");
        if (!name) return;

        if (playlistNameExists_(name)) {
          showLikeNoticeModal("[알림]", "이미 같은 이름의 플레이리스트가 있습니다.");
          showPlaylistNameInput_("create");
          return;
        }

        const list = { id: makePlaylistId_(), name, items: [] };
        playlists.push(list);
        selectedPlaylistId = list.id;
        savePlaylists();
        renderPlaylistManager();
        showCooldownText(`플레이리스트 생성: ${name}`);
      });
    }

    if (els.playlistSelect) {
      els.playlistSelect.addEventListener("change", () => {
        selectedPlaylistId = els.playlistSelect.value || "";
        resetPlaylistNameInputUi_();
        savePlaylists();
        renderPlaylistManager();
      });
    }

    if (els.playlistRenameButton) {
      els.playlistRenameButton.addEventListener("click", () => {
        const selected = getSelectedPlaylist();
        if (!selected) return;
        const name = consumePlaylistNameAction_("rename");
        if (!name) return;

        if (playlistNameExists_(name, selected.id)) {
          showLikeNoticeModal("[알림]", "이미 같은 이름의 플레이리스트가 있습니다.");
          showPlaylistNameInput_("rename");
          return;
        }

        selected.name = name;
        savePlaylists();
        renderPlaylistManager();
        showCooldownText(`플레이리스트 이름 변경: ${name}`);
      });
    }

    if (els.playlistDeleteButton) {
      els.playlistDeleteButton.addEventListener("click", () => {
        if (isPlaylistNameInputVisible_()) {
          resetPlaylistNameInputUi_();
          return;
        }

        const selected = getSelectedPlaylist();
        if (!selected) return;
        if (!window.confirm(`${selected.name} 플레이리스트를 삭제할까요?`)) return;
        playlists = playlists.filter(list => list.id !== selected.id);
        if (!playlists.length) playlists = [{ id: makePlaylistId_(), name: DEFAULT_PLAYLIST_NAME, items: [] }];
        selectedPlaylistId = playlists[0] ? playlists[0].id : "";
        resetPlaylistNameInputUi_();
        savePlaylists();
        renderPlaylistManager();
      });
    }

    if (els.playlistRemoveSelectedButton) {
      els.playlistRemoveSelectedButton.addEventListener("click", removeSelectedPlaylistItems_);
    }

    if (els.playlistClearButton) {
      els.playlistClearButton.addEventListener("click", clearSelectedPlaylistItems_);
    }

    if (els.playlistPlaySequentialButton) {
      els.playlistPlaySequentialButton.addEventListener("click", () => startPlaylistPlayback("sequential"));
    }

    if (els.playlistPlayRandomButton) {
      els.playlistPlayRandomButton.addEventListener("click", () => startPlaylistPlayback("random"));
    }

    if (els.playlistRepeatToggle) {
      els.playlistRepeatToggle.addEventListener("click", () => {
        const repeat = els.playlistRepeatToggle.dataset.repeat !== "1";
        els.playlistRepeatToggle.dataset.repeat = repeat ? "1" : "0";
        els.playlistRepeatToggle.textContent = repeat ? "전체반복" : "반복 안함";
      });
    }
  }

  function bindPlaylistPlayerEvents() {
    if (els.playlistPrevTrackButton) els.playlistPrevTrackButton.addEventListener("click", () => playPreviousPlaylistItem_());
    if (els.playlistNextTrackButton) els.playlistNextTrackButton.addEventListener("click", () => playNextPlaylistItem_("manual"));
    if (els.playlistShowListButton) els.playlistShowListButton.addEventListener("click", openPlaylistModal);
    if (els.playlistOrderToggleButton) {
      els.playlistOrderToggleButton.addEventListener("click", () => {
        if (!playlistPlayback) return;
        const nextMode = playlistPlayback.mode === "random" ? "sequential" : "random";
        const currentItemKey = getPlaylistItemKey_(playlistPlayback.queue[playlistPlayback.index]);
        playlistPlayback.mode = nextMode;
        playlistPlayback.queue = buildPlaylistQueue_(playlistPlayback.list, nextMode);
        const foundIndex = playlistPlayback.queue.findIndex(item => getPlaylistItemKey_(item) === currentItemKey);
        playlistPlayback.index = foundIndex >= 0 ? foundIndex : 0;
        renderPlaylistPlaybackUi_();
      });
    }
    if (els.playlistRepeatPlayerToggle) {
      els.playlistRepeatPlayerToggle.addEventListener("click", () => {
        if (!playlistPlayback) return;
        playlistPlayback.repeat = !playlistPlayback.repeat;
        renderPlaylistPlaybackUi_();
      });
    }
  }

  function openPlaylistModal() {
    if (!playlistEnabled) return;
    renderPlaylistManager();
    if (!els.playlistModal) return;
    els.playlistModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closePlaylistModal() {
    if (!els.playlistModal) return;
    els.playlistModal.hidden = true;
    if (els.youtubeModal && els.youtubeModal.hidden && els.likeDisabledModal && els.likeDisabledModal.hidden) {
      document.body.classList.remove("modal-open");
    }
  }

  function handlePlaylistAddButton(button) {
    if (!playlistEnabled) return;
    const id = button.dataset.playlistAddId || "";
    const song = findSongById(id);
    addLikeClickFeedback(button);

    if (button.dataset.playlistDisabled === "1" || !canAddSongToPlaylist(song)) {
      showLikeNoticeModal("[알림]", getPlaylistAddDisabledReason(song));
      return;
    }

    let selected = getSelectedPlaylist();
    if (!selected) {
      openPlaylistModal();
      showLikeNoticeModal("[알림]", "먼저 플레이리스트를 생성하거나 선택해주세요.");
      return;
    }

    if (playlistHasItem_(selected, `song:${id}`)) {
      showCooldownText("이미 플레이리스트에 포함된 곡입니다.");
      return;
    }

    selected.items.push(id);
    savePlaylists();
    renderPlaylistSummary();
    renderPlaylistManager();
    addLikeClickFeedback(button);
    showCooldownText(`${getDisplayTitle(song)} 곡을 ${selected.name}에 추가했습니다.`);
    openPlaylistModal();
  }

  function removeSongFromSelectedPlaylist(id) {
    const selected = getSelectedPlaylist();
    if (!selected) return;
    const key = String(id || "").includes(":") ? String(id || "") : `song:${id}`;
    selected.items = selected.items.filter(item => getPlaylistItemKey_(item) !== key);
    savePlaylists();
    renderPlaylistManager();
  }

  function startPlaylistPlayback(mode = "sequential") {
    if (!playlistEnabled) return;
    const selected = getSelectedPlaylist();
    if (!selected || !selected.items.length) {
      showLikeNoticeModal("[알림]", "재생할 곡이 있는 플레이리스트를 선택해주세요.");
      openPlaylistModal();
      return;
    }

    const validItems = selected.items.filter(item => getPlaylistPlayableItem_(item));
    if (!validItems.length) {
      showLikeNoticeModal("[알림]", "재생 가능한 곡이 없습니다.");
      return;
    }

    const playbackList = { ...selected, items: validItems };
    const repeat = els.playlistRepeatToggle ? els.playlistRepeatToggle.dataset.repeat === "1" : false;
    playlistPlayback = {
      active: true,
      list: playbackList,
      mode,
      repeat,
      queue: buildPlaylistQueue_(playbackList, mode),
      index: 0,
      currentEnd: 0,
      baseVolume: 100,
      fadingOut: false
    };

    closePlaylistModal();
    playPlaylistItemAt_(0);
  }

  function buildPlaylistQueue_(list, mode, options = {}) {
    const items = [...(list && list.items || [])];
    if (mode !== "random" || items.length <= 1) return items;

    const config = typeof options === "string"
      ? { avoidFirstKey: options }
      : (options || {});
    const avoidFirstKey = String(config.avoidFirstKey || "").trim();
    const previousQueue = Array.isArray(config.previousQueue) ? config.previousQueue : [];
    const previousSignature = makePlaylistQueueSignature_(previousQueue);
    const canHaveDifferentOrder = hasDifferentPlaylistQueueOrder_(items, previousQueue, avoidFirstKey);

    let best = [];

    for (let attempt = 0; attempt < 48; attempt += 1) {
      const shuffled = enforcePlaylistQueueFirstKey_(shuffleArray(items), avoidFirstKey);
      const signature = makePlaylistQueueSignature_(shuffled);

      if (!best.length) best = shuffled;

      if (canHaveDifferentOrder && signature !== previousSignature) {
        return shuffled;
      }

      if (!canHaveDifferentOrder && (!avoidFirstKey || getPlaylistItemKey_(shuffled[0]) !== avoidFirstKey)) {
        return shuffled;
      }
    }

    if (canHaveDifferentOrder) {
      const alternative = makeDifferentPlaylistQueueOrder_(items, previousQueue, avoidFirstKey);
      if (alternative.length) return alternative;
    }

    return best.length ? best : enforcePlaylistQueueFirstKey_(items, avoidFirstKey);
  }

  function makePlaylistQueueSignature_(queue) {
    return (queue || []).map(getPlaylistItemKey_).join("\u001f");
  }

  function enforcePlaylistQueueFirstKey_(queue, avoidFirstKey) {
    const arr = [...(queue || [])];
    if (!avoidFirstKey || arr.length <= 1 || getPlaylistItemKey_(arr[0]) !== avoidFirstKey) {
      return arr;
    }

    const swapIndex = arr.findIndex((item, index) => index > 0 && getPlaylistItemKey_(item) !== avoidFirstKey);
    if (swapIndex > 0) {
      [arr[0], arr[swapIndex]] = [arr[swapIndex], arr[0]];
    }

    return arr;
  }

  function hasDifferentPlaylistQueueOrder_(items, previousQueue, avoidFirstKey) {
    const currentSignature = makePlaylistQueueSignature_(previousQueue);
    if (!currentSignature || items.length <= 1) return false;

    const uniqueKeys = [...new Set(items.map(getPlaylistItemKey_).filter(Boolean))];
    if (uniqueKeys.length <= 1) return false;

    if (uniqueKeys.length === 2 && avoidFirstKey) {
      const onlyPossibleFirst = uniqueKeys.find(key => key !== avoidFirstKey);
      const firstPrev = getPlaylistItemKey_(previousQueue[0]);
      return onlyPossibleFirst !== firstPrev;
    }

    return true;
  }

  function makeDifferentPlaylistQueueOrder_(items, previousQueue, avoidFirstKey) {
    const previousSignature = makePlaylistQueueSignature_(previousQueue);
    const base = enforcePlaylistQueueFirstKey_(items, avoidFirstKey);

    for (let shift = 1; shift < base.length; shift += 1) {
      const rotated = enforcePlaylistQueueFirstKey_(base.slice(shift).concat(base.slice(0, shift)), avoidFirstKey);
      if (makePlaylistQueueSignature_(rotated) !== previousSignature) return rotated;
    }

    for (let i = 0; i < base.length; i += 1) {
      for (let j = i + 1; j < base.length; j += 1) {
        const swapped = [...base];
        [swapped[i], swapped[j]] = [swapped[j], swapped[i]];
        const fixed = enforcePlaylistQueueFirstKey_(swapped, avoidFirstKey);
        if (makePlaylistQueueSignature_(fixed) !== previousSignature) return fixed;
      }
    }

    return [];
  }

  function playPlaylistItemAt_(index) {
    if (!playlistPlayback || !playlistPlayback.active) return;
    clearPlaylistSegmentWatcher_();
    clearPlaylistSkipTimer_();
    clearPlaylistVolumeFade_();
    playlistPlayback.fadingOut = false;

    const entry = playlistPlayback.queue[index];
    const playable = getPlaylistPlayableItem_(entry);

    if (!playable || (!playable.videoId && !playable.playlistId)) {
      playlistPlayback.index = index;
      playNextPlaylistItem_("invalid");
      return;
    }

    playlistPlayback.index = index;
    playlistPlayback.currentEnd = playable.hasSegment ? playable.end : 0;

    const token = ++youtubePlayerToken;
    youtubeStartedPlaying = false;
    youtubeInitialLoadingSuppressed = false;

    destroyYoutubePlayer_(false);
    currentModalSongId = playable.type === "song" && playable.song ? playable.song.id : "";
    setModalTitleText_(playable.title || "");
    setModalArtistText_(playable.artist || "");

    if (playable.type === "song" && playable.song) {
      setModalFooterText([formatSongDate(playable.song), playable.song.timeline || ""].filter(Boolean).join(" ／ "));
      updateModalLikePanel(currentModalSongId);
    } else {
      setModalFooterText("");
      setExternalModalPanelsHidden_(true);
    }

    renderPlaylistPlaybackUi_();
    setupMediaSessionPlaybackControls_();

    els.youtubeFrameWrap.innerHTML = `<div id="youtubePlayerMount" class="youtube-player-mount"></div>`;
    els.youtubeModal.hidden = false;
    document.body.classList.add("modal-open");

    if (youtubeInitialLoadingSuppressed) {
      hideYoutubeLoading(true);
    } else {
      showYoutubeLoading();
      scheduleYoutubeLoadingStatus_(token);
    }

    ensureYouTubeIframeApi_()
      .then(() => {
        if (!isCurrentYoutubeToken_(token)) return;
        createYoutubePlayer_(playable.videoId, playable.start, token, playlistPlayback.currentEnd, { playlistId: playable.playlistId });
      })
      .catch(err => {
        if (!isCurrentYoutubeToken_(token)) return;
        console.error("[YouTube API 로딩 실패]", err);
        showYoutubeLoadingMessage("YouTube 플레이어를 불러오지 못했습니다.", { error: true });
        schedulePlaylistSkipAfterError_();
      });
  }

  function playNextPlaylistItem_(reason = "next") {
    if (!playlistPlayback || !playlistPlayback.active) return;
    clearPlaylistSegmentWatcher_();
    clearPlaylistSkipTimer_();

    let nextIndex = playlistPlayback.index + 1;
    if (nextIndex >= playlistPlayback.queue.length) {
      if (!playlistPlayback.repeat) {
        showYoutubeLoadingMessage("플레이리스트 재생이 끝났습니다.");
        window.setTimeout(() => {
          if (playlistPlayback && playlistPlayback.active) closeYoutubeModal();
        }, 900);
        return;
      }
      nextIndex = 0;
      if (playlistPlayback.mode === "random") {
        const previousQueue = [...playlistPlayback.queue];
        const lastKey = getPlaylistItemKey_(playlistPlayback.queue[playlistPlayback.index]);
        playlistPlayback.queue = buildPlaylistQueue_(playlistPlayback.list, "random", {
          avoidFirstKey: lastKey,
          previousQueue
        });
      }
    }
    playPlaylistItemAt_(nextIndex);
  }

  function playPreviousPlaylistItem_() {
    if (!playlistPlayback || !playlistPlayback.active) return;
    let prevIndex = playlistPlayback.index - 1;
    if (prevIndex < 0) prevIndex = playlistPlayback.repeat ? playlistPlayback.queue.length - 1 : 0;
    playPlaylistItemAt_(prevIndex);
  }

  function startPlaylistSegmentWatcher_() {
    clearPlaylistSegmentWatcher_();
    if (!playlistPlayback || !playlistPlayback.active || !playlistPlayback.currentEnd || !youtubePlayer) return;

    playlistSegmentTimer = window.setInterval(() => {
      if (!playlistPlayback || !playlistPlayback.active || !youtubePlayer || typeof youtubePlayer.getCurrentTime !== "function") return;
      let current = 0;
      try { current = Number(youtubePlayer.getCurrentTime() || 0); } catch { return; }
      const remaining = playlistPlayback.currentEnd - current;

      if (remaining <= PLAYLIST_FADE_DURATION_MS / 1000 && remaining > 0.08 && !playlistPlayback.fadingOut) {
        playlistPlayback.fadingOut = true;
        startPlaylistVolumeFadeOut_(Math.max(240, remaining * 1000));
      }

      if (current >= playlistPlayback.currentEnd - 0.08) {
        clearPlaylistSegmentWatcher_();
        playNextPlaylistItem_("segment_end");
      }
    }, PLAYLIST_END_CHECK_INTERVAL_MS);
  }

  function startPlaylistVolumeFadeIn_() {
    if (!playlistPlayback || !playlistPlayback.active || !youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;
    const target = Math.max(0, Math.min(100, Number(playlistPlayback.baseVolume) || 100));
    runPlaylistVolumeFade_(0, target, PLAYLIST_FADE_DURATION_MS, t => 1 - Math.pow(1 - t, 3));
  }

  function startPlaylistVolumeFadeOut_(durationMs = PLAYLIST_FADE_DURATION_MS) {
    if (!playlistPlayback || !playlistPlayback.active || !youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;
    let from = Math.max(0, Math.min(100, Number(playlistPlayback.baseVolume) || 100));
    try {
      const currentVolume = Number(youtubePlayer.getVolume && youtubePlayer.getVolume());
      if (Number.isFinite(currentVolume)) from = currentVolume;
    } catch {}
    runPlaylistVolumeFade_(from, 0, durationMs, t => Math.pow(t, 3));
  }

  function runPlaylistVolumeFade_(from, to, durationMs, easing) {
    clearPlaylistVolumeFade_();
    if (!youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;

    const start = performance.now();
    const duration = Math.max(120, Number(durationMs) || PLAYLIST_FADE_DURATION_MS);
    const fromValue = Math.max(0, Math.min(100, Number(from) || 0));
    const toValue = Math.max(0, Math.min(100, Number(to) || 0));

    const tick = () => {
      if (!youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = typeof easing === "function" ? easing(progress) : progress;
      const value = fromValue + (toValue - fromValue) * eased;
      try { youtubePlayer.setVolume(Math.max(0, Math.min(100, Math.round(value)))); } catch { return; }

      if (progress < 1) {
        playlistVolumeFadeTimer = window.setTimeout(tick, 80);
      } else {
        playlistVolumeFadeTimer = null;
      }
    };

    tick();
  }

  function clearPlaylistVolumeFade_() {
    if (playlistVolumeFadeTimer) {
      window.clearTimeout(playlistVolumeFadeTimer);
      playlistVolumeFadeTimer = null;
    }
  }

  function clearPlaylistSegmentWatcher_() {
    if (playlistSegmentTimer) {
      window.clearInterval(playlistSegmentTimer);
      playlistSegmentTimer = null;
    }
  }

  function schedulePlaylistSkipAfterError_() {
    clearPlaylistSkipTimer_();
    playlistSkipTimer = window.setTimeout(() => {
      if (playlistPlayback && playlistPlayback.active) playNextPlaylistItem_("error");
    }, PLAYLIST_ERROR_SKIP_MS);
  }

  function clearPlaylistSkipTimer_() {
    if (playlistSkipTimer) {
      window.clearTimeout(playlistSkipTimer);
      playlistSkipTimer = null;
    }
  }

  function renderPlaylistPlaybackUi_() {
    const active = Boolean(playlistPlayback && playlistPlayback.active);
    if (els.playlistPlaybackBanner) els.playlistPlaybackBanner.hidden = !active;
    if (els.playlistPlayerControls) els.playlistPlayerControls.hidden = !active;
    if (!active) return;

    const listName = playlistPlayback.list && playlistPlayback.list.name || "플레이리스트";
    const indexText = `${playlistPlayback.index + 1}/${playlistPlayback.queue.length}`;
    if (els.playlistPlayerName) els.playlistPlayerName.textContent = `${listName} · ${indexText}`;
    if (els.playlistOrderToggleButton) els.playlistOrderToggleButton.textContent = playlistPlayback.mode === "random" ? "랜덤재생" : "순차재생";
    if (els.playlistRepeatPlayerToggle) els.playlistRepeatPlayerToggle.textContent = playlistPlayback.repeat ? "전체반복" : "반복안함";
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

  function showYoutubeLoading(message = "") {
    if (!currentYoutubeLoadingText) {
      currentYoutubeLoadingText = message || makeYoutubeLoadingText();
    }

    showYoutubeLoadingMessage(currentYoutubeLoadingText, { preserveInitial: true });
  }

  function showYoutubeLoadingMessage(message, options = {}) {
    if (!els.youtubeLoading) return;

    if (youtubeLoadingFadeTimer) {
      window.clearTimeout(youtubeLoadingFadeTimer);
      youtubeLoadingFadeTimer = null;
    }

    const text = options.preserveInitial
      ? getCurrentYoutubeLoadingText_()
      : String(message || getCurrentYoutubeLoadingText_());

    els.youtubeLoading.hidden = false;
    els.youtubeLoading.classList.remove("fade-out", "error");
    if (options.error) els.youtubeLoading.classList.add("error");
    els.youtubeLoading.innerHTML = makeYoutubeLoadingMarkup(text);
  }

  function hideYoutubeLoading(immediate = false, delay = 0) {
    if (!els.youtubeLoading) return;

    if (youtubeLoadingFadeTimer) {
      window.clearTimeout(youtubeLoadingFadeTimer);
      youtubeLoadingFadeTimer = null;
    }

    const run = () => {
      if (immediate) {
        els.youtubeLoading.hidden = true;
        els.youtubeLoading.innerHTML = "";
        els.youtubeLoading.classList.remove("fade-out", "error");
        currentYoutubeLoadingText = "";
        return;
      }

      if (els.youtubeLoading.hidden) return;
      els.youtubeLoading.classList.add("fade-out");

      youtubeLoadingFadeTimer = window.setTimeout(() => {
        els.youtubeLoading.hidden = true;
        els.youtubeLoading.innerHTML = "";
        els.youtubeLoading.classList.remove("fade-out", "error");
        currentYoutubeLoadingText = "";
        youtubeLoadingFadeTimer = null;
      }, 360);
    };

    if (delay > 0) {
      youtubeLoadingFadeTimer = window.setTimeout(run, delay);
    } else {
      run();
    }
  }

  function makeYoutubeLoadingText() {
    const word = YOUTUBE_LOADING_WORDS[Math.floor(Math.random() * YOUTUBE_LOADING_WORDS.length)] || "불러오는";
    return `영상을 ${word} 중...`;
  }

  function getCurrentYoutubeLoadingText_() {
    if (!currentYoutubeLoadingText) {
      currentYoutubeLoadingText = makeYoutubeLoadingText();
    }
    return currentYoutubeLoadingText;
  }

  function makeYoutubeLoadingMarkup(text) {
    return `
      <div class="youtube-loader-box">
        <div class="youtube-loading-text">${escapeHtml(text || makeYoutubeLoadingText())}</div>
      </div>
    `;
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
      return JSON.parse(localStorage.getItem(LOCAL_DATA_CACHE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function writeLocalJsonCache(obj) {
    try {
      localStorage.setItem(LOCAL_DATA_CACHE_KEY, JSON.stringify(obj));
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

  function buildSearchQuery(keyword) {
    if (!keyword) return { terms: [], exactTerms: [], exactOnly: false };

    const normalTerms = new Set([keyword]);
    const exactTerms = new Set();
    let exactOnly = false;

    Object.entries(searchAliases).forEach(([base, entry]) => {
      const normalizedBase = normalizeSearchText(base);
      const aliasList = normalizeSearchAliasList(entry);
      const normalizedAliases = aliasList
        .map(normalizeSearchText)
        .filter(Boolean);

      if (isExactSearchAlias(entry)) {
        if (keyword === normalizedBase) {
          exactOnly = true;
          const exactTargets = normalizedAliases.length ? normalizedAliases : [normalizedBase];
          exactTargets.forEach(term => {
            if (term) exactTerms.add(term);
          });
        }
        return;
      }

      const matched = Boolean(normalizedBase) && (normalizedBase.includes(keyword) || keyword.includes(normalizedBase));
      if (matched) {
        [normalizedBase, ...normalizedAliases].forEach(term => {
          if (term) normalTerms.add(term);
        });
      }
    });

    return {
      terms: exactOnly ? [] : [...normalTerms],
      exactTerms: [...exactTerms],
      exactOnly
    };
  }

  function hasSearchQuery(query) {
    return Boolean(query && ((query.terms && query.terms.length) || (query.exactTerms && query.exactTerms.length)));
  }

  function normalizeSearchAliasList(entry) {
    if (Array.isArray(entry)) return entry;
    if (entry && typeof entry === "object") return Array.isArray(entry.aliases) ? entry.aliases : [];
    return [];
  }

  function isExactSearchAlias(entry) {
    return Boolean(entry && typeof entry === "object" && entry.exact);
  }

  function expandSearchTerms(keyword) {
    return buildSearchQuery(keyword).terms;
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
    currentDataStatusText = String(text || "");
    renderDataStatus();
  }

  function renderDataStatus() {
    if (!els.dataStatus) return;
    const formatted = formatDataStatusParts(currentDataStatusText);
    els.dataStatus.textContent = "";

    if (!formatted) {
      els.dataStatus.textContent = String(currentDataStatusText || "");
      return;
    }

    els.dataStatus.appendChild(document.createTextNode(`${formatted.dateText} · `));
    const count = document.createElement("span");
    count.className = "data-status-count";
    count.title = visitorCount;
    count.textContent = formatted.songCount;
    els.dataStatus.appendChild(count);
    if (formatted.suffix) {
      els.dataStatus.appendChild(document.createTextNode(formatted.suffix));
    }
  }

  function formatDataStatusParts(text) {
    const source = String(text || "");
    const match = source.match(/^(\d{2}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\s*·\s*(\d+)(?:곡)?(.*)$/);
    if (!match) return null;

    const [, dateText, songCount, rawSuffix = ""] = match;
    const suffix = /ⓒ/.test(rawSuffix) ? " · ⓒ" : "";
    return { dateText, songCount, suffix };
  }

  function setupCounterTracking() {
    if (!COUNTER || document.querySelector("script[data-site-counter-script]")) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://gc.zgo.at/count.js";
    script.dataset.goatcounter = `https://${COUNTER}.goatcounter.com/count`;
    script.dataset.siteCounterScript = "1";
    document.head.appendChild(script);
  }

  async function loadVisitorCount() {
    if (!COUNTER) {
      visitorCount = "…";
      renderDataStatus();
      return;
    }

    try {
      const res = await fetch(`https://${COUNTER}.goatcounter.com/counter/TOTAL.json`, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      const count = Number(data.count || 0);
      visitorCount = Number.isFinite(count) ? String(count) : "…";
      renderDataStatus();
    } catch (err) {
      console.warn("[방문자 수 로딩 실패]", err);
      visitorCount = "…";
      renderDataStatus();
    }
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

  function applyDarkMode(enabled, save = true) {
    document.documentElement.classList.toggle("dark-mode", enabled);

    if (save) {
      localStorage.setItem("darkModeEnabled", enabled ? "1" : "0");
    }
  }

  function getInitialDarkModeEnabled() {
    const saved = localStorage.getItem("darkModeEnabled");

    if (saved === "0") return false;
    if (saved === "1") return true;

    return true;
  }

  function setupDarkModeToggle() {
    const statusBox = document.querySelector(".status-box");
    if (!statusBox) return;

    const wrap = document.createElement("label");
    wrap.className = "darkmode-toggle";
    wrap.innerHTML = '<input type="checkbox" id="darkModeToggle"> 다크모드';

    statusBox.appendChild(wrap);

    const checkbox = wrap.querySelector("input");
    const enabled = getInitialDarkModeEnabled();

    checkbox.checked = enabled;
    applyDarkMode(enabled, false);

    checkbox.addEventListener("change", () => {
      applyDarkMode(checkbox.checked, true);
    });
  }

  setupDarkModeToggle();

})();
