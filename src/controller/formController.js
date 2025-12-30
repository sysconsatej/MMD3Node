import { executeQuery } from "../config/DBConfig.js";
import xlsx from "xlsx";

export const insertUpdate = async (req, res) => {
  try {
    const {
      tableName,
      submitJson,
      formId = null,
      parentColumnName = null,
    } = req.body;

    if (!tableName || !submitJson) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'tableName' and 'submitJson'",
      });
    }

    //

    const parameters = {
      tableName,
      submitJson: submitJson,
      formId,
      parentColumnName,
    };
    const query = `EXEC dynamicMultiSubmit @tableName = @tableName, @submitJson = @submitJson, @formId = @formId, @parentColumnName = @parentColumnName`;

    const rows = await executeQuery(query, parameters);
    const jsonStr = Object.values(rows[0])[0];

    const { error, success } = JSON.parse(jsonStr);

    if (!success) {
      return res.status(500).json({
        success: false,
        message: "Error executing dynamicMultiSubmit",
        error: error,
      });
    }

    const uploadFiles = req?.files?.attachments;

    if (uploadFiles) {
      if (Array.isArray(uploadFiles)) {
        for (const file of uploadFiles) {
          await file.mv(`./uploads/${file.name}`);
        }
      } else {
        await uploadFiles.mv(`./uploads/${uploadFiles.name}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: formId
        ? "Form updated successfully"
        : "Form inserted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing dynamicMultiSubmit",
      error: err.message,
    });
  }
};

export const fetchForm = async (req, res) => {
  try {
    const {
      dropdownFields = [],
      parentTableName,
      recordId,
      childTableNames,
      parentTableColumnName,
    } = req.body;

    if (!parentTableName || !recordId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'parentTableName' and 'recordId'",
      });
    }

    //

    const payload = {
      dropdownFields: JSON.stringify(dropdownFields),
      parentTableName,
      recordId,
      childTableNames,
      parentTableColumnName,
    };
    const query = `EXEC fetchFormDataApi @dropdownFields = @dropdownFields, @parentTableName = @parentTableName, @recordId = @recordId, @childTableNames = @childTableNames, @parentTableColumnName = @parentTableColumnName`;
    const result = await executeQuery(query, payload);

    const jsonStr = Object.values(result[0])[0];
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json({
      success: true,
      message: "Form fetch successfully",
      result: parsed,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing fetchFormDataApi",
      error: err.message,
    });
  }
};

export const deleteRecord = async (req, res) => {
  try {
    const { recordId, tableName, updatedBy, updatedDate } = req.body;

    if (!tableName || !recordId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'tableName' and 'recordId'",
      });
    }

    //

    const payload = {
      tableName,
      recordId,
      updatedBy: req?.body?.updatedBy
        ? req?.body?.updatedBy
        : req?.user?.updatedBy,
      updatedDate: req?.body?.updatedDate
        ? req?.body?.updatedDate
        : req?.user?.updatedDate,
    };

    const query = `EXEC deleteRecordApi @recordId = @recordId, @tableName = @tableName , @updatedBy=@updatedBy , @updatedDate=@updatedDate`;
    const result = await executeQuery(query, payload);

    const jsonStr = Object.values(result[0])[0];
    const parsed = JSON.parse(jsonStr);

    return res.status(200).json({
      success: true,
      message: "Record deleted successfully!",
      result: parsed,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing deleteRecordApi",
      error: err.message,
    });
  }
};

export const uploadExcel = async (req, res) => {
  //
  try {
    const excelFile = req?.files?.excelFile;

    if (!excelFile) {
      return res.status(400).json({
        success: false,
        message: "Missing required field: 'excelFile'",
      });
    }

    // ----------------------------------------
    // 1️⃣ Header Mapping
    // ----------------------------------------
    const keyMap = {
      "CONTAINER NO": "containerNo",
      "Cargo Gross Wt(Kgs)": "grossWt",
      "ISO Code": "isoCode",
      "Weight(Kgs)": "weight",
      "Volume(CBM)": "volume",
      "NO of Package": "noOfPackages",
      "Package Type": "packageId",
      Size: "sizeId",
      Type: "typeId",
      "ISO Code": "isoCode",
    };

    const cleanRow = (row) => {
      const cleaned = {};
      for (const key in row) {
        const value = row[key];
        if (key.startsWith("__EMPTY")) continue;
        if (value === "" || value == null) continue;

        const newKey = keyMap[key];
        if (newKey) cleaned[newKey] = value;
      }
      return cleaned;
    };

    // ----------------------------------------
    // 2️⃣ Read & Clean Excel
    // ----------------------------------------
    const workbook = xlsx.read(excelFile.data, { type: "buffer" });
    const sheet = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheet];
    let data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

    // Remove empty rows
    data = data.filter((row) => Object.values(row).some((v) => v));

    const cleanedData = data
      .map(cleanRow)
      .filter((row) => Object.keys(row).length > 0);

    // ----------------------------------------
    // 3️⃣ Extract Package & Size Codes
    // ----------------------------------------
    const extractCode = (val) => val?.toString().split("-")[0]?.trim() || null;

    const packageCodes = new Set();
    const sizeCodes = new Set();
    const typeCodes = new Set();

    for (const row of cleanedData) {
      if (row.packageId) packageCodes.add(extractCode(row.packageId));
      if (row.sizeId) sizeCodes.add(extractCode(row.sizeId));
      if (row.typeId) typeCodes.add(extractCode(row?.typeId));
    }

    // make a ()  =>
    const pkgArr = [...packageCodes];
    const sizeArr = [...sizeCodes];
    const typeArr = [...typeCodes];

    // If no codes to lookup, skip DB query
    if (pkgArr.length > 0 || sizeArr.length > 0) {
      const params = {};
      const conditions = [];

      // Package codes
      if (pkgArr.length > 0) {
        pkgArr.forEach((code, i) => (params[`pkg${i}`] = code));
        conditions.push(`
          (masterListName = 'tblPackage'
          AND principalCode IS NULL
          AND code IN (${pkgArr.map((_, i) => `@pkg${i}`).join(",")}))
        `);
      }

      // Size codes
      if (sizeArr.length > 0) {
        sizeArr.forEach((code, i) => (params[`size${i}`] = code));
        conditions.push(`
          (masterListName = 'tblSize')
        `);
      }

      if (typeArr.length > 0) {
        typeArr.forEach((code, i) => (params[`typeId${i}`] = code));
        conditions.push(`
          (masterListName = 'tblType'
          AND code IN (${typeArr.map((_, i) => `@typeId${i}`).join(",")}))`);
      }

      const query = `
        SELECT id, code, name, masterListName
        FROM tblMasterData
        WHERE ${conditions.join(" OR ")}
      `;

      const dbRows = await executeQuery(query, params);

      // ----------------------------------------
      // 4️⃣ Build Maps
      // ----------------------------------------
      const packageMap = {};
      const sizeMap = {};
      const typeMap = {};

      for (const row of dbRows) {
        const entry = { Id: row.id, Name: row.name };
        if (row.masterListName === "tblPackage") packageMap[row.code] = entry; // code
        if (row.masterListName === "tblSize") sizeMap[row?.name] = entry; // name
        if (row.masterListName === "tblType") typeMap[row?.code] = entry; //code
      }

      // ----------------------------------------
      // 5️⃣ Replace String IDs With Object IDs
      // ----------------------------------------
      for (const row of cleanedData) {
        if (row.packageId) {
          const code = extractCode(row.packageId);
          row.packageId = packageMap[code] || {};
        }
        if (row.sizeId) {
          row.sizeId = sizeMap[row?.sizeId] || {};
        }
        if (row.typeId) {
          const code = extractCode(row?.typeId);
          row.typeId = typeMap[code] || {};
        }
        if (row?.typeId && row?.sizeId) {
          const isoParams = { sizeId: row.sizeId?.Id, typeId: row?.typeId?.Id };
          const isoQuery = `SELECT id as Id , isocode as Name from tblIsocode where sizeId = ${isoParams?.sizeId} AND typeId = ${isoParams.typeId}`;
          const result = await executeQuery(isoQuery);
          row.isoCode = result[0];
        }
      }
    }

    // ----------------------------------------
    // 6️⃣ Response
    // ----------------------------------------
    return res.status(200).json({
      success: true,
      message: "Excel uploaded successfully!",
      result: cleanedData,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Error executing uploadExcel API",
      error: err.message,
    });
  }
};

const toStr = (v) => {
  if (v == null) return "";
  if (Array.isArray(v))
    return v
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
      .join(",");
  if (typeof v === "object") return JSON.stringify(v); // safe fallback
  return String(v);
};

export const validatePrint = async (req, res) => {
  try {
    const {
      tableName = null,
      recordId,
      reportsName,
      loginCompanyId,
      loginBranchId,
      locationId,
    } = req.body || {};

    // minimal required validation
    if (
      recordId == null ||
      loginCompanyId == null ||
      loginBranchId == null ||
      locationId == null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: recordId, reportsName, loginCompanyId, loginBranchId, locationId",
      });
    }

    // ✅ ensure reportsName is a valid string for mssql NVARCHAR
    const reportsNameStr = toStr(reportsName).trim();
    if (!reportsNameStr) {
      return res.status(400).json({
        success: false,
        message: "reportsName must be a non-empty string",
      });
    }

    const parameters = {
      tableName,
      recordId,
      reportsName: reportsName,
      loginCompanyId,
      loginBranchId,
      locationId,
    };

    const query = `
      EXEC validatePrint
        @tableName = @tableName,
        @recordId = @recordId,
        @reportsName = @reportsName,
        @loginCompanyId = @loginCompanyId,
        @loginBranchId = @loginBranchId,
        @locationId = @locationId
    `;

    const rows = await executeQuery(query, parameters);

    // ✅ extract JSON from first cell
    const firstRow = rows?.[0] ?? null;
    const firstCell = firstRow ? Object.values(firstRow)[0] : null;

    if (!firstCell) return res.status(200).json(null);

    try {
      return res.status(200).json(JSON.parse(firstCell));
    } catch {
      return res.status(200).json(firstCell);
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
