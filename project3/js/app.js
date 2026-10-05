/* Progressive enhancement only: content is in HTML and presentation is in CSS.
   Team and lineup behavior retained from Project 2.
   Project 3 search and jQuery interactions are in interactions.js.
   All user-supplied strings enter the DOM through textContent, never HTML. */
"use strict";
(() => {
  const selectOne = (selector) => document.querySelector(selector);
  const selectAll = (selector) => [...document.querySelectorAll(selector)];
  const page = document.body.dataset.page;
  const storageKey = "fantasy-manager-project3-v1";
  const { slots, players, byId, seedTeams } = window.FantasyData;
  let state = { teams: seedTeams };
  let storageReadable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (
      saved &&
      Array.isArray(saved.teams) &&
      saved.teams.length >= 3 &&
      saved.teams.every(
        (team) =>
          typeof team.id === "string" &&
          typeof team.name === "string" &&
          typeof team.league === "string" &&
          Array.isArray(team.roster) &&
          team.roster.every((id) => byId[id]) &&
          Array.isArray(team.lineup) &&
          team.lineup.length === 9 &&
          team.lineup.every((id) => id === null || team.roster.includes(id)),
      )
    ) {
      state = saved;
    }
  } catch (error) {
    storageReadable = false;
  }
  const params = new URLSearchParams(location.search);
  const requestedTeam = params.get("team") || "strategists";
  const team =
    state.teams.find((item) => item.id === requestedTeam) || state.teams[0];
  const points = (player, scoring = "Full PPR") =>
    player
      ? player.points -
        player.receptions *
          (scoring === "Half PPR" ? 0.5 : scoring === "Standard" ? 1 : 0)
      : 0;
  const total = (lineup, scoring = "Full PPR") =>
    lineup.reduce((sum, id) => sum + points(byId[id], scoring), 0);
  const eligible = (player, slotIndex) =>
    player &&
    (slotIndex === 6
      ? ["RB", "WR", "TE"].includes(player.position)
      : player.position === slots[slotIndex].split(" ")[0]);
  const teamUrl = (file, selected = team.id) =>
    `${file}?team=${encodeURIComponent(selected)}`;
  const show = (element, text) => {
    if (element) {
      element.textContent = text;
      element.hidden = false;
    }
  };
  function persist(nextState) {
    // Do not claim a save until localStorage succeeds (private/file contexts can block it).
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState));
      state = nextState;
      return true;
    } catch (error) {
      return false;
    }
  }
  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }
  function statusElement(text) {
    return element("span", `status ${text.toLowerCase()}`, text);
  }
  function renderLineup(lineup) {
    const body = selectOne("#starter-rows");
    if (!body) return;
    body.replaceChildren();
    lineup.forEach((id, index) => {
      const player = byId[id];
      const row = element("tr");
      row.dataset.player = id || "";
      const slot = element("th");
      slot.scope = "row";
      slot.append(element("span", "slot", slots[index]));
      const identity = element("td");
      identity.append(
        element("span", "player-name", player ? player.name : "Empty slot"),
      );
      identity.append(
        element(
          "span",
          "subtext",
          player ? player.position : "Choose a player",
        ),
      );
      const availability = element("td");
      availability.append(statusElement(player ? player.status : "Empty"));
      row.append(
        slot,
        identity,
        availability,
        element("td", "number", points(player, team.scoring).toFixed(1)),
      );
      body.append(row);
    });
  }
  function lineupIssues(lineup) {
    return lineup.flatMap((id, index) => {
      if (!id) return [`Fill ${slots[index]}`];
      const player = byId[id];
      if (player.status === "Bye")
        return [`Replace ${player.name}: he is on a bye`];
      if (!eligible(player, index))
        return [`Choose an eligible player for ${slots[index]}`];
      return [];
    });
  }
  function firstIssueSlot(lineup) {
    return lineup.findIndex(
      (id, index) =>
        !id || byId[id].status === "Bye" || !eligible(byId[id], index),
    );
  }
  function buildStartingLineup(roster) {
    const lineup = Array(9).fill(null);
    const used = new Set();
    // Fixed positions come first so FLEX does not consume the only tight end.
    [0, 1, 2, 3, 4, 5, 7, 8, 6].forEach((index) => {
      const id = roster.find(
        (candidate) =>
          !used.has(candidate) &&
          eligible(byId[candidate], index) &&
          byId[candidate].status !== "Bye",
      );
      if (id) {
        lineup[index] = id;
        used.add(id);
      }
    });
    return lineup;
  }
  function renderBench(list, lineup) {
    list.replaceChildren();
    const available = team.roster.filter((id) => !lineup.includes(id));
    available.forEach((id) => {
      const player = byId[id];
      const row = element("li");
      const identity = element("div");
      identity.append(
        element("strong", "", player.name),
        element("span", "", `${player.position} · ${player.status}`),
      );
      row.append(
        identity,
        element("span", "number", points(player, team.scoring).toFixed(1)),
      );
      list.append(row);
    });
    if (!available.length)
      list.append(element("li", "", "No bench players selected."));
  }
  function updateTeamContext() {
    selectAll("[data-team-name]").forEach((node) => {
      node.textContent = team.name;
    });
    selectAll("[data-team-link]").forEach((node) => {
      node.href = teamUrl("team-details.html");
    });
    const heading = selectOne(".page-heading .eyebrow");
    if (heading)
      heading.textContent =
        page === "edit-lineup"
          ? `${team.name} · Week 7`
          : `${team.league} · ${team.scoring}`;
    if (selectOne("[data-team-record]"))
      selectOne("[data-team-record]").textContent = `${team.record} record`;
    document.title = `${page === "edit-lineup" ? "Edit lineup" : team.name} | Fantasy Manager`;
    selectAll('a[href="edit-lineup.html"]').forEach((link) => {
      link.href = teamUrl("edit-lineup.html");
    });
    if (requestedTeam !== team.id)
      show(
        selectOne("#save-notice"),
        "That team could not be found. Showing Sunday Strategists.",
      );
  }
  if (!storageReadable) {
    const message = element(
      "p",
      "notice",
      "Browser storage could not be read. Sample data is shown; saving may be unavailable. Use a local server for the best experience.",
    );
    selectOne("main").prepend(message);
  }
  if (page === "home") {
    const picker = selectOne("#featured-team");
    picker.replaceChildren();
    state.teams.forEach((item) =>
      picker.add(new Option(`${item.name} · ${item.league}`, item.id)),
    );
    if (state.teams.some((item) => item.id === requestedTeam))
      picker.value = requestedTeam;
    function updateFeatured() {
      const featured = state.teams.find((item) => item.id === picker.value);
      selectOne("#featured-name").textContent = featured.name;
      selectOne("#featured-league").textContent =
        `${featured.league} · ${featured.scoring}`;
      selectOne("#featured-record").textContent = `YOUR TEAM · ${featured.record}`;
      selectOne("#featured-crest").src =
        `assets/${["strategists", "runners", "giants"].includes(featured.crest) ? featured.crest : "strategists"}.svg`;
      selectOne("#featured-crest").alt = `${featured.name} team crest`;
      selectOne("#featured-link").href = teamUrl("team-details.html", featured.id);
      selectOne("#home-projection").textContent = total(
        featured.lineup,
        featured.scoring,
      ).toFixed(1);
      const issues = lineupIssues(featured.lineup);
      selectOne("#lineup-alert").hidden = issues.length === 0;
      selectOne("#lineup-ready").hidden = issues.length !== 0;
      if (issues.length) {
        selectOne("#lineup-alert strong").textContent =
          `${featured.name}: ${issues.length} lineup ${issues.length === 1 ? "issue" : "issues"}.`;
        selectOne("#lineup-alert p").textContent = `${issues[0]}.`;
        selectOne("[data-fix-lineup]").href =
          `${teamUrl("edit-lineup.html", featured.id)}&slot=${firstIssueSlot(featured.lineup)}`;
      }
      const url = new URL(location.href);
      url.searchParams.set("team", featured.id);
      history.replaceState(null, "", url);
    }
    picker.addEventListener("change", updateFeatured);
    selectOne("#featured-form").addEventListener("submit", (event) => {
      event.preventDefault();
      updateFeatured();
    });
    updateFeatured();
  }
  if (page === "teams") {
    // Reuse the static article structure so every item stays template-compatible.
    const prototype = selectOne(".team-row").cloneNode(true);
    const list = selectOne("#team-list");
    list.replaceChildren();
    state.teams.forEach((item, index) => {
      const row = prototype.cloneNode(true);
      row.dataset.teamId = item.id;
      row.dataset.originalIndex = String(index);
      row.dataset.teamName = item.name.toLowerCase();
      row.dataset.league = item.league;
      row.querySelector(".row-index").textContent = String(index + 1).padStart(
        2,
        "0",
      );
      const crest = row.querySelector("img");
      crest.src = `assets/${["strategists", "runners", "giants"].includes(item.crest) ? item.crest : "strategists"}.svg`;
      crest.alt = `${item.name} team crest`;
      const title = row.querySelector("h2 a");
      title.textContent = item.name;
      title.href = teamUrl("team-details.html", item.id);
      row.querySelector(".team-identity p").textContent =
        `${item.league} · ${item.scoring}`;
      row.querySelector(".team-record strong").textContent = item.record;
      const link = row.querySelector(".team-view-link");
      link.href = title.href;
      link.setAttribute("aria-label", `View ${item.name}`);
      list.append(row);
    });
    const leagueSelect = selectOne("#league-filter");
    leagueSelect.replaceChildren(new Option("All leagues", ""));
    [...new Set(state.teams.map((item) => item.league))].forEach((league) =>
      leagueSelect.add(new Option(league, league)),
    );
    function sortTeams() {
      const mode = selectOne("#team-sort").value;
      const rows = selectAll(".team-row");
      const model = (row) =>
        state.teams.find((item) => item.id === row.dataset.teamId);
      const wins = (row) => Number(model(row).record.split(/[–-]/)[0]) || 0;
      rows.sort((a, b) => {
        if (mode === "name")
          return a.dataset.teamName.localeCompare(b.dataset.teamName);
        if (mode === "record")
          return (
            wins(b) - wins(a) ||
            Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex)
          );
        if (mode === "attention")
          return (
            lineupIssues(model(b).lineup).length -
              lineupIssues(model(a).lineup).length ||
            Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex)
          );
        return (
          Number(a.dataset.originalIndex) - Number(b.dataset.originalIndex)
        );
      });
      rows.forEach((row) => list.append(row));
    }
    selectOne("#team-sort").addEventListener("change", sortTeams);
    function filterTeams() {
      sortTeams();
      const query = selectOne("#team-search").value.trim().toLowerCase();
      let count = 0;
      selectAll(".team-row").forEach((row) => {
        row.hidden =
          !row.dataset.teamName.includes(query) ||
          (leagueSelect.value !== "" &&
            row.dataset.league !== leagueSelect.value);
        if (!row.hidden) count++;
      });
      selectOne("#team-count").textContent =
        `${count} ${count === 1 ? "team" : "teams"}`;
      selectOne("#no-teams").hidden = count !== 0;
    }
    selectOne("#team-filter").addEventListener("submit", (event) => {
      event.preventDefault();
      filterTeams();
    });
    selectOne("#team-search").addEventListener("input", filterTeams);
    leagueSelect.addEventListener("change", filterTeams);
    selectOne("#team-filter").addEventListener("reset", () =>
      setTimeout(filterTeams, 0),
    );
    filterTeams();
  }
  if (page === "team-details") {
    updateTeamContext();
    renderLineup(team.lineup);
    selectOne("#team-projection").textContent = total(
      team.lineup,
      team.scoring,
    ).toFixed(1);
    selectOne(".matchup-summary > .fineprint").textContent =
      `Projected points · ${team.scoring}`;
    const issues = lineupIssues(team.lineup);
    selectOne("#lineup-alert").hidden = issues.length === 0;
    if (issues.length) {
      selectOne("#lineup-alert strong").textContent =
        `${issues.length} lineup ${issues.length === 1 ? "issue" : "issues"} to resolve.`;
      selectOne("#lineup-alert p").textContent = `${issues[0]}.`;
    }
    if (issues.length)
      selectOne("[data-fix-lineup]").href =
        `${teamUrl("edit-lineup.html")}&slot=${firstIssueSlot(team.lineup)}`;
    renderBench(selectOne("#bench-list"), team.lineup);
    if (params.get("saved") === "1")
      show(selectOne("#save-notice"), "Your Week 7 lineup is saved in this browser.");
    if (params.get("created") === "1")
      show(
        selectOne("#save-notice"),
        `${team.name} was created. ${issues.length ? "Complete the starting lineup when your roster is ready." : "Your lineup is ready."}`,
      );
  }
  if (page === "create-team") {
    const form = selectOne("#create-team-form");
    const boxes = () => selectAll('input[name="roster"]');
    // With JavaScript, show predictable inline messages on submit. Native required
    // validation remains available when scripting is disabled.
    form.noValidate = true;
    ["team-name", "league-name"].forEach((id) => {
      selectOne("#" + id).addEventListener("input", () => {
        if (selectOne("#" + id).value.trim()) {
          selectOne("#" + id).removeAttribute("aria-invalid");
          selectOne("#" + id + "-error").hidden = true;
        }
      });
    });
    const updateCount = () => {
      const roster = boxes()
        .filter((box) => box.checked)
        .map((box) => box.value);
      selectOne("#roster-count").textContent = `${roster.length} players selected`;
      const missing = buildStartingLineup(roster).filter((id) => !id).length;
      selectOne("#roster-readiness").textContent = missing
        ? `Incomplete roster: ${missing} starting ${missing === 1 ? "slot is" : "slots are"} empty. You can create this team now, but cannot save a lineup until every slot is filled.`
        : "Your roster can fill all nine starting slots. Bye players will stay on the bench.";
    };
    updateCount();
    form.addEventListener("change", updateCount);
    selectOne("#use-sample").addEventListener("click", () => {
      boxes().forEach((box) => {
        box.checked = true;
      });
      updateCount();
    });
    selectOne("#roster-search").addEventListener("input", () => {
      let visible = 0;
      selectAll(".player-choice").forEach((label) => {
        label.hidden = !label.dataset.search.includes(
          selectOne("#roster-search").value.toLowerCase().trim(),
        );
        if (!label.hidden) visible++;
      });
      selectOne("#no-players").hidden = visible !== 0;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = selectOne("#team-name").value.trim();
      const league = selectOne("#league-name").value.trim();
      [
        ["team-name", name, "team"],
        ["league-name", league, "league"],
      ].forEach(([id, value, label]) => {
        selectOne("#" + id).setAttribute("aria-invalid", String(!value));
        selectOne("#" + id + "-error").hidden = Boolean(value);
        if (!value)
          selectOne("#" + id + "-error").textContent =
            `Enter a ${label} name. Spaces alone are not a name.`;
      });
      if (!name || !league) {
        show(
          selectOne("#create-error"),
          "Enter both a team name and a league name. Spaces alone are not a name.",
        );
        (!name ? selectOne("#team-name") : selectOne("#league-name")).focus();
        return;
      }
      if (
        state.teams.some(
          (item) =>
            item.name.toLowerCase() === name.toLowerCase() &&
            item.league.toLowerCase() === league.toLowerCase(),
        )
      ) {
        show(
          selectOne("#create-error"),
          "That team name already exists in this league. Choose a different name.",
        );
        selectOne("#team-name").focus();
        return;
      }
      const roster = boxes()
        .filter((box) => box.checked)
        .map((box) => box.value);
      const lineup = buildStartingLineup(roster);
      const created = {
        id: `team-${Date.now()}`,
        name,
        league,
        scoring: selectOne("#scoring").value,
        record: "0–0",
        crest: "strategists",
        roster,
        lineup,
      };
      if (!persist({ teams: [...state.teams, created] })) {
        show(
          selectOne("#create-error"),
          "Your browser could not save this team. Allow local storage or open the prototype with a local server, then try again.",
        );
        return;
      }
      location.href = `${teamUrl("team-details.html", created.id)}&created=1`;
    });
  }
  if (page === "edit-lineup") {
    updateTeamContext();
    let draft = [...team.lineup];
    const history = [];
    let dirty = false;
    const baseline = total(team.lineup, team.scoring);
    selectOne("#base-projection").textContent = baseline.toFixed(1);
    if (team.id !== "strategists" || baseline !== 108.4)
      selectOne(".coach-note").hidden = true;
    function updateTargets() {
      const selected = byId[selectOne("#bench-player").value];
      const target = selectOne("#target-slot");
      const previous = target.value;
      target.replaceChildren();
      slots.forEach((slot, index) => {
        if (eligible(selected, index))
          target.add(
            new Option(
              `${slot} · ${byId[draft[index]]?.name || "Empty"}${byId[draft[index]]?.status === "Bye" ? " · Bye" : ""}`,
              String(index),
            ),
          );
      });
      if ([...target.options].some((option) => option.value === previous))
        target.value = previous;
      else if ([...target.options].some((option) => option.value === "6"))
        target.value = "6";
      selectOne("#move-form button").disabled = !selected || !target.options.length;
    }
    function renderEditor() {
      renderLineup(draft);
      renderBench(selectOne("#editor-bench-list"), draft);
      const projection = total(draft, team.scoring);
      const delta = Math.round((projection - baseline) * 10) / 10;
      selectOne("#draft-projection").textContent = projection.toFixed(1);
      selectOne("#projection-change").textContent = delta
        ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)} pts`
        : "No point change";
      const issueList = lineupIssues(draft);
      selectOne("#editor-warning").hidden = issueList.length === 0;
      if (issueList.length) {
        selectOne("#editor-warning-title").textContent = `${issueList[0]}.`;
        selectOne("#editor-warning-copy").textContent =
          issueList.length > 1
            ? `${issueList.length} slots need attention. Fill each slot with an eligible player from your bench.`
            : "Choose an eligible bench player for this slot before saving.";
      }
      selectOne("#save-lineup").disabled = issueList.length > 0;
      selectOne("#save-hint").textContent = issueList.length
        ? `${issueList[0]}. ${issueList.length} ${issueList.length === 1 ? "issue" : "issues"} remaining; saving is disabled.`
        : "Your lineup is valid and ready to save.";
      selectOne("#draft-state").textContent = dirty
        ? "UNSAVED CHANGES"
        : "SAVED LINEUP";
      selectOne("#undo-move").disabled = history.length === 0;
      const select = selectOne("#bench-player");
      const previous = select.value;
      select.replaceChildren();
      team.roster
        .filter((id) => !draft.includes(id))
        .forEach((id) => {
          const player = byId[id];
          select.add(
            new Option(
              `${player.name} · ${player.position} · ${player.status} · ${points(player, team.scoring).toFixed(1)} pts`,
              id,
            ),
          );
        });
      if (!select.options.length)
        select.add(new Option("No bench players available", ""));
      if ([...select.options].some((option) => option.value === previous))
        select.value = previous;
      updateTargets();
    }
    selectOne("#bench-player").addEventListener("change", updateTargets);
    selectOne("#move-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const id = selectOne("#bench-player").value;
      const slot = Number(selectOne("#target-slot").value);
      if (
        !team.roster.includes(id) ||
        draft.includes(id) ||
        !eligible(byId[id], slot)
      )
        return;
      history.push([...draft]);
      const displaced = byId[draft[slot]];
      draft[slot] = id;
      dirty = JSON.stringify(draft) !== JSON.stringify(team.lineup);
      renderEditor();
      selectOne("#move-feedback").textContent =
        `${byId[id].name} moved to ${slots[slot]}.${displaced ? ` ${displaced.name} moved to the bench.` : ""}`;
      selectOne("#save-error").hidden = true;
    });
    selectOne("#undo-move").addEventListener("click", () => {
      if (!history.length) return;
      draft = history.pop();
      dirty = JSON.stringify(draft) !== JSON.stringify(team.lineup);
      renderEditor();
      selectOne("#move-feedback").textContent =
        "Last move undone. The previous lineup is restored.";
    });
    selectOne("#save-lineup").addEventListener("click", () => {
      const issues = lineupIssues(draft);
      if (issues.length) {
        show(
          selectOne("#save-error"),
          `${issues.join(". ")}. Your changes have not been saved.`,
        );
        selectOne("#bench-player").focus();
        return;
      }
      const updated = {
        teams: state.teams.map((item) =>
          item.id === team.id ? { ...item, lineup: [...draft] } : item,
        ),
      };
      if (!persist(updated)) {
        show(
          selectOne("#save-error"),
          "Your browser could not save this lineup. Allow local storage or use a local server, then try again.",
        );
        return;
      }
      dirty = false;
      location.href = `${teamUrl("team-details.html")}&saved=1`;
    });
    // Explicit Cancel discards; browser navigation protects an unfinished draft.
    selectAll("[data-team-link]").forEach((link) =>
      link.addEventListener("click", () => {
        dirty = false;
      }),
    );
    window.addEventListener("beforeunload", (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
    renderEditor();
    // Alerts carry the problem slot into the editor without silently moving a player.
    const requestedSlot = Number(params.get("slot"));
    if (
      params.has("slot") &&
      Number.isInteger(requestedSlot) &&
      requestedSlot >= 0 &&
      requestedSlot < slots.length
    ) {
      const candidate = team.roster.find(
        (id) =>
          !draft.includes(id) &&
          eligible(byId[id], requestedSlot) &&
          byId[id].status !== "Bye",
      );
      if (candidate) {
        selectOne("#bench-player").value = candidate;
        updateTargets();
        selectOne("#target-slot").value = String(requestedSlot);
      }
      selectOne("#move-feedback").textContent =
        `Opened ${slots[requestedSlot]} from the lineup alert. Review the replacement, then choose Move player.`;
      selectOne("#bench-player").focus();
    }
  }
  if (page === "player-stats") {
    function filterPlayers() {
      const query = selectOne("#player-search").value.trim().toLowerCase();
      let count = 0;
      selectAll("#player-stat-rows tr").forEach((row) => {
        row.hidden = !row.dataset.search.includes(query);
        if (!row.hidden) count++;
      });
      selectOne("#player-count").textContent =
        `${count} ${count === 1 ? "player" : "players"}`;
      selectOne("#stats-empty").hidden = count > 0;
    }
    selectOne("#player-search").addEventListener("input", filterPlayers);
    selectOne("#player-filter").addEventListener("submit", (event) => {
      event.preventDefault();
      filterPlayers();
    });
    selectOne("#player-filter").addEventListener("reset", () =>
      setTimeout(filterPlayers, 0),
    );
  }
})();
