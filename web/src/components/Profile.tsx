import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function Profile() {
  const { t } = useTranslation();
  const { user } = useStore();
  const [subscription, setSubscription] = useState(null);
  const [prayers, setPrayers] = useState([]);

  useEffect(() => {
    api.get('/subscriptions').then(res => setSubscription(res.data));
    api.get('/prayers').then(res => setPrayers(res.data));
  }, []);

  const subscribe = async () => {
    try {
      const res = await api.post('/subscriptions/create', { paymentMethod: 'telebirr', plan: 'basic' });
      setSubscription(res.data.subscription);
      alert(`${t('success')}: ${t('subscribe_49_etb')} – Forge unlocked.`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Subscription failed');
    }
  };

  const schedulePrayers = async () => {
    try {
      await api.post('/prayers/schedule');
      const res = await api.get('/prayers');
      setPrayers(res.data);
      alert(`${t('success')}: ${t('prayer_scheduled')}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Prayer scheduling failed');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-primary/10">
      <h1 className="text-3xl font-bold mb-6 text-secondary">{t('profile')}</h1>
      <div className="space-y-4">
        <p className="text-lg text-primary">Email: {user?.email}</p>
        <p className="text-lg text-primary">Archetype: {user?.archetype || 'Awaiting Forge'}</p>
        <p className="text-lg text-primary">Credits: {user?.credits} ETB</p>
        <p className="text-lg text-primary">
          Subscription: {subscription ? `${subscription.plan} (${subscription.status})` : 'Free – Upgrade to Forge Full'}
        </p>
        <button
          className="w-full bg-primary text-white p-4 rounded-lg shadow hover:bg-primary/80"
          onClick={subscribe}
        >
          {t('subscribe_49_etb')}
        </button>
        <button
          className="w-full bg-secondary text-white p-4 rounded-lg shadow hover:bg-secondary/80"
          onClick={schedulePrayers}
        >
          {t('schedule_prayers')}
        </button>
        <h2 className="text-lg font-bold text-primary">Today's Prayers</h2>
        {prayers.map((prayer: any) => (
          <div key={prayer.id} className="p-4 bg-white/80 rounded-lg shadow">
            <p className="font-bold text-primary">{prayer.name || prayer.time}</p>
            <p className="text-sm text-gray-600">{prayer.reminder}</p>
          </div>
        ))}
      </div>
    </div>
  );
}