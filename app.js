// Onyx — Link in Bio Builder (vanilla JS, single-page static app)
(function () {
  'use strict';

  const STORAGE_KEY = 'onyx-page-v1';

  const BLOCK_TYPES = [
    { type: 'profile',  label: 'Profile',  icon: '👤' },
    { type: 'heading',  label: 'Heading',  icon: 'H' },
    { type: 'text',     label: 'Text',     icon: '¶' },
    { type: 'button',   label: 'Button',   icon: '🔗' },
    { type: 'socials',  label: 'Socials',  icon: '✦' },
    { type: 'gallery',  label: 'Gallery',  icon: '▦' },
    { type: 'video',    label: 'Video',    icon: '▶' },
    { type: 'divider',  label: 'Divider',  icon: '—' },
  ];

  const SOCIAL_PRESETS = [
    { key: 'instagram', icon: '📷', url: 'https://instagram.com/' },
    { key: 'twitter',   icon: '𝕏',  url: 'https://x.com/' },
    { key: 'tiktok',    icon: '♪',  url: 'https://tiktok.com/@' },
    { key: 'youtube',   icon: '▶',  url: 'https://youtube.com/@' },
  ];

  function uid() { return Math.random().toString(36).slice(2, 10); }

  function defaultBlockProps(type) {
    switch (type) {
      case 'profile': return { name: 'Your Name', bio: 'Creator · Designer · Storyteller', avatar: '' };
      case 'heading': return { text: 'Featured' };
      case 'text':    return { text: 'Welcome to my page. Tap the links below to explore my latest work.' };
      case 'button':  return { text: 'My Latest Project', url: 'https://example.com' };
      case 'socials': return { items: SOCIAL_PRESETS.map(s => ({ ...s })) };
      case 'gallery': return { images: ['', '', '', ''] };
      case 'video':   return { url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' };
      case 'divider': return {};
      default: return {};
    }
  }

  function defaultState() {
    return {
      name: 'My Page',
      slug: 'creator',
      published: false,
      theme: { accent: '#8b5cf6', bg: '#0a0a0f', btnStyle: 'glass' },
      blocks: [
        { id: uid(), type: 'profile', props: defaultBlockProps('profile') },
        { id: uid(), type: 'socials', props: defaultBlockProps('socials') },
        { id: uid(), type: 'button',  props: { text: 'Visit my website', url: 'https://example.com' } },
        { id: uid(), type: 'button',  props: { text: 'Subscribe on YouTube', url: 'https://youtube.com' } },
        { id: uid(), type: 'heading', props: { text: 'Latest Work' } },
        { id: uid(), type: 'gallery', props: defaultBlockProps('gallery') },
      ],
    };
  }

  let state = load() || defaultState();
  let selectedId = null;
  let device = 'mobile';

  function load() {
    try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : null; }
    catch { return null; }
  }
  function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  // === Rendering ===
  function renderPalette() {
    const el = document.getElementById('palette');
    el.innerHTML = '';
    BLOCK_TYPES.forEach(bt => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="ico">${bt.icon}</span><span>${bt.label}</span>`;
      b.onclick = () => addBlock(bt.type);
      el.appendChild(b);
    });
  }

  function renderBlockList() {
    const list = document.getElementById('blockList');
    list.innerHTML = '';
    state.blocks.forEach((block, i) => {
      const item = document.createElement('div');
      item.className = 'block-item' + (block.id === selectedId ? ' selected' : '');
      item.draggable = true;
      item.dataset.id = block.id;
      const meta = BLOCK_TYPES.find(t => t.type === block.type) || { icon: '•', label: block.type };
      item.innerHTML = `<span class="handle">⋮⋮</span><span>${meta.icon}</span><span class="label">${meta.label}</span><button class="del" title="Delete">×</button>`;
      item.querySelector('.del').onclick = (e) => { e.stopPropagation(); removeBlock(block.id); };
      item.onclick = () => selectBlock(block.id);

      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', block.id);
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => item.classList.remove('dragging'));
      item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const fromId = e.dataTransfer.getData('text/plain');
        if (fromId && fromId !== block.id) reorder(fromId, block.id);
      });

      list.appendChild(item);
    });
  }

  function renderPreview(target) {
    const root = target || document.getElementById('preview');
    root.innerHTML = '';
    root.style.background = state.theme.bg;
    state.blocks.forEach(b => root.appendChild(renderBlock(b)));
  }

  function renderBlock(block) {
    const wrap = document.createElement('div');
    wrap.dataset.id = block.id;
    const p = block.props || {};
    switch (block.type) {
      case 'profile': {
        wrap.className = 'pv-profile';
        const initial = (p.name || '?').trim().charAt(0).toUpperCase();
        wrap.innerHTML = `
          <div class="pv-avatar">${p.avatar ? `<img src="${escapeAttr(p.avatar)}" alt="">` : initial}</div>
          <p class="pv-name">${escapeHTML(p.name || '')}</p>
          <p class="pv-bio">${escapeHTML(p.bio || '')}</p>`;
        break;
      }
      case 'heading':
        wrap.className = 'pv-heading';
        wrap.textContent = p.text || '';
        break;
      case 'text':
        wrap.className = 'pv-text';
        wrap.textContent = p.text || '';
        break;
      case 'button': {
        const a = document.createElement('a');
        a.className = 'pv-btn ' + (state.theme.btnStyle || 'glass');
        a.href = p.url || '#';
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = p.text || 'Button';
        if (state.theme.btnStyle === 'filled') a.style.background = state.theme.accent;
        if (state.theme.btnStyle === 'outline') a.style.borderColor = state.theme.accent;
        return a;
      }
      case 'socials': {
        wrap.className = 'pv-socials';
        (p.items || []).forEach(s => {
          const a = document.createElement('a');
          a.href = s.url || '#';
          a.target = '_blank';
          a.rel = 'noopener';
          a.title = s.key;
          a.textContent = s.icon || '•';
          wrap.appendChild(a);
        });
        break;
      }
      case 'gallery': {
        wrap.className = 'pv-gallery';
        (p.images || []).forEach(url => {
          if (url) {
            const img = document.createElement('img');
            img.src = url; img.alt = '';
            wrap.appendChild(img);
          } else {
            const ph = document.createElement('div');
            ph.className = 'ph'; ph.textContent = '▦';
            wrap.appendChild(ph);
          }
        });
        break;
      }
      case 'video': {
        wrap.className = 'pv-video';
        const iframe = document.createElement('iframe');
        iframe.src = p.url || '';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.setAttribute('allowfullscreen', '');
        wrap.appendChild(iframe);
        break;
      }
      case 'divider':
        wrap.className = 'pv-divider';
        break;
    }
    wrap.style.cursor = 'pointer';
    wrap.addEventListener('click', (e) => { e.stopPropagation(); selectBlock(block.id); });
    return wrap;
  }

  function renderInspector() {
    const el = document.getElementById('inspector');
    const block = state.blocks.find(b => b.id === selectedId);
    if (!block) { el.className = 'inspector-empty'; el.innerHTML = 'Select a block to edit.'; return; }
    el.className = '';
    el.innerHTML = '';
    const p = block.props || {};

    const addField = (label, inputEl) => {
      const f = document.createElement('label');
      f.className = 'field';
      const s = document.createElement('span'); s.textContent = label;
      f.appendChild(s); f.appendChild(inputEl); el.appendChild(f);
    };
    const txt = (val, oninput, tag) => {
      const i = document.createElement(tag || 'input');
      i.value = val || '';
      i.oninput = (e) => oninput(e.target.value);
      return i;
    };

    switch (block.type) {
      case 'profile':
        addField('Name', txt(p.name, v => updateProps(block.id, { name: v })));
        addField('Bio', txt(p.bio, v => updateProps(block.id, { bio: v }), 'textarea'));
        addField('Avatar URL', txt(p.avatar, v => updateProps(block.id, { avatar: v })));
        break;
      case 'heading':
        addField('Heading text', txt(p.text, v => updateProps(block.id, { text: v })));
        break;
      case 'text':
        addField('Text', txt(p.text, v => updateProps(block.id, { text: v }), 'textarea'));
        break;
      case 'button':
        addField('Label', txt(p.text, v => updateProps(block.id, { text: v })));
        addField('URL', txt(p.url, v => updateProps(block.id, { url: v })));
        break;
      case 'socials':
        (p.items || []).forEach((s, idx) => {
          addField(s.key.toUpperCase() + ' URL', txt(s.url, v => {
            const items = p.items.slice();
            items[idx] = { ...items[idx], url: v };
            updateProps(block.id, { items });
          }));
        });
        break;
      case 'gallery':
        (p.images || []).forEach((url, idx) => {
          addField('Image ' + (idx + 1) + ' URL', txt(url, v => {
            const images = p.images.slice();
            images[idx] = v;
            updateProps(block.id, { images });
          }));
        });
        break;
      case 'video':
        addField('Embed URL (YouTube /embed/...)', txt(p.url, v => updateProps(block.id, { url: v })));
        break;
      case 'divider':
        el.className = 'inspector-empty';
        el.textContent = 'Divider has no settings.';
        break;
    }
  }

  // === Mutations ===
  function addBlock(type) {
    state.blocks.push({ id: uid(), type, props: defaultBlockProps(type) });
    persistAndRender();
  }
  function removeBlock(id) {
    state.blocks = state.blocks.filter(b => b.id !== id);
    if (selectedId === id) selectedId = null;
    persistAndRender();
  }
  function selectBlock(id) { selectedId = id; renderBlockList(); renderInspector(); }
  function updateProps(id, partial) {
    const b = state.blocks.find(x => x.id === id);
    if (!b) return;
    b.props = { ...b.props, ...partial };
    save();
    renderPreview();
  }
  function reorder(fromId, toId) {
    const from = state.blocks.findIndex(b => b.id === fromId);
    const to = state.blocks.findIndex(b => b.id === toId);
    if (from < 0 || to < 0) return;
    const [moved] = state.blocks.splice(from, 1);
    state.blocks.splice(to, 0, moved);
    persistAndRender();
  }
  function persistAndRender() { save(); renderBlockList(); renderPreview(); renderInspector(); }

  // === Header / theme controls ===
  function bindHeader() {
    document.getElementById('deviceToggle').addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-device]');
      if (!btn) return;
      device = btn.dataset.device;
      document.querySelectorAll('#deviceToggle button').forEach(b => b.classList.toggle('active', b === btn));
      document.getElementById('deviceFrame').className = 'device-frame ' + device;
    });
    document.getElementById('publishBtn').addEventListener('click', () => {
      state.published = !state.published;
      const b = document.getElementById('publishBtn');
      b.textContent = state.published ? 'Published' : 'Publish';
      b.classList.toggle('published', state.published);
      save();
    });
    document.getElementById('previewBtn').addEventListener('click', () => {
      const m = document.getElementById('modal');
      m.hidden = false;
      renderPreview(document.getElementById('modalPreview'));
    });
    document.getElementById('modalClose').addEventListener('click', () => {
      document.getElementById('modal').hidden = true;
    });
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') document.getElementById('modal').hidden = true;
    });

    document.getElementById('pageName').addEventListener('input', e => { state.name = e.target.value; save(); });
    document.getElementById('slug').addEventListener('input', e => { state.slug = e.target.value; save(); });
    document.getElementById('accent').addEventListener('input', e => {
      state.theme.accent = e.target.value;
      document.documentElement.style.setProperty('--accent', e.target.value);
      save(); renderPreview();
    });
    document.getElementById('bg').addEventListener('input', e => { state.theme.bg = e.target.value; save(); renderPreview(); });
    document.getElementById('btnStyle').addEventListener('change', e => { state.theme.btnStyle = e.target.value; save(); renderPreview(); });
  }

  function hydrateControls() {
    document.getElementById('pageName').value = state.name;
    document.getElementById('slug').value = state.slug;
    document.getElementById('accent').value = state.theme.accent;
    document.getElementById('bg').value = state.theme.bg;
    document.getElementById('btnStyle').value = state.theme.btnStyle;
    document.documentElement.style.setProperty('--accent', state.theme.accent);
    if (state.published) {
      const b = document.getElementById('publishBtn');
      b.textContent = 'Published'; b.classList.add('published');
    }
  }

  function escapeHTML(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function escapeAttr(s) { return escapeHTML(s); }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    renderPalette();
    bindHeader();
    hydrateControls();
    renderBlockList();
    renderPreview();
    renderInspector();
  });
})();
