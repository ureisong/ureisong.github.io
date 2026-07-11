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
  const YOUTUBE_SHARE_AUTOPLAY_WAIT_MS = 2600;
  const TAB_TITLE_MARQUEE_INITIAL_HOLD_MS = 3000;
  const TAB_TITLE_MARQUEE_STEP_MS = 250;
  const TAB_TITLE_MARQUEE_END_HOLD_MS = 2200;
  const TAB_TITLE_MARQUEE_REPEAT = true;
  const TAB_TITLE_MARQUEE_GAP = "　　　　　　　　　　　　";

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
  const PLAYLIST_DEFAULT_VOLUME = 100;
  const PLAYLIST_VOLUME_MONITOR_INTERVAL_MS = 300;
  const PLAYLIST_VOLUME_USER_CHANGE_THRESHOLD = 2;
  const PLAYLIST_END_FADE_TRIGGER_SECONDS = 1.5;
  const PLAYLIST_SHARE_FORMAT_VERSION = 1;
  const PLAYLIST_SHARE_PREFIX = "UREI-PL";
  const PLAYLIST_SHARE_MAX_CODE_LENGTH = 100_000;
  const PLAYLIST_SHARE_MAX_COMPRESSED_BYTES = 75_000;
  const PLAYLIST_SHARE_MAX_DECOMPRESSED_BYTES = 1_000_000;
  const PLAYLIST_SHARE_MAX_ITEMS = 500;
  const PLAYLIST_SHARE_MAX_NAME_LENGTH = 80;
  const PLAYLIST_SHARE_MAX_ITEM_STRING_LENGTH = 100;
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

      커버곡/추천 플레이리스트처럼 songs 시트에 없는 YouTube 영상은 아래 형식으로
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
        title: "기본 추천 플레이리스트 예시 제목",
        section: "추천 플레이리스트"
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
    channelDetails: document.getElementById("channelDetails"),
    channelDescription: document.getElementById("channelDescription"),
    channelEmpty: document.getElementById("channelEmpty"),
    channelCarousel: document.getElementById("channelCarousel"),
    channelTrack: document.getElementById("channelTrack"),
    channelPrevButton: document.getElementById("channelPrevButton"),
    channelNextButton: document.getElementById("channelNextButton"),
    playlistOpenButton: document.getElementById("playlistOpenButton"),
    playlistSummaryName: document.getElementById("playlistSummaryName"),
    playlistModal: document.getElementById("playlistModal"),
    playlistModalClose: document.getElementById("playlistModalClose"),
    playlistExportButton: document.getElementById("playlistExportButton"),
    playlistImportButton: document.getElementById("playlistImportButton"),
    playlistImportModal: document.getElementById("playlistImportModal"),
    playlistImportModalClose: document.getElementById("playlistImportModalClose"),
    playlistImportCodeInput: document.getElementById("playlistImportCodeInput"),
    playlistImportCodeConfirmButton: document.getElementById("playlistImportCodeConfirmButton"),
    playlistImportCodeCancelButton: document.getElementById("playlistImportCodeCancelButton"),
    playlistImportPreviewModal: document.getElementById("playlistImportPreviewModal"),
    playlistImportPreviewModalClose: document.getElementById("playlistImportPreviewModalClose"),
    playlistImportPreviewName: document.getElementById("playlistImportPreviewName"),
    playlistImportPreviewSummary: document.getElementById("playlistImportPreviewSummary"),
    playlistImportPreviewItems: document.getElementById("playlistImportPreviewItems"),
    playlistImportNewName: document.getElementById("playlistImportNewName"),
    playlistImportMergeSelect: document.getElementById("playlistImportMergeSelect"),
    playlistImportPreviewApplyButton: document.getElementById("playlistImportPreviewApplyButton"),
    playlistImportPreviewCancelButton: document.getElementById("playlistImportPreviewCancelButton"),
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
    playlistReverseButton: document.getElementById("playlistReverseButton"),
    playlistFeatureElements: Array.from(document.querySelectorAll("[data-playlist-feature]")),
    playlistActionRow: document.getElementById("playlistActionRow"),
    youtubeModal: document.getElementById("youtubeModal"),
    youtubeModalClose: document.getElementById("youtubeModalClose"),
    youtubeFrameWrap: document.getElementById("youtubeFrameWrap"),
    filterDetails: document.getElementById("filterDetails"),
    filterSummaryHelp: document.querySelector("#filterDetails .summary-help"),
    faviconLink: document.getElementById("faviconLink"),
    modalSongInfoTop: document.querySelector(".modal-song-info-top"),
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
    playlistBurninShieldButton: document.getElementById("playlistBurninShieldButton"),
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
  let normalDocumentTitle = DEFAULT_DOCUMENT_TITLE;
  let currentModalTitleText = "";
  let currentModalArtistText = "";
  let youtubeIsPlaying = false;
  let tabTitleMarqueeTimer = null;
  let tabTitleMarqueeActive = false;
  let tabTitleMarqueeText = "";
  let tabTitleMarqueeOffset = 0;

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
  let channelItems = [];
  let channelIndex = 0;
  let channelMoving = false;
  let channelHover = false;
  let channelAutoTimer = null;
  const channelBorderStyles = new Map();
  let likePostEnabled = true;
  let currentModalSongId = "";
  let youtubePlayer = null;
  let youtubePlayerToken = 0;
  let youtubeApiReadyPromise = null;
  let youtubeLoadingFadeTimer = null;
  let youtubeLoadingStatusTimer = null;
  let youtubeBufferingTimer = null;
  let youtubeShareAutoplayWaitTimer = null;
  let youtubeSlowSecondTimer = null;
  let youtubeNoResponseTimer = null;
  let youtubeStartedPlaying = false;
  let youtubeInitialLoadingSuppressed = false;
  let youtubeAwaitingManualPlayback = false;
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
  let playlistVolumeFadeSeq = 0;
  let playlistVolumeMonitorTimer = null;
  let playlistLastAutomatedVolume = null;
  let playlistLastAutomatedVolumeAt = 0;
  let mediaSessionRefreshTimer = null;
  let mediaSessionRefreshSeq = 0;
  let playlistModalMode = "manager";
  let playlistModalQueuePreview = null;
  let playlistModalQueuePreviewListId = "";
  let playlistSummaryResizeObserver = null;
  let playlistPendingFocusKeys = [];
  let playlistFinishedCloseArmed = false;
  let cooldownCrossfadeTimer = null;
  let cooldownClearTimer = null;
  let youtubeClosePulseTimer = null;
  const modalCloseAttentionTimers = new WeakMap();
  let pendingCoverPlaylistHydrationPromise = null;
  let pendingCoverPlaylistHydrationRerun = false;
  let pendingCoverPlaylistHydrationRetryTimer = null;
  let pendingCoverPlaylistHydrationRetryCount = 0;
  const coverTitleResolutionPromises = new Map();
  let burninShieldEl = null;
  let burninShieldTextEl = null;
  let burninShieldLoopTimer = null;
  let burninShieldVisibleTimer = null;
  let burninShieldCloseTimer = null;
  let burninShieldFullscreenTarget = null;
  let dateGroupLongPressTimer = null;
  let dateGroupLongPressPointerId = null;
  let suppressPageLoadingForInitialShare = false;
  let playlistImportPreviewState = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    const initialSongId = getInitialSongIdQuery_();
    const initialCachedPayload = initialSongId ? readLocalJsonCache() : null;
    const canTryInitialCache = Boolean(initialSongId && initialCachedPayload);

    if (!canTryInitialCache) showPageLoading("...LOADING...", "초기화면 준비 중.");
    bindEvents();
    loadPlaylists();
    applyPlaylistEnabledState(false);
    renderPlaylistSummary();
    setupPlaylistSummaryResizeWatcher_();
    setupFavicon();

    const openedInitialFromCache = canTryInitialCache ? tryOpenInitialSongFromLocalCache_(initialSongId, initialCachedPayload) : false;
    suppressPageLoadingForInitialShare = openedInitialFromCache;

    if (!openedInitialFromCache) showPageLoading("...LOADING...", "공지사항 읽는 중..");
    renderNotice([{ text: DEFAULT_NOTICE_TEXT, link: "" }]);
    renderFooter();
    setupCounterTracking();
    loadVisitorCount();
    showPageLoading("...LOADING...", "필터 만드는 중...");
    updateFilterSummaryHelp();
    startCooldownTimer();
    startCoverAutoTimer();
    startRecAutoTimer();
    startChannelAutoTimer();
    bindResponsiveRender();
    showPageLoading("...LOADING...", "설정 불러오는 중....");
    currentSettingsRows = await loadSettingsRows();
    playlistEnabled = normalizePlaylistEnabled(extractSettingsFromRows(currentSettingsRows));
    applyPlaylistEnabledState(playlistEnabled);
    showPageLoading("...LOADING...", "설정 불러오는 중.....");
    await loadSearchAliases(false, currentSettingsRows);
    await loadData(false, currentSettingsRows);
    suppressPageLoadingForInitialShare = false;
    if (!openedInitialFromCache) handleInitialSongIdQuery_();
  }
  
  function bindResponsiveRender() {
    if (!window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 560px)");
    const rerender = () => {
      if (recommendMode === "random") renderRecommendSection();
      updatePlaylistOpenButtonLabel_();
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

    if (els.channelDetails) {
      els.channelDetails.addEventListener("toggle", () => {
        if (els.channelDetails.open) renderChannelSection();
      });
    }

    if (els.channelCarousel) {
      els.channelCarousel.addEventListener("mouseenter", () => { channelHover = true; });
      els.channelCarousel.addEventListener("mouseleave", () => { channelHover = false; });
      els.channelCarousel.addEventListener("touchstart", () => { channelHover = true; }, { passive: true });
      els.channelCarousel.addEventListener("touchend", () => {
        window.setTimeout(() => { channelHover = false; }, 1200);
      }, { passive: true });
      bindCarouselSwipe(els.channelCarousel, direction => moveChannelCarousel(direction));
    }

    if (els.channelPrevButton) {
      els.channelPrevButton.addEventListener("click", () => moveChannelCarousel(-1));
    }

    if (els.channelNextButton) {
      els.channelNextButton.addEventListener("click", () => moveChannelCarousel(1));
    }

    els.youtubeModal.addEventListener("click", event => {
      if (playlistPlayback && playlistPlayback.finished) {
        closeYoutubeModal();
        return;
      }
      if (playlistPlayback && playlistPlayback.active) {
        if (event.target === els.youtubeModal) pulseYoutubeModalCloseButton_();
        return;
      }
      if (event.target === els.youtubeModal) closeYoutubeModal();
    });

    els.youtubeModalClose.addEventListener("click", closeYoutubeModal);

    [els.modalSongTitle, els.modalSongArtist].forEach(el => {
      if (!el) return;
      el.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        if (el.dataset.modalLongPressFilter === "1") {
          el.dataset.modalLongPressFilter = "";
          return;
        }
        if (el.dataset.modalSuppressNextClick === "1") {
          el.dataset.modalSuppressNextClick = "";
          return;
        }
        copyModalInfoText_(el);
      });
      el.addEventListener("contextmenu", event => {
        if (!isDesktopContextCopyEnabled()) return;
        if (!isModalInfoFilterAllowed_(el)) return;
        event.preventDefault();
        event.stopPropagation();
        applyModalInfoFilter_(el, event.target);
      });
      bindModalInfoLongPressFilter_(el);
    });

    if (els.playlistSummaryName) {
      els.playlistSummaryName.addEventListener("click", event => {
        event.preventDefault();
        openPlaylistModal();
      });
    }

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
          coverItems = mergeCoverItemsWithKnownStoredData_(normalizeCoverItems(cached.covers || []), coverItems);
          recItems = normalizeRecItems(cached.recs || cached.recommendVideos || []);
          channelItems = normalizeChannelItems(cached.channels || []);
          hydrateStoredCoverPlaylistEntries_();
          void resolvePendingStoredCoverPlaylistEntries_();
          likePostEnabled = normalizeLikePostEnabled(cached.settings || null, true);
          playlistEnabled = normalizePlaylistEnabled(cached.settings || null);
          applyPlaylistEnabledState(playlistEnabled);
          renderNotice(currentNoticeItems);
          renderFooter();
          renderCoverSection();
          renderRecSection();
          renderChannelSection();
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
      coverItems = mergeCoverItemsWithKnownStoredData_(normalizeCoverItems(payload.covers || []), coverItems);
      recItems = normalizeRecItems(payload.recs || payload.recommendVideos || []);
      channelItems = normalizeChannelItems(payload.channels || []);
      hydrateStoredCoverPlaylistEntries_();
      await resolvePendingStoredCoverPlaylistEntries_();
      likePostEnabled = normalizeLikePostEnabled(payload.settings || null, true);
      playlistEnabled = normalizePlaylistEnabled(payload.settings || null);
      applyPlaylistEnabledState(playlistEnabled);
      renderNotice(currentNoticeItems);
      renderFooter();
      renderCoverSection();
      renderRecSection();
      renderChannelSection();
      writeLocalJsonCache({ 
        data: allSongs,
        notices: currentNoticeItems,
        footerText: currentFooterText,
        title: document.title,
        h1: els.pageTitle ? els.pageTitle.textContent : "",
        h1Visible: els.pageTitle ? els.pageTitle.style.display !== "none" : true,
        covers: coverItems,
        recs: recItems,
        channels: channelItems,
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
        coverItems = mergeCoverItemsWithKnownStoredData_(normalizeCoverItems(cached.covers || []), coverItems);
        recItems = normalizeRecItems(cached.recs || cached.recommendVideos || []);
        channelItems = normalizeChannelItems(cached.channels || []);
        hydrateStoredCoverPlaylistEntries_();
        void resolvePendingStoredCoverPlaylistEntries_();
        likePostEnabled = normalizeLikePostEnabled(cached.settings || null, true);
        playlistEnabled = normalizePlaylistEnabled(cached.settings || null);
        applyPlaylistEnabledState(playlistEnabled);
        renderNotice(currentNoticeItems);
        renderFooter();
        renderCoverSection();
        renderRecSection();
        renderChannelSection();
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
      const channels = extractChannelItemsFromRows(noticeRows);
      const footerText = extractFooterTextFromRows(noticeRows);
      const pageMeta = extractPageMetaFromRows(noticeRows);
      const settings = extractSettingsFromRows(effectiveSettingsRows);

      return {
        data: mergeSongsAndLikes(songsRows, likesRows),
        notices,
        covers,
        recs,
        channels,
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
      channels: Array.isArray(json) ? [] : (json.channels || []),
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
          end: normalizeSongEndValue_(item.timeline, item.end),
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

  function normalizeSongEndValue_(timeline, end) {
    const startText = String(timeline || "").trim();
    const endText = String(end || "").trim();
    if (!startText || !endText) return endText;
    const startSeconds = timelineToSeconds(startText);
    const endSeconds = timelineToSeconds(endText);
    return endSeconds > startSeconds ? endText : "";
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

  function isMobileLongPressCopyEnabled_() {
    if (!window.matchMedia) return false;
    return window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  }

  function clearDateGroupLongPressTimer_() {
    if (dateGroupLongPressTimer) {
      window.clearTimeout(dateGroupLongPressTimer);
      dateGroupLongPressTimer = null;
    }
    dateGroupLongPressPointerId = null;
  }

  function bindMobileDateGroupLongPress_(button) {
    if (!button || button.dataset.mobileLongPressBound === "1") return;
    button.dataset.mobileLongPressBound = "1";

    button.addEventListener("pointerdown", event => {
      if (!isMobileLongPressCopyEnabled_()) return;
      if (event.pointerType === "mouse") return;
      if (event.target && event.target.closest && event.target.closest(".date-group-count")) return;
      clearDateGroupLongPressTimer_();
      dateGroupLongPressPointerId = event.pointerId;
      dateGroupLongPressTimer = window.setTimeout(() => {
        dateGroupLongPressTimer = null;
        button.dataset.longPressCopied = "1";
        window.setTimeout(() => {
          if (button.dataset.longPressCopied === "1") button.dataset.longPressCopied = "";
        }, 900);
        copyDateGroupInfoToClipboard(button.dataset.dateGroupToggle || "");
        showCooldownText("그룹 정보를 클립보드에 복사했습니다.");
      }, 650);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      button.addEventListener(type, event => {
        if (dateGroupLongPressPointerId !== null && event.pointerId !== dateGroupLongPressPointerId) return;
        clearDateGroupLongPressTimer_();
      });
    });
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

  function getModalInfoText_(el) {
    return String(el && (el.dataset.copyText || el.textContent) || "").trim();
  }

  async function copyModalInfoText_(el) {
    const text = getModalInfoText_(el);
    if (!text) return;

    try {
      await writeTextToClipboard(text);
      showCooldownText(`복사했습니다: ${text}`);
    } catch (err) {
      console.warn("[클립보드 복사 실패]", err);
      showCooldownText("클립보드 복사에 실패했습니다.");
    }
  }

  function getModalInfoFilterType_(el) {
    if (el === els.modalSongArtist) return "artist";
    return "search";
  }

  function isModalInfoFilterAllowed_(el) {
    if (!el) return false;
    if (!currentModalSongId) return false;
    return Boolean(findSongById(currentModalSongId));
  }

  function getModalArtistFilterValueFromTarget_(target) {
    const part = target && target.closest && target.closest("[data-modal-filter-value]");
    return part ? String(part.dataset.modalFilterValue || "").trim() : "";
  }

  function getModalArtistFilterValues_(text) {
    return String(text || "")
      .split(/\s+&\s+/)
      .map(value => value.trim())
      .filter(Boolean);
  }

  function selectModalArtistFilterValue_(values) {
    const list = values.filter(Boolean);
    if (list.length <= 1) return list[0] || "";

    const message = [
      "필터를 적용할 아티스트 번호를 입력해주세요.",
      "",
      ...list.map((value, index) => `${index + 1}. ${value}`)
    ].join("\n");
    const selected = window.prompt(message, "1");
    if (selected === null) return "";

    const index = Number(String(selected).trim()) - 1;
    if (Number.isInteger(index) && index >= 0 && index < list.length) return list[index];

    const direct = String(selected || "").trim();
    return list.find(value => value === direct) || "";
  }

  function applyModalFilterValue_(type, text) {
    const value = String(text || "").trim();
    if (!value) return;
    if (!window.confirm(`"${value}" 으로 필터를 적용할까요?`)) return;

    closeYoutubeModal();
    resetFilters();
    applyFilterResultPanelState();
    if (els.filterDetails) els.filterDetails.open = true;
    if (els.searchInput) els.searchInput.value = value;
    if (els.searchMode) els.searchMode.value = type === "artist" ? "artist" : "title";
    applyAndRender(true);
    collapseNonDateSections();
    scrollToFilterSection();
  }

  function applyModalInfoFilter_(el, target = null) {
    if (!isModalInfoFilterAllowed_(el)) return;

    const type = getModalInfoFilterType_(el);
    const baseText = getModalInfoText_(el);
    if (!baseText) return;

    let text = baseText;
    if (type === "artist") {
      text = getModalArtistFilterValueFromTarget_(target) || selectModalArtistFilterValue_(getModalArtistFilterValues_(baseText));
    }

    applyModalFilterValue_(type, text);
  }

  function bindModalInfoLongPressFilter_(el) {
    if (!el || el.dataset.modalLongPressFilterBound === "1") return;
    el.dataset.modalLongPressFilterBound = "1";
    let timer = null;
    let pointerId = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchTriggered = false;

    const clear = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      pointerId = null;
    };

    const markLongPressHandled = () => {
      el.dataset.modalLongPressFilter = "1";
      el.dataset.modalSuppressNextClick = "1";
      window.setTimeout(() => {
        if (el.dataset.modalLongPressFilter === "1") el.dataset.modalLongPressFilter = "";
        if (el.dataset.modalSuppressNextClick === "1") el.dataset.modalSuppressNextClick = "";
      }, 900);
    };

    const triggerFilter = target => {
      markLongPressHandled();
      applyModalInfoFilter_(el, target);
    };

    el.addEventListener("pointerdown", event => {
      if (!isMobileLongPressCopyEnabled_()) return;
      if (event.pointerType === "mouse" || event.pointerType === "touch") return;
      clear();
      pointerId = event.pointerId;
      timer = window.setTimeout(() => {
        timer = null;
        triggerFilter(event.target);
      }, 650);
    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(type => {
      el.addEventListener(type, event => {
        if (pointerId !== null && event.pointerId !== pointerId) return;
        clear();
      });
    });

    el.addEventListener("touchstart", event => {
      if (!isMobileLongPressCopyEnabled_()) return;
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      event.preventDefault();
      event.stopPropagation();
      clear();
      touchTriggered = false;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      timer = window.setTimeout(() => {
        timer = null;
        touchTriggered = true;
        triggerFilter(event.target);
      }, 650);
    }, { passive: false });

    el.addEventListener("touchmove", event => {
      if (!isMobileLongPressCopyEnabled_() || !timer) return;
      const touch = event.touches && event.touches[0];
      if (!touch) return;
      if (Math.abs(touch.clientX - touchStartX) > 12 || Math.abs(touch.clientY - touchStartY) > 12) clear();
    }, { passive: true });

    ["touchend", "touchcancel"].forEach(type => {
      el.addEventListener(type, event => {
        if (!isMobileLongPressCopyEnabled_()) return;
        event.preventDefault();
        event.stopPropagation();
        const wasTap = Boolean(timer) && !touchTriggered;
        clear();
        if (type === "touchend" && wasTap) {
          el.dataset.modalSuppressNextClick = "1";
          window.setTimeout(() => {
            if (el.dataset.modalSuppressNextClick === "1") el.dataset.modalSuppressNextClick = "";
          }, 600);
          copyModalInfoText_(el);
        }
        touchTriggered = false;
      }, { passive: false });
    });
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
      const titleText = getSungGroupTitleText_(song);
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

      const artistText = getRawDisplayArtist(song);
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

  function formatDisplaySongTitleText_(value) {
    return String(value || "")
      .replaceAll(" [뜌땨]", " 🐤")
      .replaceAll(" [불법레이]", " 🍥");
  }

  function stripTitleMarker_(value) {
    return String(value || "")
      .replaceAll(" [뜌땨]", "").replaceAll(" 🐤", "")
      .replaceAll(" [불법레이]", "").replaceAll(" 🍥", "")
      .trim();
  }

  function getSungGroupTitleText_(song) {
    const values = getTitleValues(song).map(stripTitleMarker_).filter(Boolean);
    return values.length ? values.join(" ") : stripTitleMarker_(getDisplayTitle(song)) || "곡명 없음";
  }

  function getSongTitleTooltip_(song) {
    if (!song) return "";

    const title = String(song.title || "");
    if (title.includes(" [뜌땨]")) {
      return "뜌땨한 곡 입니다";
    } else if (title.includes(" [불법레이]")) {
      return "불법레이…🍥";
    }
  
    return "";
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
    const values = getTitleValues(song).map(formatDisplaySongTitleText_);
    return values.length ? values.join(" ") : "곡명 없음";
  }

  function getDisplayArtist(song) {
    const values = getArtistValues(song);
    return values.length ? values.join(" ") : "아티스트 없음";
  }

  function getRawDisplayArtist(song) {
    const value = String(song && song.artist || "").trim();
    return value || getDisplayArtist(song);
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
      const countEl = button.querySelector(".date-group-count");
      if (countEl && namespace === "date") {
        countEl.setAttribute("role", "button");
        countEl.setAttribute("tabindex", "0");
        countEl.title = "이 그룹의 곡을 플레이리스트에 추가";
        const addGroup = event => {
          event.preventDefault();
          event.stopPropagation();
          addDateGroupToPlaylist_(button.dataset.dateGroupToggle || "");
        };
        countEl.addEventListener("click", addGroup);
        countEl.addEventListener("keydown", event => {
          if (event.key !== "Enter" && event.key !== " ") return;
          addGroup(event);
        });
      }

      button.addEventListener("click", event => {
        if (button.dataset.longPressCopied === "1") {
          event.preventDefault();
          event.stopPropagation();
          button.dataset.longPressCopied = "";
          return;
        }
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
        bindMobileDateGroupLongPress_(button);
      }
    });
  }

  function addDateGroupToPlaylist_(key) {
    if (!playlistEnabled) return;

    const group = currentDateGroups.get(key);
    if (!group || !Array.isArray(group.items) || !group.items.length) return;

    const selected = getSelectedPlaylist();
    if (!selected) {
      openPlaylistModal();
      showLikeNoticeModal("[알림]", "먼저 플레이리스트를 생성하거나 선택해주세요.");
      return;
    }

    const addable = group.items.filter(canAddSongToPlaylist);
    if (!addable.length) {
      showLikeNoticeModal("[알림]", "이 그룹에는 플레이리스트에 추가할 수 있는 곡이 없습니다.");
      return;
    }

    const existing = new Set((selected.items || []).map(getPlaylistItemKey_));
    const targets = addable.filter(song => !existing.has(`song:${song.id}`));

    if (!targets.length) {
      showCooldownText("이미 현재 플레이리스트에 모두 포함되어 있습니다.");
      return;
    }

    const label = group.label || "선택한 그룹";
    if (!window.confirm(`${label} 의 추가 가능한 ${targets.length}곡을 ‘${selected.name}’ 에 추가할까요?`)) return;

    targets.forEach(song => selected.items.push(song.id));
    playlistPendingFocusKeys = targets.map(song => `song:${song.id}`);
    savePlaylists();
    renderPlaylistSummary();
    refreshPlaylistAddButtonStates_();
    openPlaylistModal();
    showCooldownText(`${targets.length}곡을 ${selected.name}에 추가했습니다.`);
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
    if (els.channelDetails) els.channelDetails.open = false;
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
    if (els.channelDetails) els.channelDetails.open = false;
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
    const selected = getSelectedPlaylist();
    const included = Boolean(enabled && selected && playlistHasItem_(selected, `song:${song.id}`));
    const reason = getPlaylistAddDisabledReason(song);
    const title = enabled ? included ? "현재 플레이리스트에서 제거" : "현재 플레이리스트에 추가" : reason;
    const extraClass = options.modal ? " modal-playlist-add-button" : "";
    const stateClass = included ? " playlist-remove-button" : "";

    return `<button class="playlist-add-button${enabled ? "" : " disabled disabled-front"}${stateClass}${extraClass}" type="button" data-playlist-add-id="${escapeHtml(song.id)}" data-playlist-disabled="${enabled ? "" : "1"}" data-playlist-included="${included ? "1" : "0"}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}"></button>`;
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

  function refreshPlaylistAddButtonStates_() {
    if (!playlistEnabled) return;
    document.querySelectorAll("[data-playlist-add-id]").forEach(button => {
      const id = String(button.dataset.playlistAddId || "").trim();
      const song = findSongById(id);
      const enabled = canAddSongToPlaylist(song);
      const selected = getSelectedPlaylist();
      const included = Boolean(enabled && selected && playlistHasItem_(selected, `song:${id}`));
      const title = enabled ? included ? "현재 플레이리스트에서 제거" : "현재 플레이리스트에 추가" : getPlaylistAddDisabledReason(song);
      button.classList.toggle("disabled", !enabled);
      button.classList.toggle("disabled-front", !enabled);
      button.classList.toggle("playlist-remove-button", included);
      button.dataset.playlistDisabled = enabled ? "" : "1";
      button.dataset.playlistIncluded = included ? "1" : "0";
      button.title = title;
      button.setAttribute("aria-label", title);
    });
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
    const titleTooltip = getSongTitleTooltip_(song);
    const titleAttr = titleTooltip ? ` title="${escapeHtml(titleTooltip)}"` : "";
    const titleCoreHtml = song.link
      ? `<button class="song-title-button" type="button" data-youtube-url="${escapeHtml(youtubeUrl)}" data-song-title="${escapeHtml(titleText)}" data-song-artist="${escapeHtml(modalArtistText)}" data-song-date="${escapeHtml(dateText)}" data-song-timeline="${escapeHtml(song.timeline || "")}" data-song-id="${escapeHtml(song.id)}"${titleAttr}>${escapeHtml(titleText)}</button>`
      : `<span class="song-title-missing" title="${escapeHtml(titleTooltip || "다시보기가 없습니다")}">${escapeHtml(titleText)}</span>`;

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

      const responseText = await res.text();
      let json = null;
      try {
        json = JSON.parse(responseText);
      } catch (parseErr) {
        const contentType = String(res.headers.get("content-type") || "").toLowerCase();
        const looksLikeHtml = contentType.includes("text/html") || /^\s*<!doctype html|^\s*<html/i.test(responseText);
        if (looksLikeHtml) {
          throw new Error("Apps Script가 JSON 대신 HTML을 반환했습니다. 배포 URL·웹 앱 접근 권한·배포 버전을 확인하세요.");
        }
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

  function getInitialSongIdQuery_() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return String(params.get("id") || "").trim();
    } catch {
      return "";
    }
  }

  function findSongInCachedPayload_(payload, id) {
    const requestedId = String(id || "").trim();
    if (!requestedId || !payload) return null;

    const cachedSongs = normalizeSongs(payload.data || payload || []);
    return cachedSongs.find(song => song.id === requestedId) || null;
  }

  function applyCachedPayloadForInitialSong_(payload) {
    if (!payload) return;

    allSongs = normalizeSongs(payload.data || payload || []);
    currentNoticeItems = normalizeNoticeItems(payload.notices || payload.notice || DEFAULT_NOTICE_TEXT);
    currentFooterText = normalizeFooterText(payload.footerText || payload.footer || FOOTER_TEXT);
    applyPageTitleValues(payload.title || payload.pageTitle || "", payload.h1 || payload.pageH1 || "", payload.h1Visible);
    coverItems = mergeCoverItemsWithKnownStoredData_(normalizeCoverItems(payload.covers || []), coverItems);
    recItems = normalizeRecItems(payload.recs || payload.recommendVideos || []);
    channelItems = normalizeChannelItems(payload.channels || []);
    hydrateStoredCoverPlaylistEntries_();
    void resolvePendingStoredCoverPlaylistEntries_();
    likePostEnabled = normalizeLikePostEnabled(payload.settings || null, true);
    playlistEnabled = normalizePlaylistEnabled(payload.settings || null);
    applyPlaylistEnabledState(playlistEnabled);
    renderPlaylistSummary();
    updatePlaylistOpenButtonLabel_();
  }

  function tryOpenInitialSongFromLocalCache_(requestedId, payload) {
    const id = String(requestedId || "").trim();
    if (!id || !payload) return false;

    const song = findSongInCachedPayload_(payload, id);
    if (!song || !String(song.link || "").trim()) return false;

    applyCachedPayloadForInitialSong_(payload);
    clearInitialSongIdQuery_();
    hidePageLoading();

    const youtubeUrl = makeTimelineLink(song.link, song.timeline);
    window.setTimeout(() => {
      openYoutubeModal(youtubeUrl, {
        title: getDisplayTitle(song),
        artist: String(song.artist || "").trim() || getDisplayArtist(song),
        date: formatSongDate(song),
        timeline: song.timeline || "",
        id: song.id
      }, { fromShareLink: true, forceNormalModal: true, shareAutoplayWait: true });
    }, 0);

    return true;
  }

  function handleInitialSongIdQuery_() {
    const requestedId = getInitialSongIdQuery_();

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
      }, { fromShareLink: true, forceNormalModal: true, shareAutoplayWait: true });
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

  function appendModalScrollingTextContent_(inner, value, options = {}) {
    const text = String(value || "");
    const artistParts = options.artistParts === true ? getModalArtistFilterValues_(text) : [];

    if (artistParts.length <= 1) {
      inner.textContent = text;
      return;
    }

    artistParts.forEach((part, index) => {
      if (index > 0) inner.appendChild(document.createTextNode(" & "));
      const span = document.createElement("span");
      span.className = "modal-filter-part";
      span.dataset.modalFilterValue = part;
      span.textContent = part;
      inner.appendChild(span);
    });
  }

  function setModalScrollingText_(el, text, options = {}) {
    if (!el) return;

    const value = String(text || "");
    el.dataset.copyText = value;
    el.title = value ? "클릭하면 복사됩니다" : "";
    el.innerHTML = "";
    el.classList.remove("modal-marquee-active");
    el.style.removeProperty("--modal-marquee-distance");
    el.style.removeProperty("--modal-marquee-duration");

    const inner = document.createElement("span");
    inner.className = "modal-marquee-inner";
    appendModalScrollingTextContent_(inner, value, options);
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
    currentModalTitleText = String(text || "").trim();
    setModalScrollingText_(els.modalSongTitle, currentModalTitleText);
    refreshPlayingTabTitle_();
    if (!els.modalSongTitle) return;
    const song = currentModalSongId ? allSongs.find(item => item.id === currentModalSongId) : null;
    const tooltip = getSongTitleTooltip_(song);
    if (tooltip) els.modalSongTitle.title = tooltip;
  }

  function setModalArtistText_(text) {
    currentModalArtistText = String(text || "").trim();
    setModalScrollingText_(els.modalSongArtist, currentModalArtistText, { artistParts: true });
    refreshPlayingTabTitle_();
  }

  function isDesktopTabTitleEnvironment_() {
    return Boolean(window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }

  function makePlayingTabTitle_() {
    return [currentModalTitleText, currentModalArtistText].filter(Boolean).join(" - ");
  }

  function refreshPlayingTabTitle_() {
    if (!youtubeIsPlaying || !isDesktopTabTitleEnvironment_()) return;
    const nextTitle = makePlayingTabTitle_();
    if (!nextTitle || (tabTitleMarqueeActive && tabTitleMarqueeText === nextTitle)) return;
    startTabTitleMarquee_(nextTitle);
  }

  function startTabTitleMarquee_(text) {
    stopTabTitleMarquee_(false);
    const value = String(text || "").trim();
    if (!value || !isDesktopTabTitleEnvironment_()) {
      restoreNormalDocumentTitle_();
      return;
    }

    tabTitleMarqueeActive = true;
    tabTitleMarqueeText = value;
    tabTitleMarqueeOffset = 0;
    document.title = value;
    tabTitleMarqueeTimer = window.setTimeout(runTabTitleMarqueeStep_, TAB_TITLE_MARQUEE_INITIAL_HOLD_MS);
  }

  function runTabTitleMarqueeStep_() {
    if (!tabTitleMarqueeActive || !youtubeIsPlaying || !isDesktopTabTitleEnvironment_()) {
      stopTabTitleMarquee_(true);
      return;
    }

    const source = `${tabTitleMarqueeText}${TAB_TITLE_MARQUEE_GAP}`;
    if (!source.length) {
      stopTabTitleMarquee_(true);
      return;
    }

    tabTitleMarqueeOffset = (tabTitleMarqueeOffset + 1) % source.length;
    document.title = source.slice(tabTitleMarqueeOffset) + source.slice(0, tabTitleMarqueeOffset);

    if (tabTitleMarqueeOffset === 0) {
      if (!TAB_TITLE_MARQUEE_REPEAT) {
        stopTabTitleMarquee_(true);
        return;
      }
      tabTitleMarqueeTimer = window.setTimeout(runTabTitleMarqueeStep_, TAB_TITLE_MARQUEE_END_HOLD_MS);
      return;
    }

    tabTitleMarqueeTimer = window.setTimeout(runTabTitleMarqueeStep_, TAB_TITLE_MARQUEE_STEP_MS);
  }

  function stopTabTitleMarquee_(restoreTitle = true) {
    if (tabTitleMarqueeTimer) {
      clearTimeout(tabTitleMarqueeTimer);
      tabTitleMarqueeTimer = null;
    }
    tabTitleMarqueeActive = false;
    tabTitleMarqueeText = "";
    tabTitleMarqueeOffset = 0;
    if (restoreTitle) restoreNormalDocumentTitle_();
  }

  function restoreNormalDocumentTitle_() {
    document.title = normalDocumentTitle || DEFAULT_DOCUMENT_TITLE;
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

  function isPlaylistMediaSessionActive_() {
    return Boolean(playlistPlayback && playlistPlayback.active && !playlistPlayback.finished);
  }

  function setupMediaSessionPlaybackControls_() {
    if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setActionHandler !== "function") return;

    setMediaSessionMetadata_();

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

    if (isPlaylistMediaSessionActive_()) {
      setMediaSessionActionHandler_("previoustrack", () => handleMediaSessionPreviousTrack_());
      setMediaSessionActionHandler_("nexttrack", () => handleMediaSessionNextTrack_());
      setMediaSessionActionHandler_("seekbackward", () => handleMediaSessionPreviousTrack_());
      setMediaSessionActionHandler_("seekforward", () => handleMediaSessionNextTrack_());
      startMediaSessionRefresh_();
    } else {
      setMediaSessionActionHandler_("previoustrack", null);
      setMediaSessionActionHandler_("nexttrack", null);
      setMediaSessionActionHandler_("seekbackward", null);
      setMediaSessionActionHandler_("seekforward", null);
      stopMediaSessionRefresh_();
    }
  }

  function handleMediaSessionPreviousTrack_() {
    if (!isPlaylistMediaSessionActive_()) return;
    playPreviousPlaylistItem_();
    scheduleMediaSessionRefresh_();
  }

  function handleMediaSessionNextTrack_() {
    if (!isPlaylistMediaSessionActive_()) return;
    playNextPlaylistItem_("manual");
    scheduleMediaSessionRefresh_();
  }

  function scheduleMediaSessionRefresh_() {
    if (!isPlaylistMediaSessionActive_()) return;
    const seq = ++mediaSessionRefreshSeq;
    [0, 250, 800, 1600].forEach(delay => {
      window.setTimeout(() => {
        if (seq !== mediaSessionRefreshSeq || !isPlaylistMediaSessionActive_()) return;
        setupMediaSessionPlaybackControls_();
        setMediaSessionPlaybackState_(youtubeStartedPlaying ? "playing" : "none");
      }, delay);
    });
  }

  function startMediaSessionRefresh_() {
    if (mediaSessionRefreshTimer || !isPlaylistMediaSessionActive_()) return;
    mediaSessionRefreshTimer = window.setInterval(() => {
      if (!isPlaylistMediaSessionActive_()) {
        stopMediaSessionRefresh_();
        return;
      }
      setMediaSessionMetadata_();
      setMediaSessionActionHandler_("previoustrack", () => handleMediaSessionPreviousTrack_());
      setMediaSessionActionHandler_("nexttrack", () => handleMediaSessionNextTrack_());
      setMediaSessionActionHandler_("seekbackward", () => handleMediaSessionPreviousTrack_());
      setMediaSessionActionHandler_("seekforward", () => handleMediaSessionNextTrack_());
    }, 3000);
  }

  function stopMediaSessionRefresh_() {
    mediaSessionRefreshSeq += 1;
    if (!mediaSessionRefreshTimer) return;
    window.clearInterval(mediaSessionRefreshTimer);
    mediaSessionRefreshTimer = null;
  }

  function setMediaSessionMetadata_() {
    if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;

    const title = els.modalSongTitle ? String(els.modalSongTitle.dataset.copyText || els.modalSongTitle.textContent || "").trim() : "";
    const artist = els.modalSongArtist ? String(els.modalSongArtist.dataset.copyText || els.modalSongArtist.textContent || "").trim() : "";
    const album = playlistPlayback && playlistPlayback.active && playlistPlayback.list
      ? String(playlistPlayback.list.name || "유레이 노래방")
      : "유레이 노래방";

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: title || "유레이 노래방",
        artist: artist || "",
        album
      });
    } catch (err) {
      console.warn("Media Session 메타데이터 설정 실패", err);
    }
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
    stopMediaSessionRefresh_();
    if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setActionHandler !== "function") return;

    setMediaSessionActionHandler_("play", null);
    setMediaSessionActionHandler_("pause", null);
    setMediaSessionActionHandler_("previoustrack", null);
    setMediaSessionActionHandler_("nexttrack", null);
    setMediaSessionActionHandler_("seekbackward", null);
    setMediaSessionActionHandler_("seekforward", null);
    try { navigator.mediaSession.metadata = null; } catch {}
    setMediaSessionPlaybackState_("none");
  }

  function renderYoutubeFrameMount_() {
    if (!els.youtubeFrameWrap) return;
    const sideNavEnabled = Boolean(playlistPlayback && playlistPlayback.active && !playlistPlayback.finished);
    els.youtubeFrameWrap.classList.toggle("playlist-side-nav-enabled", sideNavEnabled);
    els.youtubeFrameWrap.innerHTML = `
      <div id="youtubePlayerMount" class="youtube-player-mount"></div>
      <button class="youtube-side-nav youtube-side-prev" type="button" aria-label="이전곡"></button>
      <button class="youtube-side-nav youtube-side-next" type="button" aria-label="다음곡"></button>
      <div class="youtube-side-time youtube-side-time-current" aria-hidden="true">00:00</div>
      <div class="youtube-side-time youtube-side-time-remaining" aria-hidden="true">-00:00</div>
    `;
    const prev = els.youtubeFrameWrap.querySelector(".youtube-side-prev");
    const next = els.youtubeFrameWrap.querySelector(".youtube-side-next");
    if (prev) prev.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      playPreviousPlaylistItem_();
    });
    if (next) next.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      playNextPlaylistItem_("manual");
    });
  }

  function openYoutubeModal(url, meta = {}, options = {}) {
    const modalOptions = options || {};
    if (modalOptions.forceNormalModal === true || !modalOptions.keepPlaylistPlayback) {
      resetPlaylistSegmentProgress_();
      disarmPlaylistFinishedClose_();
      playlistPlayback = null;
      clearPlaylistSegmentWatcher_();
      clearPlaylistSkipTimer_();
      clearPlaylistVolumeFade_();
      clearPlaylistVolumeMonitor_();
      renderPlaylistPlaybackUi_();
    }
    const videoId = extractYoutubeVideoId(url);

    if (!videoId) {
      window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const startSeconds = getYoutubeStartSecondsFromRawUrl(url);
    const token = ++youtubePlayerToken;
    youtubeIsPlaying = false;
    stopTabTitleMarquee_(true);
    youtubeStartedPlaying = false;
    youtubeInitialLoadingSuppressed = modalOptions.suppressInitialLoading === true;
    youtubeAwaitingManualPlayback = false;
    clearYoutubeShareAutoplayWaitTimer_();

    destroyYoutubePlayer_(false);
    currentModalSongId = meta.id || "";
    setModalTitleText_(meta.title || "");
    setModalArtistText_(meta.artist || "");
    setModalFooterText([meta.date || "", meta.timeline || ""].filter(Boolean).join(" ／ "));
    updateModalLikePanel(currentModalSongId);
    setupMediaSessionPlaybackControls_();

    renderYoutubeFrameMount_();
    els.youtubeModal.hidden = false;
    document.body.classList.add("modal-open");

    if (modalOptions.shareAutoplayWait === true) {
      if (youtubeInitialLoadingSuppressed) {
        hideYoutubeLoading(true);
      } else {
        showYoutubeLoading();
      }
      scheduleYoutubeShareAutoplayWait_(token);
    } else if (youtubeInitialLoadingSuppressed) {
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
    youtubeIsPlaying = false;
    stopTabTitleMarquee_(true);
    closeBurninShield_();
    resetPlaylistSegmentProgress_();
    disarmPlaylistFinishedClose_();
    youtubePlayerToken += 1;
    els.youtubeModal.hidden = true;
    destroyYoutubePlayer_(true);
    hideYoutubeLoading(true);
    setModalTitleText_("");
    setModalArtistText_("");
    setModalFooterText("");
    currentModalSongId = "";
    youtubeInitialLoadingSuppressed = false;
    youtubeAwaitingManualPlayback = false;
    clearYoutubeShareAutoplayWaitTimer_();
    if (els.youtubeFrameWrap) els.youtubeFrameWrap.classList.remove("playlist-side-nav-enabled");
    clearPlaylistSegmentWatcher_();
    clearPlaylistVolumeFade_();
    clearPlaylistVolumeMonitor_();
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
              playlistPlayback.baseVolume = getPlaylistPreferredVolume_();
              playlistPlayback.volumeMode = "starting";
              playlistPlayback.resumeVolume = 0;
              preparePlaylistPlayerForFadeStart_(event.target);
            }
            event.target.playVideo();
          } catch (err) {
            console.warn("YouTube 자동 재생 요청 실패", err);
            if (!(options && options.suppressInitialLoading)) {
              showYoutubeLoadingMessage("재생 버튼 입력을 기다리는 중...");
            }
          }
        },
        onStateChange: event => handleYoutubePlayerStateChange_(event, youtubePlayerToken),
        onError: event => handleYoutubePlayerError_(event, youtubePlayerToken)
      }
    });
  }

  function loadYoutubeMediaIntoExistingPlayer_(videoId, startSeconds, token, options = {}) {
    if (!youtubePlayer || !isCurrentYoutubeToken_(token)) return false;

    const safeStart = Math.max(0, Number(startSeconds) || 0);
    try {
      if (options && options.playlistId && !videoId && typeof youtubePlayer.loadPlaylist === "function") {
        youtubePlayer.loadPlaylist({
          list: options.playlistId,
          listType: "playlist",
          index: 0,
          startSeconds: safeStart
        });
        return true;
      }

      if (videoId && typeof youtubePlayer.loadVideoById === "function") {
        youtubePlayer.loadVideoById({
          videoId,
          startSeconds: safeStart,
          suggestedQuality: "hd1080"
        });
        return true;
      }
    } catch (err) {
      console.warn("기존 YouTube 플레이어 영상 교체 실패", err);
    }

    return false;
  }

  function activateYoutubeLoadingAfterUserOrAutoplay_(token) {
    if (!isCurrentYoutubeToken_(token) || youtubeStartedPlaying) return;

    clearYoutubeShareAutoplayWaitTimer_();
    youtubeInitialLoadingSuppressed = false;
    youtubeAwaitingManualPlayback = false;
    showYoutubeLoading();
    scheduleYoutubeLoadingStatus_(token);
  }

  function handleYoutubePlayerStateChange_(event, token) {
    if (!isCurrentYoutubeToken_(token) || !window.YT || !YT.PlayerState) return;

    switch (event.data) {
      case YT.PlayerState.PLAYING:
        youtubeIsPlaying = true;
        refreshPlayingTabTitle_();
        setMediaSessionPlaybackState_("playing");
        clearYoutubeShareAutoplayWaitTimer_();
        youtubeInitialLoadingSuppressed = false;
        youtubeAwaitingManualPlayback = false;
        youtubeStartedPlaying = true;
        clearYoutubeLoadingStatusTimer_();
        clearYoutubeBufferingTimer_();
        hideYoutubeLoading(false, 180);
        if (playlistPlayback && playlistPlayback.active) {
          handlePlaylistPlaybackPlaying_();
          setupMediaSessionPlaybackControls_();
          scheduleMediaSessionRefresh_();
        }
        startPlaylistSegmentWatcher_();
        break;
      case YT.PlayerState.BUFFERING:
        clearYoutubeShareAutoplayWaitTimer_();
        if (youtubeStartedPlaying) {
          scheduleYoutubeBufferingStatus_(token);
        } else if (youtubeInitialLoadingSuppressed || youtubeAwaitingManualPlayback) {
          activateYoutubeLoadingAfterUserOrAutoplay_(token);
        } else {
          scheduleYoutubeLoadingStatus_(token);
        }
        break;
      case YT.PlayerState.CUED:
        clearYoutubeBufferingTimer_();
        break;
      case YT.PlayerState.PAUSED:
        youtubeIsPlaying = false;
        stopTabTitleMarquee_(true);
        setMediaSessionPlaybackState_("paused");
        clearYoutubeLoadingStatusTimer_();
        clearYoutubeBufferingTimer_();
        hideYoutubeLoading(false, 0);
        if (playlistPlayback && playlistPlayback.active) {
          if (!youtubeStartedPlaying && playlistPlayback.volumeMode === "starting") break;
          handlePlaylistPlaybackPaused_();
          setupMediaSessionPlaybackControls_();
        }
        break;
      case YT.PlayerState.ENDED:
        if (playlistPlayback && playlistPlayback.active && !youtubeStartedPlaying) break;
        youtubeIsPlaying = false;
        stopTabTitleMarquee_(true);
        setMediaSessionPlaybackState_("none");
        clearYoutubeLoadingStatusTimer_();
        clearYoutubeBufferingTimer_();
        hideYoutubeLoading(false, 180);
        if (playlistPlayback && playlistPlayback.active) {
          if (!playlistPlayback.repeat && playlistPlayback.index >= playlistPlayback.queue.length - 1) {
            finishPlaylistPlayback_();
          } else {
            playNextPlaylistItem_("ended");
          }
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
    clearYoutubeShareAutoplayWaitTimer_();
    youtubeAwaitingManualPlayback = false;
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

  function scheduleYoutubeShareAutoplayWait_(token) {
    clearYoutubeShareAutoplayWaitTimer_();
    youtubeShareAutoplayWaitTimer = window.setTimeout(() => {
      if (!isCurrentYoutubeToken_(token) || youtubeStartedPlaying) return;
      youtubeAwaitingManualPlayback = true;
      clearYoutubeLoadingStatusTimer_();
      clearYoutubeBufferingTimer_();
      hideYoutubeLoading(false, 0);
    }, YOUTUBE_SHARE_AUTOPLAY_WAIT_MS);
  }

  function clearYoutubeShareAutoplayWaitTimer_() {
    if (youtubeShareAutoplayWaitTimer) {
      window.clearTimeout(youtubeShareAutoplayWaitTimer);
      youtubeShareAutoplayWaitTimer = null;
    }
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
    clearYoutubeShareAutoplayWaitTimer_();
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
    const noticeSeparatorHtml = `<span class="notice-separator">　　／　　</span>`;
    const lineHtml = normalizedItems.map(formatNoticeItemHtml).join(noticeSeparatorHtml) + (normalizedItems.length > 1 ? noticeSeparatorHtml : "");

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

      if (element === els.playlistPlaybackBanner || element === els.playlistPlayerControls) {
        element.hidden = !(enabled && playlistPlayback && playlistPlayback.active);
        return;
      }

      element.hidden = !enabled;
    });

    renderPlaylistPlaybackUi_();

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

    normalDocumentTitle = titleText || DEFAULT_DOCUMENT_TITLE;
    if (!tabTitleMarqueeActive) document.title = normalDocumentTitle;

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
      .map((row, index) => makeCoverItemFromUrl(
        String(row.value || "").trim(),
        {
          id: `COVER_${String(index + 1).padStart(5, "0")}`,
          section: String(row.link || "").trim() === "TRUE" ? "오리지널 곡" : "커버곡",
          thumbnail: String(row.img || "").trim()
        }
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
      id: String(options.id || videoId).trim() || videoId,
      videoId,
      url: normalizedUrl,
      title: "커버곡을 불러오는 중...",
      section,
      thumbnail: String(options.thumbnail || "").trim() || `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`,
      fallbackThumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`
    };
  }

  function normalizeCoverItems(input) {
    if (!Array.isArray(input)) return [];
    return shuffleArray(input
      .map(item => {
        if (typeof item === "string") return makeCoverItemFromUrl(item);
        const url = String(item && item.url || item && item.value || "").trim();
        const made = makeCoverItemFromUrl(url, {
          id: String(item && item.id || "").trim(),
          thumbnail: String(item && item.thumbnail || item && item.img || "").trim()
        });
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


  function parseRecommendedIdList_(value) {
    const text = String(value || "").trim();
    if (!text || /^https?:\/\//i.test(text)) return [];
    const quoted = [...text.matchAll(/["']([^"']+)["']/g)].map(match => String(match[1] || "").trim()).filter(Boolean);
    const values = quoted.length ? quoted : text.split(",").map(part => part.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    return [...new Set(values.filter(value => /^[A-Za-z0-9_-]+$/.test(value)))];
  }

  function extractRecItemsFromRows(rows) {
    return rows
      .filter(row => String(row.key || "").trim().toLowerCase() === "rec")
      .map(row => makeRecItem_(
        String(row.value || "").trim(),
        String(row.link || row.title || "").trim(),
        String(row.img || "").trim()
      ))
      .filter(Boolean);
  }

  function makeRecItem_(value, title = "", thumbnail = "") {
    const ids = parseRecommendedIdList_(value);
    if (ids.length) {
      return {
        id: `rec_ids:${ids.join("|")}`,
        ids,
        title: String(title || "").trim() || `추천 플레이리스트 ${ids.length}곡`,
        type: "id_list",
        url: "",
        thumbnail: String(thumbnail || "").trim(),
        fallbackThumbnail: ""
      };
    }
    return makeRecItemFromUrl(value, title, thumbnail);
  }

  function makeRecItemFromUrl(url, title = "", thumbnail = "") {
    const normalizedUrl = normalizeYoutubeUrlForParse(String(url || "").trim());
    if (!normalizedUrl) return null;

    const videoId = extractYoutubeVideoId(normalizedUrl);
    const playlistId = extractYoutubePlaylistId(normalizedUrl);
    if (!videoId && !playlistId) return null;

    return {
      id: videoId || playlistId,
      url: normalizedUrl,
      title: String(title || "").trim() || "추천 플레이리스트를 불러오는 중...",
      thumbnail: String(thumbnail || "").trim() || (videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg` : ""),
      fallbackThumbnail: videoId ? `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : "",
      type: playlistId && !videoId ? "playlist" : "video"
    };
  }

  function normalizeRecItems(input) {
    if (!Array.isArray(input)) return [];
    return shuffleArray(input
      .map(item => {
        if (typeof item === "string") return makeRecItem_(item);
        const ids = Array.isArray(item && item.ids) ? item.ids.map(value => String(value || "").trim()).filter(Boolean) : parseRecommendedIdList_(item && item.value || "");
        if (String(item && item.type || "") === "id_list" || ids.length) {
          return {
            id: String(item && item.id || `rec_ids:${ids.join("|")}`).trim(),
            ids,
            title: String(item && item.title || "").trim() || `추천 플레이리스트 ${ids.length}곡`,
            type: "id_list",
            url: "",
            thumbnail: String(item && item.thumbnail || item && item.img || "").trim(),
            fallbackThumbnail: String(item && item.fallbackThumbnail || "").trim()
          };
        }
        const url = String(item && item.url || item && item.value || "").trim();
        const made = makeRecItemFromUrl(
          url,
          String(item && item.title || "").trim(),
          String(item && item.thumbnail || item && item.img || "").trim()
        );
        if (!made) return null;
        return {
          ...made,
          title: String(item && item.title || made.title || "추천 플레이리스트").trim() || "추천 플레이리스트",
          thumbnail: String(item && item.thumbnail || made.thumbnail || "").trim() || made.thumbnail,
          fallbackThumbnail: String(item && item.fallbackThumbnail || made.fallbackThumbnail || "").trim() || made.fallbackThumbnail,
          type: String(item && item.type || made.type || "video").trim() || "video"
        };
      })
      .filter(Boolean));
  }

  function normalizeYoutubeChannelUrl_(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase().replace(/^www\./, "").replace(/^m\./, "");
      if (host !== "youtube.com" && host !== "youtu.be") return "";
      if (host === "youtu.be") return "";
      const path = parsed.pathname.replace(/\/+$/, "");
      if (!/^\/(?:@[^/]+|channel\/[^/]+|c\/[^/]+|user\/[^/]+)$/i.test(path)) return "";
      return `https://www.youtube.com${path}`;
    } catch {
      return "";
    }
  }

  function getYoutubeChannelFallbackName_(url) {
    try {
      const path = new URL(url).pathname.replace(/\/+$/, "");
      return decodeURIComponent(path.split("/").filter(Boolean).pop() || "YouTube 채널").replace(/^@/, "@");
    } catch {
      return "YouTube 채널";
    }
  }

  function getYoutubeChannelAvatarFallback_(url) {
    const name = getYoutubeChannelFallbackName_(url).replace(/^@/, "");
    return `https://unavatar.io/youtube/${encodeURIComponent(name)}`;
  }

  function parseChannelNoticeValue_(value) {
    const raw = String(value || "").trim();
    if (!raw) return null;

    const tags = [];
    let rest = raw;
    while (rest.startsWith("[")) {
      const end = rest.indexOf("]");
      if (end <= 0) break;
      tags.push(rest.slice(1, end).trim());
      rest = rest.slice(end + 1).trim();
    }

    let urlText = rest;
    const httpsIndex = rest.indexOf("https://");
    if (httpsIndex >= 0) {
      urlText = rest.slice(httpsIndex).trim();
    } else if (rest.startsWith("{") && rest.endsWith("}")) {
      urlText = rest.slice(1, -1).trim();
    }

    if (urlText.startsWith("{")) {
      urlText = urlText.slice(1).trim();
    }
    if (urlText.endsWith("}")) {
      urlText = urlText.slice(0, -1).trim();
    }

    const official = tags.some(tag => tag === "공식");
    const customName = tags.find(tag => tag && tag !== "공식") || "";
    return {
      url: urlText,
      customName,
      official
    };
  }

  function extractChannelItemsFromRows(rows) {
    return rows
      .filter(row => String(row.key || "").trim().toLowerCase() === "cha")
      .map(row => makeChannelItem_(
        String(row.value || "").trim(),
        String(row.link || "").trim(),
        String(row.img || "").trim()
      ))
      .filter(Boolean);
  }

  function makeChannelItem_(value, title = "", thumbnail = "") {
    const parsedValue = parseChannelNoticeValue_(value);
    if (!parsedValue) return null;
    const url = normalizeYoutubeChannelUrl_(parsedValue.url);
    if (!url) return null;
    return {
      id: url,
      url,
      title: String(title || "").trim() || getYoutubeChannelFallbackName_(url),
      hasCustomTitle: Boolean(String(title || "").trim()),
      customName: parsedValue.customName,
      official: parsedValue.official,
      thumbnail: String(thumbnail || "").trim() || getYoutubeChannelAvatarFallback_(url),
      hasCustomThumbnail: Boolean(String(thumbnail || "").trim()),
      enriched: false
    };
  }

  function normalizeChannelItems(input) {
    if (!Array.isArray(input)) return [];
    return shuffleArray(input.map(item => {
      if (typeof item === "string") return makeChannelItem_(item);
      const made = makeChannelItem_(
        item && (item.url || item.value),
        item && item.title,
        item && (item.thumbnail || item.img)
      );
      if (!made) return null;
      return {
        ...made,
        hasCustomTitle: typeof item.hasCustomTitle === "boolean" ? item.hasCustomTitle : Boolean(String(item && item.title || "").trim()),
        customName: String(item && item.customName || made.customName || "").trim(),
        official: typeof item.official === "boolean" ? item.official : Boolean(made.official),
        hasCustomThumbnail: typeof item.hasCustomThumbnail === "boolean" ? item.hasCustomThumbnail : Boolean(String(item && (item.thumbnail || item.img) || "").trim()),
        thumbnail: String(item && (item.thumbnail || item.img) || made.thumbnail || "").trim() || made.thumbnail,
        enriched: Boolean(item && item.enriched)
      };
    }).filter(Boolean));
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
        <div class="cover-thumb-wrap media-thumb-loading">
          <img class="cover-thumb" src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" onerror="if(this.dataset.fallback&&!this.dataset.fallbackUsed){this.dataset.fallbackUsed='1';this.src=this.dataset.fallback;}else{this.parentElement.classList.remove('media-thumb-loading');this.parentElement.classList.add('cover-thumb-placeholder');this.remove();}" data-fallback="${escapeHtml(item.fallbackThumbnail || "")}" />
        </div>
        <div class="cover-title" data-cover-title="${escapeHtml(item.id)}">${escapeHtml(item.title || "커버곡")}</div>
      </a>
    `;
  }

  function bindMediaThumbnailLoading_(root) {
    if (!root) return;
    root.querySelectorAll(".cover-thumb-wrap img.cover-thumb").forEach(img => {
      const wrap = img.closest(".cover-thumb-wrap");
      if (!wrap) return;
      const finish = () => {
        wrap.classList.remove("media-thumb-loading");
        wrap.classList.add("media-thumb-loaded");
        if (wrap.classList.contains("channel-thumb-wrap")) wrap.classList.add("channel-border-ready");
      };
      img.addEventListener("load", finish, { once: true });
      if (img.complete && img.naturalWidth > 0) finish();
    });
  }

  function bindCoverCards() {
    bindCarouselPlaylistAddCards_(els.coverTrack, "cover");
    bindMediaThumbnailLoading_(els.coverTrack);
  }

  async function enrichCoverTitles(items) {
    const uniqueItems = items.filter(item => item && item.url && (!coverItems[item._actualIndex] || coverItems[item._actualIndex].title === "커버곡을 불러오는 중..."));
    let changed = false;
    await Promise.all(uniqueItems.map(async item => {
      try {
        const title = await fetchYoutubeOembedTitle(item.url);
        if (!title) return;
        const target = coverItems[item._actualIndex];
        if (target && target.title !== title) {
          target.title = title;
          changed = true;
        }
        if (els.coverTrack) {
          els.coverTrack.querySelectorAll(`[data-cover-title="${cssEscape(item.id)}"]`).forEach(el => {
            el.textContent = title;
          });
        }
      } catch (err) {
        const target = coverItems[item._actualIndex];
        if (target && target.title === "커버곡을 불러오는 중...") {
          target.title = "YouTube 커버곡";
          changed = true;
        }
      }
    }));
    if (changed) {
      persistCoverItemsToLocalCache_();
      hydrateStoredCoverPlaylistEntries_();
    }
  }

  function getReadyCoverTitle_(value) {
    const title = String(value || "").trim();
    return title && !isPendingCoverTitle_(title) ? title : "";
  }

  function collectKnownCoverData_(extraItems = []) {
    const byId = new Map();
    const byVideo = new Map();
    const add = item => {
      if (!item || typeof item !== "object") return;
      const id = String(item.id || "").trim().toUpperCase();
      const videoId = String(item.videoId || extractYoutubeVideoId(item.url || "") || "").trim();
      const title = getReadyCoverTitle_(item.title);
      if (!title) return;
      const value = {
        title,
        section: String(item.section || "커버곡").trim() || "커버곡",
        url: String(item.url || (videoId ? `https://youtu.be/${videoId}` : "")).trim(),
        videoId
      };
      if (id && !byId.has(id)) byId.set(id, value);
      if (videoId && !byVideo.has(videoId)) byVideo.set(videoId, value);
    };

    (Array.isArray(extraItems) ? extraItems : []).forEach(add);
    (Array.isArray(coverItems) ? coverItems : []).forEach(add);

    const cached = readLocalJsonCache();
    normalizeCoverItems(cached && cached.covers || []).forEach(add);

    playlists.forEach(list => {
      if (!Array.isArray(list.items)) return;
      list.items.forEach(item => {
        if (!item || typeof item !== "object" || item.type !== "external") return;
        const match = String(item.key || "").match(/^external:(COVER_\d+)$/i);
        if (!match) return;
        add({
          id: match[1],
          videoId: item.videoId,
          url: item.url,
          title: item.title,
          section: item.section
        });
      });
    });

    return { byId, byVideo };
  }

  function mergeCoverItemsWithKnownStoredData_(incomingItems, extraItems = []) {
    const known = collectKnownCoverData_(extraItems);
    return (Array.isArray(incomingItems) ? incomingItems : []).map(item => {
      if (!item || typeof item !== "object") return item;
      const id = String(item.id || "").trim().toUpperCase();
      const videoId = String(item.videoId || extractYoutubeVideoId(item.url || "") || "").trim();
      const stored = known.byId.get(id) || known.byVideo.get(videoId);
      if (!stored) return item;
      return {
        ...item,
        title: getReadyCoverTitle_(item.title) || stored.title,
        section: String(item.section || stored.section || "커버곡").trim() || "커버곡",
        url: String(item.url || stored.url || "").trim(),
        videoId: videoId || stored.videoId
      };
    });
  }

  function persistCoverItemsToLocalCache_() {
    const cached = readLocalJsonCache();
    if (!cached || typeof cached !== "object") return;
    cached.covers = coverItems;
    cached.saved_at = cached.saved_at || Date.now();
    writeLocalJsonCache(cached);
  }

  function getStoredCoverItemById_(id) {
    const key = String(id || "").trim();
    if (!key) return null;
    const current = coverItems.find(item => item.id === key) || null;
    const cached = readLocalJsonCache();
    const storedItems = normalizeCoverItems(cached && cached.covers || []);
    const stored = storedItems.find(item => item.id === key) || null;
    if (!current) return stored;
    if (!stored) return current;
    const currentPending = current.title === "커버곡을 불러오는 중...";
    const storedReady = stored.title && stored.title !== "커버곡을 불러오는 중...";
    return currentPending && storedReady ? { ...current, ...stored } : current;
  }

  function hydrateStoredCoverPlaylistEntries_() {
    let changed = false;
    playlists.forEach(list => {
      if (!Array.isArray(list.items)) return;
      list.items = list.items.map(item => {
        if (!item || typeof item !== "object" || item.type !== "external") return item;
        const match = String(item.key || "").match(/^external:(COVER_\d+)$/i);
        if (!match) return item;
        const cover = getStoredCoverItemById_(match[1]);
        if (!cover) return item;
        const next = {
          ...item,
          key: `external:${cover.id}`,
          url: cover.url,
          videoId: cover.videoId || extractYoutubeVideoId(cover.url),
          playlistId: "",
          title: getReadyCoverTitle_(cover.title) || getReadyCoverTitle_(item.title) || "커버곡을 불러오는 중...",
          section: cover.section || item.section || "커버곡"
        };
        if (JSON.stringify(next) !== JSON.stringify(item)) changed = true;
        return next;
      });
    });
    if (changed) savePlaylists();
  }

  function isPendingCoverTitle_(value) {
    return !String(value || "").trim() || String(value || "").trim() === "커버곡을 불러오는 중...";
  }

  async function fetchYoutubeOembedTitleWithRetry_(url, attempts = 3) {
    for (let index = 0; index < attempts; index += 1) {
      const title = await fetchYoutubeOembedTitle(url);
      if (title) return title;
      if (index + 1 < attempts) await new Promise(resolve => window.setTimeout(resolve, 1200 * (index + 1)));
    }
    return "";
  }

  function resolveExactCoverTitle_(cover, attempts = 5) {
    const videoId = String(cover && cover.videoId || extractYoutubeVideoId(cover && cover.url || "")).trim();
    const url = String(cover && cover.url || (videoId ? `https://youtu.be/${videoId}` : "")).trim();
    const readyTitle = String(cover && cover.title || "").trim();
    if (readyTitle && !isPendingCoverTitle_(readyTitle)) return Promise.resolve(readyTitle);
    if (!url) return Promise.resolve("");
    const key = videoId || url;
    if (coverTitleResolutionPromises.has(key)) return coverTitleResolutionPromises.get(key);
    const promise = fetchYoutubeOembedTitleWithRetry_(url, attempts).finally(() => {
      coverTitleResolutionPromises.delete(key);
    });
    coverTitleResolutionPromises.set(key, promise);
    return promise;
  }

  function applyResolvedCoverTitleToStoredEntries_(coverId, videoId, title, sourceCover = null) {
    const key = String(coverId || "").trim().toUpperCase();
    const video = String(videoId || "").trim();
    let changed = false;
    playlists.forEach(list => {
      if (!Array.isArray(list.items)) return;
      list.items = list.items.map(item => {
        if (!item || typeof item !== "object" || item.type !== "external") return item;
        const itemMatch = String(item.key || "").match(/^external:(COVER_\d+)$/i);
        const sameId = Boolean(key && itemMatch && itemMatch[1].toUpperCase() === key);
        const sameVideo = Boolean(video && String(item.videoId || extractYoutubeVideoId(item.url || "")) === video);
        if (!sameId && !sameVideo) return item;
        const next = {
          ...item,
          key: `external:${String(sourceCover && sourceCover.id || key || itemMatch && itemMatch[1] || "").trim()}`,
          url: String(sourceCover && sourceCover.url || item.url || (video ? `https://youtu.be/${video}` : "")).trim(),
          videoId: String(sourceCover && sourceCover.videoId || video || item.videoId || "").trim(),
          playlistId: "",
          title,
          section: String(sourceCover && sourceCover.section || item.section || "커버곡").trim() || "커버곡"
        };
        if (JSON.stringify(next) !== JSON.stringify(item)) changed = true;
        return next;
      });
    });
    return changed;
  }

  function getPendingStoredCoverPlaylistEntries_() {
    const pendingEntries = [];
    playlists.forEach(list => {
      if (!Array.isArray(list.items)) return;
      list.items.forEach(item => {
        if (!item || typeof item !== "object" || item.type !== "external" || !isPendingCoverTitle_(item.title)) return;
        const match = String(item.key || "").match(/^external:(COVER_\d+)$/i);
        if (!match) return;
        pendingEntries.push({
          coverId: match[1].toUpperCase(),
          videoId: String(item.videoId || extractYoutubeVideoId(item.url || "")).trim(),
          url: String(item.url || "").trim(),
          section: String(item.section || "커버곡").trim() || "커버곡"
        });
      });
    });
    return pendingEntries;
  }

  function schedulePendingCoverPlaylistHydrationRetry_() {
    if (pendingCoverPlaylistHydrationRetryTimer || pendingCoverPlaylistHydrationRetryCount >= 3) return;
    const delays = [2000, 5000, 10000];
    const delay = delays[pendingCoverPlaylistHydrationRetryCount] || delays[delays.length - 1];
    pendingCoverPlaylistHydrationRetryCount += 1;
    pendingCoverPlaylistHydrationRetryTimer = window.setTimeout(() => {
      pendingCoverPlaylistHydrationRetryTimer = null;
      void resolvePendingStoredCoverPlaylistEntries_();
    }, delay);
  }

  function resolvePendingStoredCoverPlaylistEntries_() {
    if (pendingCoverPlaylistHydrationPromise) {
      pendingCoverPlaylistHydrationRerun = true;
      return pendingCoverPlaylistHydrationPromise;
    }
    const pendingEntries = getPendingStoredCoverPlaylistEntries_();
    if (!pendingEntries.length) {
      pendingCoverPlaylistHydrationRetryCount = 0;
      if (pendingCoverPlaylistHydrationRetryTimer) {
        window.clearTimeout(pendingCoverPlaylistHydrationRetryTimer);
        pendingCoverPlaylistHydrationRetryTimer = null;
      }
      return Promise.resolve();
    }

    pendingCoverPlaylistHydrationPromise = (async () => {
      let changed = false;
      const handled = new Set();
      for (const entry of pendingEntries) {
        const identity = `${entry.coverId}|${entry.videoId || entry.url}`;
        if (handled.has(identity)) continue;
        handled.add(identity);
        const stored = getStoredCoverItemById_(entry.coverId);
        const cover = stored || {
          id: entry.coverId,
          videoId: entry.videoId,
          url: entry.url || (entry.videoId ? `https://youtu.be/${entry.videoId}` : ""),
          title: "",
          section: entry.section
        };
        const title = await resolveExactCoverTitle_(cover, 5);
        if (!title) continue;
        const resolved = { ...cover, title };
        const current = coverItems.find(item => item.id === entry.coverId);
        if (current) Object.assign(current, resolved);
        if (applyResolvedCoverTitleToStoredEntries_(entry.coverId, entry.videoId || resolved.videoId, title, resolved)) changed = true;
      }
      if (changed) {
        savePlaylists();
        persistCoverItemsToLocalCache_();
        renderPlaylistSummary();
        if (els.playlistModal && !els.playlistModal.hidden) renderPlaylistManager();
      }
    })().finally(() => {
      pendingCoverPlaylistHydrationPromise = null;
      if (pendingCoverPlaylistHydrationRerun) {
        pendingCoverPlaylistHydrationRerun = false;
        window.setTimeout(() => {
          void resolvePendingStoredCoverPlaylistEntries_();
        }, 0);
        return;
      }
      if (getPendingStoredCoverPlaylistEntries_().length) {
        schedulePendingCoverPlaylistHydrationRetry_();
      } else {
        pendingCoverPlaylistHydrationRetryCount = 0;
      }
    });
    return pendingCoverPlaylistHydrationPromise;
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
      els.recDescription.textContent = count ? `추천 플레이리스트 ${count}개를 표시합니다.` : "표시할 추천 플레이리스트가 없습니다.";
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
    bindMediaThumbnailLoading_(els.recTrack);
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

  function getRecommendedIdListThumbnail_(ids) {
    for (const id of ids || []) {
      const song = findSongById(id);
      if (song) {
        const videoId = extractYoutubeVideoId(song.link);
        if (videoId) return `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/maxresdefault.jpg`;
      }
      const cover = coverItems.find(item => item.id === id);
      if (cover && cover.thumbnail) return cover.thumbnail;
    }
    return "";
  }

  function renderCarouselMediaCard(item, kind) {
    const isCenter = item._slot === 0;
    const title = item.title || (kind === "rec" ? "추천 플레이리스트" : "커버곡");
    const indexAttr = kind === "rec" ? "data-rec-index" : "data-cover-index";
    const titleAttr = kind === "rec" ? "data-rec-title" : "data-cover-title";
    const isIdList = kind === "rec" && item.type === "id_list";
    const displayThumbnail = item.thumbnail || (isIdList ? getRecommendedIdListThumbnail_(item.ids) : "");
    const thumb = displayThumbnail
      ? `<img class="cover-thumb" src="${escapeHtml(displayThumbnail)}" alt="" loading="lazy" onerror="if(this.dataset.fallback&&!this.dataset.fallbackUsed){this.dataset.fallbackUsed='1';this.src=this.dataset.fallback;}else{this.parentElement.classList.remove('media-thumb-loading');this.parentElement.classList.add('cover-thumb-placeholder');this.remove();}" data-fallback="${escapeHtml(item.fallbackThumbnail || "")}" />`
      : `<div class="cover-thumb-placeholder-content">${isIdList ? `♫ ${item.ids.length}` : (item.type === "playlist" ? "▶ LIST" : "▶")}</div>`;
    const thumbClass = displayThumbnail ? "cover-thumb-wrap media-thumb-loading" : "cover-thumb-wrap cover-thumb-placeholder";
    const common = `class="cover-card ${isCenter ? "active" : "side"}" ${indexAttr}="${escapeHtml(item._actualIndex)}"`;
    const openTag = isIdList
      ? `<button type="button" ${common} data-rec-id-list="1" title="클릭하면 현재 플레이리스트에 곡을 추가합니다.">`
      : `<a ${common} href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" data-carousel-playlist-kind="${escapeHtml(kind)}" data-playlist-hint="우클릭하면 플레이리스트에 추가할 수 있어요!" title="우클릭하면 플레이리스트에 추가할 수 있어요!">`;
    const closeTag = isIdList ? "</button>" : "</a>";

    return `
      ${openTag}
        <div class="${thumbClass}">
          ${thumb}
        </div>
        <div class="cover-title" ${titleAttr}="${escapeHtml(item.id)}">${escapeHtml(title)}</div>
      ${closeTag}
    `;
  }

  function bindRecCards() {
    bindCarouselPlaylistAddCards_(els.recTrack, "rec");
    if (!els.recTrack) return;
    els.recTrack.querySelectorAll("[data-rec-id-list]").forEach(card => {
      card.addEventListener("click", () => {
        const index = Number(card.dataset.recIndex);
        const item = Number.isInteger(index) ? recItems[index] : null;
        if (item) addRecommendedIdsToCurrentPlaylist_(item);
      });
    });
  }

  function getResolvedCoverFallbackTitle_(cover) {
    const section = String(cover && cover.section || "커버곡").trim() || "커버곡";
    return section === "오리지널 곡" ? "YouTube 오리지널 곡" : "YouTube 커버곡";
  }

  function updateResolvedCoverItem_(id, resolved) {
    const key = String(id || "").trim();
    if (!key || !resolved) return;
    const current = coverItems.find(item => item.id === key);
    if (current) Object.assign(current, resolved);
    persistCoverItemsToLocalCache_();
    hydrateStoredCoverPlaylistEntries_();
  }

  async function resolveRecommendedPlaylistItem_(id) {
    const key = String(id || "").trim();
    if (!key) return null;
    if (findSongById(key)) return key;

    let cover = coverItems.find(item => String(item.id || "").trim() === key) || null;
    if (!cover || !cover.url) return null;

    const exactTitle = await resolveExactCoverTitle_(cover, 5);
    if (!exactTitle) return null;
    if (cover.title !== exactTitle) {
      cover = { ...cover, title: exactTitle };
      updateResolvedCoverItem_(key, cover);
    }

    return {
      type: "external",
      key: `external:${cover.id}`,
      url: cover.url,
      videoId: cover.videoId || extractYoutubeVideoId(cover.url),
      playlistId: "",
      title: exactTitle,
      section: cover.section || "커버곡"
    };
  }

  async function addRecommendedIdsToCurrentPlaylist_(item) {
    if (!playlistEnabled) return;
    const selected = getSelectedPlaylist();
    if (!selected) {
      openPlaylistModal();
      showLikeNoticeModal("[알림]", "먼저 플레이리스트를 생성하거나 선택해주세요.");
      return;
    }
    const resolved = (await Promise.all((item.ids || []).map(resolveRecommendedPlaylistItem_))).filter(Boolean);
    const additions = filterUniquePlaylistItems_(resolved).filter(entry => !playlistHasItem_(selected, entry));
    if (!additions.length) {
      showCooldownText("추가 가능한 곡이 없습니다.");
      return;
    }
    const label = item.title || "추천 플레이리스트";
    if (!window.confirm(`${label} 의 추가 가능한 ${additions.length}곡을 ‘${selected.name}’ 에 추가할까요?`)) return;
    selected.items.push(...additions);
    playlistPendingFocusKeys = additions.map(getPlaylistItemKey_);
    savePlaylists();
    renderPlaylistSummary();
    refreshPlaylistAddButtonStates_();
    openPlaylistModal();
    showCooldownText(`${additions.length}곡을 ${selected.name}에 추가했습니다.`);
  }

  async function enrichRecTitles(items) {
    const uniqueItems = items.filter(item => item && item.url && (!recItems[item._actualIndex] || recItems[item._actualIndex].title === "추천 플레이리스트를 불러오는 중..."));
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
        if (target && target.title === "추천 플레이리스트를 불러오는 중...") target.title = target.type === "playlist" ? "YouTube 플레이리스트" : "YouTube 추천 플레이리스트";
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

  function getChannelBorderStyle_(id) {
    const key = String(id || "");
    if (channelBorderStyles.has(key)) return channelBorderStyles.get(key);
    const used = new Set(channelBorderStyles.values());
    let style = "";
    do {
      const hueA = Math.floor(Math.random() * 360);
      const hueB = (hueA + 45 + Math.floor(Math.random() * 225)) % 360;
      const hueC = (hueB + 45 + Math.floor(Math.random() * 225)) % 360;
      const angle = Math.floor(Math.random() * 360);
      const width = 3 + Math.floor(Math.random() * 3);
      style = `--channel-border-a:hsl(${hueA} 88% 62%);--channel-border-b:hsl(${hueB} 88% 62%);--channel-border-c:hsl(${hueC} 88% 62%);--channel-border-angle:${angle}deg;--channel-border-width:${width}px;`;
    } while (used.has(style));
    channelBorderStyles.set(key, style);
    return style;
  }

  function renderChannelSection() {
    if (!els.channelDetails || !els.channelTrack) return;
    const count = channelItems.length;
    if (els.channelDescription) els.channelDescription.textContent = count ? `추천 채널 ${count}개를 표시합니다.` : "표시할 추천 채널이 없습니다.";
    if (!count) {
      if (els.channelEmpty) els.channelEmpty.hidden = false;
      if (els.channelCarousel) els.channelCarousel.hidden = true;
      setChannelNavHidden(true);
      els.channelTrack.innerHTML = "";
      return;
    }
    if (els.channelEmpty) els.channelEmpty.hidden = true;
    if (els.channelCarousel) els.channelCarousel.hidden = false;
    setChannelNavHidden(false);
    channelIndex = wrapIndex(channelIndex, count);
    const visible = getVisibleChannelItems_();
    els.channelTrack.innerHTML = visible.map(renderChannelCard_).join("");
    bindMediaThumbnailLoading_(els.channelTrack);
    enrichChannelItems_(visible);
  }

  function setChannelNavHidden(hidden) {
    if (els.channelPrevButton) els.channelPrevButton.hidden = Boolean(hidden);
    if (els.channelNextButton) els.channelNextButton.hidden = Boolean(hidden);
  }

  function getVisibleChannelItems_() {
    const count = channelItems.length;
    if (!count) return [];
    return [-1, 0, 1].map(offset => {
      const actualIndex = wrapIndex(channelIndex + offset, count);
      return { ...channelItems[actualIndex], _actualIndex: actualIndex, _slot: offset };
    });
  }

  function renderChannelCard_(item) {
    const isCenter = item._slot === 0;
    const borderStyle = getChannelBorderStyle_(item.id);
    const hasCustomName = Boolean(item.customName);
    const primaryOfficialHtml = item.official && !hasCustomName
      ? `<img class="channel-official-mark" src="official.png" alt="공식" loading="lazy" />`
      : "";
    const metaHtml = hasCustomName
      ? `<div class="channel-title-meta"><span class="channel-custom-name">${escapeHtml(item.customName)}</span>${item.official ? `<img class="channel-official-mark channel-official-mark-meta" src="official.png" alt="공식" loading="lazy" />` : ""}</div>`
      : "";
    const hasDecoratedTitle = Boolean(hasCustomName || item.official);
    const titleHtml = hasDecoratedTitle
      ? `<div class="cover-title channel-cover-title" data-channel-title="${escapeHtml(item.id)}"><div class="channel-title-primary">${escapeHtml(item.title)}${primaryOfficialHtml}</div>${metaHtml}</div>`
      : `<div class="cover-title" data-channel-title="${escapeHtml(item.id)}">${escapeHtml(item.title)}</div>`;
    return `
      <a class="cover-card channel-card ${isCenter ? "active" : "side"}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" data-channel-index="${escapeHtml(item._actualIndex)}">
        <div class="cover-thumb-wrap channel-thumb-wrap media-thumb-loading" style="${escapeHtml(borderStyle)}">
          <img class="cover-thumb channel-thumb" src="${escapeHtml(item.thumbnail)}" alt="" loading="lazy" onerror="if(!this.dataset.fallbackUsed){this.dataset.fallbackUsed='1';this.src='https://www.google.com/s2/favicons?domain=youtube.com&sz=128';}else{this.parentElement.classList.remove('media-thumb-loading');this.remove();}" />
        </div>
        ${titleHtml}
      </a>
    `;
  }

  async function enrichChannelItems_(items) {
    const targets = items.filter(item => item && item.url && !item.enriched);
    await Promise.all(targets.map(async item => {
      try {
        const endpoint = `https://noembed.com/embed?url=${encodeURIComponent(item.url)}`;
        const res = await fetch(endpoint, { cache: "force-cache" });
        if (!res.ok) return;
        const json = await res.json();
        const target = channelItems[item._actualIndex];
        if (!target) return;
        const title = String(json.title || json.author_name || "").trim();
        const thumbnail = String(json.thumbnail_url || "").trim();
        if (title && !target.hasCustomTitle) target.title = title;
        if (thumbnail && !target.hasCustomThumbnail) target.thumbnail = thumbnail;
        target.enriched = true;
        renderChannelSection();
      } catch {
        const target = channelItems[item._actualIndex];
        if (target) target.enriched = true;
      }
    }));
  }

  function moveChannelCarousel(direction) {
    if (!channelItems.length || channelMoving) return;
    channelMoving = true;
    if (els.channelTrack) {
      els.channelTrack.classList.remove("move-left", "move-right");
      void els.channelTrack.offsetWidth;
      els.channelTrack.classList.add(direction > 0 ? "move-left" : "move-right");
    }
    window.setTimeout(() => {
      channelIndex = wrapIndex(channelIndex + direction, channelItems.length);
      if (els.channelTrack) els.channelTrack.classList.remove("move-left", "move-right");
      channelMoving = false;
      renderChannelSection();
    }, 260);
  }

  function startChannelAutoTimer() {
    if (channelAutoTimer) window.clearInterval(channelAutoTimer);
    channelAutoTimer = window.setInterval(() => {
      if (!shouldAutoMoveChannel_()) return;
      moveChannelCarousel(-1);
    }, 10000);
  }

  function shouldAutoMoveChannel_() {
    if (!els.channelDetails || !els.channelDetails.open) return false;
    if (!els.channelCarousel || els.channelCarousel.hidden) return false;
    if (channelHover || channelMoving || channelItems.length <= 1) return false;
    return isElementFullyVisible(els.channelDetails);
  }

  function bindCarouselPlaylistAddCards_(root, fallbackKind) {
    if (!root) return;

    root.querySelectorAll(".cover-card[data-carousel-playlist-kind]").forEach(card => {
      let longPressTimer = null;
      let longPressTriggered = false;

      card.addEventListener("contextmenu", event => {
        if (!isDesktopContextCopyEnabled()) return;
        event.preventDefault();
        void handleCarouselPlaylistAdd_(card, card.dataset.carouselPlaylistKind || fallbackKind);
      });

      card.addEventListener("touchstart", () => {
        longPressTriggered = false;
        if (!playlistEnabled) return;
        longPressTimer = window.setTimeout(() => {
          longPressTriggered = true;
          void handleCarouselPlaylistAdd_(card, card.dataset.carouselPlaylistKind || fallbackKind);
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

  async function handleCarouselPlaylistAdd_(card, kind) {
    if (!playlistEnabled) return;

    let entry = null;
    if (kind === "cover") {
      const index = Number(card && card.dataset && card.dataset.coverIndex);
      let cover = Number.isInteger(index) ? coverItems[index] : null;
      if (!cover || !cover.url) {
        showLikeNoticeModal("[알림]", "현재 데이터에서 커버곡 정보를 찾을 수 없습니다.");
        return;
      }
      const exactTitle = await resolveExactCoverTitle_(cover, 5);
      if (!exactTitle) {
        showLikeNoticeModal("[알림]", "커버곡의 정확한 제목을 확인하지 못해 추가하지 않았습니다.");
        return;
      }
      if (cover.title !== exactTitle) {
        cover = { ...cover, title: exactTitle };
        updateResolvedCoverItem_(cover.id, cover);
      }
      entry = {
        type: "external",
        key: `external:${cover.id}`,
        url: cover.url,
        videoId: cover.videoId || extractYoutubeVideoId(cover.url),
        playlistId: "",
        title: exactTitle,
        section: cover.section || "커버곡"
      };
    } else {
      entry = makeExternalPlaylistEntryFromCard_(card, kind);
    }
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
    playlistPendingFocusKeys = [getPlaylistItemKey_(entry)];
    savePlaylists();
    renderPlaylistSummary();
    refreshPlaylistAddButtonStates_();
    openPlaylistModal();
    showCooldownText(`${entry.title} 영상을 ${selected.name}에 추가했습니다.`);
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

  function getPlaylistItemMediaIdentity_(item) {
    if (typeof item === "string") {
      const song = findSongById(item);
      const videoId = song ? extractYoutubeVideoId(song.link) : "";
      return videoId ? `video:${videoId}` : `song:${item}`;
    }
    if (!item || typeof item !== "object") return "";
    const url = String(item.url || "").trim();
    const videoId = String(item.videoId || extractYoutubeVideoId(url) || "").trim();
    const playlistId = String(item.playlistId || extractYoutubePlaylistId(url) || "").trim();
    if (videoId) return `video:${videoId}`;
    if (playlistId) return `playlist:${playlistId}`;
    return String(item.key || item.id || url || "").trim();
  }

  function filterUniquePlaylistItems_(items) {
    const seen = new Set();
    return (items || []).filter(item => {
      const identity = getPlaylistItemMediaIdentity_(item) || getPlaylistItemKey_(item);
      if (!identity || seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  }

  function playlistHasItem_(list, itemOrKey) {
    if (!list || !Array.isArray(list.items)) return false;
    const key = typeof itemOrKey === "string" && itemOrKey.includes(":")
      ? itemOrKey
      : getPlaylistItemKey_(itemOrKey);
    const identity = getPlaylistItemMediaIdentity_(itemOrKey);
    if (!key && !identity) return false;
    return list.items.some(item => {
      if (key && getPlaylistItemKey_(item) === key) return true;
      return Boolean(identity && getPlaylistItemMediaIdentity_(item) === identity);
    });
  }

  function makeExternalPlaylistEntryFromCard_(card, kind) {
    const url = String(card && card.href || "").trim();
    const title = String(card && card.querySelector(".cover-title") && card.querySelector(".cover-title").textContent || "").trim()
      || (kind === "rec" ? "추천 플레이리스트" : "커버곡");
    const section = kind === "rec"
      ? "추천 플레이리스트"
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
    updatePlaylistOpenButtonLabel_();
  }

  function isTabletOrBelow_() {
    return Boolean(window.matchMedia && window.matchMedia("(max-width: 1024px)").matches);
  }

  function updatePlaylistOpenButtonLabel_() {
    if (!els.playlistOpenButton) return;
    window.requestAnimationFrame(() => {
      const nameEl = els.playlistSummaryName;
      const clipped = Boolean(nameEl && nameEl.scrollWidth > nameEl.clientWidth + 1);
      els.playlistOpenButton.textContent = isTabletOrBelow_() && clipped ? "플리" : "플레이리스트";
    });
  }

  function setupPlaylistSummaryResizeWatcher_() {
    if (!els.playlistSummaryName || typeof ResizeObserver !== "function") return;
    if (playlistSummaryResizeObserver) playlistSummaryResizeObserver.disconnect();
    playlistSummaryResizeObserver = new ResizeObserver(updatePlaylistOpenButtonLabel_);
    playlistSummaryResizeObserver.observe(els.playlistSummaryName);
  }

  function renderPlaylistManager() {
    renderPlaylistSummary();
    if (!els.playlistSelect) return;

    const nowMode = playlistModalMode === "now" && Boolean(playlistPlayback && playlistPlayback.active);
    const useQueuePreview = nowMode && playlistModalQueuePreview && selectedPlaylistId === playlistModalQueuePreviewListId;
    const selected = getSelectedPlaylist();
    const displayItems = useQueuePreview
      ? playlistModalQueuePreview.items
      : (selected && Array.isArray(selected.items) ? selected.items : []);

    if (els.playlistModal) els.playlistModal.classList.toggle("playlist-now-playing-mode", nowMode);

    const title = els.playlistModal ? els.playlistModal.querySelector("h2") : null;
    if (title) title.textContent = nowMode ? "지금 듣는 중🎶" : "플레이리스트";

    els.playlistSelect.innerHTML = playlists.map(list => `
      <option value="${escapeHtml(list.id)}" ${list.id === selectedPlaylistId ? "selected" : ""}>${escapeHtml(list.name)} (${list.items.length})</option>
    `).join("");

    resetPlaylistNameInputUi_();

    if (els.playlistEmpty) els.playlistEmpty.hidden = Boolean(displayItems.length);

    if (!els.playlistItems) return;
    if (!displayItems.length) {
      els.playlistItems.innerHTML = "";
      updatePlaylistBulkButtons_();
      return;
    }

    els.playlistItems.innerHTML = displayItems.map((item, index) => {
      const playable = getPlaylistPlayableItem_(item);
      const key = getPlaylistItemKey_(item);
      const titleText = playable ? playable.title : key;
      const titleTooltip = playable && playable.type === "song" ? getSongTitleTooltip_(playable.song) : "";
      const titleHoverAttr = titleTooltip ? ` title="${escapeHtml(titleTooltip)}"` : "";
      const meta = playable && playable.type === "song"
        ? [getRawDisplayArtist(playable.song), formatSongDateIso_(playable.song), [playable.song.timeline || "", playable.song.end || ""].filter(Boolean).join(" ~ ")].filter(Boolean).join(" · ")
        : playable
          ? playable.section
          : "재생할 수 없는 항목";
      const draggable = nowMode ? "false" : "true";
      const nowIndex = useQueuePreview ? ` data-playlist-now-index="${index}"` : "";
      const currentClass = useQueuePreview && playlistPlayback && index === playlistPlayback.index ? " playlist-item-row-current" : "";

      return `
        <div class="playlist-item-row${currentClass}" draggable="${draggable}" data-playlist-item-id="${escapeHtml(key)}" data-playlist-item-index="${index}"${nowIndex}>
          <label class="playlist-item-check-wrap" title="선택">
            <input class="playlist-item-check" type="checkbox" data-playlist-check-id="${escapeHtml(key)}" aria-label="선택" />
          </label>
          <div class="playlist-item-main">
            <div class="playlist-item-title-line">
              <span class="playlist-item-index">${index + 1}. </span>
              ${nowMode ? `<strong class="playlist-item-title-marquee" data-playlist-title-text="${escapeHtml(titleText)}"${titleHoverAttr}><span class="modal-marquee-inner">${escapeHtml(titleText)}</span></strong>` : `<strong${titleHoverAttr}>${escapeHtml(titleText)}</strong>`}
            </div>
            <span class="playlist-item-meta">${escapeHtml(meta)}</span>
          </div>
          <div class="playlist-item-mobile-move" aria-label="모바일 순서 변경">
            <button class="playlist-item-move-button" type="button" data-playlist-move-id="${escapeHtml(key)}" data-playlist-move-step="-1" ${index === 0 ? "disabled" : ""} aria-label="위로 이동">↑</button>
            <button class="playlist-item-move-button" type="button" data-playlist-move-id="${escapeHtml(key)}" data-playlist-move-step="1" ${index === displayItems.length - 1 ? "disabled" : ""} aria-label="아래로 이동">↓</button>
          </div>
          <button class="playlist-item-remove" type="button" data-playlist-remove-id="${escapeHtml(key)}" aria-label="삭제">×</button>
        </div>
      `;
    }).join("");

    bindPlaylistItemRowEvents_();
    updatePlaylistBulkButtons_();
    applyPlaylistItemTitleMarquee_();
    applyPlaylistPendingFocus_();
    scrollPlaylistCurrentItemIntoView_();
  }

  function applyPlaylistPendingFocus_() {
    if (!els.playlistItems || !playlistPendingFocusKeys.length) return;
    const keys = [...playlistPendingFocusKeys];
    playlistPendingFocusKeys = [];
    const rows = keys
      .map(key => els.playlistItems.querySelector(`[data-playlist-item-id="${cssEscape(key)}"]`))
      .filter(Boolean);
    const target = rows[rows.length - 1] || null;
    rows.forEach(row => {
      row.classList.add("playlist-item-row-added-pulse");
      window.setTimeout(() => row.classList.remove("playlist-item-row-added-pulse"), 3000);
    });
    scrollPlaylistItemIntoCenter_(target);
  }

  function scrollPlaylistCurrentItemIntoView_() {
    if (playlistModalMode !== "now" || !els.playlistItems) return;
    scrollPlaylistItemIntoCenter_(els.playlistItems.querySelector(".playlist-item-row-current"));
  }

  function applyPlaylistItemTitleMarquee_() {
    if (!els.playlistItems) return;
    els.playlistItems.querySelectorAll(".playlist-item-title-marquee").forEach(title => {
      const inner = title.querySelector(".modal-marquee-inner");
      if (!inner) return;
      title.classList.remove("modal-marquee-active");
      title.style.removeProperty("--modal-marquee-distance");
      title.style.removeProperty("--modal-marquee-duration");
      window.requestAnimationFrame(() => {
        const distance = Math.ceil(inner.scrollWidth - title.clientWidth);
        if (distance <= 2) return;
        const moveSeconds = Math.max(2.4, Math.min(12, distance / 38));
        const totalSeconds = 4 + moveSeconds * 2;
        title.style.setProperty("--modal-marquee-distance", `${distance}px`);
        title.style.setProperty("--modal-marquee-duration", `${totalSeconds}s`);
        title.classList.add("modal-marquee-active");
      });
    });
  }

  function scrollPlaylistItemIntoCenter_(row) {
    if (!row || !els.playlistItems) return;
    const container = els.playlistItems;
    if (container.scrollHeight <= container.clientHeight + 1) return;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const rowRect = row.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const rawTop = container.scrollTop + (rowRect.top - containerRect.top) - ((container.clientHeight - rowRect.height) / 2);
        const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
        const top = Math.max(0, Math.min(maxTop, rawTop));
        container.scrollTo({ top, behavior: "smooth" });
      });
    });
  }

  function bindPlaylistItemRowEvents_() {
    if (!els.playlistItems) return;
    const nowMode = playlistModalMode === "now" && Boolean(playlistPlayback && playlistPlayback.active);

    els.playlistItems.querySelectorAll("[data-playlist-remove-id]").forEach(button => {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        removeSongFromSelectedPlaylist(button.dataset.playlistRemoveId || "", { confirm: true });
      });
    });

    if (nowMode) {
      els.playlistItems.querySelectorAll(".playlist-item-row[data-playlist-now-index]").forEach(row => {
        row.addEventListener("click", event => {
          if (event.target.closest("button,input,label,select,textarea")) return;
          const index = Number(row.dataset.playlistNowIndex || -1);
          if (!Number.isInteger(index) || index < 0) return;
          closePlaylistModal();
          playPlaylistItemAt_(index, { captureCurrentVolume: true });
        });
      });
      return;
    }

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
    if (playlistModalMode === "now") {
      if (els.playlistRemoveSelectedButton) els.playlistRemoveSelectedButton.disabled = true;
      if (els.playlistClearButton) els.playlistClearButton.disabled = true;
      if (els.playlistReverseButton) els.playlistReverseButton.disabled = true;
      return;
    }

    const selected = getSelectedPlaylist();
    const checkedCount = els.playlistItems
      ? els.playlistItems.querySelectorAll("[data-playlist-check-id]:checked").length
      : 0;
    const totalCount = els.playlistItems
      ? els.playlistItems.querySelectorAll("[data-playlist-check-id]").length
      : 0;

    if (els.playlistRemoveSelectedButton) {
      els.playlistRemoveSelectedButton.disabled = checkedCount === 0;
      els.playlistRemoveSelectedButton.textContent = checkedCount ? `선택삭제 (${checkedCount})` : "선택삭제";
    }

    if (els.playlistClearButton) {
      els.playlistClearButton.disabled = !(selected && selected.items.length) || totalCount === 0 || checkedCount === totalCount;
      els.playlistClearButton.textContent = checkedCount && checkedCount < totalCount ? `전체선택 (${checkedCount}/${totalCount})` : "전체선택";
    }

    if (els.playlistReverseButton) {
      els.playlistReverseButton.disabled = !(selected && selected.items.length > 1);
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

  function selectAllPlaylistItems_() {
    if (!els.playlistItems) return;
    els.playlistItems.querySelectorAll("[data-playlist-check-id]").forEach(input => {
      input.checked = true;
    });
    updatePlaylistBulkButtons_();
  }

  function reverseSelectedPlaylistItems_() {
    const selected = getSelectedPlaylist();
    if (!selected || selected.items.length <= 1) return;
    selected.items.reverse();
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
    updatePlaylistNameActionButtons_();
  }

  function showPlaylistNameInput_(action) {
    pendingPlaylistNameAction = action;
    if (!els.playlistNameInput) return;
    els.playlistNameInput.value = "";
    els.playlistNameInput.dataset.action = action;
    els.playlistNameInput.hidden = false;
    updatePlaylistDeleteButtonText_();
    updatePlaylistNameActionButtons_();
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

  function updatePlaylistNameActionButtons_() {
    const visible = isPlaylistNameInputVisible_();
    const action = visible && els.playlistNameInput ? String(els.playlistNameInput.dataset.action || "") : "";

    if (els.playlistCreateButton) els.playlistCreateButton.disabled = action === "rename";
    if (els.playlistRenameButton) els.playlistRenameButton.disabled = action === "create";
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

  function bytesToBase64Url_(bytes) {
    let binary = "";
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes_(value) {
    const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function transformBytesWithStream_(bytes, mode, format) {
    const StreamClass = mode === "compress" ? window.CompressionStream : window.DecompressionStream;
    if (typeof StreamClass !== "function") throw new Error(`${mode} stream unsupported`);
    const stream = new Blob([bytes]).stream().pipeThrough(new StreamClass(format));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function decompressBytesWithLimit_(bytes, format, maxBytes) {
    if (typeof window.DecompressionStream !== "function") throw new Error("decompress stream unsupported");
    const reader = new Blob([bytes]).stream().pipeThrough(new window.DecompressionStream(format)).getReader();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel();
          throw new Error("decompressed size limit exceeded");
        }
        chunks.push(value);
      }
    } finally {
      try { reader.releaseLock(); } catch {}
    }
    const result = new Uint8Array(total);
    let offset = 0;
    chunks.forEach(chunk => {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    });
    return result;
  }

  function validatePlaylistSharePayload_(parsed, version) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Number(parsed.v) !== version || !Array.isArray(parsed.i)) {
      throw new Error("공유코드 내부 데이터 형식이 올바르지 않습니다.");
    }
    const name = String(parsed.n || "가져온 플레이리스트").trim() || "가져온 플레이리스트";
    if (name.length > PLAYLIST_SHARE_MAX_NAME_LENGTH) {
      throw new Error(`플레이리스트 이름은 최대 ${PLAYLIST_SHARE_MAX_NAME_LENGTH}자까지 사용할 수 있습니다.`);
    }
    if (parsed.i.length > PLAYLIST_SHARE_MAX_ITEMS) {
      throw new Error(`공유 플레이리스트는 최대 ${PLAYLIST_SHARE_MAX_ITEMS}곡까지 가져올 수 있습니다.`);
    }
    parsed.i.forEach(rawItem => {
      if (typeof rawItem === "string") {
        if (rawItem.length > PLAYLIST_SHARE_MAX_ITEM_STRING_LENGTH) {
          throw new Error("공유코드의 곡 ID가 허용 길이를 초과했습니다.");
        }
        return;
      }
      if (!Array.isArray(rawItem) || rawItem.length !== 2 || rawItem.some(value => typeof value !== "string" || value.length > PLAYLIST_SHARE_MAX_ITEM_STRING_LENGTH)) {
        throw new Error("공유코드의 커버곡 항목 형식이 올바르지 않습니다.");
      }
    });
    return { name, items: parsed.i };
  }

  async function sha256Hex_(text) {
    if (!window.crypto || !window.crypto.subtle) throw new Error("SHA-256을 지원하지 않는 환경입니다.");
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(text || "")));
    return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
  }

  function getCoverIdFromPlaylistItem_(item) {
    if (!item || typeof item !== "object") return "";
    const candidates = [item.id, item.key];
    for (const candidate of candidates) {
      const match = String(candidate || "").match(/(?:^|external:)(COVER_\d+)$/i);
      if (match) return match[1].toUpperCase();
    }
    const identity = getPlaylistItemMediaIdentity_(item);
    const videoId = identity.startsWith("video:") ? identity.slice(6) : "";
    if (!videoId) return "";
    const cover = coverItems.find(value => String(value.videoId || "") === videoId);
    return cover ? String(cover.id || "").trim() : "";
  }

  function makePlaylistShareData_(list) {
    const skipped = [];
    const items = [];
    (list && Array.isArray(list.items) ? list.items : []).forEach(item => {
      if (typeof item === "string") {
        const id = item.trim();
        if (id) items.push(id);
        return;
      }
      const normalized = normalizePlaylistItem_(item);
      const coverId = getCoverIdFromPlaylistItem_(normalized);
      const videoId = normalized && String(normalized.videoId || extractYoutubeVideoId(normalized.url) || "").trim();
      if (coverId && videoId) {
        items.push([coverId, videoId]);
        return;
      }
      skipped.push(item);
    });
    return {
      data: {
        v: PLAYLIST_SHARE_FORMAT_VERSION,
        n: String(list && list.name || "플레이리스트").trim() || "플레이리스트",
        i: items
      },
      skippedCount: skipped.length
    };
  }

  async function createPlaylistShareCode_(list) {
    const exported = makePlaylistShareData_(list);
    validatePlaylistSharePayload_(exported.data, PLAYLIST_SHARE_FORMAT_VERSION);
    const sourceBytes = new TextEncoder().encode(JSON.stringify(exported.data));
    if (sourceBytes.byteLength > PLAYLIST_SHARE_MAX_DECOMPRESSED_BYTES) {
      throw new Error("플레이리스트 공유 데이터가 허용된 최대 크기를 초과했습니다.");
    }
    let status = "R";
    let encodedBytes = sourceBytes;
    try {
      encodedBytes = await transformBytesWithStream_(sourceBytes, "compress", "gzip");
      status = "G";
    } catch {}
    if (encodedBytes.byteLength > PLAYLIST_SHARE_MAX_COMPRESSED_BYTES) {
      throw new Error("플레이리스트 공유코드가 허용된 최대 크기를 초과했습니다.");
    }
    const payload = bytesToBase64Url_(encodedBytes);
    const checksum = (await sha256Hex_(payload)).slice(0, 8);
    const code = `${PLAYLIST_SHARE_PREFIX}${PLAYLIST_SHARE_FORMAT_VERSION}-${status}-${checksum.slice(0, 4)}${payload}${checksum.slice(4, 8)}`;
    if (code.length > PLAYLIST_SHARE_MAX_CODE_LENGTH) {
      throw new Error("플레이리스트 공유코드가 허용된 최대 길이를 초과했습니다.");
    }
    return {
      code,
      skippedCount: exported.skippedCount,
      itemCount: exported.data.i.length
    };
  }

  async function parsePlaylistShareCode_(code) {
    const rawSource = String(code || "");
    if (rawSource.length > PLAYLIST_SHARE_MAX_CODE_LENGTH) {
      throw new Error(`공유코드는 최대 ${PLAYLIST_SHARE_MAX_CODE_LENGTH.toLocaleString()}자까지 입력할 수 있습니다.`);
    }
    const source = rawSource.replace(/\s+/g, "").trim();
    const match = source.match(/^UREI-PL(\d+)-([GR])-([0-9a-fA-F]{4})(.+)([0-9a-fA-F]{4})$/);
    if (!match) throw new Error("공유코드 형식이 올바르지 않습니다.");
    const version = Number(match[1]);
    if (version !== PLAYLIST_SHARE_FORMAT_VERSION) throw new Error(`지원하지 않는 공유코드 규격 버전입니다: ${version}`);
    const status = match[2];
    const payload = match[4];
    const estimatedBytes = Math.floor(payload.length * 3 / 4);
    if (estimatedBytes > PLAYLIST_SHARE_MAX_COMPRESSED_BYTES) {
      throw new Error("공유코드 데이터가 허용된 최대 크기를 초과했습니다.");
    }
    const expectedChecksum = `${match[3]}${match[5]}`.toLowerCase();
    const actualChecksum = (await sha256Hex_(payload)).slice(0, 8).toLowerCase();
    if (actualChecksum !== expectedChecksum) throw new Error("공유코드가 손상되었거나 일부가 누락되었습니다.");
    let bytes;
    try {
      bytes = base64UrlToBytes_(payload);
    } catch {
      throw new Error("공유코드의 인코딩 형식이 올바르지 않습니다.");
    }
    if (bytes.byteLength > PLAYLIST_SHARE_MAX_COMPRESSED_BYTES) {
      throw new Error("공유코드 데이터가 허용된 최대 크기를 초과했습니다.");
    }
    if (status === "G") {
      try {
        bytes = await decompressBytesWithLimit_(bytes, "gzip", PLAYLIST_SHARE_MAX_DECOMPRESSED_BYTES);
      } catch (error) {
        if (String(error && error.message || "").includes("size limit")) {
          throw new Error("압축 해제된 공유 데이터가 허용된 최대 크기를 초과했습니다.");
        }
        throw new Error("이 브라우저에서는 압축된 공유코드를 해제할 수 없거나 공유코드가 손상되었습니다.");
      }
    } else if (bytes.byteLength > PLAYLIST_SHARE_MAX_DECOMPRESSED_BYTES) {
      throw new Error("공유 데이터가 허용된 최대 크기를 초과했습니다.");
    }
    let parsed;
    try {
      parsed = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new Error("공유코드의 데이터 내용을 읽을 수 없습니다.");
    }
    const validated = validatePlaylistSharePayload_(parsed, version);
    return {
      version,
      name: validated.name,
      items: validated.items
    };
  }

  function findCoverItemForImport_(coverId, videoId) {
    const id = String(coverId || "").trim().toUpperCase();
    const video = String(videoId || "").trim();
    const byId = getStoredCoverItemById_(id);
    if (byId && (!video || String(byId.videoId || "") === video)) return byId;
    const currentByVideo = coverItems.find(item => String(item.videoId || "") === video);
    if (currentByVideo) return currentByVideo;
    const cached = readLocalJsonCache();
    const storedByVideo = normalizeCoverItems(cached && cached.covers || []).find(item => String(item.videoId || "") === video);
    return storedByVideo || byId || null;
  }

  async function resolveSharedPlaylistItem_(rawItem) {
    if (typeof rawItem === "string") {
      const id = rawItem.trim();
      const song = findSongById(id);
      if (!id || !song || !canAddSongToPlaylist(song)) {
        return { valid: false, label: id || "빈 곡 ID", reason: "곡을 찾을 수 없음" };
      }
      return {
        valid: true,
        item: id,
        label: `${getDisplayTitle(song)} - ${getRawDisplayArtist(song) || getDisplayArtist(song)}`
      };
    }

    if (!Array.isArray(rawItem) || rawItem.length < 2) {
      return { valid: false, label: String(rawItem || "알 수 없는 항목"), reason: "항목 형식 오류" };
    }

    const coverId = String(rawItem[0] || "").trim().toUpperCase();
    const videoId = String(rawItem[1] || "").trim();
    if (!/^COVER_\d+$/.test(coverId) || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return { valid: false, label: `${coverId || "COVER"} / ${videoId || "영상 ID 없음"}`, reason: "커버곡 형식 오류" };
    }

    const cover = findCoverItemForImport_(coverId, videoId);
    let title = String(cover && cover.title || "").trim();
    const section = String(cover && cover.section || "커버곡").trim() || "커버곡";
    const url = String(cover && cover.url || `https://youtu.be/${videoId}`).trim();
    if (!title || title === "커버곡을 불러오는 중...") {
      try { title = await fetchYoutubeOembedTitle(url); } catch {}
    }
    title = title || (section === "오리지널 곡" ? "YouTube 오리지널 곡" : "YouTube 커버곡");
    return {
      valid: true,
      item: {
        type: "external",
        key: `external:${cover && cover.id || coverId}`,
        url,
        videoId,
        playlistId: "",
        title,
        section
      },
      label: `${title} - ${section}`
    };
  }

  async function resolvePlaylistShareItems_(rawItems) {
    const results = [];
    for (const rawItem of rawItems) results.push(await resolveSharedPlaylistItem_(rawItem));
    const uniqueItems = [];
    const validResultIndexes = [];
    results.forEach((result, index) => {
      if (!result.valid) return;
      const candidate = result.item;
      const identity = getPlaylistItemMediaIdentity_(candidate) || getPlaylistItemKey_(candidate);
      if (!identity || uniqueItems.some(item => (getPlaylistItemMediaIdentity_(item) || getPlaylistItemKey_(item)) === identity)) {
        result.valid = false;
        result.reason = "중복 항목";
        return;
      }
      uniqueItems.push(candidate);
      validResultIndexes.push(index);
    });
    return { results, validItems: uniqueItems, validResultIndexes };
  }

  function setNestedPlaylistModalOpen_(modal, open) {
    if (!modal) return;
    modal.hidden = !open;
    if (open) document.body.classList.add("modal-open");
    else if (
      (!els.youtubeModal || els.youtubeModal.hidden) &&
      (!els.playlistModal || els.playlistModal.hidden) &&
      (!els.playlistImportModal || els.playlistImportModal.hidden) &&
      (!els.playlistImportPreviewModal || els.playlistImportPreviewModal.hidden)
    ) document.body.classList.remove("modal-open");
  }

  function openPlaylistImportModal_() {
    if (!els.playlistImportModal) return;
    if (els.playlistImportCodeInput) els.playlistImportCodeInput.value = "";
    setNestedPlaylistModalOpen_(els.playlistImportModal, true);
    window.setTimeout(() => els.playlistImportCodeInput && els.playlistImportCodeInput.focus(), 20);
  }

  function closePlaylistImportModal_() {
    setNestedPlaylistModalOpen_(els.playlistImportModal, false);
  }

  function closePlaylistImportPreviewModal_() {
    playlistImportPreviewState = null;
    setNestedPlaylistModalOpen_(els.playlistImportPreviewModal, false);
  }

  function getPlaylistImportPreviewRows_() {
    if (!playlistImportPreviewState) return { rows: [], validItems: [], duplicateCount: 0, excludedCount: 0 };
    const mode = playlistImportImportModeValue_();
    const targetId = String(els.playlistImportMergeSelect && els.playlistImportMergeSelect.value || "").trim();
    const target = mode === "merge" ? playlists.find(list => list.id === targetId) : null;
    const rows = playlistImportPreviewState.results.map(result => {
      if (!result.valid || !result.item) {
        const duplicate = String(result.reason || "") === "중복 항목";
        return { ...result, addable: false, duplicate, reason: result.reason || "정보 없음/제외" };
      }
      if (target && playlistHasItem_(target, result.item)) {
        return { ...result, addable: false, duplicate: true, reason: "선택한 플레이리스트에 이미 존재" };
      }
      return { ...result, addable: true, duplicate: false, reason: "추가 가능" };
    });
    const validItems = rows.filter(row => row.addable).map(row => row.item);
    const duplicateCount = rows.filter(row => row.duplicate).length;
    const excludedCount = rows.filter(row => !row.addable && !row.duplicate).length;
    return { rows, validItems, duplicateCount, excludedCount };
  }

  function refreshPlaylistImportPreviewMarquees_() {
    if (!els.playlistImportPreviewItems) return;
    els.playlistImportPreviewItems.querySelectorAll(".playlist-import-preview-label").forEach(label => {
      const inner = label.querySelector(".modal-marquee-inner");
      if (!inner) return;
      label.classList.remove("modal-marquee-active");
      label.style.removeProperty("--modal-marquee-distance");
      label.style.removeProperty("--modal-marquee-duration");
      const distance = Math.ceil(inner.scrollWidth - label.clientWidth);
      if (distance <= 2) return;
      const moveSeconds = Math.max(2.4, Math.min(12, distance / 38));
      label.style.setProperty("--modal-marquee-distance", `${distance}px`);
      label.style.setProperty("--modal-marquee-duration", `${4 + moveSeconds * 2}s`);
      label.classList.add("modal-marquee-active");
    });
  }

  function refreshPlaylistImportPreview_() {
    if (!playlistImportPreviewState) return;
    const computed = getPlaylistImportPreviewRows_();
    playlistImportPreviewState.currentValidItems = computed.validItems;
    if (els.playlistImportPreviewSummary) {
      els.playlistImportPreviewSummary.textContent = `전체 ${playlistImportPreviewState.rawCount}곡 · 중복 ${computed.duplicateCount}곡 · 추가 가능 ${computed.validItems.length}곡 · 정보 없음/제외 ${computed.excludedCount}곡`;
    }
    if (els.playlistImportPreviewItems) {
      els.playlistImportPreviewItems.innerHTML = computed.rows.map((result, index) => `
        <div class="playlist-import-preview-item ${result.addable ? "is-valid" : "is-invalid"}" title="${escapeHtml(result.reason || "")}">
          <span class="playlist-import-preview-index">${index + 1}</span>
          <span class="playlist-import-preview-label"><span class="modal-marquee-inner">${escapeHtml(result.label || "알 수 없는 항목")}</span></span>
          <span class="playlist-import-preview-state" aria-label="${result.addable ? "추가 가능" : "추가 불가"}">${result.addable ? "⭕" : "❌"}</span>
        </div>
      `).join("");
      window.requestAnimationFrame(refreshPlaylistImportPreviewMarquees_);
    }
    if (els.playlistImportPreviewApplyButton) {
      els.playlistImportPreviewApplyButton.disabled = !computed.validItems.length;
    }
  }

  function updatePlaylistImportPreviewMode_() {
    if (!els.playlistImportPreviewModal) return;
    const checked = els.playlistImportPreviewModal.querySelector('input[name="playlistImportMode"]:checked');
    const mode = checked ? checked.value : "new";
    if (els.playlistImportNewName) {
      els.playlistImportNewName.disabled = mode !== "new";
      els.playlistImportNewName.hidden = mode !== "new";
    }
    if (els.playlistImportMergeSelect) {
      els.playlistImportMergeSelect.disabled = mode !== "merge";
      els.playlistImportMergeSelect.hidden = mode !== "merge";
    }
    refreshPlaylistImportPreview_();
  }

  function renderPlaylistImportPreview_(share, resolved) {
    playlistImportPreviewState = {
      name: share.name,
      rawCount: share.items.length,
      results: resolved.results,
      validItems: resolved.validItems,
      currentValidItems: resolved.validItems
    };
    if (els.playlistImportPreviewName) els.playlistImportPreviewName.textContent = share.name;
    if (els.playlistImportNewName) els.playlistImportNewName.value = makeUniquePlaylistName_(share.name);
    if (els.playlistImportMergeSelect) {
      els.playlistImportMergeSelect.innerHTML = playlists.map(list => `<option value="${escapeHtml(list.id)}" ${list.id === selectedPlaylistId ? "selected" : ""}>${escapeHtml(list.name)} (${list.items.length})</option>`).join("");
    }
    const defaultRadio = els.playlistImportPreviewModal && els.playlistImportPreviewModal.querySelector('input[name="playlistImportMode"][value="new"]');
    if (defaultRadio) defaultRadio.checked = true;
    updatePlaylistImportPreviewMode_();
    setNestedPlaylistModalOpen_(els.playlistImportPreviewModal, true);
  }

  function makeUniquePlaylistName_(name) {
    const base = String(name || "가져온 플레이리스트").trim() || "가져온 플레이리스트";
    if (!playlistNameExists_(base)) return base;
    let index = 2;
    while (playlistNameExists_(`${base} (${index})`)) index += 1;
    return `${base} (${index})`;
  }

  async function exportSelectedPlaylist_() {
    const selected = getSelectedPlaylist();
    if (!selected) return;
    try {
      const exported = await createPlaylistShareCode_(selected);
      if (!exported.itemCount) {
        showLikeNoticeModal("[알림]", "공유할 수 있는 곡이 없습니다.");
        return;
      }
      await writeTextToClipboard(exported.code);
      const skippedText = exported.skippedCount ? `\n지원하지 않는 외부 영상 ${exported.skippedCount}개는 제외했습니다.` : "";
      showLikeNoticeModal("[완료]", `‘${selected.name}’ 공유코드를 클립보드에 복사했습니다.${skippedText}`);
    } catch (error) {
      showLikeNoticeModal("[오류]", String(error && error.message || "공유코드를 만들지 못했습니다."));
    }
  }

  async function validatePlaylistImportCode_() {
    const code = String(els.playlistImportCodeInput && els.playlistImportCodeInput.value || "").trim();
    if (!code) {
      showLikeNoticeModal("[알림]", "공유코드를 입력해주세요.");
      return;
    }
    if (els.playlistImportCodeConfirmButton) els.playlistImportCodeConfirmButton.disabled = true;
    try {
      const share = await parsePlaylistShareCode_(code);
      const resolved = await resolvePlaylistShareItems_(share.items);
      closePlaylistImportModal_();
      renderPlaylistImportPreview_(share, resolved);
    } catch (error) {
      showLikeNoticeModal("[오류]", String(error && error.message || "공유코드를 확인하지 못했습니다."));
    } finally {
      if (els.playlistImportCodeConfirmButton) els.playlistImportCodeConfirmButton.disabled = false;
    }
  }

  function applyPlaylistImportPreview_() {
    if (!playlistImportPreviewState || !playlistImportImportModeValue_()) return;
    const mode = playlistImportImportModeValue_();
    const importItems = Array.isArray(playlistImportPreviewState.currentValidItems)
      ? playlistImportPreviewState.currentValidItems
      : [];
    if (!importItems.length) return;

    if (mode === "new") {
      const name = String(els.playlistImportNewName && els.playlistImportNewName.value || "").trim();
      if (!name) {
        showLikeNoticeModal("[알림]", "새 플레이리스트 이름을 입력해주세요.");
        return;
      }
      if (playlistNameExists_(name)) {
        showLikeNoticeModal("[알림]", "이미 같은 이름의 플레이리스트가 있습니다.");
        return;
      }
      const list = { id: makePlaylistId_(), name, items: filterUniquePlaylistItems_(importItems) };
      playlists.push(list);
      selectedPlaylistId = list.id;
      savePlaylists();
      closePlaylistImportPreviewModal_();
      renderPlaylistManager();
      renderPlaylistSummary();
      refreshPlaylistAddButtonStates_();
      showCooldownText(`플레이리스트 가져오기: ${name}`);
      return;
    }

    const targetId = String(els.playlistImportMergeSelect && els.playlistImportMergeSelect.value || "").trim();
    const target = playlists.find(list => list.id === targetId);
    if (!target) {
      showLikeNoticeModal("[알림]", "병합할 플레이리스트를 선택해주세요.");
      return;
    }
    let added = 0;
    importItems.forEach(item => {
      if (playlistHasItem_(target, item)) return;
      target.items.push(item);
      added += 1;
    });
    selectedPlaylistId = target.id;
    savePlaylists();
    closePlaylistImportPreviewModal_();
    renderPlaylistManager();
    renderPlaylistSummary();
    refreshPlaylistAddButtonStates_();
    showCooldownText(`‘${target.name}’에 ${added}곡 병합`);
  }

  function playlistImportImportModeValue_() {
    const checked = els.playlistImportPreviewModal && els.playlistImportPreviewModal.querySelector('input[name="playlistImportMode"]:checked');
    return checked ? checked.value : "new";
  }

  function bindPlaylistManagerEvents() {
    if (els.playlistImportModal) els.playlistImportModal.hidden = true;
    if (els.playlistImportPreviewModal) els.playlistImportPreviewModal.hidden = true;

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

    if (els.playlistExportButton) els.playlistExportButton.addEventListener("click", exportSelectedPlaylist_);
    if (els.playlistImportButton) els.playlistImportButton.addEventListener("click", openPlaylistImportModal_);
    if (els.playlistImportModal) {
      els.playlistImportModal.addEventListener("click", event => {
        if (event.target === els.playlistImportModal) pulseModalCloseButton_(els.playlistImportModalClose);
      });
    }
    if (els.playlistImportModalClose) els.playlistImportModalClose.addEventListener("click", closePlaylistImportModal_);
    if (els.playlistImportCodeCancelButton) els.playlistImportCodeCancelButton.addEventListener("click", closePlaylistImportModal_);
    if (els.playlistImportCodeConfirmButton) els.playlistImportCodeConfirmButton.addEventListener("click", validatePlaylistImportCode_);
    if (els.playlistImportPreviewModal) {
      els.playlistImportPreviewModal.addEventListener("click", event => {
        if (event.target === els.playlistImportPreviewModal) pulseModalCloseButton_(els.playlistImportPreviewModalClose);
      });
      els.playlistImportPreviewModal.querySelectorAll('input[name="playlistImportMode"]').forEach(input => {
        input.addEventListener("change", updatePlaylistImportPreviewMode_);
      });
    }
    if (els.playlistImportMergeSelect) {
      els.playlistImportMergeSelect.addEventListener("change", refreshPlaylistImportPreview_);
    }
    if (els.playlistImportPreviewModalClose) els.playlistImportPreviewModalClose.addEventListener("click", closePlaylistImportPreviewModal_);
    if (els.playlistImportPreviewCancelButton) els.playlistImportPreviewCancelButton.addEventListener("click", closePlaylistImportPreviewModal_);
    if (els.playlistImportPreviewApplyButton) els.playlistImportPreviewApplyButton.addEventListener("click", applyPlaylistImportPreview_);

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
        refreshPlaylistAddButtonStates_();
        showCooldownText(`플레이리스트 생성: ${name}`);
      });
    }

    if (els.playlistSelect) {
      els.playlistSelect.addEventListener("change", () => {
        selectedPlaylistId = els.playlistSelect.value || "";
        if (playlistModalMode === "now" && selectedPlaylistId !== playlistModalQueuePreviewListId) {
          playlistModalQueuePreview = null;
          playlistModalQueuePreviewListId = "";
        }
        resetPlaylistNameInputUi_();
        savePlaylists();
        renderPlaylistManager();
        refreshPlaylistAddButtonStates_();
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
        renderPlaylistSummary();
        refreshPlaylistAddButtonStates_();
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
        renderPlaylistSummary();
        refreshPlaylistAddButtonStates_();
      });
    }

    if (els.playlistRemoveSelectedButton) {
      els.playlistRemoveSelectedButton.addEventListener("click", removeSelectedPlaylistItems_);
    }

    if (els.playlistClearButton) {
      els.playlistClearButton.addEventListener("click", selectAllPlaylistItems_);
    }

    if (els.playlistReverseButton) {
      els.playlistReverseButton.addEventListener("click", reverseSelectedPlaylistItems_);
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

  function pulseModalCloseButton_(button) {
    if (!button) return;
    const previousTimer = modalCloseAttentionTimers.get(button);
    if (previousTimer) window.clearTimeout(previousTimer);
    button.classList.remove("modal-close-attention");
    void button.offsetWidth;
    button.classList.add("modal-close-attention");
    const timer = window.setTimeout(() => {
      button.classList.remove("modal-close-attention");
      modalCloseAttentionTimers.delete(button);
    }, 3000);
    modalCloseAttentionTimers.set(button, timer);
  }

  function pulseYoutubeModalCloseButton_() {
    pulseModalCloseButton_(els.youtubeModalClose);
    if (youtubeClosePulseTimer) window.clearTimeout(youtubeClosePulseTimer);
    youtubeClosePulseTimer = window.setTimeout(() => {
      youtubeClosePulseTimer = null;
    }, 3000);
  }

  function isMobileBurninShieldEnabled_() {
    if (!window.matchMedia) return false;
    return window.matchMedia("(max-width: 720px), (pointer: coarse)").matches;
  }

  function getBurninFullscreenTarget_() {
    if (els.youtubeModal && !els.youtubeModal.hidden) return els.youtubeModal;
    return document.documentElement;
  }

  async function requestBurninFullscreen_(target) {
    if (!target || !target.requestFullscreen) return;
    try {
      await target.requestFullscreen();
      burninShieldFullscreenTarget = target;
    } catch {
      burninShieldFullscreenTarget = null;
    }
  }

  function ensureBurninShield_(parent = document.body) {
    if (!burninShieldEl) {
      burninShieldEl = document.createElement("div");
      burninShieldEl.className = "burnin-shield";
      burninShieldEl.hidden = true;

      burninShieldTextEl = document.createElement("div");
      burninShieldTextEl.className = "burnin-shield-text";
      burninShieldEl.appendChild(burninShieldTextEl);

      burninShieldEl.addEventListener("click", handleBurninShieldTap_);
    }
    const targetParent = parent && parent.appendChild ? parent : document.body;
    if (burninShieldEl.parentNode !== targetParent) targetParent.appendChild(burninShieldEl);
    return burninShieldEl;
  }

  function getBurninCurrentSongTexts_() {
    const title = els.modalSongTitle ? String(els.modalSongTitle.dataset.copyText || els.modalSongTitle.textContent || "").trim() : "";
    const artist = els.modalSongArtist ? String(els.modalSongArtist.dataset.copyText || els.modalSongArtist.textContent || "").trim() : "";
    return {
      title: title || "재생 중",
      artist: artist || ""
    };
  }

  function positionBurninShieldTextSafely_() {
    if (!burninShieldEl || !burninShieldTextEl) return;

    const shieldRect = burninShieldEl.getBoundingClientRect();
    const textRect = burninShieldTextEl.getBoundingClientRect();
    const margin = 18;
    const safeWidth = Math.max(1, shieldRect.width - margin * 2);
    const safeHeight = Math.max(1, shieldRect.height - margin * 2);
    const halfWidth = Math.min(textRect.width / 2, safeWidth / 2);
    const halfHeight = Math.min(textRect.height / 2, safeHeight / 2);
    const minX = margin + halfWidth;
    const maxX = Math.max(minX, shieldRect.width - margin - halfWidth);
    const minY = margin + halfHeight;
    const maxY = Math.max(minY, shieldRect.height - margin - halfHeight);
    const x = minX + Math.random() * Math.max(0, maxX - minX);
    const y = minY + Math.random() * Math.max(0, maxY - minY);

    burninShieldTextEl.style.left = `${x}px`;
    burninShieldTextEl.style.top = `${y}px`;
  }

  function clearBurninShieldTextTimers_() {
    if (burninShieldLoopTimer) {
      window.clearTimeout(burninShieldLoopTimer);
      burninShieldLoopTimer = null;
    }
    if (burninShieldVisibleTimer) {
      window.clearTimeout(burninShieldVisibleTimer);
      burninShieldVisibleTimer = null;
    }
  }

  function setBurninShieldTextContent_() {
    if (!burninShieldTextEl) return;
    const { title, artist } = getBurninCurrentSongTexts_();
    burninShieldTextEl.innerHTML = `<div>재생 중 · 탭하면 돌아가기</div><div>·</div><div class="burnin-shield-song-title">${escapeHtml(title)}</div><div>${escapeHtml(artist)}</div>`;
  }

  function showBurninShieldText_(holdMs = 2000, continueLoop = true) {
    if (!burninShieldEl || burninShieldEl.hidden || !burninShieldTextEl) return;
    const fadeMs = 1150;
    const cooldownMs = 12000;

    clearBurninShieldTextTimers_();
    burninShieldTextEl.classList.remove("show");
    setBurninShieldTextContent_();

    window.requestAnimationFrame(() => {
      if (!burninShieldTextEl || !burninShieldEl || burninShieldEl.hidden) return;
      positionBurninShieldTextSafely_();
      window.requestAnimationFrame(() => {
        if (!burninShieldTextEl || !burninShieldEl || burninShieldEl.hidden) return;
        burninShieldTextEl.classList.add("show");
      });
    });

    burninShieldVisibleTimer = window.setTimeout(() => {
      if (burninShieldTextEl) burninShieldTextEl.classList.remove("show");
    }, fadeMs + holdMs);

    if (continueLoop) {
      burninShieldLoopTimer = window.setTimeout(scheduleBurninShieldText_, fadeMs + holdMs + fadeMs + cooldownMs);
    }
  }

  function scheduleBurninShieldText_() {
    showBurninShieldText_(2000, true);
  }

  function handleBurninShieldTap_(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!burninShieldEl || burninShieldEl.hidden || !burninShieldTextEl) return;

    if (burninShieldTextEl.classList.contains("show")) {
      closeBurninShield_(true);
      return;
    }

    showBurninShieldText_(3000, true);
  }

  async function openBurninShield_() {
    if (!isMobileBurninShieldEnabled_()) return;
    const target = getBurninFullscreenTarget_();
    const shield = ensureBurninShield_(target === document.documentElement ? document.body : target);
    await requestBurninFullscreen_(target);
    if (burninShieldCloseTimer) {
      window.clearTimeout(burninShieldCloseTimer);
      burninShieldCloseTimer = null;
    }
    shield.classList.remove("closing");
    shield.hidden = false;
    document.body.classList.add("burnin-shield-open");
    scheduleBurninShieldText_();
  }

  async function closeBurninShield_(fade = false) {
    clearBurninShieldTextTimers_();
    if (burninShieldCloseTimer) {
      window.clearTimeout(burninShieldCloseTimer);
      burninShieldCloseTimer = null;
    }
    if (burninShieldTextEl) burninShieldTextEl.classList.remove("show");

    const finishClose = async () => {
      if (burninShieldEl) {
        burninShieldEl.classList.remove("closing");
        burninShieldEl.hidden = true;
      }
      document.body.classList.remove("burnin-shield-open");
      if (document.fullscreenElement && burninShieldFullscreenTarget) {
        try { await document.exitFullscreen(); } catch {}
      }
      burninShieldFullscreenTarget = null;
      burninShieldCloseTimer = null;
    };

    if (fade && burninShieldEl && !burninShieldEl.hidden) {
      burninShieldEl.classList.add("closing");
      burninShieldCloseTimer = window.setTimeout(finishClose, 560);
      return;
    }

    await finishClose();
  }

  function bindPlaylistPlayerEvents() {
    if (els.playlistPrevTrackButton) els.playlistPrevTrackButton.addEventListener("click", () => playPreviousPlaylistItem_());
    if (els.playlistNextTrackButton) els.playlistNextTrackButton.addEventListener("click", () => playNextPlaylistItem_("manual"));
    if (els.playlistShowListButton) els.playlistShowListButton.addEventListener("click", () => openPlaylistModal("now"));
    if (els.playlistBurninShieldButton) els.playlistBurninShieldButton.addEventListener("click", openBurninShield_);
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

  function openPlaylistModal(mode = "manager") {
    if (!playlistEnabled) return;
    playlistModalMode = mode === "now" && playlistPlayback && playlistPlayback.active ? "now" : "manager";
    if (playlistModalMode === "now") {
      playlistModalQueuePreview = {
        id: playlistPlayback.list && playlistPlayback.list.id || "",
        name: playlistPlayback.list && playlistPlayback.list.name || "플레이리스트",
        items: [...(playlistPlayback.queue || [])]
      };
      playlistModalQueuePreviewListId = playlistModalQueuePreview.id;
      if (playlistModalQueuePreviewListId) selectedPlaylistId = playlistModalQueuePreviewListId;
    } else {
      playlistModalQueuePreview = null;
      playlistModalQueuePreviewListId = "";
    }
    if (els.playlistModal) {
      els.playlistModal.hidden = false;
      document.body.classList.add("modal-open");
    }
    renderPlaylistManager();
    window.requestAnimationFrame(() => {
      applyPlaylistPendingFocus_();
      scrollPlaylistCurrentItemIntoView_();
    });
  }

  function closePlaylistModal() {
    if (!els.playlistModal) return;
    els.playlistModal.hidden = true;
    els.playlistModal.classList.remove("playlist-now-playing-mode");
    playlistModalMode = "manager";
    playlistModalQueuePreview = null;
    playlistModalQueuePreviewListId = "";
    const title = els.playlistModal.querySelector("h2");
    if (title) title.textContent = "플레이리스트";
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
      removeSongFromSelectedPlaylist(`song:${id}`, { confirm: true, song });
      return;
    }

    selected.items.push(id);
    playlistPendingFocusKeys = [`song:${id}`];
    savePlaylists();
    renderPlaylistSummary();
    refreshPlaylistAddButtonStates_();
    addLikeClickFeedback(button);
    openPlaylistModal();
    showCooldownText(`${getDisplayTitle(song)} 곡을 ${selected.name}에 추가했습니다.`);
  }

  function removeSongFromSelectedPlaylist(id, options = {}) {
    const selected = getSelectedPlaylist();
    if (!selected) return false;
    const key = String(id || "").includes(":") ? String(id || "") : `song:${id}`;
    const item = selected.items.find(entry => getPlaylistItemKey_(entry) === key);
    if (!item) return false;

    const playable = getPlaylistPlayableItem_(item);
    const label = playable && playable.title || (options.song && getDisplayTitle(options.song)) || "이 곡";
    if (options.confirm && !window.confirm(`${label} 을(를) 현재 플레이리스트에서 삭제할까요?`)) return false;

    selected.items = selected.items.filter(entry => getPlaylistItemKey_(entry) !== key);
    savePlaylists();
    const removedCurrent = removePlaylistItemFromActivePlayback_(selected.id, key);
    renderPlaylistManager();
    renderPlaylistSummary();
    refreshPlaylistAddButtonStates_();
    if (!removedCurrent) renderPlaylistPlaybackUi_();
    showCooldownText(`${label} 곡을 ${selected.name}에서 제거했습니다.`);
    return true;
  }

  function syncNowPlayingPlaylistPreview_() {
    if (playlistModalMode !== "now" || !playlistPlayback || !playlistPlayback.active) return;
    playlistModalQueuePreview = {
      id: playlistPlayback.list && playlistPlayback.list.id || "",
      name: playlistPlayback.list && playlistPlayback.list.name || "플레이리스트",
      items: [...(playlistPlayback.queue || [])]
    };
    playlistModalQueuePreviewListId = playlistModalQueuePreview.id;
  }

  function removePlaylistItemFromActivePlayback_(listId, key) {
    if (!playlistPlayback || !playlistPlayback.active || !playlistPlayback.list || playlistPlayback.list.id !== listId) return false;

    const currentKey = getPlaylistItemKey_(playlistPlayback.queue[playlistPlayback.index]);
    const removeIndex = playlistPlayback.queue.findIndex(item => getPlaylistItemKey_(item) === key);
    if (removeIndex < 0) return false;

    playlistPlayback.queue = playlistPlayback.queue.filter(item => getPlaylistItemKey_(item) !== key);
    playlistPlayback.list.items = playlistPlayback.list.items.filter(item => getPlaylistItemKey_(item) !== key);

    syncNowPlayingPlaylistPreview_();

    if (!playlistPlayback.queue.length) {
      finishPlaylistPlayback_();
      return true;
    }

    if (currentKey === key) {
      const nextIndex = removeIndex < playlistPlayback.queue.length ? removeIndex : (playlistPlayback.repeat ? 0 : -1);
      if (nextIndex < 0) finishPlaylistPlayback_();
      else playPlaylistItemAt_(nextIndex);
      syncNowPlayingPlaylistPreview_();
      if (playlistModalMode === "now" && els.playlistModal && !els.playlistModal.hidden) renderPlaylistManager();
      return true;
    }

    if (removeIndex < playlistPlayback.index) playlistPlayback.index = Math.max(0, playlistPlayback.index - 1);
    syncNowPlayingPlaylistPreview_();
    return false;
  }

  function getPlaylistPlaybackSourceItems_(list) {
    if (!list || !Array.isArray(list.items)) return [];
    const checkedIds = getCheckedPlaylistItemIds_();
    if (!checkedIds.length) return list.items;
    const checkedSet = new Set(checkedIds);
    return list.items.filter(item => checkedSet.has(getPlaylistItemKey_(item)));
  }

  function startPlaylistPlayback(mode = "sequential") {
    if (!playlistEnabled) return;
    const selected = getSelectedPlaylist();
    if (!selected || !selected.items.length) {
      showLikeNoticeModal("[알림]", "재생할 곡이 있는 플레이리스트를 선택해주세요.");
      openPlaylistModal();
      return;
    }

    const sourceItems = getPlaylistPlaybackSourceItems_(selected);
    const validItems = sourceItems.filter(item => getPlaylistPlayableItem_(item));
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
      currentStart: 0,
      currentEnd: 0,
      baseVolume: PLAYLIST_DEFAULT_VOLUME,
      preferredVolume: PLAYLIST_DEFAULT_VOLUME,
      hasVolumeBaseline: true,
      resumeVolume: 0,
      volumeMode: "starting",
      fadingOut: false,
      finished: false
    };

    closePlaylistModal();
    startPlaylistVolumeMonitor_();
    playPlaylistItemAt_(0, { captureCurrentVolume: false });
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

  function playPlaylistItemAt_(index, options = {}) {
    if (!playlistPlayback || !playlistPlayback.active) return;
    const playOptions = options || {};
    if (playOptions.captureCurrentVolume) rememberPlaylistPlaybackVolume_();
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
    playlistPlayback.finished = false;
    playlistPlayback.currentStart = playable.hasSegment ? playable.start : 0;
    playlistPlayback.currentEnd = playable.hasSegment ? playable.end : 0;
    resetPlaylistSegmentProgress_();
    applyRandomPlaylistProgressColors_();
    playlistPlayback.volumeMode = "starting";
    playlistPlayback.resumeVolume = 0;

    const token = ++youtubePlayerToken;
    youtubeIsPlaying = false;
    stopTabTitleMarquee_(true);
    youtubeStartedPlaying = false;
    youtubeInitialLoadingSuppressed = false;
    youtubeAwaitingManualPlayback = false;
    clearYoutubeShareAutoplayWaitTimer_();

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
    scheduleMediaSessionRefresh_();

    const hasReusablePlayer = Boolean(youtubePlayer && typeof youtubePlayer.loadVideoById === "function");
    if (!hasReusablePlayer) renderYoutubeFrameMount_();
    else if (els.youtubeFrameWrap) els.youtubeFrameWrap.classList.add("playlist-side-nav-enabled");
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

        if (hasReusablePlayer) {
          preparePlaylistPlayerForFadeStart_(youtubePlayer);
          const loaded = loadYoutubeMediaIntoExistingPlayer_(playable.videoId, playable.start, token, { playlistId: playable.playlistId });
          if (!loaded) {
            destroyYoutubePlayer_(false);
            renderYoutubeFrameMount_();
            createYoutubePlayer_(playable.videoId, playable.start, token, playlistPlayback.currentEnd, { playlistId: playable.playlistId });
          }
          return;
        }

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
    const shouldCaptureVolume = reason === "manual" || reason === "ended";
    if (shouldCaptureVolume) rememberPlaylistPlaybackVolume_();
    clearPlaylistSegmentWatcher_();
    clearPlaylistSkipTimer_();

    let nextIndex = playlistPlayback.index + 1;
    if (nextIndex >= playlistPlayback.queue.length) {
      if (!playlistPlayback.repeat) {
        finishPlaylistPlayback_();
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
    playPlaylistItemAt_(nextIndex, { captureCurrentVolume: false });
  }

  function finishPlaylistPlayback_() {
    if (!playlistPlayback || !playlistPlayback.active) return;
    youtubeIsPlaying = false;
    stopTabTitleMarquee_(true);
    playlistPlayback.finished = true;
    resetPlaylistSegmentProgress_();
    clearPlaylistSegmentWatcher_();
    clearPlaylistSkipTimer_();
    clearPlaylistVolumeFade_();
    clearPlaylistVolumeMonitor_();
    try {
      if (youtubePlayer && typeof youtubePlayer.mute === "function") youtubePlayer.mute();
      if (youtubePlayer && typeof youtubePlayer.stopVideo === "function") youtubePlayer.stopVideo();
      else if (youtubePlayer && typeof youtubePlayer.pauseVideo === "function") youtubePlayer.pauseVideo();
    } catch {}
    renderPlaylistPlaybackUi_();
    setupMediaSessionPlaybackControls_();
    setMediaSessionPlaybackState_("none");
    showYoutubeLoadingMessage("플레이리스트 재생이 끝났습니다\n클릭하면 닫힙니다");
    armPlaylistFinishedClose_();
  }

  function armPlaylistFinishedClose_() {
    if (playlistFinishedCloseArmed) return;
    playlistFinishedCloseArmed = true;
    window.setTimeout(() => {
      document.addEventListener("click", handlePlaylistFinishedDocumentClose_, true);
      document.addEventListener("touchend", handlePlaylistFinishedDocumentClose_, true);
    }, 80);
  }

  function handlePlaylistFinishedDocumentClose_(event) {
    if (!playlistPlayback || !playlistPlayback.finished) {
      disarmPlaylistFinishedClose_();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    disarmPlaylistFinishedClose_();
    closeYoutubeModal();
  }

  function disarmPlaylistFinishedClose_() {
    playlistFinishedCloseArmed = false;
    document.removeEventListener("click", handlePlaylistFinishedDocumentClose_, true);
    document.removeEventListener("touchend", handlePlaylistFinishedDocumentClose_, true);
  }

  function playPreviousPlaylistItem_() {
    if (!playlistPlayback || !playlistPlayback.active) return;
    rememberPlaylistPlaybackVolume_();
    let prevIndex = playlistPlayback.index - 1;
    if (prevIndex < 0) prevIndex = playlistPlayback.repeat ? playlistPlayback.queue.length - 1 : 0;
    playPlaylistItemAt_(prevIndex, { captureCurrentVolume: false });
  }

  function rememberPlaylistPlaybackVolume_() {
    if (!playlistPlayback || !playlistPlayback.active) return;
    capturePlaylistUserVolume_();
    setPlaylistVolumeImmediately_(0);
  }

  function getPlaylistPreferredVolume_() {
    const preferred = Number(playlistPlayback && playlistPlayback.preferredVolume);
    if (Number.isFinite(preferred)) return Math.max(1, Math.min(100, preferred));
    return PLAYLIST_DEFAULT_VOLUME;
  }

  function setPlaylistAutomatedVolume_(player, volume) {
    if (!player || typeof player.setVolume !== "function") return;
    const safeVolume = Math.max(0, Math.min(100, Math.round(Number(volume) || 0)));
    playlistLastAutomatedVolume = safeVolume;
    playlistLastAutomatedVolumeAt = performance.now();
    try { player.setVolume(safeVolume); } catch {}
  }

  function capturePlaylistUserVolume_() {
    if (!playlistPlayback || !playlistPlayback.active || !youtubePlayer) return;
    if (playlistPlayback.volumeMode !== "normal") return;
    const currentVolume = getPlaylistCurrentVolume_(getPlaylistPreferredVolume_());
    if (!Number.isFinite(currentVolume) || currentVolume <= 0) return;
    const recentlyAutomated = performance.now() - playlistLastAutomatedVolumeAt < PLAYLIST_VOLUME_MONITOR_INTERVAL_MS * 2;
    if (recentlyAutomated && playlistLastAutomatedVolume !== null && Math.abs(currentVolume - playlistLastAutomatedVolume) < PLAYLIST_VOLUME_USER_CHANGE_THRESHOLD) return;
    if (Math.abs(currentVolume - getPlaylistPreferredVolume_()) < PLAYLIST_VOLUME_USER_CHANGE_THRESHOLD) return;
    playlistPlayback.preferredVolume = Math.max(1, Math.min(100, currentVolume));
    playlistPlayback.baseVolume = playlistPlayback.preferredVolume;
    playlistPlayback.hasVolumeBaseline = true;
  }

  function startPlaylistVolumeMonitor_() {
    clearPlaylistVolumeMonitor_();
    playlistVolumeMonitorTimer = window.setInterval(() => {
      capturePlaylistUserVolume_();
    }, PLAYLIST_VOLUME_MONITOR_INTERVAL_MS);
  }

  function clearPlaylistVolumeMonitor_() {
    if (playlistVolumeMonitorTimer) {
      window.clearInterval(playlistVolumeMonitorTimer);
      playlistVolumeMonitorTimer = null;
    }
    playlistLastAutomatedVolume = null;
    playlistLastAutomatedVolumeAt = 0;
  }

  function preparePlaylistPlayerForFadeStart_(player) {
    if (!player) return;
    try { if (typeof player.mute === "function") player.mute(); } catch {}
    setPlaylistAutomatedVolume_(player, 0);
  }

  function releasePlaylistPlayerForFade_(player, volume) {
    if (!player) return;
    const safeVolume = Math.max(0, Math.min(100, Math.round(Number(volume) || 0)));
    setPlaylistAutomatedVolume_(player, safeVolume);
    try { if (typeof player.unMute === "function") player.unMute(); } catch {}
    setPlaylistAutomatedVolume_(player, safeVolume);
  }

  function getPlaylistCurrentVolume_(fallback = 0) {
    try {
      const value = Number(youtubePlayer && youtubePlayer.getVolume && youtubePlayer.getVolume());
      if (Number.isFinite(value)) return Math.max(0, Math.min(100, value));
    } catch {}
    return Math.max(0, Math.min(100, Number(fallback) || 0));
  }

  function setPlaylistVolumeImmediately_(volume) {
    if (!youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;
    setPlaylistAutomatedVolume_(youtubePlayer, volume);
  }

  function getPlaylistFadeTargetVolume_() {
    const resumeVolume = Number(playlistPlayback && playlistPlayback.resumeVolume);
    if (Number.isFinite(resumeVolume) && resumeVolume > 0) return Math.max(0, Math.min(100, resumeVolume));
    return getPlaylistPreferredVolume_();
  }

  function handlePlaylistPlaybackPlaying_() {
    if (!playlistPlayback || !playlistPlayback.active) return;
    const mode = playlistPlayback.volumeMode || "starting";
    if (mode !== "starting" && mode !== "paused") return;

    const target = getPlaylistFadeTargetVolume_();
    const nextMode = mode === "paused" ? "resuming" : "fadingIn";
    playlistPlayback.volumeMode = nextMode;
    preparePlaylistPlayerForFadeStart_(youtubePlayer);
    startPlaylistVolumeFadeIn_(target, () => {
      if (playlistPlayback && playlistPlayback.active && playlistPlayback.volumeMode === nextMode) {
        playlistPlayback.volumeMode = "normal";
        playlistPlayback.resumeVolume = 0;
      }
    });
  }

  function handlePlaylistPlaybackPaused_() {
    if (!playlistPlayback || !playlistPlayback.active || playlistPlayback.finished) return;
    const wasNormalVolume = playlistPlayback.volumeMode === "normal";
    const currentVolume = wasNormalVolume
      ? getPlaylistCurrentVolume_(getPlaylistPreferredVolume_())
      : getPlaylistPreferredVolume_();
    clearPlaylistVolumeFade_();
    playlistPlayback.resumeVolume = currentVolume > 0 ? currentVolume : getPlaylistPreferredVolume_();
    playlistPlayback.volumeMode = "paused";
    setPlaylistVolumeImmediately_(0);
  }

  function formatPlaylistProgressTime_(seconds, negative = false) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    const value = hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    return negative ? `-${value}` : value;
  }

  function applyRandomPlaylistProgressColors_() {
    if (!els.modalSongInfoTop) return;
    const hue = Math.floor(Math.random() * 360);
    const secondHue = (hue + 28 + Math.floor(Math.random() * 54)) % 360;
    els.modalSongInfoTop.style.setProperty("--playlist-segment-progress-color-start", `hsla(${hue}, 78%, 58%, 0.24)`);
    els.modalSongInfoTop.style.setProperty("--playlist-segment-progress-color-end", `hsla(${secondHue}, 74%, 63%, 0.20)`);
    els.modalSongInfoTop.style.setProperty("--playlist-segment-progress-color-start-dark", `hsla(${hue}, 82%, 64%, 0.30)`);
    els.modalSongInfoTop.style.setProperty("--playlist-segment-progress-color-end-dark", `hsla(${secondHue}, 78%, 68%, 0.25)`);
    els.modalSongInfoTop.style.setProperty("--playlist-segment-progress-shadow", `hsla(${hue}, 80%, 55%, 0.13)`);
    els.modalSongInfoTop.style.setProperty("--playlist-segment-progress-shadow-dark", `hsla(${hue}, 84%, 64%, 0.17)`);
  }

  function resetPlaylistSegmentProgress_() {
    if (els.modalSongInfoTop) {
      els.modalSongInfoTop.classList.remove("playlist-segment-progress-active");
      els.modalSongInfoTop.style.removeProperty("--playlist-segment-progress");
    }
    if (!els.youtubeFrameWrap) return;
    els.youtubeFrameWrap.classList.remove("playlist-segment-progress-enabled");
    const currentEl = els.youtubeFrameWrap.querySelector(".youtube-side-time-current");
    const remainingEl = els.youtubeFrameWrap.querySelector(".youtube-side-time-remaining");
    if (currentEl) currentEl.textContent = "00:00";
    if (remainingEl) remainingEl.textContent = "-00:00";
  }

  function updatePlaylistSegmentProgress_(currentTime) {
    if (!isDesktopTabTitleEnvironment_() || !playlistPlayback || !playlistPlayback.active) {
      resetPlaylistSegmentProgress_();
      return;
    }

    const start = Number(playlistPlayback.currentStart);
    const end = Number(playlistPlayback.currentEnd);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      resetPlaylistSegmentProgress_();
      return;
    }

    const duration = end - start;
    const elapsed = Math.max(0, Math.min(duration, Number(currentTime) - start));
    const remaining = Math.max(0, duration - elapsed);
    const progress = duration > 0 ? Math.max(0, Math.min(100, elapsed / duration * 100)) : 0;

    if (els.modalSongInfoTop) {
      els.modalSongInfoTop.classList.add("playlist-segment-progress-active");
      els.modalSongInfoTop.style.setProperty("--playlist-segment-progress", `${progress.toFixed(3)}%`);
    }

    if (!els.youtubeFrameWrap) return;
    els.youtubeFrameWrap.classList.add("playlist-segment-progress-enabled");
    const currentEl = els.youtubeFrameWrap.querySelector(".youtube-side-time-current");
    const remainingEl = els.youtubeFrameWrap.querySelector(".youtube-side-time-remaining");
    if (currentEl) currentEl.textContent = formatPlaylistProgressTime_(elapsed);
    if (remainingEl) remainingEl.textContent = formatPlaylistProgressTime_(remaining, true);
  }

  function startPlaylistSegmentWatcher_() {
    clearPlaylistSegmentWatcher_();
    if (!playlistPlayback || !playlistPlayback.active || !playlistPlayback.currentEnd || !youtubePlayer) {
      resetPlaylistSegmentProgress_();
      return;
    }

    playlistSegmentTimer = window.setInterval(() => {
      if (!playlistPlayback || !playlistPlayback.active || !youtubePlayer || typeof youtubePlayer.getCurrentTime !== "function") return;
      let current = 0;
      try { current = Number(youtubePlayer.getCurrentTime() || 0); } catch { return; }
      updatePlaylistSegmentProgress_(current);
      const remaining = playlistPlayback.currentEnd - current;

      if (remaining > PLAYLIST_END_FADE_TRIGGER_SECONDS && playlistPlayback.fadingOut) {
        playlistPlayback.fadingOut = false;
        if (playlistPlayback.volumeMode === "ending") playlistPlayback.volumeMode = "normal";
        clearPlaylistVolumeFade_();
        setPlaylistVolumeImmediately_(getPlaylistPreferredVolume_());
      }

      if (remaining <= PLAYLIST_END_FADE_TRIGGER_SECONDS && remaining > 0.08 && !playlistPlayback.fadingOut) {
        playlistPlayback.fadingOut = true;
        startPlaylistVolumeFadeOut_(Math.max(240, remaining * 1000));
      }

      if (current >= playlistPlayback.currentEnd - 0.08) {
        clearPlaylistSegmentWatcher_();
        if (!playlistPlayback.repeat && playlistPlayback.index >= playlistPlayback.queue.length - 1) {
          finishPlaylistPlayback_();
        } else {
          playNextPlaylistItem_("segment_end");
        }
      }
    }, PLAYLIST_END_CHECK_INTERVAL_MS);
  }

  function startPlaylistVolumeFadeIn_(targetVolume, onDone) {
    if (!playlistPlayback || !playlistPlayback.active || !youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;
    const target = Math.max(0, Math.min(100, Number(targetVolume) || getPlaylistPreferredVolume_()));
    runPlaylistVolumeFade_(0, target, PLAYLIST_FADE_DURATION_MS, t => 1 - Math.pow(1 - t, 3), onDone, { muteUntilAudible: true });
  }

  function startPlaylistVolumeFadeOut_(durationMs = PLAYLIST_FADE_DURATION_MS) {
    if (!playlistPlayback || !playlistPlayback.active || !youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;
    let from = getPlaylistCurrentVolume_(getPlaylistPreferredVolume_());
    try {
      const currentVolume = Number(youtubePlayer.getVolume && youtubePlayer.getVolume());
      if (Number.isFinite(currentVolume)) from = currentVolume;
    } catch {}
    playlistPlayback.volumeMode = "ending";
    runPlaylistVolumeFade_(from, 0, durationMs, t => Math.pow(t, 3));
  }

  function runPlaylistVolumeFade_(from, to, durationMs, easing, onDone, options = {}) {
    clearPlaylistVolumeFade_();
    if (!youtubePlayer || typeof youtubePlayer.setVolume !== "function") return;

    const fadePlayer = youtubePlayer;
    const fadeSeq = ++playlistVolumeFadeSeq;
    const start = performance.now();
    const duration = Math.max(120, Number(durationMs) || PLAYLIST_FADE_DURATION_MS);
    const fromValue = Math.max(0, Math.min(100, Number(from) || 0));
    const toValue = Math.max(0, Math.min(100, Number(to) || 0));
    let audioReleased = !(options && options.muteUntilAudible && toValue > fromValue);
    if (!audioReleased) preparePlaylistPlayerForFadeStart_(fadePlayer);

    const tick = () => {
      if (fadeSeq !== playlistVolumeFadeSeq || youtubePlayer !== fadePlayer) return;
      if (!fadePlayer || typeof fadePlayer.setVolume !== "function") return;
      const elapsed = performance.now() - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = typeof easing === "function" ? easing(progress) : progress;
      const value = fromValue + (toValue - fromValue) * eased;
      const safeValue = Math.max(0, Math.min(100, Math.round(value)));
      try {
        if (!audioReleased && (progress > 0 || safeValue > 0)) {
          releasePlaylistPlayerForFade_(fadePlayer, safeValue);
          audioReleased = true;
        } else {
          setPlaylistAutomatedVolume_(fadePlayer, safeValue);
        }
      } catch { return; }

      if (progress < 1) {
        playlistVolumeFadeTimer = window.setTimeout(tick, 50);
      } else {
        playlistVolumeFadeTimer = null;
        if (typeof onDone === "function") onDone();
      }
    };

    tick();
  }

  function clearPlaylistVolumeFade_() {
    playlistVolumeFadeSeq += 1;
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
    if (els.youtubeFrameWrap) els.youtubeFrameWrap.classList.toggle("playlist-side-nav-enabled", active && !(playlistPlayback && playlistPlayback.finished));
    if (!active) return;

    const listName = playlistPlayback.list && playlistPlayback.list.name || "플레이리스트";
    const indexText = `${playlistPlayback.index + 1}/${playlistPlayback.queue.length}`;
    if (els.playlistPlayerName) els.playlistPlayerName.textContent = `${indexText} · ${listName}`;
    if (els.playlistOrderToggleButton) els.playlistOrderToggleButton.textContent = playlistPlayback.mode === "random" ? "랜덤재생" : "순차재생";
    if (els.playlistRepeatPlayerToggle) els.playlistRepeatPlayerToggle.textContent = playlistPlayback.repeat ? "전체반복" : "반복안함";
    if (playlistModalMode === "now" && els.playlistModal && !els.playlistModal.hidden) renderPlaylistManager();
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
    if (!els.pageLoading || suppressPageLoadingForInitialShare) return;
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
        setCooldownStatusText_(`좋아요 쿨타임: ${Math.ceil(remain / 1000)}초`, false);
      } else if (els.cooldownStatus && els.cooldownStatus.textContent.startsWith("좋아요 쿨타임")) {
        setCooldownStatusText_("", false);
      }
    }, 250);
  }

  function setCooldownStatusText_(text, autoHide = true) {
    if (!els.cooldownStatus) return;
    const value = String(text || "");
    window.clearTimeout(cooldownClearTimer);
    window.clearTimeout(cooldownCrossfadeTimer);
    els.cooldownStatus.textContent = value;
    document.body.classList.toggle("cooldown-status-visible", Boolean(value));

    if (autoHide && value) {
      cooldownClearTimer = window.setTimeout(() => {
        if (els.cooldownStatus && !els.cooldownStatus.textContent.startsWith("좋아요 쿨타임")) {
          document.body.classList.remove("cooldown-status-visible");
          cooldownCrossfadeTimer = window.setTimeout(() => {
            if (els.cooldownStatus && !document.body.classList.contains("cooldown-status-visible")) {
              els.cooldownStatus.textContent = "";
            }
          }, 260);
        }
      }, 3000);
    }
  }

  function showCooldownText(text) {
    setCooldownStatusText_(text, true);
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
