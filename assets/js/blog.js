/* blog.js — 全站唯一脚本，全部是渐进增强（脚本没加载，文章照样能读）：
   深浅色切换；文章页的表格横向滚动、信源标签、目录、阅读进度、回到顶部、Mermaid 渲染。 */
(function () {
  'use strict';

  var root = document.documentElement;
  var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  var themeListeners = [];

  function currentTheme() {
    return root.getAttribute('data-theme') || (darkQuery.matches ? 'dark' : 'light');
  }
  function notifyTheme() {
    themeListeners.forEach(function (fn) { fn(); });
  }

  /* ---------- 深浅色切换 ---------- */
  var themeToggle = document.querySelector('[data-theme-toggle]');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      notifyTheme();
    });
  }
  if (darkQuery.addEventListener) {
    darkQuery.addEventListener('change', function () {
      if (!root.getAttribute('data-theme')) notifyTheme();
    });
  }

  var content = document.getElementById('content');
  if (!content) return;
  var opts = (content.closest('[data-post]') || content).dataset;

  /* ---------- 表格：包一层 .tablewrap 以便横向滚动 ---------- */
  content.querySelectorAll('table').forEach(function (table) {
    if (table.closest('.tablewrap, .table-wrap')) return;
    var wrap = document.createElement('div');
    wrap.className = 'tablewrap';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  /* ---------- 信源标签：【官方】【实测】… → 彩色徽标（front matter: evidence_tags: true） ---------- */
  if (opts.evidenceTags === 'true') {
    var TAGS = { '官方': 'tag-official', '实测': 'tag-tested', '逆向': 'tag-reverse', '推断': 'tag-infer', '访谈': 'tag-neutral', '公开报道': 'tag-neutral' };
    var KEYS = Object.keys(TAGS);
    var walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        return n.parentElement.closest('pre, code, script, style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    var re = /【([^】]{1,60})】/g;
    textNodes.forEach(function (node) {
      var text = node.nodeValue;
      if (text.indexOf('【') < 0) return;
      var frag = document.createDocumentFragment();
      var last = 0, changed = false, m;
      re.lastIndex = 0;
      while ((m = re.exec(text))) {
        var inner = m[1];
        var key = KEYS.find(function (k) { return inner.indexOf(k) === 0; });
        if (!key) continue;
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        var span = document.createElement('span');
        if (inner.length <= 14) { span.className = 'tag ' + TAGS[key]; span.textContent = inner; }
        else { span.className = 'evidence-note'; span.textContent = m[0]; }
        frag.appendChild(span);
        last = m.index + m[0].length;
        changed = true;
      }
      if (!changed) return;
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- 目录：取正文里最高的两级标题；toc: true / false 强制开关，默认文章够长才出现 ---------- */
  var toc = document.querySelector('.toc');
  var tocToggle = document.querySelector('.toc-toggle');
  var items = [];
  if (toc && opts.toc !== 'false') {
    var all = [].slice.call(content.querySelectorAll('h1, h2, h3')).filter(function (h) {
      return !h.closest('blockquote, .callout, figure, .duo, .cards, footer, .footnotes');
    });
    var levels = [1, 2, 3].filter(function (l) {
      return all.some(function (h) { return h.tagName === 'H' + l; });
    }).slice(0, 2);
    var heads = all.filter(function (h) { return levels.indexOf(+h.tagName.charAt(1)) >= 0; });
    var longEnough = heads.length >= 4 && content.textContent.length > 3000;
    if (heads.length >= 2 && (opts.toc === 'true' || longEnough)) {
      var list = document.createElement('ol');
      heads.forEach(function (h, i) {
        if (!h.id) h.id = 'sec-' + (i + 1);
        var label = h.cloneNode(true);
        label.querySelectorAll('.sub').forEach(function (s) { s.remove(); });
        var li = document.createElement('li');
        li.className = h.tagName === 'H' + levels[0] ? 'lv1' : 'lv2';
        var a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = label.textContent.trim();
        li.appendChild(a);
        list.appendChild(li);
        items.push({ h: h, a: a });
      });
      toc.querySelector('.toc-inner').appendChild(list);
      toc.classList.add('is-ready');
      if (tocToggle) tocToggle.classList.add('is-ready');
    }
  }
  if (items.length && tocToggle) {
    tocToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      toc.classList.toggle('is-open');
    });
    toc.addEventListener('click', function (e) {
      if (e.target.closest('a')) toc.classList.remove('is-open');
    });
    document.addEventListener('click', function (e) {
      if (toc.classList.contains('is-open') && !toc.contains(e.target)) toc.classList.remove('is-open');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') toc.classList.remove('is-open');
    });
  }

  /* ---------- 阅读进度 + 回到顶部 + 目录高亮 ---------- */
  var bar = document.querySelector('.progress');
  var back = document.querySelector('.back-top');
  var ticking = false;
  function update() {
    ticking = false;
    var st = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(st / max, 1) : 0) + ')';
    if (back) back.classList.toggle('show', st > 800);
    if (!items.length) return;
    var cur = null;
    for (var i = 0; i < items.length; i++) {
      if (items[i].h.getBoundingClientRect().top < 120) cur = items[i];
      else break;
    }
    items.forEach(function (it) { it.a.classList.toggle('active', it === cur); });
    if (cur) {
      var box = toc.classList.contains('is-open') ? toc : toc.querySelector('.toc-inner');
      var r = cur.a.getBoundingClientRect(), br = box.getBoundingClientRect();
      if (br.height && (r.top < br.top + 40 || r.bottom > br.bottom - 40)) {
        box.scrollTop += r.top - br.top - br.height / 2;
      }
    }
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
  if (back) {
    back.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- Mermaid：```mermaid 代码块 / 旧文章的 pre.mermaid-src → 图；切换深浅色时重绘 ---------- */
  var MERMAID = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  var pres = [];
  content.querySelectorAll('pre.mermaid-src, pre > code.language-mermaid, .language-mermaid pre').forEach(function (el) {
    var pre = el.closest('pre');
    if (pres.indexOf(pre) < 0) pres.push(pre);
  });
  var diagrams = pres.map(function (pre) {
    return { pre: pre, holder: pre.parentElement.closest('.language-mermaid') || pre, src: pre.textContent, box: null };
  });
  if (diagrams.length) {
    import(MERMAID).then(function (mod) {
      var mermaid = mod.default, seq = 0;
      function render() {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'loose',
          theme: currentTheme() === 'dark' ? 'dark' : 'neutral',
          fontFamily: getComputedStyle(root).getPropertyValue('--sans')
        });
        return diagrams.reduce(function (p, d) {
          return p.then(function () {
            return mermaid.render('mmd-' + (seq++), d.src).then(function (out) {
              if (!d.box) {
                d.box = document.createElement('div');
                d.box.className = 'mermaid-svg';
                d.holder.parentNode.insertBefore(d.box, d.holder);
                d.holder.hidden = true;
              }
              d.box.innerHTML = out.svg;
            }, function (err) {
              console.warn('mermaid', err);
              d.pre.classList.add('mermaid-failed');
            });
          });
        }, Promise.resolve());
      }
      render();
      themeListeners.push(render);
    }, function () {
      diagrams.forEach(function (d) { d.pre.classList.add('mermaid-failed'); });
    });
  }
})();
