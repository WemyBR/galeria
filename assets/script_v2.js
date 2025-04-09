const API_URL = 'https://galeria-backend-production.up.railway.app';

document.addEventListener('DOMContentLoaded', () => {
  let allFiles = [];

  async function fetchGallery() {
    try {
      const res = await fetch(`${API_URL}/list`);
      allFiles = await res.json();
      renderGallery();
    } catch {
      console.error('Erro ao buscar arquivos');
    }
  }

  function renderGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    const sortValue = document.getElementById('sortSelect').value;
    const filterValue = document.getElementById('filterSelect').value;

    let files = [...allFiles];

    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    if (searchTerm) {
      files = files.filter(f => f.toLowerCase().includes(searchTerm));
    }

    files = files.filter(f => {
      const ext = f.split('.').pop().toLowerCase();
      if (filterValue === 'images') {
        return ['jpg','jpeg','png','gif','webp'].includes(ext);
      } else if (filterValue === 'videos') {
        return ['mp4','webm','ogg','mov'].includes(ext);
      }
      return true;
    });

    files.sort((a, b) => {
      if (sortValue === 'name-asc') return a.localeCompare(b);
      if (sortValue === 'name-desc') return b.localeCompare(a);
      return 0;
    });

    files.forEach(file => {
      const ext = file.split('.').pop().toLowerCase();
      const item = document.createElement('div');
      item.className = 'item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = file;
      item.appendChild(checkbox);

      let media;
      if(['jpg','jpeg','png','gif','webp'].includes(ext)){
        media = document.createElement('img');
        media.src = `${API_URL}/uploads/${file}`;
        media.onclick = () => openLightbox('img', media.src);
      } else if(['mp4','webm','ogg','mov'].includes(ext)){
        media = document.createElement('video');
        media.src = `${API_URL}/uploads/${file}`;
        media.controls = true;
        media.onclick = () => openLightbox('video', media.src);
      }
      if(media) {
        media.style.cursor = 'pointer';
        item.appendChild(media);
      }

      const info = document.createElement('div');
      info.style.fontSize = '12px';
      info.style.marginTop = '5px';
      info.title = file;
      info.innerText = file.length > 20 ? `${file.slice(0,10)}...${file.slice(-7)}` : file;
      item.appendChild(info);

      gallery.appendChild(item);
    });
  }

  function openLightbox(type, src) {
    const content = document.getElementById('lightboxContent');
    content.innerHTML = '';
    if(type === 'img'){
      const img = document.createElement('img');
      img.src = src;
      content.appendChild(img);
    } else if(type === 'video'){
      const video = document.createElement('video');
      video.src = src;
      video.controls = true;
      video.autoplay = true;
      content.appendChild(video);
    }
    document.getElementById('lightbox').style.display = 'flex';
  }

  document.getElementById('lightboxClose').onclick = () => {
    document.getElementById('lightbox').style.display = 'none';
  };

  document.getElementById('sortSelect').onchange =
  document.getElementById('filterSelect').onchange =
  document.getElementById('searchInput').oninput = renderGallery;

  document.getElementById('fileInput').addEventListener('change', () => {
    const formData = new FormData(document.getElementById('uploadForm'));
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/upload`);

    xhr.upload.onprogress = e => {
      if(e.lengthComputable){
        const percent = (e.loaded / e.total) * 100;
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('progressBar').style.width = percent + '%';
      }
    };

    xhr.onload = () => {
      document.getElementById('progressContainer').style.display = 'none';
      document.getElementById('progressBar').style.width = '0%';
      fetchGallery();
      fetchStats();
    };

    xhr.onerror = () => alert('Erro no upload');

    xhr.send(formData);
  });

  document.getElementById('downloadSelected').onclick = () => {
    const selected = Array.from(document.querySelectorAll('.gallery input[type="checkbox"]:checked')).map(cb => cb.value);
    if(selected.length === 0) return alert('Selecione pelo menos um arquivo');
    selected.forEach(file => {
      const a = document.createElement('a');
      a.href = `${API_URL}/uploads/${file}`;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  };

  document.getElementById('deleteSelected').onclick = async () => {
    const selected = Array.from(document.querySelectorAll('.gallery input[type="checkbox"]:checked')).map(cb => cb.value);
    if(selected.length === 0) return alert('Selecione pelo menos um arquivo');
    if(!confirm('Tem certeza que deseja excluir os arquivos selecionados?')) return;
    try {
      const res = await fetch(`${API_URL}/delete`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ files: selected })
      });
      if(res.ok){
        fetchGallery();
      } else {
        alert('Erro ao excluir');
      }
    } catch {
      alert('Erro na requisição');
    }
  };

  const toggleThemeBtn = document.getElementById('toggleTheme');
  const body = document.body;

  if(localStorage.getItem('theme') === 'dark'){
    body.classList.add('dark-theme');
    toggleThemeBtn.innerText = '☀️';
  } else {
    toggleThemeBtn.innerText = '🌙';
  }

  toggleThemeBtn.onclick = () => {
    body.classList.toggle('dark-theme');
    if(body.classList.contains('dark-theme')){
      localStorage.setItem('theme', 'dark');
      toggleThemeBtn.innerText = '☀️';
    } else {
      localStorage.setItem('theme', 'light');
      toggleThemeBtn.innerText = '🌙';
    }
  };

  async function fetchStats(){
    try {
      const res = await fetch(`${API_URL}/stats`);
      const stats = await res.json();
      document.getElementById('stats').innerText =
        `Total: ${stats.total} arquivos | Fotos: ${stats.photos} | Vídeos: ${stats.videos} | Espaço: ${stats.sizeMB} MB`;
    } catch {
      document.getElementById('stats').innerText = 'Erro ao carregar estatísticas';
    }
  }

  fetchGallery();
  fetchStats();

  // Drag and drop upload
  const dropOverlay = document.getElementById('dropOverlay');
  const uploadForm = document.getElementById('uploadForm');
  const fileInput = document.getElementById('fileInput');

  window.addEventListener('dragover', e => {
    e.preventDefault();
    dropOverlay.style.display = 'flex';
  });

  window.addEventListener('dragleave', e => {
    if(e.target === dropOverlay){
      dropOverlay.style.display = 'none';
    }
  });

  window.addEventListener('drop', e => {
    e.preventDefault();
    dropOverlay.style.display = 'none';
    const files = e.dataTransfer.files;
    if(files.length > 0){
      const dt = new DataTransfer();
      for(const file of files){
        dt.items.add(file);
      }
      fileInput.files = dt.files;
      const formData = new FormData(uploadForm);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/upload`);
      xhr.onload = () => {
        fetchGallery();
        fetchStats();
      };
      xhr.send(formData);
    }
  });
});
