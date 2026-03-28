import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Download() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const { content, title } = state as { content: string; title: string };

  return (
    <div className="min-h-screen p-6 bg-secondary/10">
      <h1 className="text-3xl font-bold mb-6 text-primary">{title || t('download')}</h1>
      <div className="flex-1 bg-white/80 p-4 rounded-lg shadow">
        <p className="text-base leading-6 mb-4 text-gray-800">{content}</p>
      </div>
      <button
        className="w-full bg-secondary text-white p-4 rounded-lg shadow hover:bg-secondary/80"
        onClick={() => alert('Downloaded: Content saved to your forge journal!')}
      >
        {t('download')}
      </button>
    </div>
  );
}