import axios from 'axios';
import { getDeviceCode } from './device';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// 自动注入设备码请求头
api.interceptors.request.use(config => {
  config.headers['X-Device-Code'] = getDeviceCode();
  return config;
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
