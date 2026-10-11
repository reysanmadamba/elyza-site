/* Portfolio posts added from /admin. Used by the homepage (latest few) and /works (everything). */
(async () => {
  const grid = document.querySelector('#grid');
  if (!grid) return;
  const chips = document.querySelector('#chips');
  const section = grid.closest('[data-works]');
  const empty = document.querySelector('#worksEmpty');
  const limit = Number(grid.dataset.limit) || Infinity;

  let posts = [];
  try {
    const res = await fetch('/api/posts');
    if (res.ok) posts = (await res.json()).posts || [];
  } catch {}
  if (!posts.length) {
    if (empty) empty.hidden = false;
    return;
  }

  function media(p) {
    if (p.platform === 'photo') {
      const img = document.createElement('img');
      img.src = p.src;
      img.loading = 'lazy';
      img.alt = p.caption || 'Photo by Elyza';
      return img;
    }
    if (p.platform === 'video') {
      const video = document.createElement('video');
      video.src = p.src;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      return video;
    }
    const frame = document.createElement('iframe');
    frame.src = p.embed;
    frame.loading = 'lazy';
    frame.title = p.caption || `${p.platform} post`;
    frame.allow = 'autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    return frame;
  }

  function draw(filter) {
    const shown = posts.filter((p) => filter === 'all' || p.category === filter).slice(0, limit);
    grid.replaceChildren(...shown.map((p) => {
      const fig = document.createElement('figure');
      fig.className = 'post';
      fig.dataset.platform = p.platform;
      fig.append(media(p));
      const uploaded = Boolean(p.src);
      if (p.caption || !uploaded) {
        const cap = document.createElement('figcaption');
        const text = document.createElement('span');
        text.textContent = p.caption || '';
        cap.append(text);
        if (!uploaded) {
          const link = document.createElement('a');
          link.href = p.url;
          link.target = '_blank';
          link.rel = 'noopener';
          link.textContent = `${p.platform} ↗`;
          cap.append(link);
        }
        fig.append(cap);
      }
      return fig;
    }));
    chips.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
  }

  const order = ['glam', 'play', 'peaks', 'shred', 'life'];
  const used = ['all', ...order.filter((c) => posts.some((p) => p.category === c))];
  if (used.length > 2) used.forEach((c) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.filter = c;
    b.textContent = c === 'all' ? 'everything' : c;
    b.addEventListener('click', () => draw(c));
    chips.append(b);
  });
  if (section) section.hidden = false;
  draw('all');
})();
