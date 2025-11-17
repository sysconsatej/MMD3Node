import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";
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

    await initializeConnection();

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
  } finally {
    await closeConnection();
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

    await initializeConnection();

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
  } finally {
    await closeConnection();
  }
};

export const deleteRecord = async (req, res) => {
  try {
    const { recordId, tableName } = req.body;

    if (!tableName || !recordId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: 'tableName' and 'recordId'",
      });
    }

    await initializeConnection();

    const payload = {
      tableName,
      recordId,
    };

    const query = `EXEC deleteRecordApi @recordId = @recordId, @tableName = @tableName`;
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
  } finally {
    await closeConnection();
  }
};

// export const uploadExcel = async (req, res) => {
//   await initializeConnection();
//   try {
//     const excelFile = req?.files?.excelFile;

//     if (!excelFile) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields: 'excelFile'",
//       });
//     }

//     const keyMap = {
//       "CONTAINER NO": "containerNo",
//       "Cargo Gross Wt(Kgs)": "grossWt",
//       "ISO Code": "isoCode",
//       "Weight(Kgs)": "weight",
//       "Volume(CBM)": "volume",
//       "NO of Package": "noOfPackages",
//       "Package Type": "packageId",
//       "Size" :  "sizeId",
//     };

//     function cleanRow(row) {
//       const cleaned = {};
//       for (const key in row) {
//         const value = row[key];
//         if (key.startsWith("__EMPTY")) continue;
//         if (value === "" || value == null) continue;

//         const newKey = keyMap[key];
//         if (newKey) cleaned[newKey] = value;
//       }
//       return cleaned;
//     }

//     // Read excel
//     const workbook = xlsx.read(excelFile.data, { type: "buffer" });
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];
//     let data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

//     data = data.filter((row) => Object.values(row).some((v) => v));

//     const cleanedData = data
//       .map((row) => cleanRow(row))
//       .filter((r) => Object.keys(r).length > 0);

//     const extractCode = (val) => {
//       return val?.toString().split("-")[0]?.trim();
//     };

//     const packageCodes = new Set();
//     const sizeCodes = new Set();

//     for (const row of cleanedData) {
//       if (row.packageId) packageCodes.add(extractCode(row.packageId));
//     }

//     const pkgArr = [...packageCodes];
//     const sizeArr = [...sizeCodes];

//     const allCodes = [...pkgArr, ...sizeArr];

//     if (allCodes.length > 0) {
//       const params = {};

//       pkgArr.forEach((code, i) => (params[`pkg${i}`] = code));
//       sizeArr.forEach((code, i) => (params[`size${i}`] = code));

//       const query = `
//   SELECT id, code, name, masterListName
//   FROM tblMasterData
//   WHERE
//     (
//       masterListName = 'tblPackage'
//       AND principalCode IS NULL
//       AND code IN (${pkgArr.map((_, i) => `@pkg${i}`).join(",")})
//     )
//    OR
//     (
//       masterListName = "tblSize"
//       AND code IN (${sizeArr.map((_, i) => `@size${i}`).join(",")})
//    )

//     `;

//       const rows = await executeQuery(query, params);

//       const packageMap = {};
//       const  sizeMap = {};

//       for (const row of rows) {
//         const entry = { Id: row.id, Name: row.name };

//         if (row.masterListName === "tblPackage") {
//           packageMap[row.code] = entry;
//         }
//         if(row.masterListName === "tblSize"){
//           sizeMap[row.code] = entry;
//         }
//       }

//       for (const row of cleanedData) {
//         if (row.packageId) {
//           const code = extractCode(row.packageId);
//           console.log("package code", code, { ...packageMap[code] });
//           row.packageId = packageMap[code] || {};
//         }

//         if (row.sizeId) {
//           const code = extractCode(row.sizeId);
//           row.sizeId = sizeMap[code] || {};
//         }
//       }
//     }

//     return res.status(200).json({
//       success: true,
//       message: "Excel uploaded successfully!",
//       result: cleanedData,
//     });
//   } catch (err) {
//     return res.status(500).json({
//       success: false,
//       message: "Error executing uploadExcel API",
//       error: err.message,
//     });
//   } finally {
//     await closeConnection();
//   }
// };

export const uploadExcel = async (req, res) => {
  await initializeConnection();
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
      "Size": "sizeId",
      "Type": "typeId",
      "ISO Code" : "isoCode"
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

    console.log(typeArr, "[][][[]");

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

      console.log(dbRows);

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
  } finally {
    await closeConnection();
  }
};
