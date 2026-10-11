const $ = (s) => document.querySelector(s);
let posts = [];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2000);
}

async function api(path, method = 'GET', body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/session') show(false);
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.');
  return data;
}

function show(authed) {
  $('#login').hidden = authed;
  $('#manager').hidden = !authed;
  if (authed) load(); else $('#pw').focus();
}

async function load() {
  try {
    posts = (await api('/api/posts')).posts;
    render();
  } catch (err) {
    toast(err.message);
  }
}

function render() {
  const list = $('#posts');
  list.replaceChildren();
  $('#count').textContent = posts.length ? `· ${posts.length}` : '';
  $('#empty').hidden = posts.length > 0;
  posts.forEach((p, i) => {
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'info';
    const meta = document.createElement('p');
    meta.className = 'meta';
    meta.innerHTML = '<span></span> · ';
    meta.firstChild.textContent = p.category;
    meta.append(p.platform);
    info.append(meta);
    if (p.caption) {
      const cap = document.createElement('p');
      cap.className = 'cap';
      cap.textContent = p.caption;
      info.append(cap);
    }
    const link = document.createElement('a');
    link.className = 'link';
    link.href = p.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = p.url.replace(/^https:\/\/(www\.)?/, '');
    info.append(link);

    const acts = document.createElement('div');
    acts.className = 'acts';
    const btn = (label, title, disabled, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.title = title;
      b.setAttribute('aria-label', title);
      b.disabled = disabled;
      b.addEventListener('click', fn);
      acts.append(b);
    };
    btn('↑', 'Move up', i === 0, () => move(i, -1));
    btn('↓', 'Move down', i === posts.length - 1, () => move(i, 1));
    btn('✕', 'Remove', false, () => remove(p));
    li.append(info, acts);
    list.append(li);
  });
}

async function move(i, dir) {
  const order = posts.map((p) => p.id);
  [order[i], order[i + dir]] = [order[i + dir], order[i]];
  try {
    posts = (await api('/api/posts', 'PUT', { order })).posts;
    render();
  } catch (err) { toast(err.message); }
}

async function remove(p) {
  try {
    posts = (await api(`/api/posts?id=${encodeURIComponent(p.id)}`, 'DELETE')).posts;
    render();
    toast('Removed');
  } catch (err) { toast(err.message); }
}

$('#login').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('#loginError').textContent = '';
  try {
    await api('/api/session', 'POST', { password: $('#pw').value });
    $('#pw').value = '';
    show(true);
  } catch (err) {
    $('#loginError').textContent = err.message;
  }
});

$('#add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#addBtn');
  $('#addError').textContent = '';
  btn.disabled = true;
  btn.textContent = 'Adding…';
  try {
    posts = (await api('/api/posts', 'POST', {
      url: $('#url').value,
      category: $('#category').value,
      caption: $('#caption').value,
    })).posts;
    $('#url').value = '';
    $('#caption').value = '';
    render();
    toast('Added ♡');
  } catch (err) {
    $('#addError').textContent = err.message;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add to portfolio';
  }
});

$('#logout').addEventListener('click', async () => {
  await api('/api/session', 'DELETE').catch(() => {});
  show(false);
});

api('/api/session').then((s) => show(s.authed)).catch(() => show(false));
