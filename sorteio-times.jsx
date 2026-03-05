const { useState, useEffect, useRef } = React;

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

function App() {
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
      overflowX: "hidden",
    }}>
      {/* O CSS permanece o mesmo dentro da tag style */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .btn { cursor: pointer; border: none; font-family: inherit; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; transition: all 0.18s; }
        .slide-in { animation: slideIn 0.4s ease; }
        @keyframes slideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { to { transform: rotate(360deg); } }
        input, select { background: #111827; border: 1px solid #1e3a5f; color: #e8eaf0; padding: 8px 12px; border-radius: 6px; width: 100%; outline: none; }
      `}</style>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 480, margin: "0 auto", padding: "0 0 80px" }}>
        {/* Renderização condicional das Views (List, Manage, History, etc) conforme seu código original */}
        <div style={{ padding: "24px 20px 12px", textAlign: "center" }}>
          <h1 style={{ fontSize: 42, fontWeight: 900, background: "linear-gradient(135deg, #fff 0%, #93c5fd 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            RACHA FC
          </h1>
        </div>

        {/* Nav Simplificada */}
        <div style={{ display: "flex", gap: 6, padding: "8px 16px 16px" }}>
           <button onClick={() => setView(VIEWS.LIST)} style={{ flex: 1, padding: 8, background: view === VIEWS.LIST ? "#1d4ed8" : "#111827", color: "#fff", border: "1px solid #3b82f6", borderRadius: 8 }}>Jogadores</button>
           <button onClick={() => setView(VIEWS.MANAGE)} style={{ flex: 1, padding: 8, background: view === VIEWS.MANAGE ? "#1d4ed8" : "#111827", color: "#fff", border: "1px solid #3b82f6", borderRadius: 8 }}>Gerenciar</button>
           <button onClick={() => setView(VIEWS.HISTORY)} style={{ flex: 1, padding: 8, background: view === VIEWS.HISTORY ? "#1d4ed8" : "#111827", color: "#fff", border: "1px solid #3b82f6", borderRadius: 8 }}>Ranking</button>
        </div>

        {/* Lógica das Telas (Resumida para o exemplo, mas use sua lógica completa aqui) */}
        {view === VIEWS.LIST && (
           <div className="slide-in" style={{ padding: "0 16px" }}>
              <button onClick={handleDraw} style={{ width: "100%", padding: 12, background: "#1d4ed8", color: "#fff", borderRadius: 8, fontWeight: "bold" }}>🎲 SORTEAR TIMES</button>
              {players.map(p => (
                 <div key={p.id} onClick={() => toggleConfirm(p.id)} style={{ padding: 12, margin: "8px 0", background: confirmed.has(p.id) ? "#1e3a5f" : "#0d1526", borderRadius: 8, border: "1px solid #1e3a5f" }}>
                    {p.name} - {POSITION_ICONS[p.position]} - ELO: {eloRating(p)} {confirmed.has(p.id) ? "✅" : ""}
                 </div>
              ))}
           </div>
        )}
        
        {/* Outras Views aqui... */}
      </div>
    </div>
  );
}

// O segredo para funcionar sem compilador:
window.App = App;