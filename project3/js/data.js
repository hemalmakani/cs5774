/* Fictional Week 7 data retained from Projects 1 and 2.
   Content is shared by the original team features and Project 3 interactions. */
"use strict";
(() => {
  const slots = [
    "QB",
    "RB 1",
    "RB 2",
    "WR 1",
    "WR 2",
    "TE",
    "FLEX",
    "DST",
    "K",
  ];
  const players = [
    {
      id: "carter",
      name: "Alex Carter",
      position: "QB",
      points: 23,
      status: "Healthy",
      receptions: 0,
    },
    {
      id: "cole",
      name: "Mason Cole",
      position: "RB",
      points: 0,
      status: "Bye",
      receptions: 0,
    },
    {
      id: "reed",
      name: "Devin Reed",
      position: "RB",
      points: 18.2,
      status: "Healthy",
      receptions: 4,
    },
    {
      id: "brooks",
      name: "Evan Brooks",
      position: "WR",
      points: 16.3,
      status: "Questionable",
      receptions: 5,
    },
    {
      id: "grant",
      name: "Leo Grant",
      position: "WR",
      points: 14.1,
      status: "Healthy",
      receptions: 4,
    },
    {
      id: "hayes",
      name: "Owen Hayes",
      position: "TE",
      points: 11.4,
      status: "Healthy",
      receptions: 3,
    },
    {
      id: "price",
      name: "Noah Price",
      position: "WR",
      points: 12.4,
      status: "Healthy",
      receptions: 4,
    },
    {
      id: "bears",
      name: "Bears defense",
      position: "DST",
      points: 7,
      status: "Healthy",
      receptions: 0,
    },
    {
      id: "west",
      name: "Ryan West",
      position: "K",
      points: 6,
      status: "Healthy",
      receptions: 0,
    },
    {
      id: "wells",
      name: "Jordan Wells",
      position: "RB",
      points: 17,
      status: "Healthy",
      receptions: 3,
    },
    {
      id: "stone",
      name: "Caleb Stone",
      position: "RB",
      points: 14,
      status: "Healthy",
      receptions: 2,
    },
    {
      id: "king",
      name: "Sam King",
      position: "TE",
      points: 9,
      status: "Healthy",
      receptions: 3,
    },
  ];
  const byId = Object.fromEntries(players.map((player) => [player.id, player]));
  const seedTeams = [
    {
      id: "strategists",
      name: "Sunday Strategists",
      league: "Friends League",
      record: "4–2",
      crest: "strategists",
    },
    {
      id: "runners",
      name: "Red Zone Runners",
      league: "Office League",
      record: "3–3",
      crest: "runners",
    },
    {
      id: "giants",
      name: "Goal Line Giants",
      league: "Family League",
      record: "5–1",
      crest: "giants",
    },
  ].map((team) => ({
    ...team,
    scoring: "Full PPR",
    roster: players.map((player) => player.id),
    lineup: players.slice(0, 9).map((player) => player.id),
  }));
  window.FantasyData = Object.freeze({ slots, players, byId, seedTeams });
})();
