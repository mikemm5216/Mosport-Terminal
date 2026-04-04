async function main() {
    const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
    const res = await fetch(url);
    const data = await res.json();
    const event = data.events[0];
    const comp = event.competitions[0];
    console.log("Competition keys:", Object.keys(comp));
    if (comp.odds) console.log("Odds[0] keys:", Object.keys(comp.odds[0]));
    if (comp.predictor) console.log("Predictor keys:", Object.keys(comp.predictor));
    const hComp = comp.competitors.find(c => c.homeAway === "home");
    console.log("Home Competitor keys:", Object.keys(hComp));
}
main();
