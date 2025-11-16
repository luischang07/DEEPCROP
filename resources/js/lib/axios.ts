import axios from 'axios';

// Configurar Axios para enviar cookies en cada request
axios.defaults.withCredentials = true;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

export default axios;
