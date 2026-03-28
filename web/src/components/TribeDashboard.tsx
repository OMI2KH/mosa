import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function TribeDashboard() {
  const { t } = useTranslation();
  const { tribe, setLevel } = useStore();
  const [todos, setTodos] = useState([]);
  const [businessName, setBusinessName] = useState('');
  const [proof, setProof] = useState('');

  useEffect(() => {
    api.get('/todos').then(res => setTodos(res.data.filter((td: any) => td.type === 'group')));
  }, []);

  const upgrade = async () => {
    if (!businessName || !proof) {
      alert('Business name and proof required');
      return;
    }
    try {
      const res = await api.post(`/tribes/${tribe.id}/upgrade`, { businessName, proof });
      setLevel(res.data.tribe.level);
      alert(`${t('level_up')} ${res.data.tribe.level}. ${t('tiktok_spotlight')}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Upgrade failed');
    }
  };

  return (
    <div className="min-h-screen p-6 bg-primary/10">
      <h1 className="text-3xl font-bold mb-4 text-secondary">Aura: {tribe?.name}</h1>
      <p className="text-lg mb-4 text-primary">Level: {tribe?.level}</p>
      <input
        className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
        placeholder={t('business_name')}
        value={businessName}
        onChange={(e) => setBusinessName(e.target.value)}
      />
      <textarea
        className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
        placeholder={t('proof')}
        value={proof}
        onChange={(e) => setProof(e.target.value)}
      />
      <button
        className="w-full bg-secondary text-white p-4 rounded-lg shadow hover:bg-secondary/80 mb-4"
        onClick={upgrade}
      >
        {t('upgrade_level')}
      </button>
      <h2 className="text-lg font-bold mb-2 text-primary">Group To-Dos</h2>
      {todos.map((todo: any) => (
        <div key={todo.id} className="p-3 bg-white/80 rounded-lg mb-2 shadow">
          <p className="font-bold text-primary">{todo.title}</p>
          <p className="text-sm text-gray-600">{todo.description}</p>
          <p className="text-xs text-accent">Due: {new Date(todo.dueDate).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}