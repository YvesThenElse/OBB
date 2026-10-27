<img src="public/logo.svg" width="72" alt="">

# OBB — Orange Black Box

Voir ce que Claude Code a **vraiment** fait : ses agents, ses sous-agents, ses skills, ses
hooks, ses boucles, ses shells et ses outils, dans le temps.

![La ligne du temps d'une session à neuf agents](documentation/images/apercu.png)

> **Orange** comme Claude. **Boîte noire** comme ce qu'est un agent pendant qu'il
> travaille : on lui donne une consigne, il rend un résultat, et entre les deux personne
> ne voit rien — ni les sous-agents qu'il a lancés, ni les outils qu'il a appelés, ni ce
> qu'il a refait trois fois. C'est cette boîte-là que l'outil ouvre.
>
> L'outil ne pose aucune sonde dans Claude Code et ne détourne aucun appel : il **lit les
> traces que Claude Code écrit déjà**. Rien n'est instrumenté, rien n'est modifié.

## Démarrer

Téléchargez le fichier de votre système sur la **[page des versions][versions]** et
ouvrez-le. Rien d'autre à installer — [le détail](documentation/1-installer.md), y compris
la méfiance de votre système au premier lancement.

Depuis les sources, Node 22 et **aucune dépendance** :

```sh
node serveur.js      # puis http://127.0.0.1:7420
```

Pour suivre une machine distante, on y pose une **sonde** — un fichier de 116 ko, ou un
exécutable autonome si Node n'y est pas : [l'installer](documentation/2-la-sonde.md).

[versions]: https://github.com/YvesThenElse/OBB/releases/latest

## Ce que ça montre

Une voie par agent, et sous chaque agent les voies qui le décrivent — quand il a travaillé
et quand il a attendu, ce qu'il a réfléchi, à quel modèle il a parlé, les outils qu'il a
appelés, les shells qu'il a laissés courir, les skills qu'il a chargés, les hooks qui l'ont
encadré, les fichiers qu'il a touchés, les boucles qui l'ont répété, et son contexte qui
monte jusqu'au compactage.

Chaque marque s'ouvre sur une carte qui donne son contenu entier — rien n'est tronqué — et
son contexte exact au moment de l'appel.

→ **[Les voies, une par une, en image](documentation/4-les-voies.md)**

## Documentation

| | |
|---|---|
| [1 — Installer](documentation/1-installer.md) | les binaires, la voie sans installation, le tailnet |
| [2 — Installer la sonde](documentation/2-la-sonde.md) | suivre les sessions d'une machine distante |
| [3 — Se servir de l'application](documentation/3-se-servir-de-l-application.md) | la molette, le glissé, les cartes, la recherche, la pause |
| [4 — Les voies, une par une](documentation/4-les-voies.md) | ce que chaque ligne montre, en image |
| [5 — La suite](documentation/5-la-suite.md) | ce qui reste à faire, et ce qui est connu comme manquant |

## Le reste du dépôt

- [`CAHIER-DES-CHARGES.md`](CAHIER-DES-CHARGES.md) — ce qu'on construit, et pourquoi.
- [`OBSERVATIONS-FORMAT.md`](OBSERVATIONS-FORMAT.md) — comment Claude Code écrit ses traces.
  La référence de format, mesurée et non devinée.
- [`exemples/`](exemples/LISEZ-MOI.md) — des kits à déposer dans un répertoire vide, qui
  produisent une session dont la ligne du temps montre quelque chose. Le premier,
  [`cuisine/`](exemples/cuisine/LISEZ-MOI.md), met en scène une brigade : un chef qui ne
  cuisine pas, des postes en parallèle, une barrière avant l'envoi.
- [Mesures](documentation/mesures.md) — les chiffres de performance et d'épreuve.
