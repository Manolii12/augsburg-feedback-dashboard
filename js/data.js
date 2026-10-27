const STATEMENTS = [
  "Mit diesem Online-Dienst konnte ich mein Anliegen erfolgreich erledigen.",
  "Die Bearbeitung des Online-Antrags war leicht verständlich.",
  "Ich konnte den Antrag in angemessener Zeit ausfüllen.",
  "Die Antragstellung war mit wenig Aufwand möglich.",
  "Die Nutzung des Online-Dienstes verlief reibungslos.",
  "Ich habe Vertrauen, dass mein Antrag korrekt und sicher bearbeitet wird.",
];

const OFFICES = [
  "Bürgeramt",
  "Standesamt",
  "Kfz-Zulassungsstelle",
  "Ausländerbehörde",
  "Ordnungsamt",
];

const SERVICES = [
  "Meldebescheinigung",
  "Personalausweis beantragen",
  "Führerschein umschreiben",
  "Wohnsitz ummelden",
  "Geburtsurkunde bestellen",
  "Parkausweis beantragen",
  "Gewerbeanmeldung",
];

const POSITIVE_COMMENTS = [
  "Einfache und intuitive Bedienung – alles sehr übersichtlich erklärt.",
  "Schnelle Bearbeitung und Rückmeldung. Vielen Dank!",
  "Ich finde es großartig, dass vieles online möglich ist.",
  "Vertrauenswürdiger und sicherer Prozess – weiter so!",
  "Der Online-Antrag hat mir einen Behördengang erspart.",
  "Sehr gut strukturiert, auch ohne Vorkenntnisse verständlich.",
  "Die Statusanzeige zum Antrag war hilfreich und transparent.",
  "Freundliche Hinweise im Formular, keine unnötigen Felder.",
  "Hat auf dem Smartphone gut funktioniert.",
  "Klare Sprache, keine Behördendeutsch-Hürden.",
];

const NEUTRAL_COMMENTS = [
  "Grundsätzlich okay, an ein paar Stellen etwas umständlich.",
  "Hat funktioniert, dauerte aber länger als erwartet.",
  "Einige Fachbegriffe waren nicht sofort klar.",
  "Der Upload der Nachweise war etwas hakelig.",
  "Inhaltlich in Ordnung, optisch etwas unübersichtlich.",
];

const NEGATIVE_COMMENTS = [
  "Ich bin mehrmals aus dem Formular geflogen und musste neu beginnen.",
  "Pflichtfelder waren nicht klar gekennzeichnet.",
  "Die Wartezeit nach dem Absenden war zu lang.",
  "Fehlermeldung ohne Hinweis, was ich ändern soll.",
  "Auf dem Tablet kaum bedienbar, Buttons zu klein.",
  "Ich musste denselben Nachweis zweimal hochladen.",
];

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

const OVERALL_WEIGHTS = [
  [1, 0.04],
  [2, 0.08],
  [3, 0.20],
  [4, 0.38],
  [5, 0.30],
];

const STATEMENT_BIAS = [0.25, 0.05, -0.1, -0.05, 0.15, 0.15];

function weightedScore(rng) {
  const r = rng();
  let acc = 0;
  for (const [score, weight] of OVERALL_WEIGHTS) {
    acc += weight;
    if (r <= acc) return score;
  }
  return 5;
}

function clampScore(n) {
  return Math.min(5, Math.max(1, Math.round(n)));
}

function relatedScore(rng, overall, bias) {
  const jitter = Math.floor(rng() * 3) - 1;
  return clampScore(overall + bias + jitter);
}

function formatDate(date) {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function generateFeedback(count = 1248, seed = 2024) {
  const rng = mulberry32(seed);
  const start = new Date("2024-01-01T09:00:00");
  const end = new Date("2024-04-30T18:00:00");
  const span = end.getTime() - start.getTime();
  const items = [];

  for (let i = 0; i < count; i++) {
    const overall = weightedScore(rng);
    const scores = STATEMENTS.map((_, i) => relatedScore(rng, overall, STATEMENT_BIAS[i]));
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    let comment = "";
    let commentType = null;
    const commentRoll = rng();
    if (overall >= 4 && commentRoll < 0.28) {
      comment = pick(rng, POSITIVE_COMMENTS);
      commentType = "positive";
    } else if (overall <= 2 && commentRoll < 0.7) {
      comment = pick(rng, NEGATIVE_COMMENTS);
      commentType = "negative";
    } else if (commentRoll < 0.1) {
      comment = pick(rng, NEUTRAL_COMMENTS);
      commentType = "neutral";
    }

    const created = new Date(start.getTime() + rng() * span);
    items.push({
      id: `FB-${String(10000 + i)}`,
      created,
      office: pick(rng, OFFICES),
      service: pick(rng, SERVICES),
      scores,
      overall,
      avg: Math.round(avg * 10) / 10,
      comment,
      commentType,
      channel: rng() < 0.7 ? "Online-Formular" : "Nach Abschluss per E-Mail",
    });
  }

  items.sort((a, b) => b.created - a.created);
  return items;
}

const DATASET = generateFeedback();
const LAST_UPDATED = "02.05.2025 10:30 Uhr";

const PERIODS = [
  { id: "all", label: "01.01.2024 – 30.04.2024", from: new Date("2024-01-01"), to: new Date("2024-04-30T23:59:59") },
  { id: "q1", label: "01.01.2024 – 31.03.2024", from: new Date("2024-01-01"), to: new Date("2024-03-31T23:59:59") },
  { id: "apr", label: "01.04.2024 – 30.04.2024", from: new Date("2024-04-01"), to: new Date("2024-04-30T23:59:59") },
];
