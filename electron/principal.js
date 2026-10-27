// Orange Black Box — la coquille de bureau.
//
// Elle ne contient aucune logique propre : elle démarre le serveur **dans son propre
// processus** et ouvre une fenêtre dessus. Tout ce qu'on voit est l'application web, à
// l'identique de ce que sert `node serveur.js`. C'est voulu : il n'y a qu'une seule
// version du programme à corriger, et la coquille ne peut pas diverger de la page.
//
// ⚠️ Décidé par Yves le 13 octobre 2026 : cette coquille renverse le §8 du cahier des
// charges, qui disait « Node, sans aucune dépendance ». Electron en est une, et une
// lourde. Le serveur, lui, n'en a toujours aucune : lancé par `node serveur.js`, il
// fonctionne sans rien installer.

'use strict';

const { app, BrowserWindow, shell, Menu } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { demarrer } = require('../serveur.js');

// Le port habituel d'abord — on retrouve ainsi ses favoris et sa mémoire d'écran, qui
// sont attachés à l'origine `127.0.0.1:7420`. S'il est déjà pris, par un `node
// serveur.js` lancé à la main par exemple, on demande au système un port libre plutôt
// que de refuser de démarrer.
const PORT_HABITUEL = 7420;

// La coquille n'écoute **que** sur la boucle locale, quoi qu'en dise l'environnement :
// une application de bureau qu'on double-clique ne doit pas exposer ses transcripts au
// réseau sans qu'on l'ait demandé. L'ouverture au tailnet reste au lancement en ligne de
// commande, où elle se demande explicitement.
const HOTES = ['127.0.0.1'];

let fenetre = null;
let accueil = null;

/**
 * L'écran d'accueil — §: ce qui se passe entre le double-clic et la fenêtre.
 *
 * La fenêtre principale ne se montre qu'une fois la page prête (`ready-to-show`), et sur
 * un gros transcript cela prend une seconde ou deux pendant lesquelles **rien ne paraît
 * à l'écran** : l'application semble n'avoir pas démarré. L'accueil occupe ce temps-là,
 * et pas une milliseconde de plus — il se referme dès que la fenêtre s'ouvre, jamais
 * après un délai décoratif.
 *
 * Le logo n'est pas redessiné ici : il est **lu dans `public/logo.svg`**, la source
 * unique, puis inséré dans la page. Si la lecture échoue — un paquet abîmé — l'accueil
 * s'affiche sans lui plutôt que de ne pas s'afficher du tout.
 */
function pageDAccueil() {
  let logo = '';
  try {
    logo = fs.readFileSync(path.join(__dirname, '..', 'public', 'logo.svg'), 'utf8')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<\?xml[\s\S]*?\?>/g, '')
      .trim();
  } catch { /* sans logo, mais avec le nom */ }

  const corps = `<!doctype html><meta charset="utf-8">
<style>
  html, body { margin:0; height:100%; background:transparent; overflow:hidden;
    -webkit-user-select:none; cursor:default; }
  .panneau {
    position:absolute; inset:0; border-radius:16px;
    /* Le fond du panneau n'est PAS celui de la boîte du logo (#14161d) : au même ton,
       la boîte disparaissait et ne laissait qu'un rectangle fantôme autour des barres.
       #11131a est le fond de l'application, et la boîte s'y détache. */
    background:#11131a; border:1px solid #2b2f3b;
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:.55rem; font:14px/1 ui-sans-serif, system-ui, -apple-system, sans-serif;
  }
  .panneau svg { width:58px; height:58px; display:block; margin-bottom:.4rem; }
  .sigle { font-size:3.1rem; font-weight:700; letter-spacing:.08em; color:#E8833A;
    line-height:1; }
  .nom { font-size:.72rem; letter-spacing:.26em; text-transform:uppercase;
    color:#8a90a0; }
  /* Le filet d'attente ne mesure rien et ne prétend rien mesurer : il dit « ça
     travaille », ce qui est la seule chose qu'on sache à cet instant. */
  .filet { width:112px; height:2px; border-radius:1px; background:#2b2f3b;
    overflow:hidden; margin-top:.9rem; }
  .filet i { display:block; width:38%; height:100%; border-radius:1px;
    background:#E8833A; animation:va 1.1s ease-in-out infinite; }
  @keyframes va { 0% { transform:translateX(-100%); } 100% { transform:translateX(265%); } }
  @media (prefers-reduced-motion: reduce) { .filet i { animation:none; width:100%;
    opacity:.45; } }
</style>
<div class="panneau">
  ${logo}
  <div class="sigle">OBB</div>
  <div class="nom">Orange Black Box</div>
  <div class="filet"><i></i></div>
</div>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(corps);
}

/**
 * Combien de temps l'accueil reste visible **au minimum**, une fois peint.
 *
 * Sans ce plancher il clignote au lieu de paraître : mesuré sur cette machine, l'accueil
 * devenait visible à 249 ms et la fenêtre principale le remplaçait à 263 — **quatorze
 * millisecondes à l'écran**, c'est-à-dire un défaut d'affichage et non un écran d'accueil.
 * Le serveur démarre simplement plus vite que la fenêtre ne se peint.
 *
 * 700 ms : assez pour qu'on lise le nom, trop peu pour qu'on attende. Et ce plancher ne
 * coûte rien dès que le démarrage est réellement long — sur une grosse session, la
 * fenêtre met davantage et l'accueil n'est jamais prolongé.
 */
const DUREE_MINIMALE_MS = 700;

let accueilVu = null;      // instant où l'accueil est devenu visible
let aFaireEnsuite = null;  // montrer la fenêtre — en attente que l'accueil ait eu son temps
let gardeFou = null;

function ouvrirLAccueil() {
  accueil = new BrowserWindow({
    width: 380, height: 260,
    frame: false, transparent: true, resizable: false, movable: false,
    skipTaskbar: true, alwaysOnTop: true, center: true, show: false,
    // Sans cela, une plateforme qui ne sait pas composer peindrait un rectangle noir
    // derrière les coins arrondis.
    backgroundColor: '#00000000',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  accueil.once('ready-to-show', () => {
    if (!accueil) return;
    accueil.show();
    accueilVu = Date.now();
    peutEtreAchever();
  });
  accueil.loadURL(pageDAccueil());
  // Garde-fou : un accueil qui survivrait à une panne resterait au-dessus de tout, sans
  // bordure ni bouton pour le fermer. Au bout de quinze secondes il s'efface — et s'il
  // reste quelque chose à faire, cela se fait quand même : un accueil cassé ne doit
  // jamais retenir la fenêtre en otage.
  gardeFou = setTimeout(achever, 15000);
  gardeFou.unref?.();
}

/**
 * Remplacer l'accueil par la fenêtre. L'appelant donne **ce qu'il veut faire**, et non
 * l'ordre de fermer : c'est ici qu'on sait si l'accueil a eu son temps, et les deux
 * gestes doivent rester solidaires pour qu'il n'y ait jamais d'instant où ni l'un ni
 * l'autre n'est à l'écran.
 */
function remplacerLAccueil(montrerLaFenetre) {
  aFaireEnsuite = montrerLaFenetre;
  if (!accueil) { achever(); return; }
  peutEtreAchever();
}

function peutEtreAchever() {
  // Tant que l'accueil n'est pas peint, on ne sait pas depuis quand le compter — on
  // attend `ready-to-show`, qui rappellera cette fonction.
  if (!aFaireEnsuite || accueilVu === null) return;
  setTimeout(achever, Math.max(0, DUREE_MINIMALE_MS - (Date.now() - accueilVu)));
}

function achever() {
  if (gardeFou) { clearTimeout(gardeFou); gardeFou = null; }
  const faire = aFaireEnsuite;
  aFaireEnsuite = null;     // avant l'appel : `achever` peut être appelée deux fois,
  if (faire) faire();       // par le garde-fou et par la voie normale.
  if (!accueil) return;
  const a = accueil;
  accueil = null;           // avant de fermer : `window-all-closed` ne doit pas voir
  a.destroy();              // un état intermédiaire.
}

async function ouvrirLeServeur() {
  try {
    return await demarrer({ port: PORT_HABITUEL, hotes: HOTES, silencieux: true });
  } catch {
    // EADDRINUSE, le plus souvent : un serveur tourne déjà sur 7420.
    return demarrer({ port: 0, hotes: HOTES, silencieux: true });
  }
}

function pageDErreur(message) {
  // Pas de fichier séparé : une coquille qui ne peut pas démarrer doit pouvoir le dire
  // même si rien d'autre ne fonctionne.
  const corps = `<!doctype html><meta charset="utf-8">
<style>
  body { background:#11131a; color:#e4e6ee; font:15px/1.6 ui-sans-serif, system-ui, sans-serif;
         margin:0; display:grid; place-items:center; height:100vh; text-align:center; }
  div { max-width:34rem; padding:2rem; }
  h1 { font-size:1.1rem; font-weight:600; color:#f7768e; }
  code { font-family:ui-monospace, Menlo, monospace; background:#1a1d27; padding:.1rem .3rem;
         border-radius:3px; }
</style>
<div><h1>Orange Black Box n'a pas pu démarrer</h1>
<p>${message}</p>
<p>L'application lit <code>~/.claude</code>, le dossier que Claude Code écrit.
Si Claude Code n'a jamais tourné sur cette machine, il n'y a rien à observer.</p></div>`;
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(corps);
}

function creerLaFenetre(url) {
  fenetre = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#11131a',   // la couleur du thème sombre, pour ne pas éclater en blanc
    title: 'Orange Black Box',
    show: false,
    webPreferences: {
      // La page est une page web ordinaire servie en HTTP : elle n'a aucun besoin de
      // Node, et le lui donner serait une porte ouverte pour rien.
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Ne montrer la fenêtre qu'une fois la page prête : sinon on voit un rectangle vide
  // pendant la seconde que coûte la lecture d'un gros transcript. C'est exactement ce
  // temps-là que l'accueil occupe, et il s'efface ici — après `show()`, pour qu'il n'y
  // ait jamais d'instant où ni l'un ni l'autre n'est à l'écran.
  fenetre.once('ready-to-show', () => remplacerLAccueil(() => {
    if (fenetre) fenetre.show();
  }));

  // Un lien vers l'extérieur s'ouvre dans le navigateur du système, jamais dans la
  // coquille : une fenêtre d'application n'a ni barre d'adresse ni bouton retour.
  fenetre.webContents.setWindowOpenHandler(({ url: cible }) => {
    shell.openExternal(cible);
    return { action: 'deny' };
  });

  fenetre.loadURL(url);
  fenetre.on('closed', () => { fenetre = null; });
}

app.whenReady().then(async () => {
  // L'accueil d'abord, avant même le menu : il n'a besoin de rien et tout le reste prend
  // du temps. C'est tout l'intérêt d'un écran d'accueil que de paraître en premier.
  ouvrirLAccueil();

  // Un menu minimal, mais pas aucun : sans lui, ni copier-coller ni ⌘Q sur macOS.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
    { role: 'editMenu' },
    {
      label: 'Affichage',
      submenu: [
        { role: 'reload', label: 'Recharger' },
        { role: 'toggleDevTools', label: 'Outils de développement' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Taille normale' },
        { role: 'zoomIn', label: 'Agrandir' },
        { role: 'zoomOut', label: 'Réduire' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
      ],
    },
    { role: 'windowMenu' },
  ]));

  try {
    const { url } = await ouvrirLeServeur();
    creerLaFenetre(url);
  } catch (err) {
    creerLaFenetre(pageDErreur(String(err && err.message ? err.message : err)));
  }

  // Sur macOS, cliquer l'icône du dock d'une application sans fenêtre la rouvre.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && fenetre === null) app.relaunch();
  });
});

// Ailleurs que sur macOS, fermer la fenêtre ferme l'application — c'est l'usage.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Exporté pour qu'on puisse **regarder l'accueil sans lancer Electron** : c'est la seule
// façon d'éprouver exactement la page qui sera servie, plutôt qu'une copie de son HTML
// qui divergerait au premier retouche.
module.exports = { pageDAccueil };
