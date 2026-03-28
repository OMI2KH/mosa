import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';

export default function Lessons() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);

  useEffect(() => {
    api.get('/lessons').then(res => setLessons(res.data));
  }, []);

  return (
    <div className="min-h-screen p-6 bg-primary/10">
      <h1 className="text-3xl font-bold mb-6 text-secondary">{t('lessons')}</h1>
      {lessons.map((lesson: any) => (
        <div
          key={lesson.id}
          className="p-4 bg-white/80 rounded-lg mb-2 shadow cursor-pointer"
          onClick={() => navigate('/download', { state: { content: lesson.content, title: lesson.title } })}
        >
          <p className="font-bold text-primary">{lesson.title}</p>
          <p className="text-sm text-gray-600">{lesson.type} {lesson.isGroup ? '(Group Ritual)' : '(Personal Spark)'}</p>
        </div>
      ))}
    </div>
  );
}