(function () {
  "use strict";

  const FACEIT_API_KEY = "0be7b90a-d91f-4036-bb8e-1fa3a352ad6d";

  function getSteam64() {
    const input = document.querySelector('input[name="abuseID"]');
    if (input) return input.value;
    const scripts = document.querySelectorAll("script");
    for (const script of scripts) {
      if (script.textContent.includes("g_rgProfileData")) {
        const match = script.textContent.match(/"steamid"\s*:\s*"(\d+)"/);
        if (match && match[1]) return match[1];
      }
    }
    return null;
  }

  function formatLastPlayed(timestamp) {
    if (!timestamp) return "N/A";
    const lastDate = new Date(timestamp);
    const now = new Date();
    const day = lastDate.getDate();
    const month = lastDate.toLocaleString('en-US', { month: 'short' });
    const year = lastDate.getFullYear();
    const diffMs = Math.max(0, now.getTime() - lastDate.getTime());
    const diffDays = Math.floor(diffMs / 86400000);
    const ago = diffDays > 0 ? `${diffDays}d ago` : "Today";
    return `${day} ${month} ${year} (${ago})`;
  }

  async function getLeetify(steam64) {
    try {
      const response = await fetch(`https://api-public.cs-prod.leetify.com/v2/profiles/${steam64}`);
      if (!response.ok) return null;
      const json = await response.json();
      return {
        total: json.total_matches,
        rating: json.ranks?.leetify,
        aim: json.rating?.aim,
        reaction: json.stats?.reaction_time_ms
      };
    } catch (e) { return null; }
  }

  async function fetchFaceit(steam64) {
    try {
      const res = await fetch(`https://open.faceit.com/data/v4/players?game=cs2&game_player_id=${steam64}`, {
        headers: { Authorization: `Bearer ${FACEIT_API_KEY}` }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const statsRes = await fetch(`https://open.faceit.com/data/v4/players/${data.player_id}/games/cs2/stats?limit=30`, {
        headers: { Authorization: `Bearer ${FACEIT_API_KEY}` }
      });
      const statsData = await statsRes.json();
      const matches = statsData.items || [];
      matches.sort((a, b) => new Date(b.stats["Match Finished At"] || b.updated_at) - new Date(a.stats["Match Finished At"] || a.updated_at));
      return { info: data, stats: matches };
    } catch (e) { return null; }
  }

  async function inject() {
    const steam64 = getSteam64();
    const target = document.querySelector(".profile_rightcol");
    if (!steam64 || !target || document.getElementById("stats-pro-v2")) return;

    const wrapper = document.createElement("div");
    wrapper.id = "stats-pro-v2";
    Object.assign(wrapper.style, {
      marginTop: "10px",
      padding: "16px",
      backgroundColor: "rgba(23, 26, 33, 0.98)",
      borderRadius: "6px",
      color: "#acb2b8",
      fontSize: "13px",
      border: "1px solid rgba(50, 211, 90, 0.3)",
      boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
      fontFamily: "'Motiva Sans', Sans-serif"
    });
    
    wrapper.innerHTML = `<div style="color:#32d35a; font-weight:bold; text-align:center;">SCANNING...</div>`;
    target.prepend(wrapper);

    const fData = await fetchFaceit(steam64);
    const lData = await getLeetify(steam64);

    let content = "";
    if (fData) {
      const s = fData.stats;
      const last = s[0] ? (s[0].stats["Match Finished At"] || s[0].updated_at) : null;
      const kd = (s.reduce((a, b) => a + parseFloat(b.stats["K/D Ratio"]), 0) / s.length).toFixed(2);
      const eloCS2 = fData.info.games?.cs2?.faceit_elo || "N/A";
      const eloCSGO = fData.info.games?.csgo?.faceit_elo || "N/A";

      content += `
        <div style="color:#ff6c20; font-weight:bold; font-size:11px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid rgba(255,108,32,0.2); padding-bottom:4px; margin-bottom:8px;">Faceit Network</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>CS2 ELO</span><b style="color:#fff;">${eloCS2}</b></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>CS:GO ELO</span><b style="color:#888;">${eloCSGO}</b></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Avg K/D (30m)</span><b style="color:#fff;">${kd}</b></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Last Match</span><b style="color:#fff; font-size:11px;">${formatLastPlayed(last)}</b></div>
      `;
    }

    if (lData) {
      content += `
        <div style="color:#66c0f4; font-weight:bold; font-size:11px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid rgba(102,192,244,0.2); padding-bottom:4px; margin:14px 0 8px 0;">Leetify Intel</div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Rating</span><b style="color:#fff;">${lData.rating?.toFixed(2) || "N/A"}</b></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Aim Power</span><b style="color:#fff;">${Math.round(lData.aim) || "N/A"}</b></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Reaction</span><b style="color:#fff;">${Math.round(lData.reaction)}ms</b></div>
        <div style="display:flex; justify-content:space-between; margin-bottom:4px;"><span>Matches</span><b style="color:#fff;">${lData.total}</b></div>
      `;
    }

    content += `
      <a href="https://csst.at/profile/${steam64}" target="_blank" 
         style="display:block; margin-top:15px; background:linear-gradient(90deg, #32d35a, #28a745); color:#000; text-align:center; padding:8px; text-decoration:none; border-radius:3px; font-weight:bold; font-size:11px; text-transform:uppercase;">
         FULL CSST.AT PROFILE
      </a>
    `;

    wrapper.innerHTML = content;
  }

  setTimeout(inject, 1500);
})();
