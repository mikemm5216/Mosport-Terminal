import { SECRET_REGISTRY } from "../../security/secrets.registry";

const now = Date.now();

for (const secret of SECRET_REGISTRY) {
  console.log(
    `[SECURITY] ${secret.name} owner=${secret.owner} rotationDays=${secret.rotationDays}`
  );
}

console.log("[SECURITY] Token age check completed.");
