/**
 * Secure Data Scrubbing Utility
 * Recursively removes any property containing 'internal_code' or 'internalCode'
 * to ensure no proprietary classification IDs are exposed in the frontend.
 */
export function stripInternalCodes<T>(data: T): T {
    if (data === null || typeof data !== "object") {
        return data;
    }

    if (Array.isArray(data)) {
        return data.map(stripInternalCodes) as unknown as T;
    }

    const result: any = {};
    for (const [key, value] of Object.entries(data)) {
        if (key.toLowerCase().includes("internalcode") || key.toLowerCase().includes("internal_code")) {
            continue; // Scrub it
        }
        result[key] = stripInternalCodes(value);
    }

    return result as T;
}
