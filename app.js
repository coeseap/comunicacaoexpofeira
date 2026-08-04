(() => {
  const tabButtons = [...document.querySelectorAll("[data-tab]")];
  const panels = [...document.querySelectorAll(".tab-panel")];
  const openTabButtons = [...document.querySelectorAll("[data-open-tab]")];
  const openScheduleButtons = [...document.querySelectorAll("[data-open-schedule]")];
  const validTabs = new Set(panels.map((panel) => panel.id));
  const titleByTab = {
    principal: "Caderno de Comunicação 2.0 | Expofeira 2026",
    programacao: "Programação | Expofeira 2026",
    expositores: "Expositores | Expofeira 2026",
    icms: "Decreto do ICMS | Expofeira 2026",
    inclusao: "Inclusão e Segurança | Expofeira 2026",
    recomendacoes: "Recomendações | Expofeira 2026",
    noticias: "Na mídia | Expofeira 2026",
  };

  function refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function activateTab(tabId, options = {}) {
    const { updateHash = true, scroll = true } = options;
    if (!validTabs.has(tabId)) return;

    tabButtons.forEach((button) => {
      const active = button.dataset.tab === tabId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });

    panels.forEach((panel) => {
      const active = panel.id === tabId;
      panel.hidden = !active;
      panel.classList.toggle("is-active", active);
    });

    document.title = titleByTab[tabId] || titleByTab.principal;
    if (updateHash) history.replaceState(null, "", `#${tabId}`);
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    refreshIcons();
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
    button.addEventListener("keydown", (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const currentIndex = tabButtons.indexOf(button);
      let nextIndex = currentIndex;
      if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabButtons.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = tabButtons.length - 1;
      tabButtons[nextIndex].focus();
      activateTab(tabButtons[nextIndex].dataset.tab);
    });
  });

  openTabButtons.forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.openTab));
  });

  window.addEventListener("hashchange", () => {
    const tabId = location.hash.replace("#", "");
    if (validTabs.has(tabId)) activateTab(tabId, { updateHash: false });
  });

  document.getElementById("print-page")?.addEventListener("click", () => window.print());

  const schedule = Array.isArray(window.EXPO_SCHEDULE) ? window.EXPO_SCHEDULE : [];
  const dateFilter = document.getElementById("date-filter");
  const categoryFilter = document.getElementById("category-filter");
  const scheduleList = document.getElementById("schedule-list");
  const scheduleSearch = document.getElementById("schedule-search");
  const scheduleDateLabel = document.getElementById("schedule-date-label");
  const agendaTitle = document.getElementById("agenda-title");
  const resultCount = document.getElementById("result-count");

  const preferredCategoryOrder = ["Todos", "Petróleo, gás e energia", "Agosto Lilás", "Shows", "Cultura", "Agro e negócios", "Conhecimento", "Experiências", "Serviços"];
  const categorySet = new Set(schedule.flatMap((day) => day.events.map((event) => event.category)));
  const categories = preferredCategoryOrder.filter((category) => category === "Todos" || categorySet.has(category));
  const iconByCategory = {
    Shows: "music-2",
    Cultura: "drama",
    "Agro e negócios": "sprout",
    Conhecimento: "presentation",
    Experiências: "sparkles",
    Serviços: "landmark",
    "Petróleo, gás e energia": "ship",
    "Agosto Lilás": "ribbon",
  };
  const classByCategory = {
    Shows: "category-shows",
    Cultura: "category-cultura",
    "Agro e negócios": "category-agro",
    Conhecimento: "category-conhecimento",
    Experiências: "category-experiencias",
    Serviços: "category-servicos",
    "Petróleo, gás e energia": "category-energy",
    "Agosto Lilás": "category-lilac",
  };

  const state = {
    date: schedule[0]?.date || "08/08",
    category: "Todos",
    query: "",
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalized(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function displayDate(date) {
    const [day] = date.split("/");
    return `${Number(day)} de agosto`;
  }

  function renderFilters() {
    if (dateFilter) {
      dateFilter.innerHTML = schedule.map((day) => `
        <button class="filter-button${day.date === state.date ? " is-active" : ""}" type="button" data-date="${escapeHtml(day.date)}" aria-pressed="${day.date === state.date}">
          ${escapeHtml(day.date)}<span>${escapeHtml(day.weekday)}</span>
        </button>
      `).join("");

      dateFilter.querySelectorAll("[data-date]").forEach((button) => {
        button.addEventListener("click", () => {
          state.date = button.dataset.date;
          renderFilters();
          renderSchedule();
        });
      });
    }

    if (categoryFilter) {
      categoryFilter.innerHTML = categories.map((category) => `
        <button class="category-button${category === state.category ? " is-active" : ""} ${classByCategory[category] || ""}" type="button" data-category="${escapeHtml(category)}" aria-pressed="${category === state.category}">
          ${escapeHtml(category)}
        </button>
      `).join("");

      categoryFilter.querySelectorAll("[data-category]").forEach((button) => {
        button.addEventListener("click", () => {
          state.category = button.dataset.category;
          renderFilters();
          renderSchedule();
        });
      });
    }
  }

  function renderSchedule() {
    if (!scheduleList) return;
    const day = schedule.find((item) => item.date === state.date) || schedule[0];
    if (!day) return;

    const query = normalized(state.query);
    const events = day.events.filter((event) => {
      const categoryMatch = state.category === "Todos" || event.category === state.category;
      const searchText = normalized(`${event.title} ${event.location} ${event.detail} ${event.category}`);
      return categoryMatch && (!query || searchText.includes(query));
    });

    if (scheduleDateLabel) scheduleDateLabel.textContent = day.weekday;
    if (agendaTitle) agendaTitle.textContent = displayDate(day.date);
    if (resultCount) resultCount.textContent = `${events.length} ${events.length === 1 ? "atividade" : "atividades"}`;

    if (!events.length) {
      scheduleList.innerHTML = `<div class="empty-state"><strong>Nenhuma atividade encontrada.</strong><p>Tente outro termo, dia ou assunto.</p></div>`;
      return;
    }

    scheduleList.innerHTML = events.map((event) => {
      const icon = iconByCategory[event.category] || "calendar-check";
      const categoryClass = classByCategory[event.category] || "";
      const detail = event.detail ? `<p>${escapeHtml(event.detail)}</p>` : "";
      return `
        <article class="schedule-item ${categoryClass}">
          <time>${escapeHtml(event.time)}</time>
          <span class="schedule-icon" aria-hidden="true"><i data-lucide="${icon}"></i></span>
          <div class="schedule-main">
            <h3>${escapeHtml(event.title)}</h3>
            ${detail}
          </div>
          <div class="schedule-meta">
            <span class="schedule-category">${escapeHtml(event.category)}</span>
            <span>${escapeHtml(event.location)}</span>
          </div>
        </article>
      `;
    }).join("");
    refreshIcons();
  }

  scheduleSearch?.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderSchedule();
  });

  openScheduleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.date = button.dataset.scheduleDate || state.date;
      state.category = button.dataset.scheduleCategory || "Todos";
      state.query = "";
      if (scheduleSearch) scheduleSearch.value = "";
      activateTab("programacao", { scroll: false });
      renderFilters();
      renderSchedule();
      document.querySelector(".schedule-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  renderFilters();
  renderSchedule();

  const newsItems = Array.isArray(window.EXPO_NEWS)
    ? [...window.EXPO_NEWS].sort((a, b) => Number(b.number) - Number(a.number))
    : [];
  const newsSearch = document.getElementById("news-search");
  const newsFilter = document.getElementById("news-filter");
  const newsGrid = document.getElementById("news-grid");
  const newsResultCount = document.getElementById("news-result-count");
  const newsGroups = ["Todos", "Agro", "Cultura", "Economia", "Infraestrutura e negócios", "Inovação e tecnologia", "Segurança", "Outros"]
    .filter((group) => group === "Todos" || newsItems.some((item) => item.group === group));
  const newsState = { group: "Todos", query: "" };

  function displayNewsDate(date) {
    const [day, month, year] = String(date).split("/");
    const monthName = { "07": "JUL", "08": "AGO" }[month] || month;
    return `${day} ${monthName} ${year}`;
  }

  function renderNewsFilters() {
    if (!newsFilter) return;
    newsFilter.innerHTML = newsGroups.map((group) => `
      <button class="category-button${group === newsState.group ? " is-active" : ""}" type="button" data-news-group="${escapeHtml(group)}" aria-pressed="${group === newsState.group}">
        ${escapeHtml(group)}
      </button>
    `).join("");
    newsFilter.querySelectorAll("[data-news-group]").forEach((button) => {
      button.addEventListener("click", () => {
        newsState.group = button.dataset.newsGroup;
        renderNewsFilters();
        renderNews();
      });
    });
  }

  function renderNews() {
    if (!newsGrid) return;
    const query = normalized(newsState.query);
    const filtered = newsItems.filter((item) => {
      const groupMatch = newsState.group === "Todos" || item.group === newsState.group;
      const searchText = normalized(`${item.title} ${item.source} ${item.topic} ${item.author} ${item.summary}`);
      return groupMatch && (!query || searchText.includes(query));
    });

    if (newsResultCount) {
      newsResultCount.textContent = `${filtered.length} ${filtered.length === 1 ? "publicação" : "publicações"}`;
    }
    if (!filtered.length) {
      newsGrid.innerHTML = `<div class="empty-state"><strong>Nenhuma publicação encontrada.</strong><p>Tente outro termo ou assunto.</p></div>`;
      return;
    }

    newsGrid.innerHTML = filtered.map((item) => `
      <a class="media-link-item" href="${escapeHtml(item.url)}" target="_blank" rel="noopener">
        <div class="media-link-copy">
          <span class="news-source">${escapeHtml(item.source)} · ${displayNewsDate(item.date)}</span>
          <h3>${escapeHtml(item.title)}</h3>
        </div>
        <span class="news-link">Abrir publicação <i data-lucide="arrow-up-right" aria-hidden="true"></i></span>
      </a>
    `).join("");
    refreshIcons();
  }

  newsSearch?.addEventListener("input", (event) => {
    newsState.query = event.target.value;
    renderNews();
  });

  renderNewsFilters();
  renderNews();

  const initialTab = location.hash.replace("#", "");
  activateTab(validTabs.has(initialTab) ? initialTab : "principal", { updateHash: false, scroll: false });
  refreshIcons();
})();
