import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import Cookies from 'js-cookie';


// JWT 타입 정의
interface JwtPayload {
  exp: number;
  token_type: string;
  user_id: number;
}

// 쿠키 저장소 인터페이스
interface TokenStorage {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  setAccessToken: (token: string, expiry: number) => void;
  setRefreshToken: (token: string, expiry: number) => void;
}

// 쿠키 저장소
export const tokenStorage: TokenStorage = {
  getAccessToken: () => Cookies.get('accessToken') || null,
  getRefreshToken: () => Cookies.get('refreshToken') || null,
  setAccessToken: (token: string, expiry: number) => {
    Cookies.set('accessToken', token, { expires: new Date(expiry * 1000) });
  },
  setRefreshToken: (token: string, expiry: number) => {
    Cookies.set('refreshToken', token, { expires: new Date(expiry * 1000) });
  },
};

const instance = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
const REFRESH_URL = `${instance.defaults.baseURL}/users/token/refresh/`;


// 로그인 함수
// 로그인 시 브라우저 쿠키에 토큰이 저장된다
export async function login(username: string, password: string): Promise<void> {
  try {
    const response = await instance.post(`/user/login/`, {
      username,
      password
    });

    const { accessToken, refreshToken } = response.data;

    // 토큰 디코딩하여 만료 시간 확인
    const decodedAccessToken: JwtPayload = jwtDecode(accessToken);
    const decodedRefreshToken: JwtPayload = jwtDecode(refreshToken);

    // 토큰 저장
    tokenStorage.setAccessToken(accessToken, decodedAccessToken.exp);
    tokenStorage.setRefreshToken(refreshToken, decodedRefreshToken.exp);

  } catch (error) {
    console.error('Login failed', error);
    throw error;
  }
}

export const getUserId = () => {
  const accessToken = tokenStorage.getAccessToken();
  if (accessToken) {
    const decodedAccessToken: JwtPayload = jwtDecode(accessToken);
    const userID = decodedAccessToken.user_id
    return userID
  }
}

// 토큰 만료 시간 확인 및 갱신 함수
async function refreshTokenIfNeeded(): Promise<void> {
  const accessToken = tokenStorage.getAccessToken();
  const refreshToken = tokenStorage.getRefreshToken();

  if (accessToken && refreshToken) {
    const decodedAccessToken: JwtPayload = jwtDecode(accessToken);
    const currentTime = Math.floor(Date.now() / 1000);

    // 액세스 토큰 만료 시간이 다가오면 갱신
    if (currentTime > decodedAccessToken.exp - 60) { // 만료 1분 전
      try {
        const response = await axios.post(REFRESH_URL, {
          refreshToken: refreshToken
        });

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

        // 새 토큰 디코딩하여 만료 시간 확인
        const decodedNewAccessToken: JwtPayload = jwtDecode(newAccessToken);
        const decodedNewRefreshToken: JwtPayload = jwtDecode(newRefreshToken);

        // 새 토큰 저장
        tokenStorage.setAccessToken(newAccessToken, decodedNewAccessToken.exp);
        tokenStorage.setRefreshToken(newRefreshToken, decodedNewRefreshToken.exp);

      } catch (error) {
        console.error('Failed to refresh token', error);
        // 로그아웃 처리 등 추가 작업 필요
      }
    }
  }
}

// Axios 인터셉터 설정
// 요청을 보내기 전에 호출되며, 요청을 수정하거나 보내기 전에 추가적인 작업을 수행할 수 있다.
instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  await refreshTokenIfNeeded();
  const token = tokenStorage.getAccessToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error: AxiosError) => {
  return Promise.reject(error);
});

// 서버로부터 응답을 받은 후 호출되며, 응답을 수정하거나 에러 처리 등의 추가 작업을 수행할 수 있다.
instance.interceptors.response.use((response: AxiosResponse) => {
  return response;
}, async (error: AxiosError) => {
  const originalRequest = error.config as InternalAxiosRequestConfig & {
    _retry: boolean
  }

  if (originalRequest && error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    const refreshToken = tokenStorage.getRefreshToken();

    if (refreshToken) {
      try {
        const response = await axios.post(REFRESH_URL, {
          refreshToken: refreshToken
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data;

        // 새 토큰 디코딩하여 만료 시간 확인
        const decodedAccessToken: JwtPayload = jwtDecode(accessToken);
        const decodedRefreshToken: JwtPayload = jwtDecode(newRefreshToken);

        // 새 토큰 저장
        tokenStorage.setAccessToken(accessToken, decodedAccessToken.exp);
        tokenStorage.setRefreshToken(newRefreshToken, decodedRefreshToken.exp);

        // 원래 요청을 다시 시도
        originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
        return instance(originalRequest);
      } catch (err) {
        console.error('Failed to refresh token', err);
        // 로그아웃 처리 등 추가 작업 필요
      }
    }
  }
  return Promise.reject(error);
});



export default instance;