const $ = (s) => document.querySelector(s);
const MB = 1024 * 1024;
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

function thumb(p) {
  if (p.platform === 'photo') {
    const img = document.createElement('img');
    img.src = p.src;
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }
  const tile = document.createElement('span');
  tile.textContent = p.platform === 'video' ? '▶' : p.platform[0].toUpperCase();
  return tile;
}

function render() {
  const list = $('#posts');
  list.replaceChildren();
  $('#count').textContent = posts.length ? `· ${posts.length}` : '';
  $('#empty').hidden = posts.length > 0;
  posts.forEach((p, i) => {
    const li = document.createElement('li');
    const pic = document.createElement('div');
    pic.className = 'thumb';
    pic.append(thumb(p));

    const info = document.createElement('div');
    info.className = 'info';
    const meta = document.createElement('p');
    meta.className = 'meta';
    const cat = document.createElement('span');
    cat.textContent = p.category;
    meta.append(cat, ` · ${p.src ? `uploaded ${p.platform}` : p.platform}`);
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
    link.textContent = p.src ? 'open file' : p.url.replace(/^https:\/\/(www\.)?/, '');
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
      b.addEventListener('click', () => fn(b));
      acts.append(b);
    };
    btn('↑', 'Move up', i === 0, () => move(i, -1));
    btn('↓', 'Move down', i === posts.length - 1, () => move(i, 1));
    btn('✕', 'Delete', false, (b) => remove(p, b));
    li.append(pic, info, acts);
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

// first tap arms the button, second tap deletes
async function remove(p, b) {
  if (!b.classList.contains('sure')) {
    b.classList.add('sure');
    b.textContent = 'Delete?';
    setTimeout(() => { b.classList.remove('sure'); b.textContent = '✕'; }, 3000);
    return;
  }
  b.disabled = true;
  try {
    posts = (await api(`/api/posts?id=${encodeURIComponent(p.id)}`, 'DELETE')).posts;
    render();
    toast('Deleted');
  } catch (err) { toast(err.message); b.disabled = false; }
}

async function uploadFile(file) {
  const isVideo = file.type.startsWith('video/');
  if (!isVideo && !file.type.startsWith('image/')) throw new Error('Pick a photo or a video file.');
  if (/hei[cf]/i.test(file.type + file.name)) throw new Error("HEIC photos don't show in most browsers. Save it as JPG first.");
  const cap = isVideo ? 60 : 15;
  if (file.size > cap * MB) throw new Error(`That ${isVideo ? 'clip' : 'photo'} is over ${cap} MB. Trim or compress it, or paste a link instead.`);

  const bar = $('#progress');
  bar.hidden = false;
  bar.value = 0;
  try {
    const name = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-60);
    const blob = await window.blobUpload(`uploads/${name}`, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
      contentType: file.type,
      multipart: file.size > 8 * MB,
      onUploadProgress: (e) => { bar.value = e.percentage; },
    });
    return { url: blob.url, contentType: file.type };
  } catch (err) {
    throw new Error(/log in/i.test(err.message) ? 'Please log in again.' : "The upload didn't finish. Check your connection and try again.");
  } finally {
    bar.hidden = true;
  }
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
  const file = $('#file').files[0];
  const url = $('#url').value.trim();
  $('#addError').textContent = '';
  if (!file && !url) { $('#addError').textContent = 'Paste a link or choose a file first.'; return; }
  if (file && url) { $('#addError').textContent = 'Use a link or a file, not both.'; return; }
  btn.disabled = true;
  btn.textContent = file ? 'Uploading…' : 'Adding…';
  try {
    const body = { category: $('#category').value, caption: $('#caption').value };
    if (file) body.upload = await uploadFile(file); else body.url = url;
    posts = (await api('/api/posts', 'POST', body)).posts;
    $('#url').value = '';
    $('#file').value = '';
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
