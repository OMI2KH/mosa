import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, tribe, level, setTribe, setLevel } = useStore();

  useEffect(() => {
    const fetchTribe = async () => {
      try {
        const res = await api.get('/tribes');
        if (res.data.length > 0) {
          setTribe(res.data[0]);
          setLevel(res.data[0].level);
          alert(`${t('aura_christened')} ${res.data[0].name}`);
        }
      } catch (error) {
        console.error('Tribe fetch error:', error);
      }
    };
    fetchTribe();
  }, []);

  return (
    <div className="min-h-screen p-6 bg-secondary/10">
      <h1 className="text-3xl font-bold mb-6 text-primary">{t('welcome')}, {user?.name}!</h1>
      <p className="text-lg mb-4 text-secondary">{t('aura_christened')} {tribe?.name || 'Awaiting Aura'} | Level: {level}</p>
      <button
        className="w-full bg-primary text-white p-4 rounded-lg shadow hover:bg-primary/80 mb-4"
        onClick={() => navigate('/tribe')}
      >
        {t('tribe_dashboard')}
      </button>
      <button
        className="w-full bg-primary text-white p-4 rounded-lg shadow hover:bg-primary/80 mb-4"
        onClick={() => navigate('/lessons')}
      >
        {t('lessons')}
      </button>
      <button
        className="w-full bg-primary text-white p-4 rounded-lg shadow hover:bg-primary/80 mb-4"
        onClick={() => navigate('/profile')}
      >
        {t('profile')}
      </button>
    </div>
  );
}