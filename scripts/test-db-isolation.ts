import { prismaPublic } from "../lib/prismaPublic";
import { prismaQuant } from "../lib/prismaQuant";

async function testIsolation() {
    console.log("[Test] --- ISOLATION ASSERTION ---");

    // 1. Verify prismaPublic does NOT have access to quant_internal models (TS check simulation)
    const publicModels = Object.keys(prismaPublic);
    const quantModels = ["matchFeatures", "odds", "eventSnapshot"];

    for (const model of quantModels) {
        if (publicModels.includes(model)) {
            console.error(`[SECURITY FAILURE] prismaPublic has access to internal model: ${model}`);
            process.exit(1);
        }
    }
    console.log("✅ prismaPublic Isolation: PASS");

    // 2. Verify prismaQuant exists
    if (!prismaQuant) {
        console.error("[SECURITY FAILURE] prismaQuant client missing.");
        process.exit(1);
    }
    console.log("✅ prismaQuant Existence: PASS");
}

testIsolation().catch(console.error);
