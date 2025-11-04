import { initializeConnection, executeQuerySpData } from "../config/DBConfig.js";

const VALID_SP = /^[A-Za-z0-9_.\[\]]+$/;

const parseForJsonPath = (result) => {
    const rs = result?.recordset;
    if (Array.isArray(rs) && rs.length) {
        const first = rs[0];
        const jsonCol = Object.keys(first).find(
            (k) => k.startsWith("JSON_") || k === "JSON_F52E2B61-18A1-11d1-B105-00805F49916B"
        );
        if (jsonCol) {
            try {
                return JSON.parse(first[jsonCol] || "[]");
            } catch {
            }
        }
        return rs;
    }
    if (Array.isArray(result?.recordsets) && result.recordsets.length) {
        return result.recordsets[0] || [];
    }
    return [];
};

export const uploadToSp = async (req, res) => {
    try {
        const { spName, json } = req.body || {};

        if (!spName || typeof spName !== "string" || !VALID_SP.test(spName)) {
            return res.status(400).send({ success: false, message: "Invalid or missing 'spName'" });
        }
        if (typeof json === "undefined") {
            return res.status(400).send({ success: false, message: "Missing 'json' in request body" });
        }

        await initializeConnection();

        const query = `EXEC ${spName} @json = @json`;
        const jsonText = typeof json === "string" ? json : JSON.stringify(json);

        const result = await executeQuerySpData(query, { json: jsonText });
        const data = parseForJsonPath(result);

        return res.send({
            success: true,
            message: Array.isArray(data) && data.length ? "Data fetched successfully" : "No data returned",
            data: Array.isArray(data) ? data : [],
        });
    } catch (error) {
        console.error("❌ uploadToSp error:", error);
        return res.status(500).send({
            success: false,
            message: error?.message || "Internal Server Error",
            data: [],
        });
    }
};
