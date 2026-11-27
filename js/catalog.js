(() => {
  const SUPABASE_URL = 'https://saxwbaiebvqfltumuqqo.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zO0b2kb3oWMTlgrWJvhlPw_eTdK7AYK';
  const grid = document.getElementById('ebooks-grid');
  if (!grid) return;
  const fallback = message => {
    grid.replaceChildren();
    const p = document.createElement('p');
    p.className = 'catalog-state';
    p.textContent = message;
    grid.appendChild(p);
  };
  const safeExternalUrl = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' ? url.href : null;
    } catch { return null; }
  };
  async function loadCatalog() {
    try {
      const endpoint = SUPABASE_URL + '/rest/v1/ebooks?select=id,nombre,descripcion,precio,enlace_compra,imagen_url&activo=eq.true&order=id.asc';
      const response = await fetch(endpoint, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY }
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const books = await response.json();
      if (!Array.isArray(books) || books.length === 0) {
        fallback('Estamos actualizando el catálogo. Escríbenos para consultar los recursos disponibles.');
        return;
      }
      const fragment = document.createDocumentFragment();
      books.forEach(book => {
        const card = document.createElement('article');
        card.className = 'ebook-card';
        const imageUrl = safeExternalUrl(book.imagen_url || '');
        if (imageUrl) {
          const img = document.createElement('img');
          img.src = imageUrl;
          img.alt = 'Portada de ' + (book.nombre || 'publicación VitroCorp');
          img.loading = 'lazy';
          img.onerror = () => img.replaceWith(makePlaceholder(book.nombre));
          card.appendChild(img);
        } else card.appendChild(makePlaceholder(book.nombre));
        const body = document.createElement('div');
        body.className = 'ebook-body';
        const title = document.createElement('h3');
        title.textContent = book.nombre || 'Recurso VitroCorp';
        const description = document.createElement('p');
        description.textContent = book.descripcion || 'Publicación digital de VitroCorp EC.';
        const bottom = document.createElement('div');
        bottom.className = 'ebook-bottom';
        const price = document.createElement('span');
        const amount = Number(book.precio);
        price.className = 'ebook-price';
        price.textContent = Number.isFinite(amount) ? '$' + amount.toFixed(2) : 'Consultar';
        bottom.appendChild(price);
        const purchaseUrl = safeExternalUrl(book.enlace_compra || '');
        if (purchaseUrl) {
          const link = document.createElement('a');
          link.className = 'ebook-btn';
          link.href = purchaseUrl;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.textContent = 'Ver publicación ↗';
          link.dataset.track = 'ebook_click';
          bottom.appendChild(link);
        }
        body.append(title, description, bottom);
        card.appendChild(body);
        fragment.appendChild(card);
      });
      grid.replaceChildren(fragment);
    } catch (error) {
      console.error('No se pudo cargar el catálogo de VitroCorp:', error);
      fallback('No pudimos cargar las publicaciones en este momento. Puedes consultarlas por WhatsApp.');
    }
  }
  function makePlaceholder(name) {
    const el = document.createElement('div');
    el.className = 'ebook-placeholder';
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', 'Portada de ' + (name || 'publicación'));
    const brand = document.createElement('small');
    brand.textContent = 'VITROCORP EC';
    const title = document.createElement('strong');
    title.textContent = name || 'Publicación digital';
    const type = document.createElement('small');
    type.textContent = 'BIOTECNOLOGÍA APLICADA';
    el.append(brand, title, type);
    return el;
  }
  loadCatalog();
})();