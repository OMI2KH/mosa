import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../utils/api';
import { useStore } from '../store/useStore';

export default function Survey() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setUser } = useStore();
  const [skills, setSkills] = useState('');
  const [passions, setPassions] = useState('');
  const [risk, setRisk] = useState('low');

  const submitSurvey = async () => {
    if (!skills || !passions) {
      alert('Please fill skills and passions');
      return;
    }
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const surveyData = { skills, passions, risk };
      const res = await api.post('/auth/register', {
        surveyData,
        location: { lat: position.coords.latitude, lng: position.coords.longitude }
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...user, archetype: res.data.archetype, surveyData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      alert(`${t('success')}: Archetype forged: ${res.data.archetype}. Tribe awaits!`);
      navigate('/home');
    } catch (err: any) {
      alert(err.response?.data?.error || t('survey_failed'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary/10 p-6">
      <div className="max-w-md w-full space-y-8">
        <h2 className="text-3xl font-bold text-center text-secondary">{t('survey_title')}</h2>
        <textarea
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          placeholder={t('skills')}
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        <textarea
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          placeholder={t('passions')}
          value={passions}
          onChange={(e) => setPassions(e.target.value)}
        />
        <label className="text-lg text-primary">{t('risk_tolerance')}</label>
        <select
          className="w-full p-4 border border-gray-300 rounded-lg bg-white shadow-sm mb-4"
          value={risk}
          onChange={(e) => setRisk(e.target.value)}
        >
          <option value="low">Low Risk (Preserver Ember)</option>
          <option value="medium">Medium Risk (Multiplier Flame)</option>
          <option value="high">High Risk (Creator Spark)</option>
        </select>
        <button
          className="w-full bg-secondary text-white p-4 rounded-lg shadow hover:bg-secondary/80"
          onClick={submitSurvey}
        >
          {t('submit_survey')}
        </button>
      </div>
    </div>
  );
}