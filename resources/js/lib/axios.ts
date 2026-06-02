import axios from 'axios';

// Configurar Axios para enviar cookies en cada request
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// Obtener el token CSRF del meta tag
const token = document.head.querySelector<HTMLMetaElement>('meta[name="csrf-token"]');
if (token) {
    axios.defaults.headers.common['X-CSRF-TOKEN'] = token.content;
}

export default axios;
