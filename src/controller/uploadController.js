// controllers/uploadToSp.js
import { initializeConnection, executeQuerySpData } from "../config/DBConfig.js";

const VALID_SP = /^[A-Za-z0-9_.\[\]]+$/;

const safeParse = (t) => { try { return typeof t === "string" ? JSON.parse(t) : t; } catch { return {}; } };

const parseForJsonPath = (result) => {
    const rs = result?.recordset;
    if (Array.isArray(rs) && rs.length) {
        const first = rs[0];
        const jsonCol = Object.keys(first).find(
            (k) => k.startsWith("JSON_") || k === "JSON_F52E2B61-18A1-11d1-B105-00805F49916B"
        );
        if (jsonCol) {
            try { return JSON.parse(first[jsonCol] || "[]"); } catch { }
        }
        return rs;
    }
    if (Array.isArray(result?.recordsets) && result.recordsets.length) return result.recordsets[0] || [];
    return [];
};

export const uploadToSp = async (req, res) => {
    try {
        const { spName, json } = req.body || {};
        if (!spName || typeof spName !== "string" || !VALID_SP.test(spName))
            return res.status(400).send({ success: false, message: "Invalid or missing 'spName'", data: [] });
        if (typeof json === "undefined")
            return res.status(400).send({ success: false, message: "Missing 'json' in request body", data: [] });

        await initializeConnection();

        const obj = safeParse(json);
        const sp = spName.trim();

        if (sp.toLowerCase() === "inputmbl") {
            // 1) reshape header -> criteria for the SP
            const header = obj.header || obj.criteria || {};
            const data = Array.isArray(obj.data) ? obj.data : [];

            const wrapped = {
                criteria: {
                    fpdId: header.fpdId ?? null,
                    podvesselId: header.podvesselId ?? null,
                    submitterTypeId: header.submitterTypeId ?? null,
                    consigneeIdNo: header.consigneeIdNo ?? null,
                },
                data,
            };

            // 2) pass the required extra params
            const params = {
                json: JSON.stringify(wrapped),
                createdBy: header.userId ?? header.createdBy ?? 0,
                clientId: header.clientId ?? 0,
                companyId: header.companyId ?? 0,
                companyBranchId: header.companyBranchId ?? 0,
            };

            const query =
                `EXEC ${sp} ` +
                `@json=@json, ` +
                `@createdBy=@createdBy, @clientId=@clientId, @companyId=@companyId, @companyBranchId=@companyBranchId`;

            const result = await executeQuerySpData(query, params);
            const payload = parseForJsonPath(result);

            // If SP returned {success,message} forward it; else wrap
            if (payload && typeof payload === "object" && !Array.isArray(payload) && "success" in payload) {
                return res.send(payload);
            }
            return res.send({ success: true, message: "Executed inputMbl", data: Array.isArray(payload) ? payload : [] });
        }

        // default: SPs that only expect @json
        const query = `EXEC ${sp} @json=@json`;
        const result = await executeQuerySpData(query, { json: typeof json === "string" ? json : JSON.stringify(json) });
        const dataOut = parseForJsonPath(result);
        return res.send({
            success: true,
            message: Array.isArray(dataOut) && dataOut.length ? "Data fetched successfully" : "No data returned",
            data: Array.isArray(dataOut) ? dataOut : [],
        });
    } catch (error) {
        console.error("❌ uploadToSp error:", error);
        return res.status(500).send({ success: false, message: error?.message || "Internal Server Error", data: [] });
    }
};
