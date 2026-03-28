import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { setUser } = useStore();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please fill all fields');
      return;
    }
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate('/home');
    } catch (err: any) {
      alert(err.response?.data?.error || t('login_failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/10 p-6">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-3xl font-bold text-center text-primary">{t('welcome')}</h2>
        <input
          type="email"
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          placeholder={t('email')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          placeholder={t('password')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-primary text-white p-4 rounded-lg shadow hover:bg-primary/80"
          onClick={handleLogin}
        >
          {t('login')}
        </button>
        <button
          className="w-full bg-secondary text-white p-4 rounded-lg shadow hover:bg-secondary/80 mt-4"
          onClick={() => navigate('/register')}
        >
          {t('register')}
        </button>
      </div>
    </div>
  );
}