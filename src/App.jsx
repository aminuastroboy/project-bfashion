import React, { useEffect, useState, useRef } from "react";

const SAMPLE_MATH = [
  { id: 1, q: "7 + 5 = ?", choices: [10, 11, 12, 13], ans: 12 },
  { id: 2, q: "9 - 4 = ?", choices: [3, 4, 5, 6], ans: 5 },
  { id: 3, q: "3 x 4 = ?", choices: [7, 11, 12, 14], ans: 12 }
];

const SAMPLE_ENGLISH = [
  { id: 1, q: "Choose the correct spelling:", prompt: "A. recieve  B. receive  C. recive", ans: "receive" },
  { id: 2, q: "Pick the noun:", prompt: "Run, happiness, quickly", ans: "happiness" },
  { id: 3, q: "Complete: The cat ___ on the mat.", prompt: "(is / are / am)", ans: "is" }
];

const SAMPLE_QUIZ = [
  { q: "Which is a mammal?", choices: ["Shark", "Frog", "Dog", "Turtle"], ans: "Dog" },
  { q: "5 + 6 = ?", choices: [10, 11, 12, 9], ans: 11 }
];

function useLocalStorageState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (e) {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  }, [key, state]);
  return [state, setState];
}

export default function App() {
  const [user, setUser] = useLocalStorageState("g3_user", { name: "", onboarded: false });
  const [route, setRoute] = useLocalStorageState("g3_route", "dashboard");
  const [progress, setProgress] = useLocalStorageState("g3_progress", { math: 0, english: 0, quiz: 0 });
  const [settings, setSettings] = useLocalStorageState("g3_settings", { voice: true, sounds: true, voiceRate: 1, voicePitch: 1 });

  const audioCtxRef = useRef(null);

  useEffect(() => {
    document.title = user.name ? `${user.name} • SmartyStars` : `SmartyStars`;
    if (settings.sounds && typeof window !== 'undefined' && !audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtxRef.current = null; }
    }
  }, [user, settings.sounds]);

  function handleLogin(name) {
    setUser({ name, onboarded: true });
    setRoute("dashboard");
  }

  function handleAnswer(module, correct) {
    setProgress(prev => {
      const next = { ...prev, [module]: prev[module] + (correct ? 1 : 0) };
      return next;
    });
    if (settings.sounds) playSound(correct ? 'correct' : 'wrong');
  }

  function speak(text) {
    if (!settings.voice) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = settings.voiceRate || 1;
      utter.pitch = settings.voicePitch || 1;
      const voices = synth.getVoices();
      if (voices && voices.length) {
        const candidate = voices.find(v => /en/i.test(v.lang)) || voices[0];
        if (candidate) utter.voice = candidate;
      }
      synth.speak(utter);
    } catch (e) {
      console.warn('TTS failed', e);
    }
  }

  function playSound(type = 'click') {
    const ctx = audioCtxRef.current || (audioCtxRef.current = (typeof window !== 'undefined' ? new (window.AudioContext || window.webkitAudioContext)() : null));
    if (!ctx) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    if (type === 'correct') {
      o.frequency.setValueAtTime(880, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.12);
    } else if (type === 'wrong') {
      o.frequency.setValueAtTime(220, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.18);
    } else {
      o.frequency.setValueAtTime(1000, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now);
      o.stop(now + 0.06);
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-indigo-100 to-pink-50 font-sans">
      <header className="max-w-3xl mx-auto mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold">SmartyStars</h1>
          <div className="text-sm text-gray-700">{user.name ? `Hello, ${user.name} 👋` : "Welcome!"}</div>
        </div>
        <p className="mt-1 text-gray-600">Fun, safe, and kid-friendly learning for Grade 3 — installable PWA with voice & sounds.</p>
      </header>

      <main className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-4">
        {!user.onboarded ? (
          <Onboard onLogin={handleLogin} settings={settings} setSettings={setSettings} />
        ) : (
          <div>
            <Nav current={route} onChange={setRoute} progress={progress} onLogout={() => setUser({ name: "", onboarded: false })} />

            <section className="mt-4">
              {route === "dashboard" && <Dashboard progress={progress} onNavigate={setRoute} user={user} speak={speak} />}
              {route === "math" && <ModuleMath onAnswer={(c) => handleAnswer("math", c)} speak={speak} playSound={playSound} />}
              {route === "english" && <ModuleEnglish onAnswer={(c) => handleAnswer("english", c)} speak={speak} playSound={playSound} />}
              {route === "quiz" && <QuizModule onAnswer={(c) => handleAnswer("quiz", c)} speak={speak} playSound={playSound} />}
              {route === "profile" && <Profile user={user} progress={progress} settings={settings} setSettings={setSettings} />}
            </section>
          </div>
        )}
      </main>

      <footer className="max-w-3xl mx-auto mt-4 text-center text-xs text-gray-400">Made with ❤️ for curious kids</footer>
    </div>
  );
}

function Onboard({ onLogin, settings, setSettings }) {
  const [name, setName] = useState("");

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold">Quick setup</h2>
      <p className="text-sm text-gray-600 mt-1">Enter your niece's name to save progress and personalize the app.</p>
      <div className="mt-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Her name" className="flex-1 p-2 rounded border" />
        <button disabled={!name.trim()} onClick={() => onLogin(name.trim())} className="px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60">Start</button>
      </div>

      <div className="mt-4 p-3 rounded border bg-gray-50">
        <h3 className="font-semibold">Accessibility</h3>
        <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={settings.voice} onChange={(e) => setSettings(s => ({...s, voice: e.target.checked}))} /> Enable voice (reads questions aloud)</label>
        <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={settings.sounds} onChange={(e) => setSettings(s => ({...s, sounds: e.target.checked}))} /> Enable sound effects</label>
      </div>
    </div>
  );
}

function Nav({ current, onChange, progress, onLogout }) {
  return (
    <nav className="flex items-center gap-3">
      <button className={`px-3 py-2 rounded ${current === 'dashboard' ? 'bg-indigo-100' : ''}`} onClick={() => onChange('dashboard')}>Dashboard</button>
      <button className={`px-3 py-2 rounded ${current === 'math' ? 'bg-indigo-100' : ''}`} onClick={() => onChange('math')}>Math</button>
      <button className={`px-3 py-2 rounded ${current === 'english' ? 'bg-indigo-100' : ''}`} onClick={() => onChange('english')}>English</button>
      <button className={`px-3 py-2 rounded ${current === 'quiz' ? 'bg-indigo-100' : ''}`} onClick={() => onChange('quiz')}>Quiz</button>
      <div className="ml-auto flex items-center gap-2">
        <div className="text-xs text-gray-600">Stars: {progress.math + progress.english + progress.quiz}</div>
        <button onClick={() => onChange('profile')} className="px-2 py-1 rounded border">Profile</button>
        <button onClick={onLogout} className="px-2 py-1 rounded border">Logout</button>
      </div>
    </nav>
  );
}

function Dashboard({ progress, onNavigate, user, speak }) {
  useEffect(() => { if (speak) speak(`Welcome ${user.name}. Choose a module to begin.`); }, []);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card title="Math Adventure" subtitle={`${progress.math} stars`} onClick={() => onNavigate('math')} />
      <Card title="English & Spelling" subtitle={`${progress.english} stars`} onClick={() => onNavigate('english')} />
      <Card title="Quick Quiz" subtitle={`${progress.quiz} stars`} onClick={() => onNavigate('quiz')} />
      <div className="md:col-span-3 mt-2 p-4 rounded bg-yellow-50 border">
        <h3 className="font-bold">Tip for parents</h3>
        <p className="text-sm text-gray-700 mt-1">Encourage short daily sessions (10–20 minutes). Celebrate stars and progress — small rewards work great!</p>
      </div>
    </div>
  );
}

function Card({ title, subtitle, onClick }) {
  return (
    <div onClick={onClick} className="cursor-pointer p-4 bg-white rounded-xl shadow hover:shadow-md border">
      <h3 className="font-bold text-lg">{title}</h3>
      <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
    </div>
  );
}

function ModuleMath({ onAnswer, speak, playSound }) {
  const [index, setIndex] = useState(0);
  const [showResult, setShowResult] = useState(null);

  useEffect(() => { if (speak) speak(`Question: ${SAMPLE_MATH[index].q}`); }, [index]);

  function pickChoice(choice) {
    const correct = choice === SAMPLE_MATH[index].ans;
    setShowResult(correct ? "✔️ Correct" : "❌ Try again");
    onAnswer(correct);
    if (speak) speak(correct ? 'Correct! Well done.' : 'Not quite, try the next one.');
    if (playSound) playSound(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setShowResult(null);
      setIndex((i) => (i + 1) % SAMPLE_MATH.length);
    }, 900);
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Math Adventure</h2>
      <div className="mt-3 p-4 rounded border bg-indigo-50">
        <div className="text-lg">{SAMPLE_MATH[index].q}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {SAMPLE_MATH[index].choices.map((c) => (
            <button key={c} onClick={() => pickChoice(c)} className="p-3 rounded bg-white border">{c}</button>
          ))}
        </div>
        {showResult && <div className="mt-2 font-bold">{showResult}</div>}
      </div>
    </div>
  );
}

function ModuleEnglish({ onAnswer, speak, playSound }) {
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState("");
  const item = SAMPLE_ENGLISH[index];

  useEffect(() => { if (speak) speak(item.q + ' ' + item.prompt); }, [index]);

  function submit() {
    const correct = given.trim().toLowerCase() === item.ans.toLowerCase();
    onAnswer(correct);
    setGiven("");
    if (speak) speak(correct ? 'Great job!' : `The correct answer is ${item.ans}`);
    if (playSound) playSound(correct ? 'correct' : 'wrong');
    setTimeout(() => setIndex((i) => (i + 1) % SAMPLE_ENGLISH.length), 700);
  }

  return (
    <div>
      <h2 className="text-xl font-bold">English & Spelling</h2>
      <div className="mt-3 p-4 rounded border bg-pink-50">
        <div className="text-lg">{item.q}</div>
        <div className="mt-2 text-sm text-gray-700">{item.prompt}</div>
        <input value={given} onChange={(e) => setGiven(e.target.value)} placeholder="Type your answer" className="mt-3 w-full p-2 rounded border" />
        <div className="mt-2 flex justify-end">
          <button onClick={submit} className="px-4 py-2 rounded bg-pink-600 text-white">Submit</button>
        </div>
      </div>
    </div>
  );
}

function QuizModule({ onAnswer, speak, playSound }) {
  const [qIndex, setQIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => { if (speak) speak(`Quiz: ${SAMPLE_QUIZ[qIndex].q}`); }, [qIndex]);

  function pick(a) {
    const correct = a === SAMPLE_QUIZ[qIndex].ans;
    onAnswer(correct);
    setFeedback(correct ? "Great!" : "Not quite");
    if (speak) speak(correct ? 'Nice! You earned a star.' : 'Almost. Keep trying!');
    if (playSound) playSound(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      setQIndex((i) => (i + 1) % SAMPLE_QUIZ.length);
    }, 900);
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Quick Quiz</h2>
      <div className="mt-3 p-4 rounded border bg-green-50">
        <div className="text-lg">{SAMPLE_QUIZ[qIndex].q}</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {SAMPLE_QUIZ[qIndex].choices.map((c) => (
            <button key={c} onClick={() => pick(c)} className="p-3 rounded bg-white border">{c}</button>
          ))}
        </div>
        {feedback && <div className="mt-2 font-bold">{feedback}</div>}
      </div>
    </div>
  );
}

function Profile({ user, progress, settings, setSettings }) {
  return (
    <div>
      <h2 className="text-xl font-bold">Profile</h2>
      <div className="mt-3 p-4 rounded border bg-white">
        <p><strong>Name:</strong> {user.name}</p>
        <p className="mt-2"><strong>Stars earned:</strong> {progress.math + progress.english + progress.quiz}</p>
        <div className="mt-3">
          <h4 className="font-semibold">Settings</h4>
          <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={settings.voice} onChange={(e) => setSettings(s => ({...s, voice: e.target.checked}))} /> Voice (reads questions)</label>
          <label className="flex items-center gap-2 mt-2"><input type="checkbox" checked={settings.sounds} onChange={(e) => setSettings(s => ({...s, sounds: e.target.checked}))} /> Sound effects</label>
          <div className="mt-2 text-sm text-gray-600">Voice rate and pitch can be tuned in local storage settings (advanced).</div>
        </div>
        <p className="mt-2 text-sm text-gray-600">Progress is saved locally. To move progress online, add Firebase credentials to <code>src/firebase.config.js</code>.</p>
      </div>
    </div>
  );
}
