import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const api = axios.create({ baseURL: 'http://localhost:8081/api' });

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [q, setQ] = useState(null);
  const [selected, setSelected] = useState(null);
  const [result, setResult] = useState(null);
  const [startTime, setStartTime] = useState(null);

  const login = async () => {
    if (!username.trim()) return;
    const res = await api.post('/login', { username });
    setUser(res.data);
  };

  const getQ = useCallback(async () => {
    const res = await api.get(`/question/${user._id}`);
    if (res.data.message === 'GameOver') {
      setUser(prev => ({ ...prev, strikeCount: 3 }));
    } else {
      setQ(res.data);
      setResult(null);
      setSelected(null);
      setStartTime(Date.now());
    }
  }, [user]);

  const submit = async () => {
    const time = (Date.now() - startTime) / 1000;
    const res = await api.post('/answer', { userId: user._id, questionId: q._id, selectedOption: selected, responseTime: time });
    setResult(res.data);
    setUser(prev => ({ ...prev, currentAbility: res.data.newAbility, strikeCount: res.data.strikes }));
  };

  const quit = () => { setUser(null); setQ(null); setUsername(''); };

  // GLOBAL ENTER KEY LISTENER
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (!user) login();
        else if (user.strikeCount >= 3) api.post('/reset', { userId: user._id }).then(r => { setUser(r.data); setQ(null); });
        else if (result) getQ();
        else if (q && selected !== null) submit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, username, q, selected, result, getQ]);

  useEffect(() => { if (user && user.strikeCount < 3 && !q) getQ(); }, [user, q, getQ]);

  if (!user) return (
    <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: '#f0f4f8' }}>
      <div style={{ background: 'white', padding: '50px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h1 style={{ color: '#2d3748' }}>AI CS Assessment</h1>
        <input autoFocus value={username} onChange={e => setUsername(e.target.value)} placeholder="Type Name & Press Enter" style={{ padding: '15px', width: '280px', borderRadius: '10px', border: '2px solid #cbd5e0', fontSize: '16px' }} />
        <br/><br/>
        <button onClick={login} style={{ padding: '12px 40px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Begin Training</button>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '30px', background: 'white', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #edf2f7', paddingBottom: '15px', marginBottom: '25px' }}>
         <span>Student: <strong>{user.username}</strong></span>
         <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>Strikes: {'❌'.repeat(user.strikeCount)}</span>
            <button onClick={quit} style={{ background: '#feb2b2', color: '#9b2c2c', border: 'none', padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Quit</button>
         </div>
      </div>

      {user.strikeCount >= 3 ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h1 style={{ color: '#e53e3e' }}>Final Ability: {user.currentAbility}</h1>
          <p>Training complete. Press <strong>Enter</strong> to restart.</p>
          <button onClick={() => api.post('/reset', { userId: user._id }).then(r => { setUser(r.data); setQ(null); })} style={{ padding: '15px 40px', background: '#3182ce', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer' }}>Restart Session</button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {q && (
            <motion.div key={q._id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              
              {/* THE HIGHLIGHT YOU WANTED */}
              <div style={{ marginBottom: '15px' }}>
                {q.isVisited ? (
                  <span style={{ background: '#fef3c7', color: '#92400e', padding: '6px 15px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #fde68a' }}>🔄 VISITED PREVIOUSLY</span>
                ) : (
                  <span style={{ background: '#d1fae5', color: '#065f46', padding: '6px 15px', borderRadius: '20px', fontSize: '13px', fontWeight: 'bold', border: '1px solid #a7f3d0' }}>✨ NEW QUESTION</span>
                )}
              </div>

              <h2 style={{ color: '#1a202c', lineHeight: '1.4' }}>{q.content}</h2>
              
              {q.options.map((opt, i) => (
                <div key={i} onClick={() => !result && setSelected(i)} style={{
                  padding: '18px', margin: '12px 0', border: '2px solid', borderRadius: '12px', cursor: 'pointer', transition: '0.2s',
                  backgroundColor: result ? (i === q.correctOption ? '#f0fff4' : i === selected ? '#fff5f5' : 'white') : (i === selected ? '#ebf8ff' : 'white'),
                  borderColor: result ? (i === q.correctOption ? '#48bb78' : i === selected ? '#f56565' : '#edf2f7') : (i === selected ? '#4299e1' : '#edf2f7')
                }}>
                  <span style={{ fontWeight: 'bold', marginRight: '10px' }}>{String.fromCharCode(65 + i)}.</span> {opt}
                  {result && i === q.correctOption && <span style={{ float: 'right' }}>✅</span>}
                  {result && i === selected && i !== q.correctOption && <span style={{ float: 'right' }}>❌</span>}
                </div>
              ))}

              {!result ? (
                <button onClick={submit} disabled={selected === null} style={{ width: '100%', padding: '20px', marginTop: '20px', background: '#2d3748', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>Submit (Enter)</button>
              ) : (
                <button onClick={getQ} style={{ width: '100%', padding: '20px', marginTop: '20px', background: '#48bb78', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>Next Question (Enter)</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}