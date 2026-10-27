const state = {
  view: "overview",
  period: "all",
  office: "Alle",
  service: "Alle",
  search: "",
};

function $(sel) {
  return document.querySelector(sel);
}

function filtered() {
  const period = PERIODS.find((p) => p.id === state.period);
  return DATASET.filter((item) => {
    if (item.created < period.from || item.created > period.to) return false;
    if (state.office !== "Alle" && item.office !== state.office) return false;
    if (state.service !== "Alle" && item.service !== state.service) return false;
    if (state.search) {
      const q = state.search.toLowerCase();
      const hay = `${item.id} ${item.office} ${item.service} ${item.comment}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function overall(item) {
  return item.overall;
}

function bucket(score) {
  if (score >= 6) return "top";
  if (score <= 2) return "low";
  return "mid";
}

function stats(items) {
  const n = items.length;
  const dist = [0, 0, 0, 0, 0, 0, 0];
  const statementSums = STATEMENTS.map(() => 0);
  let top = 0;
  let mid = 0;
  let low = 0;
  let sum = 0;

  items.forEach((item) => {
    const o = overall(item);
    dist[o - 1] += 1;
    sum += item.avg;
    if (o >= 6) top += 1;
    else if (o <= 2) low += 1;
    else mid += 1;
    item.scores.forEach((s, i) => (statementSums[i] += s));
  });

  const avg = n ? sum / n : 0;
  return {
    n,
    avg,
    dist,
    top,
    mid,
    low,
    topPct: n ? Math.round((top / n) * 100) : 0,
    midPct: n ? Math.round((mid / n) * 100) : 0,
    lowPct: n ? Math.round((low / n) * 100) : 0,
    statementAvgs: statementSums.map((s) => (n ? s / n : 0)),
  };
}

function fmt(n) {
  return n.toLocaleString("de-DE");
}

function fmtAvg(n) {
  return n.toFixed(1).replace(".", ",");
}

function sentimentLabel(score) {
  if (score >= 6) return "Top-2 (zufrieden)";
  if (score <= 2) return "Bottom-2 (unzufrieden)";
  return "Neutral";
}

function fillFilters() {
  const period = $("#filter-period");
  period.innerHTML = PERIODS.map((p) => `<option value="${p.id}">${p.label}</option>`).join("");
  $("#filter-office").innerHTML = ["Alle", ...OFFICES].map((o) => `<option>${o}</option>`).join("");
  $("#filter-service").innerHTML = ["Alle", ...SERVICES].map((s) => `<option>${s}</option>`).join("");
  $("#updated-at").textContent = LAST_UPDATED;
}

function render() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.view === state.view);
  });
  const root = $("#view-root");
  const items = filtered();
  const s = stats(items);

  const views = {
    overview: renderOverview,
    ratings: renderRatings,
    details: renderDetails,
    feedback: renderFeedback,
    export: renderExport,
  };
  root.innerHTML = views[state.view](items, s);
  bindViewEvents();
}

function renderOverview(items, s) {
  const quotes = items.filter((i) => i.commentType === "positive").slice(0, 4);
  const statementRows = STATEMENTS.map((text, i) => {
    const avg = s.statementAvgs[i];
    const width = (avg / 7) * 100;
    return `<div class="statement-row clickable-row" data-statement="${i}" role="button" tabindex="0">
      <b>${i + 1}.</b>
      <p>${text}</p>
      <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
      <div class="avg">${fmtAvg(avg)}</div>
    </div>`;
  }).join("");

  const distCols = s.dist
    .map((count, i) => {
      const pct = s.n ? Math.round((count / s.n) * 100) : 0;
      const h = Math.max(6, pct * 1.7);
      return `<button class="dist-col" data-score="${i + 1}" title="${count} Bewertungen">
        <span class="pct">${pct}%</span>
        <span class="dist-bar" style="height:${h}%"></span>
        <span class="dist-label">${i + 1}</span>
      </button>`;
    })
    .join("");

  const circ = 2 * Math.PI * 54;
  const topLen = (s.topPct / 100) * circ;
  const midLen = (s.midPct / 100) * circ;
  const lowLen = circ - topLen - midLen;

  return `
    <section class="kpi-row">
      ${kpiCard("count", "Anzahl Bewertungen", fmt(s.n), "Rückmeldungen", peopleIcon())}
      ${kpiCard("avg", "Durchschnittliche Bewertung", `${fmtAvg(s.avg)} / 7`, "Mittelwert", starIcon())}
      ${kpiCard("top", "Zufriedenheit (Top-2-Box)", `${s.topPct} %`, "Zustimmung (6–7)", upIcon())}
      ${kpiCard("low", "Unzufriedenheit (Bottom-2-Box)", `${s.lowPct} %`, "Ablehnung (1–2)", downIcon())}
    </section>
    <section class="split">
      <article class="card">
        <h2 class="card-title">Bewertung je Aussage (Ø auf Skala 1–7)</h2>
        <div class="statement-head" style="display:grid;grid-template-columns:28px 1fr 210px 36px;gap:10px;color:var(--muted);font-size:12px;">
          <span>#</span><span>Aussage</span><span></span><span>Durchschnitt</span>
        </div>
        ${statementRows}
        <div class="scale"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span></div>
        <div class="scale-caption"><span>Stimme überhaupt nicht zu</span><span>Weder noch</span><span>Stimme voll und ganz zu</span></div>
      </article>
      <article class="card">
        <h2 class="card-title">Verteilung der Bewertungen (Gesamt)</h2>
        <div class="dist">${distCols}</div>
        <div class="dist-axis"><span>Stimme überhaupt nicht zu</span><span>Weder noch</span><span>Stimme voll und ganz zu</span></div>
      </article>
    </section>
    <section class="bottom-row">
      <article class="card clickable" data-open="summary">
        <h2 class="card-title">Zusammenfassung der Bewertungen</h2>
        <div class="summary">
          <div class="donut-wrap">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="#e8ece9" stroke-width="12"></circle>
              <circle cx="60" cy="60" r="54" fill="none" stroke="#165a32" stroke-width="12"
                stroke-dasharray="${topLen} ${circ}" stroke-linecap="butt"></circle>
              <circle cx="60" cy="60" r="54" fill="none" stroke="#c5cdc8" stroke-width="12"
                stroke-dasharray="${midLen} ${circ}" stroke-dashoffset="${-topLen}"></circle>
              <circle cx="60" cy="60" r="54" fill="none" stroke="#c62828" stroke-width="12"
                stroke-dasharray="${lowLen} ${circ}" stroke-dashoffset="${-(topLen + midLen)}"></circle>
            </svg>
            <div class="donut-center"><strong>${fmt(s.n)}</strong><span>Rückmeldungen</span></div>
          </div>
          <div class="legend">
            <div><span class="dot" style="background:#165a32"></span> Top-2 (6–7) <span class="pct">${s.topPct}%</span></div>
            <div><span class="dot" style="background:#9aa19c"></span> Neutral (3–5) <span class="pct">${s.midPct}%</span></div>
            <div><span class="dot" style="background:#c62828"></span> Bottom-2 (1–2) <span class="pct">${s.lowPct}%</span></div>
          </div>
        </div>
      </article>
      <article class="card">
        <div class="quotes-head">
          <h2 class="card-title">Positives Feedback – O-Töne aus dem Freitextfeld</h2>
          <div class="heart">♥</div>
        </div>
        <div class="quotes">
          ${
            quotes.length
              ? quotes
                  .map(
                    (q) => `<button class="quote" data-id="${q.id}">${q.comment}<div class="quote-meta">${q.service} · ${q.office}</div></button>`
                  )
                  .join("")
              : `<p class="empty">Keine Freitexte im aktuellen Filter.</p>`
          }
        </div>
      </article>
    </section>
  `;
}

function kpiCard(key, title, value, sub, icon) {
  return `<button class="card clickable kpi" data-open="${key}">
    <div>
      <h3>${title}</h3>
      <div class="value">${value}</div>
      <div class="sub">${sub}</div>
    </div>
    ${icon}
  </button>`;
}

function peopleIcon() {
  return `<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="9" cy="8" r="3"/><circle cx="16" cy="9" r="2.4"/><path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5"/><path d="M14 14.2c2.1-.2 4.2 1.3 4.8 4.3"/></svg>`;
}
function starIcon() {
  return `<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><polygon points="12 3 15 9 21.5 9.8 16.8 14.4 18.2 21 12 17.6 5.8 21 7.2 14.4 2.5 9.8 9 9"/></svg>`;
}
function upIcon() {
  return `<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 11v8h10v-8"/><path d="M12 19V5"/><path d="M8 9l4-4 4 4"/></svg>`;
}
function downIcon() {
  return `<svg class="kpi-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M7 13V5h10v8"/><path d="M12 5v14"/><path d="M8 15l4 4 4-4"/></svg>`;
}

function renderRatings(items) {
  const rows = items
    .slice(0, 80)
    .map((item) => {
      const o = overall(item);
      return `<tr class="clickable" data-id="${item.id}" role="button" tabindex="0">
        <td>${item.id}</td>
        <td>${formatDate(item.created)}</td>
        <td>${item.office}</td>
        <td>${item.service}</td>
        <td><span class="stars">${"★".repeat(Math.max(1, Math.round(item.avg)))}${"☆".repeat(7 - Math.max(1, Math.round(item.avg)))}</span></td>
        <td>${fmtAvg(item.avg)}</td>
        <td><span class="badge ${bucket(o)}">${sentimentLabel(o)}</span></td>
      </tr>`;
    })
    .join("");

  return `<article class="card">
    <div class="toolbar">
      <h2 class="card-title" style="margin:0">Einzelbewertungen (${fmt(items.length)})</h2>
      <input class="search" id="search-input" placeholder="Suche nach ID, Dienststelle, Text…" value="${state.search.replace(/"/g, "&quot;")}" />
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ID</th><th>Datum</th><th>Dienststelle</th><th>Online-Service</th><th>Skala</th><th>Ø</th><th>Kategorie</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="7" class="empty">Keine Treffer.</td></tr>`}</tbody>
      </table>
    </div>
    <p class="sub" style="margin:10px 0 0;color:var(--muted);font-size:12px">Es werden die neuesten 80 Einträge der aktuellen Filterung angezeigt. Klick öffnet die Detailkarte.</p>
  </article>`;
}

function renderDetails(items, s) {
  const cards = STATEMENTS.map((text, i) => {
    const dist = [0, 0, 0, 0, 0, 0, 0];
    items.forEach((item) => dist[item.scores[i] - 1]++);
    const bars = dist
      .map((c, idx) => {
        const pct = s.n ? Math.round((c / s.n) * 100) : 0;
        return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12px">
          <span style="width:14px">${idx + 1}</span>
          <div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${pct}%"></div></div>
          <span style="width:40px;text-align:right">${pct}%</span>
        </div>`;
      })
      .join("");
    return `<button class="card clickable" data-statement="${i}">
      <h3 class="card-title">${i + 1}. ${text}</h3>
      <p style="margin:0 0 8px;color:var(--green);font-weight:700">Ø ${fmtAvg(s.statementAvgs[i])} / 7</p>
      ${bars}
    </button>`;
  }).join("");

  return `<div class="detail-grid">${cards}</div>`;
}

function renderFeedback(items) {
  const withText = items.filter((i) => i.comment);
  const cards = withText
    .slice(0, 24)
    .map((item) => {
      const o = overall(item);
      return `<button class="card clickable" data-id="${item.id}" style="text-align:left">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
          <strong style="color:var(--green)">${item.id}</strong>
          <span class="badge ${bucket(o)}">${sentimentLabel(o)}</span>
        </div>
        <p style="margin:10px 0 8px">${item.comment}</p>
        <div class="quote-meta">${item.service} · ${item.office} · ${formatDate(item.created)} · Ø ${fmtAvg(item.avg)}</div>
      </button>`;
    })
    .join("");

  return `<article class="card" style="margin-bottom:4px">
    <h2 class="card-title" style="margin:0">Freitext-Feedback (${fmt(withText.length)} von ${fmt(items.length)})</h2>
  </article>
  <div class="detail-grid">${cards || `<p class="empty">Keine Freitexte vorhanden.</p>`}</div>`;
}

function renderExport(items, s) {
  return `<article class="card">
    <h2 class="card-title">Export (Clickdummy)</h2>
    <p>Die aktuelle Filterung umfasst <strong>${fmt(s.n)}</strong> fiktive Rückmeldungen. Mittelwert: <strong>${fmtAvg(s.avg)} / 7</strong>.</p>
    <div class="export-actions">
      <button class="btn" id="export-csv">CSV herunterladen</button>
      <button class="btn secondary" id="export-json">JSON herunterladen</button>
    </div>
    <p style="color:var(--muted);font-size:13px;margin-top:16px">Hinweis: Es handelt sich um zufällig erzeugte Beispieldaten für Demonstrationszwecke, nicht um echte Bürger*innenbewertungen.</p>
  </article>`;
}

function bindViewEvents() {
  document.querySelectorAll("[data-open]").forEach((el) => {
    el.addEventListener("click", () => openKpi(el.dataset.open));
  });
  document.querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", () => openFeedback(el.dataset.id));
  });
  document.querySelectorAll("[data-statement]").forEach((el) => {
    el.addEventListener("click", () => openStatement(Number(el.dataset.statement)));
  });
  document.querySelectorAll("[data-score]").forEach((el) => {
    el.addEventListener("click", () => openScore(Number(el.dataset.score)));
  });
  const search = $("#search-input");
  if (search) {
    search.addEventListener("input", (e) => {
      state.search = e.target.value;
      render();
      const next = $("#search-input");
      if (next) {
        next.focus();
        next.setSelectionRange(state.search.length, state.search.length);
      }
    });
  }
  $("#export-csv")?.addEventListener("click", () => downloadFile("csv"));
  $("#export-json")?.addEventListener("click", () => downloadFile("json"));
}

function openKpi(key) {
  const items = filtered();
  const s = stats(items);
  const map = {
    count: {
      title: "Anzahl Bewertungen",
      html: `<p>${fmt(s.n)} Rückmeldungen im gewählten Filter.</p>
        ${previewList(items.slice(0, 8))}`,
    },
    avg: {
      title: "Durchschnittliche Bewertung",
      html: `<p>Gesamtmittelwert: <strong>${fmtAvg(s.avg)} / 7</strong></p>
        <div class="score-list">${STATEMENTS.map((t, i) => `<div>${i + 1}. ${t} — <strong>${fmtAvg(s.statementAvgs[i])}</strong></div>`).join("")}</div>`,
    },
    top: {
      title: "Zufriedenheit (Top-2-Box)",
      html: `<p>${fmt(s.top)} Bewertungen mit Gesamtnote 6 oder 7 (${s.topPct} %).</p>${previewList(items.filter((i) => overall(i) >= 6).slice(0, 8))}`,
    },
    low: {
      title: "Unzufriedenheit (Bottom-2-Box)",
      html: `<p>${fmt(s.low)} Bewertungen mit Gesamtnote 1 oder 2 (${s.lowPct} %).</p>${previewList(items.filter((i) => overall(i) <= 2).slice(0, 8))}`,
    },
    summary: {
      title: "Zusammenfassung der Bewertungen",
      html: `<div class="kv">
        <dt>Rückmeldungen</dt><dd>${fmt(s.n)}</dd>
        <dt>Top-2</dt><dd>${fmt(s.top)} (${s.topPct} %)</dd>
        <dt>Neutral</dt><dd>${fmt(s.mid)} (${s.midPct} %)</dd>
        <dt>Bottom-2</dt><dd>${fmt(s.low)} (${s.lowPct} %)</dd>
        <dt>Mittelwert</dt><dd>${fmtAvg(s.avg)} / 7</dd>
      </div>
      <p>Klicken Sie in der Navigation auf <strong>Bewertungen</strong>, um alle Einzelkarten zu öffnen.</p>`,
    },
  };
  const view = map[key];
  if (view) openModal(view.title, view.html);
}

function previewList(items) {
  if (!items.length) return `<p class="empty">Keine Einträge.</p>`;
  return `<div class="score-list">${items
    .map(
      (item) =>
        `<button class="quote" data-id="${item.id}" style="width:100%;text-align:left">
          <strong>${item.id}</strong> · Ø ${fmtAvg(item.avg)} · ${item.service}<br/>
          ${item.comment || "<em>Kein Freitext</em>"}
        </button>`
    )
    .join("")}</div>`;
}

function openFeedback(id) {
  const item = DATASET.find((i) => i.id === id);
  if (!item) return;
  const o = overall(item);
  const scores = item.scores
    .map(
      (score, i) => `<div class="statement-row">
        <b>${i + 1}.</b><p>${STATEMENTS[i]}</p>
        <div class="bar-track"><div class="bar-fill" style="width:${(score / 7) * 100}%"></div></div>
        <div class="avg">${score}</div>
      </div>`
    )
    .join("");

  openModal(
    `Feedback ${item.id}`,
    `<dl class="kv">
      <dt>Datum</dt><dd>${formatDate(item.created)}</dd>
      <dt>Dienststelle</dt><dd>${item.office}</dd>
      <dt>Online-Service</dt><dd>${item.service}</dd>
      <dt>Kanal</dt><dd>${item.channel}</dd>
      <dt>Gesamtnote</dt><dd>${fmtAvg(item.avg)} / 7 · ${sentimentLabel(o)}</dd>
    </dl>
    <h3 class="card-title">Bewertung je Aussage</h3>
    ${scores}
    <h3 class="card-title" style="margin-top:16px">Freitext</h3>
    <div class="comment-box">${item.comment || "Es wurde kein Freitext hinterlassen."}</div>`
  );
}

function openStatement(index) {
  const items = filtered();
  const s = stats(items);
  const examples = items
    .filter((i) => i.comment)
    .sort((a, b) => b.scores[index] - a.scores[index])
    .slice(0, 6);
  openModal(
    `Aussage ${index + 1}`,
    `<p>${STATEMENTS[index]}</p>
     <p>Durchschnitt im Filter: <strong>${fmtAvg(s.statementAvgs[index])} / 7</strong></p>
     ${previewList(examples)}`
  );
}

function openScore(score) {
  const items = filtered().filter((i) => overall(i) === score);
  openModal(
    `Bewertungen mit Note ${score}`,
    `<p>${fmt(items.length)} Rückmeldungen mit Gesamtnote ${score}.</p>${previewList(items.slice(0, 10))}`
  );
}

function openModal(title, html) {
  $("#modal-title").textContent = title;
  $("#modal-body").innerHTML = html;
  $("#modal").hidden = false;
  $("#modal-body").querySelectorAll("[data-id]").forEach((el) => {
    el.addEventListener("click", () => openFeedback(el.dataset.id));
  });
}

function closeModal() {
  $("#modal").hidden = true;
}

function downloadFile(type) {
  const items = filtered();
  let content;
  let mime;
  let name;
  if (type === "csv") {
    const header = ["id", "datum", "dienststelle", "service", "mittelwert", ...STATEMENTS.map((_, i) => `aussage_${i + 1}`), "freitext"];
    const rows = items.map((item) =>
      [item.id, formatDate(item.created), item.office, item.service, item.avg, ...item.scores, `"${(item.comment || "").replace(/"/g, '""')}"`].join(";")
    );
    content = [header.join(";"), ...rows].join("\n");
    mime = "text/csv;charset=utf-8";
    name = "augsburg-feedback-dummy.csv";
  } else {
    content = JSON.stringify(items, null, 2);
    mime = "application/json";
    name = "augsburg-feedback-dummy.json";
  }
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function init() {
  fillFilters();
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      closeModal();
      state.view = btn.dataset.view;
      state.search = "";
      render();
    });
  });
  $("#filter-period").addEventListener("change", (e) => {
    state.period = e.target.value;
    render();
  });
  $("#filter-office").addEventListener("change", (e) => {
    state.office = e.target.value;
    render();
  });
  $("#filter-service").addEventListener("change", (e) => {
    state.service = e.target.value;
    render();
  });
  $("#info-btn").addEventListener("click", () => {
    openModal(
      "Hinweise zum Clickdummy",
      `<p>Dieses Dashboard ist ein interaktiver Prototyp für die Stadt Augsburg. Alle Zahlen, Dienststellenbezüge und Freitexte sind fiktiv.</p>
       <ul>
         <li>Die linke Navigation wechselt die Unterseiten.</li>
         <li>Filter oben wirken auf alle Ansichten.</li>
         <li>KPI-Karten, Balken, Zitate und Tabellenzeilen öffnen Detailansichten.</li>
       </ul>`
    );
  });
  $("#modal-close").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
  render();
}

init();
