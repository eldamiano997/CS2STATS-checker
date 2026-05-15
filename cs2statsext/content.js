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
      marginTop: "10px", padding: "15px", backgroundColor: "rgba(23, 26, 33, 0.95)",
      borderRadius: "4px", color: "#acb2b8", fontSize: "12px", borderLeft: "3px solid #32d35a"
    });
    
    wrapper.innerHTML = `<div style="color:#5cb85c">Loading Stats...</div>`;
    target.prepend(wrapper);

    const fData = await fetchFaceit(steam64);
    const lData = await getLeetify(steam64);

    let content = "";
    if (fData) {
      const s = fData.stats;
      const last = s[0] ? (s[0].stats["Match Finished At"] || s[0].updated_at) : null;
      const kd = (s.reduce((a, b) => a + parseFloat(b.stats["K/D Ratio"]), 0) / s.length).toFixed(2);
      content += `
        <div style="color:#ff6c20; font-weight:bold; margin-bottom:5px;">FACEIT</div>
        <div style="display:flex; justify-content:space-between;">ELO: <b style="color:white;">${fData.info.games.cs2.faceit_elo}</b></div>
        <div style="display:flex; justify-content:space-between;">Avg K/D: <b>${kd}</b></div>
        <div style="display:flex; justify-content:space-between;">Last: <b>${formatLastPlayed(last)}</b></div>
      `;
    }

    if (lData) {
      content += `
        <div style="height:1px; background:#394a5a; margin:10px 0;"></div>
        <div style="color:#66c0f4; font-weight:bold; margin-bottom:5px;">LEETIFY</div>
        <div style="display:flex; justify-content:space-between;">Rating: <b>${lData.rating?.toFixed(2) || "N/A"}</b></div>
        <div style="display:flex; justify-content:space-between;">Aim: <b>${Math.round(lData.aim) || "N/A"}</b></div>
        <div style="display:flex; justify-content:space-between;">Reaction: <b>${Math.round(lData.reaction)}ms</b></div>
        <div style="display:flex; justify-content:space-between;">Matches: <b>${lData.total}</b></div>
      `;
    }

    content += `
      <div style="margin-top:12px;">
        <a href="https://csst.at/profile/${steam64}" target="_blank" style="display:block; background:#32d35a; color:black; text-align:center; padding:6px; text-decoration:none; border-radius:2px; font-weight:bold;">OPEN CSST.AT</a>
      </div>
    `;

    wrapper.innerHTML = content;
  }

  // Odpalamy z opóźnieniem, żeby Steam się "uspokoił"
  setTimeout(inject, 1500);

})();