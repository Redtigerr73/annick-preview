/* Habillage commun des pages publiques : bandeau de démo, en-tête, pied de page, utilitaires. */
(function () {
  'use strict';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  const NAV = [['index.html', 'Accueil', 'accueil'], ['index.html#approche', 'L’approche', 'approche'], ['index.html#parcours', 'Le parcours', 'parcours'], ['index.html#pratique', 'Infos pratiques', 'pratique'], ['questionnaire.html', 'Questionnaire', 'questionnaire']];

  function chrome(current) {
    const top = document.getElementById('chrome-top');
    if (top) top.innerHTML = `
      <div class="demo-bar"><div class="wrap">
        <span>Démonstration préparée pour Annick Dejonckheere · données fictives, rien n’est envoyé</span>
        <nav aria-label="Démonstration"><a href="pourquoi.html">Ce que ça change pour vous</a><a href="espace.html">Ouvrir l’espace praticienne</a></nav>
      </div></div>
      <header class="site-head"><div class="wrap">
        <a class="brand" href="index.html"><b>Annick Dejonckheere</b><span>Nutrithérapeute · micronutrition et hormonologie</span></a>
        <button class="btn ghost sm menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
        <nav class="site-nav" id="site-nav" aria-label="Principale">
          ${NAV.map(([h, l, k]) => `<a href="${h}"${k === current ? ' aria-current="page"' : ''}>${l}</a>`).join('')}
          <a class="btn sm" href="rendez-vous.html"${current === 'rdv' ? ' aria-current="page"' : ''}>Prendre rendez-vous</a>
        </nav>
      </div></header>`;
    const foot = document.getElementById('chrome-foot');
    if (foot) foot.innerHTML = `
      <footer class="site-foot"><div class="wrap">
        <div class="cols">
          <div><h3>Annick Dejonckheere</h3><p>Nutrithérapeute spécialisée en nutrition, micronutrition et hormonologie. Approche de médecine fonctionnelle, formée par le Dr Résimont.</p>
            <p class="small" style="color:#A8BAB4">Les consultations de nutrithérapie complètent le suivi médical, elles ne le remplacent pas. En cas d’urgence, appelez le 112.</p></div>
          <div><h3>Cabinets</h3><p>Cabinet du Dr Résimont<br>Avenue des Crocus 11, 1070 Bruxelles</p><p>Forest<br>Rue de Liège 43, 1190 Bruxelles</p></div>
          <div><h3>Secrétariat</h3><p>+32 (0)2 880 09 68</p><p>Du lundi au vendredi<br>9 h à 12 h, 13 h à 18 h</p><p><a href="rendez-vous.html">Prendre rendez-vous en ligne</a></p></div>
        </div>
        <p class="small" style="margin-top:32px;color:#A8BAB4">Démonstration réalisée par Mohamad HAJI. Site non officiel, non indexé : les rendez-vous et questionnaires de cette page ne sont transmis à personne.</p>
      </div></footer>`;
    const btn = $('.menu-btn'), nav = $('#site-nav');
    if (btn) btn.addEventListener('click', () => { const o = nav.classList.toggle('open'); btn.setAttribute('aria-expanded', o); });
  }

  window.Site = { esc, $, $$, toast, chrome };
})();
