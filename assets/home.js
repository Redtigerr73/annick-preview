/* Accueil : le carnet à surligner. Les signes choisis sont repris dans le questionnaire. */
(function () {
  'use strict';
  Site.chrome('accueil');
  const box = document.getElementById('nb-result');
  const signs = Array.from(document.querySelectorAll('.sign'));
  function update() {
    const on = signs.filter(b => b.getAttribute('aria-pressed') === 'true');
    if (!on.length) { box.innerHTML = '<p class="small muted" style="margin:0">Rien n’est enregistré tant que vous n’ouvrez pas le questionnaire.</p>'; return; }
    const n = on.length;
    box.innerHTML = `<strong>${n} signe${n > 1 ? 's' : ''} surligné${n > 1 ? 's' : ''}.</strong>
      <p class="small" style="margin:4px 0 10px">Ce sont des pistes à explorer en consultation, pas un diagnostic.</p>
      <a class="btn hlb sm" href="questionnaire.html" id="nb-go">Les reprendre dans mon questionnaire</a>`;
    document.getElementById('nb-go').addEventListener('click', () => {
      try {
        const draft = JSON.parse(localStorage.getItem('annick-questionnaire-brouillon') || '{}');
        draft.answers = draft.answers || {};
        on.forEach(b => { if (!draft.answers[b.dataset.axis]) draft.answers[b.dataset.axis] = 2; });
        localStorage.setItem('annick-questionnaire-brouillon', JSON.stringify(draft));
      } catch (e) { /* stockage indisponible */ }
    });
  }
  signs.forEach(b => b.addEventListener('click', () => { b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); update(); }));
})();
