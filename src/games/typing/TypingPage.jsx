import React, { useEffect, useRef, useState } from 'react';
import GameShell from '../../components/GameShell';
import ResultPanel from '../../components/ResultPanel';
import { useGameGuard } from '../../lib/useGameGuard';
import { useScoreSubmit } from '../../lib/useScoreSubmit';
import { pickDaily, todayKey } from '../../lib/season';
import { getSchedule } from '../../api';

const SENTENCES = [
  "Great tutors don't just give answers; they ask better questions, wait patiently, and let the student arrive at the insight themselves.",
  "Consistent, deliberate practice — even in short 20-minute bursts — beats a single, exhausting, last-minute cramming session every time.",
  "A well-timed hint, offered at exactly the right moment, can turn a frustrated student's \"I give up\" into a confident \"Oh, I get it now!\"",
  "Struggling with a concept usually isn't about intelligence; it's about not having found the right explanation, analogy, or example — yet.",
  "The best tutoring sessions feel less like a lecture and more like a conversation: curious, back-and-forth, and occasionally full of tangents.",
];
export default function TypingPage() {
  const { allowed, week } = useGameGuard('typing');
  const { finish, result, prevBest } = useScoreSubmit(week);
  const [sentence, setSentence] = useState(null);
  const [value, setValue] = useState('');
  const [wpm, setWpm] = useState(0);
  const [acc, setAcc] = useState(100);
  const [done, setDone] = useState(false);
  const startRef = useRef(null);

  useEffect(() => {
    if (!allowed) return;
    getSchedule()
      .then((data) => {
        const o = data.overrides?.[`typing:${todayKey()}`];
        setSentence(o ? o.sentence : pickDaily(SENTENCES, 'typing'));
      })
      .catch(() => setSentence(pickDaily(SENTENCES, 'typing')));
  }, [allowed]);

  const onChange = (e) => {
    const val = e.target.value;
    if (startRef.current === null) startRef.current = performance.now();
    setValue(val);
    let correctCount = 0;
    for (let i = 0; i < val.length; i++) if (val[i] === sentence[i]) correctCount++;
    const elapsedMin = (performance.now() - startRef.current) / 60000;
    const w = elapsedMin > 0 ? Math.round((val.length / 5) / elapsedMin) : 0;
    setWpm(isFinite(w) ? w : 0);
    setAcc(val.length > 0 ? Math.round((correctCount / val.length) * 100) : 100);
  };

  const submit = () => {
    if (value.length < sentence.length * 0.9 || done) return;
    const elapsedMin = Math.max((performance.now() - startRef.current) / 60000, 0.05);
    const w = Math.round((value.length / 5) / elapsedMin);
    let correctCount = 0;
    for (let i = 0; i < sentence.length; i++) if (value[i] === sentence[i]) correctCount++;
    const accuracy = correctCount / sentence.length;
    setDone(true);
    finish(Math.round(Math.min(100, w) * accuracy));
  };

  if (!allowed || !sentence) return null;

  return (
    <GameShell emoji="⌨️" title="Typing Speed" tag="Type the sentence as fast & accurately as you can." week={week}>
      {result ? (
        <ResultPanel score={result.score} isNewBest={result.isNewBest} prevBest={prevBest} weekTotal={result.weekTotal} />
      ) : (
        <>
          <p className="text-zinc-500 text-xs text-center max-w-sm">Type the sentence exactly, then press Enter. Score is speed × accuracy.</p>
          <div className="font-mono text-sm leading-relaxed p-4 rounded-xl bg-zinc-950/50 border border-border max-w-md">
            {sentence.split('').map((ch, i) => {
              let cls = 'text-zinc-500';
              if (i < value.length) cls = value[i] === ch ? 'text-correct' : 'text-red-500 underline';
              return <span key={i} className={cls}>{ch}</span>;
            })}
          </div>
          <textarea
            autoFocus
            disabled={done}
            value={value}
            onChange={onChange}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            rows={3}
            className="w-full max-w-md p-3 rounded-xl bg-zinc-950/50 border border-border focus:border-accent outline-none font-mono resize-none"
          />
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-2xl font-black font-display text-accent">{wpm}</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">WPM</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black font-display text-correct">{acc}%</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500">Accuracy</div>
            </div>
          </div>
        </>
      )}
    </GameShell>
  );
}
