import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [religion, setReligion] = useState('Islam');
  const { setUser } = useStore();

  const handleRegister = async () => {
    if (!email || !password || !name) {
      alert('Please fill required fields');
      return;
    }
    try {
      const res = await api.post('/auth/register', { email, password, name, referralCode, religion });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      navigate('/survey');
    } catch (err: any) {
      alert(err.response?.data?.error || t('register_failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/10 p-6">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-3xl font-bold text-center text-primary">{t('register')}</h2>
        <input
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          placeholder={t('name')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
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
        <input
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          placeholder={t('referral_code')}
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
        />
        <label className="text-lg text-primary">{t('survey_religion')}</label>
        <select
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          value={religion}
          onChange={(e) => setReligion(e.target.value)}
        >
          <option value="Islam">Islam</option>
          <option value="Orthodox">Orthodox</option>
          <option value="Other">Other</option>
        </select>
        <button
          className="w-full bg-primary text-white p-4 rounded-lg shadow hover:bg-primary/80"
          onClick={handleRegister}
        >
          {t('register')}
        </button>
        <button
          className="w-full bg-secondary text-white p-4 rounded-lg shadow hover:bg-secondary/80 mt-4"
          onClick={() => navigate('/login')}
        >
          {t('back_to_login')}
        </button>
      </div>
    </div>
  );
}