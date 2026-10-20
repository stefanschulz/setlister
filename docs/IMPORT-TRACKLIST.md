# Tracklist-Import im Artikel-Editor

Plugin **„System – syndae Tracklist-Import“** (`extensions/plg_system_syndaeimport`). Im Artikel-Editor gibt es den Reiter **„Tracklist-Import“**. Dort wird entweder das von SetLister erzeugte HTML oder JSON eingefügt. **Beim Speichern des Artikels wird die Tracklist durch die eingefügten Daten ersetzt**; das Feld wird nicht gespeichert und ist danach wieder leer. Mit der Schaltfläche **„Prüfen“** unter dem Feld zeigt eine Vorschau vorab, was übernommen würde (Tabelle mit Künstlern und Rollen, Titel, Album, Label, dazu Hinweise auf fehlende Künstler/Titel und die Zahl der Events); dabei wird nichts gespeichert. Nach dem Speichern nennt eine Meldung die Anzahl der übernommenen Tracks (und wie viele es vorher waren). Bei einem Fehler (Format nicht lesbar) bleibt die Tracklist unverändert und die Meldung nennt den Grund (z. B. die Zeile).

## Format 1: HTML (wie SetLister es erzeugt)

```html
<ul>
  <li><a href="https://soundcloud.com/aurory">Aurory</a> - Yeah Oh (<a href="https://open.spotify.com/…">Yeah Oh</a>)</li>
  <li>A &amp; B feat. C vs D - Titel (Album)</li>
</ul>
```

- Aufbau je Zeile: `Künstler - Titel (Album)`. Das Album steht in der letzten Klammer am Ende und darf verlinkt sein (Album-Link). Die Künstler dürfen einzeln verlinkt sein (Künstler-Link).
- Mehrere Künstler: `A, B & C`. Nach `feat.` folgen Gastkünstler, nach `vs` die Remixer (wie in SetLister: `A feat. B vs C`).
- Auch ältere Artikelformate (`<p>` mit `<br>`-getrennten Zeilen, reiner Text mit einer Zeile je Track) werden gelesen.
- Aus dem HTML ist kein Label erkennbar (leer). Mit JSON ist es möglich.
- Gegenprobe: Aus den SetLister-Daten aller 793 Folgen wurde das HTML so erzeugt, wie es SetLister tut, und wieder gelesen; 789 Folgen kommen identisch zurück, 4 unterscheiden sich nur durch doppelte Leerzeichen (`extensions/plg_system_syndaeimport/tests/roundtrip.php`).

## Format 2: JSON (für eine neue Funktion in SetLister)

Vollständiges Beispiel: `docs/tracklist-import-example.json`.

| Schlüssel | Pflicht | Inhalt |
|---|---|---|
| `tracks` | ja | Liste der Tracks in Abspielreihenfolge (auch zulässig: das JSON besteht nur aus dieser Liste) |
| `tracks[].artists[]` | ja | `name` (Pflicht), `role` (`original`, `featuring`, `remix`), `url` (Künstler-Website, optional). Statt der Liste ist auch ein Text wie `A & B feat. C vs D` erlaubt |
| `tracks[].title` | ja | Titel |
| `tracks[].album` | nein | Albumtitel |
| `tracks[].albumUrl` | nein | Link zum Album (Spotify, Bandcamp …) |
| `tracks[].label` | nein | Label |
| `events[]` | nein | `date` (JJJJ-MM-TT), `name`, `url`, `place`; ersetzt die Events der Folge, wenn der Schlüssel vorhanden ist (leere Liste = Events löschen) |
| `subtitle` | nein | Untertitel der Folge |
| `imageCredit` | nein | Bildnachweis (HTML mit Links erlaubt) |

Nicht vorhandene optionale Schlüssel lassen die bestehenden Werte unverändert.

## Installation (Dev und Live)

1. `python tools/build-plugin.py` erzeugt `.releases/plg_system_syndaeimport.zip`.
2. Joomla: Erweiterungen → Installieren (oder `php cli/joomla.php extension:install --path=…`), danach das Plugin aktivieren (Plugin-Reihenfolge möglichst weit hinten, damit es nach dem Speichern der normalen Felder läuft).
3. Voraussetzung: die benutzerdefinierten Felder aus `tools/migrate/create-fields.php`.

Nach dem Import wird der Artikel für die Suche neu indexiert.
