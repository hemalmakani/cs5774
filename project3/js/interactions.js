/* Project 3: simulated search and two complete jQuery interactions.
   Search: a native GET form passes q to search-results.html.
   Interaction 1: delegated click events manage the player watchlist.
   Interaction 2: a change event previews the selected scoring format.
   Application logic is specific to this prototype; jQuery is the only library.
   User-entered text is inserted with .text(), never interpreted as HTML. */
"use strict";

jQuery(function ($) {
  const { byId } = window.FantasyData;
  const normalizePhrase = (value) => value.trim().replace(/\s+/g, " ").toLowerCase();

  // Keep native GET navigation, so the query can be bookmarked and shared.
  $(".site-search").on("submit", function () {
    const $input = $(this).find("[name='q']");
    $input.val(normalizePhrase($input.val()));
  });

  if ($("body").attr("data-page") === "search-results") {
    const submittedPhrase = new URLSearchParams(window.location.search).get("q") || "";
    const keyphrase = normalizePhrase(submittedPhrase);
    $("#site-query").val(submittedPhrase);
    const $results = $("#search-results").empty();

    // This is deliberately simulated: an exact phrase chooses a fixed result set.
    // There is no server request, filtering algorithm, or actual search index.
    if (keyphrase === "running backs") {
      $("#search-results-heading").text("Results for running backs");
      $("#search-status").text("3 sample players · Week 7 · Full PPR projections");
      ["wells", "stone", "reed"].forEach((id) => {
        const player = byId[id];
        const $result = $("<article>").addClass("search-result");
        $("<h3>")
          .append($("<a>", { href: `player-stats.html#player-${id}` }).text(player.name))
          .appendTo($result);
        $("<p>")
          .text(`${player.position} · ${player.status} · ${player.points.toFixed(1)} projected points`)
          .appendTo($result);
        $("<a>", { href: `player-stats.html#player-${id}` })
          .text(`View ${player.name} in Player Stats`)
          .appendTo($result);
        $results.append($result);
      });
    } else {
      $("#search-results-heading").text("No results found");
      $("#search-status").text(
        keyphrase
          ? `No sample results for “${submittedPhrase}”. Try running backs in the search box above.`
          : "Enter running backs in the search box above to see sample players.",
      );
      $("<p>")
        .append($("<a>", { href: "player-stats.html" }).text("Browse all players"))
        .appendTo($results);
    }
  }

  if ($("#player-workspace").length) {
    const storageKey = "fantasy-manager-project3-watchlist-v1";
    const watched = new Set();
    let storageAvailable = true;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (Array.isArray(saved)) {
        saved.filter((id) => Object.hasOwn(byId, id)).forEach((id) => watched.add(id));
      }
    } catch (error) {
      storageAvailable = false;
    }

    function updatePlayerRow(id, selected) {
      const $row = $("#player-stat-rows").find(`#player-${id}`);
      // Modify the existing table row and its button instead of duplicating them.
      $row.toggleClass("is-watched", selected);
      $row.find(".watch-toggle")
        .attr("aria-pressed", String(selected))
        .attr("aria-label", `${selected ? "Unwatch" : "Watch"} ${byId[id].name}`)
        .text(selected ? "Watching" : "Watch");
    }

    function appendWatchlistItem(id) {
      const player = byId[id];
      const $item = $("<li>", { "data-player-id": id }).addClass("watchlist-item");
      const $identity = $("<div>");
      $("<strong>").text(player.name).appendTo($identity);
      $("<span>").addClass("subtext")
        .text(`${player.position} · ${player.status} · ${player.points.toFixed(1)} pts`)
        .appendTo($identity);
      $item.append($identity);
      // This button does not exist when the parent click handler is registered.
      $("<button>", {
        type: "button",
        "data-player-id": id,
        "aria-label": `Remove ${player.name} from watchlist`,
      }).addClass("button secondary watch-remove")
        .text("Remove from watchlist")
        .appendTo($item);
      $("#watchlist").append($item);
    }

    function updateCount() {
      $("#watchlist-count").text(`${watched.size} ${watched.size === 1 ? "player" : "players"} watched`);
      $("#watchlist-empty").prop("hidden", watched.size !== 0);
    }

    // INTERACTION 1 — click + event delegation + traversal.
    // A single stable parent handles original table buttons AND newly added
    // watchlist removal buttons. No listeners are bound to individual players.
    $("#player-workspace").on("click", ".watch-toggle, .watch-remove", function () {
      const $control = $(this);
      const id = $control.attr("data-player-id");
      if (!Object.hasOwn(byId, id)) return;
      const removing = watched.has(id);
      if (removing) {
        watched.delete(id);
        $("#watchlist").children().filter(function () {
          return $(this).attr("data-player-id") === id;
        }).remove();
      } else {
        watched.add(id);
        appendWatchlistItem(id); // Add a new li, identity text, and removal button.
      }
      updatePlayerRow(id, !removing);
      updateCount();
      try {
        localStorage.setItem(storageKey, JSON.stringify([...watched]));
        storageAvailable = true;
      } catch (error) {
        storageAvailable = false;
      }
      const message = `${byId[id].name} ${removing ? "removed from" : "added to"} your watchlist.`;
      $("#watchlist-feedback").text(message + (storageAvailable
        ? " Saved in this browser."
        : " Browser storage is unavailable; this change lasts only while this page is open."));

      // Keep keyboard focus useful after removing the button that was activated.
      if ($control.hasClass("watch-remove")) {
        const $original = $("#player-stat-rows").find(`#player-${id} .watch-toggle`);
        if ($original.is(":visible")) $original.trigger("focus");
        else $("#watchlist-title").attr("tabindex", "-1").trigger("focus");
      }
    });

    watched.forEach((id) => {
      updatePlayerRow(id, true);
      appendWatchlistItem(id);
    });
    updateCount();
    if (!storageAvailable) {
      $("#watchlist-feedback").text("Browser storage is unavailable. Watchlist changes will last only while this page is open.");
    }
  }

  // INTERACTION 2 — change + DOM traversal, with no form validation involved.
  // Move from the changed select up to its field/form, then down to the helper,
  // preview container, and player labels. Selection stays scoped to this form.
  $("#scoring").on("change", function () {
    const $select = $(this);
    const format = $select.val();
    const rates = { "Full PPR": 1, "Half PPR": 0.5, Standard: 0 };
    if (!Object.hasOwn(rates, format)) return;
    const rate = rates[format];
    const $field = $select.closest(".field");
    const $form = $field.closest("form");
    const description = rate === 0 ? "No points for receptions." : `${rate} ${rate === 1 ? "point" : "points"} per reception.`;
    $field.find("#scoring-help").text(`${format}: ${description} Player projections below have updated.`);
    $field.addClass("scoring-updated");

    $form.find(".player-choice").each(function () {
      const $choice = $(this);
      const player = byId[$choice.find("input[name='roster']").val()];
      const projection = player.points - player.receptions * (1 - rate);
      $choice.find(".player-projection").text(`${player.position} · ${projection.toFixed(1)} projected points`);
    });

    const example = byId.wells;
    const basePoints = example.points - example.receptions;
    const receptionPoints = example.receptions * rate;
    // A new paragraph is created on each change; it is not a prewritten hidden
    // message. Replace the previous example so the UI remains compact.
    $field.find("#scoring-preview").empty().append(
      $("<p>").addClass("score-example")
        .text(`${example.name}: ${basePoints.toFixed(1)} base points + ${receptionPoints.toFixed(1)} reception points = ${(basePoints + receptionPoints).toFixed(1)} projected points in ${format}.`),
    );
  });
});
