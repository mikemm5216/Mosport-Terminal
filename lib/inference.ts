export async function getXGBoostInference(homeTeamId: string, awayTeamId: string, sport: string): Promise<number> {
    try {
        // Deterministic Feature Extraction (Placeholder for real DB stats)
        // Feature vector length: 6 [Home World, Away World, Home Physio, Away Physio, Home Psycho, Away Psycho]
        // Currently using a baseline of 0.5 for all features to represent neutral state
        // This is NO LONGER RANDOM. It is a stable baseline for the neural link.
        const featureVector = [0.5, 0.5, 0.5, 0.5, 0.5, 0.5];

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
            next: { revalidate: 300 } // Cache for 5 mins
        });

        if (!response.ok) {
            console.error(`[INFERENCE_OFFLINE] Status: ${response.status}`);
            return -1.0;
        }

        const data = await response.json();
        return data.probability ?? -1.0;
    } catch (e) {
        console.error(`[INFERENCE_CRITICAL_FAILURE]`, e);
        return -1.0;
    }
}
