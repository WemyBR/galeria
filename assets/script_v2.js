const API_URL = 'https://galeria-backend-production.up.railway.app';
// const socket = io(API_URL);

document.addEventListener('DOMContentLoaded', () => {
  let allFiles = [];

  async function fetchGallery() {
    const res = await fetch(`${API_URL}/list`);
    allFiles = await res.json();
    renderGallery();
  }

  function renderGallery() {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    const sortValue = document.getElementById('sortSelect').value;
    const filterValue = document.getElementById('filterSelect').value;

    let files = [...allFiles];

    // Filtro por texto
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    if(searchTerm){
      files = files.filter(file => file.name.toLowerCase().includes(searchTerm));
    }

    // Filtro por tipo
    files = files.filter(file => {
      const ext = file.split('.').pop().toLowerCase();
      if(filterValue === 'images') {
        return ['jpg','jpeg','png','gif','webp'].includes(ext);
      } else if(filterValue === 'videos') {
        return ['mp4','webm','ogg','mov'].includes(ext);
      }
      return true;
    });

    // Ordenação
    files.sort((a, b) => {
      if(sortValue === 'name-asc') {
        return a.localeCompare(b);
      } else if(sortValue === 'name-desc') {
        return b.localeCompare(a);
      }
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

      let mediaElement;
      if(['jpg','jpeg','png','gif','webp'].includes(ext)){
        mediaElement = document.createElement('img');
        mediaElement.src = `${API_URL}/uploads/${file}`;
        mediaElement.style.cursor = 'pointer';
        mediaElement.onclick = () => openLightbox('img', mediaElement.src);
      } else if(['mp4','webm','ogg','mov'].includes(ext)){
        mediaElement = document.createElement('video');
        mediaElement.controls = true;
        mediaElement.src = `${API_URL}/uploads/${file}`;
        mediaElement.style.cursor = 'pointer';
        mediaElement.onclick = () => openLightbox('video', mediaElement.src);
      }
      if(mediaElement) item.appendChild(mediaElement);

      const info = document.createElement('div');
      info.style.fontSize = '12px';
      info.style.marginTop = '5px';
      info.title = file;
      if(file.length > 20){
        const start = file.substring(0, 10);
        const end = file.substring(file.length - 7);
        info.innerText = `${start}...${end}`;
      } else {
        info.innerText = file;
      }
      item.appendChild(info);

      gallery.appendChild(item);
    });
  }

  document.getElementById('sortSelect').addEventListener('change', renderGallery);
  document.getElementById('filterSelect').addEventListener('change', renderGallery);
  document.getElementById('searchInput').addEventListener('input', renderGallery);

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

  const lightbox = document.getElementById('lightbox');
  const lightboxClose = document.getElementById('lightboxClose');

  lightboxClose.onclick = () => {
    lightbox.style.display = 'none';
  };

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      lightbox.style.display = 'none';
    }
  });

  document.getElementById('fileInput').addEventListener('change', async (e) => {
    const formData = new FormData(document.getElementById('uploadForm'));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/upload`);

    const startTime = Date.now();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = (event.loaded / event.total) * 100;
        document.getElementById('progressContainer').style.display = 'block';
        document.getElementById('progressBar').style.width = percent + '%';

        const currentTime = Date.now();
        const timeElapsed = (currentTime - startTime) / 1000;
        const bytesUploaded = event.loaded;
        const speed = bytesUploaded / timeElapsed;
        const remainingBytes = event.total - bytesUploaded;
        const estimatedTime = speed > 0 ? remainingBytes / speed : 0;

        const speedKBs = (speed / 1024).toFixed(1);
        const estSeconds = estimatedTime.toFixed(1);

        document.getElementById('progressDetails').innerText =
          `${percent.toFixed(1)}% - ${speedKBs} KB/s - ${estSeconds}s restantes`;
      }
    };

    xhr.onload = () => {
      document.getElementById('progressContainer').style.display = 'none';
      document.getElementById('progressBar').style.width = '0%';
      document.getElementById('progressDetails').innerText = '';
      document.getElementById('message').innerText = 'Upload concluído!';
      e.target.value = '';
      fetchGallery();
      fetchStats();
    };

    xhr.onerror = () => {
      document.getElementById('message').innerText = 'Erro no upload.';
    };

    xhr.send(formData);
  });

  document.getElementById('downloadSelected').addEventListener('click', () => {
    const selected = Array.from(document.querySelectorAll('.gallery input[type="checkbox"]:checked'))
      .map(cb => cb.value);
    if(selected.length === 0){
      alert('Selecione pelo menos um arquivo para baixar.');
      return;
    }
    selected.forEach(file => {
      const link = document.createElement('a');
      link.href = `${API_URL}/uploads/${file}`;
      link.download = file;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  });

  document.getElementById('deleteSelected').addEventListener('click', async () => {
    const selected = Array.from(document.querySelectorAll('.gallery input[type="checkbox"]:checked`))
      .map(cb => cb.value);
    if(selected.length === 0){
      alert('Selecione pelo menos um arquivo para excluir.');
      return;
    }
    if(!confirm('Tem certeza que deseja excluir os arquivos selecionados?')) return;

    try {
      const response = await fetch(`${API_URL}/delete`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ files: selected })
      });
      if (!response.ok) {
        const text = await response.text();
        console.error('Erro ao excluir:', text);
        alert('Erro ao excluir arquivos: ' + text);
      } else {
        fetchGallery();
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      alert('Erro na requisição: ' + error.message);
    }
  });

  // Tema escuro/claro
  const toggleThemeBtn = document.getElementById('toggleTheme');
  const body = document.body;

  if(localStorage.getItem('theme') === 'dark'){
    body.classList.add('dark-theme');
    toggleThemeBtn.innerText = '☀️';
  } else {
    toggleThemeBtn.innerText = '🌙';
  }

  toggleThemeBtn.addEventListener('click', () => {
    body.classList.toggle('dark-theme');
    if(body.classList.contains('dark-theme')){
      localStorage.setItem('theme', 'dark');
      toggleThemeBtn.innerText = '☀️';
    } else {
      localStorage.setItem('theme', 'light');
      toggleThemeBtn.innerText = '🌙';
    }
  });

  fetchGallery();

  // Atualização em tempo real
  // socket.on('update', () => {
  //   fetchGallery();
  //   fetchStats();
  // });

  // Drag and drop upload
  const dropOverlay = document.getElementById('dropOverlay');
  const uploadForm = document.getElementById('uploadForm');
  const fileInput = document.getElementById('fileInput');

  window.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropOverlay.style.display = 'flex';
  });

  window.addEventListener('dragleave', (e) => {
    if (e.target === dropOverlay) {
      dropOverlay.style.display = 'none';
    }
  });

  window.addEventListener('drop', (e) => {
    e.preventDefault();
    dropOverlay.style.display = 'none';

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const dataTransfer = new DataTransfer();
      for (const file of files) {
        dataTransfer.items.add(file);
      }
      fileInput.files = dataTransfer.files;

      const formData = new FormData(uploadForm);
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/upload`);
      xhr.onload = () => {
        fetchGallery();
      };
      xhr.send(formData);
    }
  });
});
