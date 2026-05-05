export async function getXGBoostInference(homeTeamId: string, awayTeamId: string, sport: string, fallbackProb?: number): Promise<number> {
    try {
        const featureVector = [0, 0, 0, 0, 0, 0];

        const response = await fetch("http://localhost:8000/api/v1/inference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model_id: "latest",
                home_team: homeTeamId,
                away_team: awayTeamId,
                feature_vector: featureVector,
                model_type: sport === "basketball" ? "NBA-MAIN" : "MLB-MAIN"
            }),
            next: { revalidate: 300 }
        });

        if (!response.ok) {
            if (fallbackProb !== undefined) return fallbackProb;
            return -1.0;
        }

        const data = await response.json();
        const prob = data.probability ?? fallbackProb;
        if (prob !== undefined) return prob;

        return -1.0;
    } catch (e) {
        if (fallbackProb !== undefined) return fallbackProb;
        return -1.0;
    }
}
