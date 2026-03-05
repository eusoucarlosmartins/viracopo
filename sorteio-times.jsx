import { useState, useEffect, useRef } from "react";

const POSITIONS = ["GK", "DEF", "MID", "ATK"];
const POSITION_LABELS = { GK: "Goleiro", DEF: "Defensor", MID: "Meia", ATK: "Atacante" };
const POSITION_COLORS = { GK: "#f59e0b", DEF: "#3b82f6", MID: "#10b981", ATK: "#ef4444" };
const POSITION_ICONS = { GK: "🧤", DEF: "🛡️", MID: "⚙️", ATK: "⚡" };

const initialPlayers = [
  { id: 1, name: "Carlos", position: "GK", skill: 8, elo: 1200, wins: 5, losses: 2 },
  { id: 2, name: "Pedro", position: "DEF", skill: 7, elo: 1150, wins: 4, losses: 3 },
  { id: 3, name: "Marcos", position: "DEF", skill: 6, elo: 1080, wins: 3, losses: 4 },
  { id: 4, name: "Lucas", position: "MID", skill: 9, elo: 1320, wins: 8, losses: 1 },
  { id: 5, name: "André", position: "MID", skill: 7, elo: 1170, wins: 5, losses: 3 },
  { id: 6, name: "Rafael", position: "ATK", skill: 8, elo: 1250, wins: 6, losses: 2 },
  { id: 7, name: "João", position: "ATK", skill: 6, elo: 1090, wins: 3, losses: 5 },
  { id: 8, name: "Felipe", position: "GK", skill: 7, elo: 1130, wins: 4, losses: 4 },
  { id: 9, name: "Bruno", position: "DEF", skill: 8, elo: 1220, wins: 6, losses: 2 },
  { id: 10, name: "Thiago", position: "MID", skill: 5, elo: 1020, wins: 2, losses: 5 },
];

function eloRating(player) {
  return Math.round(player.elo + (player.skill - 5) * 20);
}

function getRatingDisplay(player) {
  return eloRating(player);
}

function sortPlayers(players) {
  return [...players].sort((a, b) => eloRating(b) - eloRating(a));
}

function distributeTeams(confirmed) {
  const byPosition = {};
  POSITIONS.forEach(p => { byPosition[p] = []; });
  confirmed.forEach(p => byPosition[p.position].push(p));

  const teamA = [], teamB = [];

  POSITIONS.forEach(pos => {
    const group = sortPlayers(byPosition[pos]);
    for (let i = 0; i < group.length; i += 2) {
      const pair = [group[i], group[i + 1]].filter(Boolean);
      if (pair.length === 2) {
        if (Math.random() < 0.5) { teamA.push(pair[0]); teamB.push(pair[1]); }
        else { teamA.push(pair[1]); teamB.push(pair[0]); }
      } else if (pair.length === 1) {
        (teamA.length <= teamB.length ? teamA : teamB).push(pair[0]);
      }
    }
  });

  return { teamA, teamB };
}

function teamStrength(team) {
  return team.reduce((sum, p) => sum + eloRating(p), 0);
}

function balanceTeams(teamA, teamB) {
  let best = { teamA: [...teamA], teamB: [...teamB] };
  let bestDiff = Math.abs(teamStrength(teamA) - teamStrength(teamB));

  for (let iter = 0; iter < 200; iter++) {
    const a = [...best.teamA], b = [...best.teamB];
    const ia = Math.floor(Math.random() * a.length);
    const candidates = b.filter(p => p.position === a[ia].position);
    if (candidates.length === 0) continue;
    const ib = b.indexOf(candidates[Math.floor(Math.random() * candidates.length)]);
    [a[ia], b[ib]] = [b[ib], a[ia]];
    const diff = Math.abs(teamStrength(a) - teamStrength(b));
    if (diff < bestDiff) { bestDiff = diff; best = { teamA: a, teamB: b }; }
  }
  return best;
}

const VIEWS = { LIST: "list", DRAW: "draw", RESULT: "result", MANAGE: "manage", HISTORY: "history" };

export default function App() {
  const [players, setPlayers] = useState(initialPlayers);
  const [confirmed, setConfirmed] = useState(new Set(initialPlayers.map(p => p.id)));
  const [view, setView] = useState(VIEWS.LIST);
  const [teams, setTeams] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [animStep, setAnimStep] = useState(0);
  const [newPlayer, setNewPlayer] = useState({ name: "", position: "ATK", skill: 7 });
  const [editingId, setEditingId] = useState(null);
  const [history, setHistory] = useState([]);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState(null);
  const nextId = useRef(players.length + 1);

  const toggleConfirm = (id) => {
    setConfirmed(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleDraw = () => {
    const conf = players.filter(p => confirmed.has(p.id));
    if (conf.length < 2) return;
    setAnimating(true);
    setAnimStep(0);
    setView(VIEWS.DRAW);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      setAnimStep(step);
      if (step >= 6) {
        clearInterval(interval);
        const raw = distributeTeams(conf);
        const balanced = balanceTeams(raw.teamA, raw.teamB);
        setTeams(balanced);
        setTimeout(() => { setAnimating(false); setView(VIEWS.RESULT); }, 400);
      }
    }, 380);
  };

  const registerResult = (winner) => {
    setWinnerTeam(winner);
    setShowWinModal(true);
  };

  const confirmResult = () => {
    if (!winnerTeam || !teams) return;
    const winners = winnerTeam === "A" ? teams.teamA : teams.teamB;
    const losers = winnerTeam === "A" ? teams.teamB : teams.teamA;
    const K = 32;

    setPlayers(prev => prev.map(p => {
      const isWinner = winners.some(w => w.id === p.id);
      const isLoser = losers.some(l => l.id === p.id);
      if (!isWinner && !isLoser) return p;
      const avgOpponent = isWinner
        ? losers.reduce((s, l) => s + eloRating(l), 0) / Math.max(losers.length, 1)
        : winners.reduce((s, w) => s + eloRating(w), 0) / Math.max(winners.length, 1);
      const expected = 1 / (1 + Math.pow(10, (avgOpponent - eloRating(p)) / 400));
      const result = isWinner ? 1 : 0;
      const delta = Math.round(K * (result - expected));
      return { ...p, elo: Math.max(800, p.elo + delta), wins: p.wins + (isWinner ? 1 : 0), losses: p.losses + (isLoser ? 1 : 0) };
    }));

    setHistory(prev => [{
      date: new Date().toLocaleDateString("pt-BR"),
      teamA: teams.teamA.map(p => p.name),
      teamB: teams.teamB.map(p => p.name),
      winner: winnerTeam,
      strengthA: teamStrength(teams.teamA),
      strengthB: teamStrength(teams.teamB),
    }, ...prev.slice(0, 9)]);

    setShowWinModal(false);
    setWinnerTeam(null);
    setTeams(null);
    setView(VIEWS.LIST);
  };

  const addPlayer = () => {
    if (!newPlayer.name.trim()) return;
    const p = { ...newPlayer, id: nextId.current++, elo: 1000 + (newPlayer.skill - 5) * 40, wins: 0, losses: 0 };
    setPlayers(prev => [...prev, p]);
    setConfirmed(prev => new Set([...prev, p.id]));
    setNewPlayer({ name: "", position: "ATK", skill: 7 });
  };

  const deletePlayer = (id) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setConfirmed(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setNewPlayer({ name: p.name, position: p.position, skill: p.skill });
  };

  const saveEdit = () => {
    setPlayers(prev => prev.map(p => p.id === editingId ? { ...p, ...newPlayer } : p));
    setEditingId(null);
    setNewPlayer({ name: "", position: "ATK", skill: 7 });
  };

  const confirmedPlayers = players.filter(p => confirmed.has(p.id));
  const strengthDiff = teams ? Math.abs(teamStrength(teams.teamA) - teamStrength(teams.teamB)) : 0;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0f1e",
      fontFamily: "'Barlow Condensed', 'Arial Narrow', sans-serif",
      color: "#e8eaf0",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0f1e; } ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        .btn { cursor: pointer; border: none; font-family: inherit; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.18s; }
        .btn:hover { transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }
        .card-hover { transition: all 0.2s; }
        .card-hover:hover { transform: translateY(-2px); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .slide-in { animation: slideIn 0.4s ease; }
        @keyframes slideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .bounce-in { animation: bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes bounceIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
        .field-lines { background: repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,255,255,0.02) 48px, rgba(255,255,255,0.02) 50px); }
        input, select { background: #111827; border: 1px solid #1e3a5f; color: #e8eaf0; padding: 8px 12px; border-radius: 6px; font-family: inherit; font-size: 14px; width: 100%; outline: none; }
        input:focus, select:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.2); }
        input::placeholder { color: #4b5563; }
      `}</style>

      {/* BG decoration */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)" }} />
        <svg style={{ position: "absolute", bottom: 0, left: 0, right: 0, opacity: 0.03 }} viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice">
          <ellipse cx="400" cy="200" rx="380" ry="180" fill="none" stroke="white" strokeWidth="2"/>
          <line x1="400" y1="20" x2="400" y2="380" stroke="white" strokeWidth="1"/>
          <circle cx="400" cy="200" r="60" fill="none" stroke="white" strokeWidth="1.5"/>
        </svg>
      </div>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "0 0 80px" }}>

        {/* Header */}
        <div style={{ padding: "24px 20px 12px", textAlign: "center" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.3em", color: "#3b82f6", fontWeight: 700, marginBottom: 4 }}>⚽ SISTEMA DE SORTEIO</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1, background: "linear-gradient(135deg, #fff 0%, #93c5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            RACHA<span style={{ WebkitTextFillColor: "#3b82f6" }}>FC</span>
          </h1>
          <div style={{ fontSize: 12, color: "#4b6080", marginTop: 4, letterSpacing: "0.15em" }}>DRAFT INTELIGENTE COM ELO RATING</div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 6, padding: "8px 16px 16px", overflowX: "auto" }}>
          {[
            { id: VIEWS.LIST, label: "Jogadores", icon: "👥" },
            { id: VIEWS.MANAGE, label: "Gerenciar", icon: "✏️" },
            { id: VIEWS.HISTORY, label: "Histórico", icon: "📋" },
          ].map(v => (
            <button key={v.id} className="btn" onClick={() => setView(v.id)}
              style={{
                flex: "none", padding: "8px 14px", borderRadius: 8, fontSize: 12,
                background: view === v.id ? "#1d4ed8" : "#111827",
                color: view === v.id ? "#fff" : "#6b7280",
                border: `1px solid ${view === v.id ? "#3b82f6" : "#1e2d45"}`,
                boxShadow: view === v.id ? "0 0 16px rgba(59,130,246,0.3)" : "none",
              }}>
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* PLAYERS VIEW */}
        {view === VIEWS.LIST && (
          <div className="slide-in" style={{ padding: "0 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{confirmedPlayers.length}</span>
                <span style={{ color: "#4b6080", fontSize: 13, marginLeft: 6 }}>confirmados / {players.length} total</span>
              </div>
              <button className="btn" onClick={handleDraw} disabled={confirmedPlayers.length < 2}
                style={{
                  background: confirmedPlayers.length >= 2 ? "linear-gradient(135deg, #1d4ed8, #0ea5e9)" : "#1e2d45",
                  color: confirmedPlayers.length >= 2 ? "#fff" : "#4b6080",
                  padding: "10px 20px", borderRadius: 8, fontSize: 14,
                  boxShadow: confirmedPlayers.length >= 2 ? "0 4px 20px rgba(59,130,246,0.4)" : "none",
                }}>
                🎲 SORTEAR
              </button>
            </div>

            {/* Position groups */}
            {POSITIONS.map(pos => {
              const group = sortPlayers(players.filter(p => p.position === pos));
              if (!group.length) return null;
              return (
                <div key={pos} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 16 }}>{POSITION_ICONS[pos]}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: POSITION_COLORS[pos] }}>{POSITION_LABELS[pos].toUpperCase()}</span>
                    <div style={{ flex: 1, height: 1, background: POSITION_COLORS[pos], opacity: 0.2 }} />
                    <span style={{ fontSize: 11, color: "#4b6080" }}>{group.filter(p => confirmed.has(p.id)).length}/{group.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {group.map(p => (
                      <div key={p.id} className="card-hover"
                        onClick={() => toggleConfirm(p.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                          background: confirmed.has(p.id) ? "rgba(29,78,216,0.15)" : "#0d1526",
                          border: `1px solid ${confirmed.has(p.id) ? "rgba(59,130,246,0.4)" : "#1e2d45"}`,
                          boxShadow: confirmed.has(p.id) ? "0 0 12px rgba(59,130,246,0.1)" : "none",
                        }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                          background: confirmed.has(p.id) ? POSITION_COLORS[pos] : "#1e2d45",
                          fontSize: 11, fontWeight: 800, color: "#fff",
                          transition: "background 0.2s",
                        }}>{p.name.slice(0, 2).toUpperCase()}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "#4b6080" }}>{p.wins}V · {p.losses}D</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 18, fontWeight: 900, color: confirmed.has(p.id) ? "#fff" : "#4b6080" }}>{p.skill}<span style={{ fontSize: 11, fontWeight: 400 }}>/10</span></div>
                          <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700 }}>ELO {getRatingDisplay(p)}</div>
                        </div>
                        <div style={{ width: 20, textAlign: "center", fontSize: 16 }}>
                          {confirmed.has(p.id) ? "✅" : "⬜"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MANAGE VIEW */}
        {view === VIEWS.MANAGE && (
          <div className="slide-in" style={{ padding: "0 16px" }}>
            <div style={{ background: "#0d1526", border: "1px solid #1e3a5f", borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", color: "#3b82f6", marginBottom: 12 }}>
                {editingId ? "✏️ EDITAR JOGADOR" : "➕ NOVO JOGADOR"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input placeholder="Nome do jogador" value={newPlayer.name} onChange={e => setNewPlayer(p => ({ ...p, name: e.target.value }))} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <select value={newPlayer.position} onChange={e => setNewPlayer(p => ({ ...p, position: e.target.value }))}>
                    {POSITIONS.map(pos => <option key={pos} value={pos}>{POSITION_ICONS[pos]} {POSITION_LABELS[pos]}</option>)}
                  </select>
                  <div style={{ position: "relative" }}>
                    <select value={newPlayer.skill} onChange={e => setNewPlayer(p => ({ ...p, skill: Number(e.target.value) }))}>
                      {[1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>Habilidade: {n}/10</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {editingId ? (
                    <>
                      <button className="btn" onClick={saveEdit} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", fontSize: 13 }}>✅ SALVAR</button>
                      <button className="btn" onClick={() => { setEditingId(null); setNewPlayer({ name: "", position: "ATK", skill: 7 }); }} style={{ padding: "10px 16px", borderRadius: 8, background: "#1e2d45", color: "#6b7280", fontSize: 13 }}>✕</button>
                    </>
                  ) : (
                    <button className="btn" onClick={addPlayer} style={{ flex: 1, padding: "10px", borderRadius: 8, background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)", color: "#fff", fontSize: 13 }}>+ ADICIONAR</button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sortPlayers(players).map(p => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "#0d1526", border: "1px solid #1e2d45" }}>
                  <span style={{ fontSize: 18 }}>{POSITION_ICONS[p.position]}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "#4b6080" }}>{POSITION_LABELS[p.position]} · Skill {p.skill} · ELO {getRatingDisplay(p)}</div>
                  </div>
                  <button className="btn" onClick={() => startEdit(p)} style={{ padding: "6px 10px", borderRadius: 6, background: "#1e3a5f", color: "#93c5fd", fontSize: 11 }}>✏️</button>
                  <button className="btn" onClick={() => deletePlayer(p.id)} style={{ padding: "6px 10px", borderRadius: 6, background: "#3b1a1a", color: "#f87171", fontSize: 11 }}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* DRAW ANIMATION */}
        {view === VIEWS.DRAW && (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 72, marginBottom: 20, animation: "spin 0.8s linear infinite" }}>⚽</div>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: "0.05em", marginBottom: 8 }}>SORTEANDO...</div>
            <div style={{ color: "#4b6080", fontSize: 14, marginBottom: 32 }}>Algoritmo de equilíbrio em execução</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: i < animStep ? "#3b82f6" : "#1e2d45",
                  transition: "background 0.3s",
                  boxShadow: i < animStep ? "0 0 8px #3b82f6" : "none",
                }} />
              ))}
            </div>
            <div style={{ marginTop: 20, fontSize: 12, color: "#1e3a5f", letterSpacing: "0.1em" }}>
              {["CARREGANDO JOGADORES", "CALCULANDO ELO", "FORMANDO POTES", "DISTRIBUINDO POR POSIÇÃO", "BALANCEANDO TIMES", "FINALIZANDO"][Math.min(animStep, 5)]}
            </div>
          </div>
        )}

        {/* RESULT VIEW */}
        {view === VIEWS.RESULT && teams && (
          <div className="slide-in" style={{ padding: "0 16px" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: "#4b6080", letterSpacing: "0.15em", marginBottom: 4 }}>RESULTADO DO SORTEIO</div>
              <div style={{ fontSize: 11, color: strengthDiff <= 50 ? "#10b981" : strengthDiff <= 100 ? "#f59e0b" : "#ef4444", fontWeight: 700, letterSpacing: "0.1em" }}>
                {strengthDiff <= 50 ? "⚖️ TIMES EQUILIBRADOS" : strengthDiff <= 100 ? "⚠️ LEVE DIFERENÇA" : "🔥 TIMES DESIGUAIS"} · DIFF: {strengthDiff}pts
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[{ team: teams.teamA, label: "TIME A", color: "#1d4ed8", accent: "#3b82f6" }, { team: teams.teamB, label: "TIME B", color: "#065f46", accent: "#10b981" }].map(({ team, label, color, accent }) => (
                <div key={label} style={{ background: `${color}22`, border: `1px solid ${accent}44`, borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ background: `${color}66`, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.05em" }}>{label}</span>
                    <span style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{teamStrength(team)}pts</span>
                  </div>
                  <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {POSITIONS.map(pos => {
                      const pos_players = team.filter(p => p.position === pos);
                      if (!pos_players.length) return null;
                      return pos_players.map(p => (
                        <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: "rgba(0,0,0,0.2)" }}>
                          <span style={{ fontSize: 13 }}>{POSITION_ICONS[p.position]}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                            <div style={{ fontSize: 9, color: "#4b6080" }}>{POSITION_LABELS[p.position]}</div>
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: accent }}>{p.skill}</div>
                        </div>
                      ));
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="btn" onClick={() => { setTeams(null); setView(VIEWS.LIST); }} style={{ flex: 1, padding: "11px", borderRadius: 8, background: "#1e2d45", color: "#6b7280", fontSize: 13 }}>← VOLTAR</button>
              <button className="btn" onClick={handleDraw} style={{ flex: 1, padding: "11px", borderRadius: 8, background: "#1e3a5f", color: "#93c5fd", fontSize: 13 }}>🔄 NOVO SORTEIO</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#4b6080", letterSpacing: "0.1em", textAlign: "center", marginBottom: 8 }}>REGISTRAR RESULTADO</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="btn" onClick={() => registerResult("A")} style={{ padding: "12px", borderRadius: 8, background: "rgba(29,78,216,0.3)", border: "1px solid #3b82f6", color: "#93c5fd", fontSize: 13 }}>🏆 TIME A GANHOU</button>
                <button className="btn" onClick={() => registerResult("B")} style={{ padding: "12px", borderRadius: 8, background: "rgba(6,95,70,0.3)", border: "1px solid #10b981", color: "#6ee7b7", fontSize: 13 }}>🏆 TIME B GANHOU</button>
              </div>
            </div>
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === VIEWS.HISTORY && (
          <div className="slide-in" style={{ padding: "0 16px" }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>RANKING ELO</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sortPlayers(players).map((p, i) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: i < 3 ? `rgba(${["234,179,8","156,163,175","180,83,9"][i]},0.1)` : "#0d1526", border: `1px solid ${i < 3 ? `rgba(${["234,179,8","156,163,175","180,83,9"][i]},0.3)` : "#1e2d45"}` }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: ["#ca8a04","#9ca3af","#b45309"][i] || "#1e2d45", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color: "#fff" }}>{i + 1}</div>
                    <span style={{ fontSize: 16 }}>{POSITION_ICONS[p.position]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "#4b6080" }}>{p.wins}V {p.losses}D · WR {p.wins + p.losses > 0 ? Math.round(p.wins / (p.wins + p.losses) * 100) : 0}%</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#3b82f6" }}>{getRatingDisplay(p)}</div>
                      <div style={{ fontSize: 10, color: "#4b6080" }}>ELO</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {history.length > 0 && (
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>PARTIDAS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {history.map((h, i) => (
                    <div key={i} style={{ padding: "12px 14px", borderRadius: 10, background: "#0d1526", border: "1px solid #1e2d45" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 11, color: "#4b6080", letterSpacing: "0.1em" }}>{h.date}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: h.winner === "A" ? "#3b82f6" : "#10b981" }}>TIME {h.winner} VENCEU 🏆</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                        <div>
                          <div style={{ fontSize: 10, color: "#3b82f6", fontWeight: 700, marginBottom: 3 }}>TIME A · {h.strengthA}pts</div>
                          <div style={{ fontSize: 11, color: "#e8eaf0" }}>{h.teamA.join(", ")}</div>
                        </div>
                        <div style={{ fontSize: 14, color: "#4b6080" }}>VS</div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: "#10b981", fontWeight: 700, marginBottom: 3 }}>TIME B · {h.strengthB}pts</div>
                          <div style={{ fontSize: 11, color: "#e8eaf0" }}>{h.teamB.join(", ")}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {history.length === 0 && <div style={{ textAlign: "center", color: "#4b6080", padding: 40 }}>Nenhuma partida registrada ainda</div>}
          </div>
        )}
      </div>

      {/* Win Modal */}
      {showWinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
          <div className="bounce-in" style={{ background: "#0d1526", border: "1px solid #1e3a5f", borderRadius: 16, padding: 24, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>CONFIRMAR RESULTADO?</div>
            <div style={{ color: "#4b6080", fontSize: 14, marginBottom: 20 }}>
              Time {winnerTeam} venceu. Os ratings ELO serão atualizados para todos os jogadores.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => setShowWinModal(false)} style={{ flex: 1, padding: 12, borderRadius: 8, background: "#1e2d45", color: "#6b7280", fontSize: 13 }}>CANCELAR</button>
              <button className="btn" onClick={confirmResult} style={{ flex: 1, padding: 12, borderRadius: 8, background: "linear-gradient(135deg, #ca8a04, #f59e0b)", color: "#000", fontSize: 13 }}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
