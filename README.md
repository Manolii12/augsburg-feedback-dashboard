# Online-Dienst Feedback Dashboard (Clickdummy)

Interaktiver Klickprototyp für ein Feedback-Dashboard der Stadt Augsburg. Alle Daten sind **fiktiv** und zufällig erzeugt; das Logo dient nur der Demonstration.

## Funktionen

- Bewertungsskala 1–5 (Top-2 = 4–5, Bottom-2 = 1–2)
- Responsive: auf Smartphones wechselt das Layout automatisch in eine mobile Ansicht
- Übersicht mit KPI-Karten, Aussagenbalken, Verteilung, Donut und O-Tönen
- Untermenüs: Bewertungen, Details, Feedback (Text), Export
- Filter nach Zeitraum, Dienststelle und Online-Service
- Klick auf Karten, Balken und Zitate öffnet Detailansichten
- CSV/JSON-Export der gefilterten Beispieldaten

## Lokal starten

Im Projektordner:

```bash
python3 -m http.server 8080
```

Dann im Browser `http://localhost:8080` öffnen.

## GitHub Pages

Dieses Repository ist als GitHub-Pages-Seite aus dem `main`-Branch (Ordner `/`) gedacht.
