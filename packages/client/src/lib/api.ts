import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 不自动跳转，让页面自己处理
    }
    return Promise.reject(error);
  }
);

export default api;
