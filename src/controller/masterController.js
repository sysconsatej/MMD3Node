import {
  closeConnection,
  executeQuery,
  initializeConnection,
} from "../config/DBConfig.js";

export const createMaster = async (req, res) => {
  try {
    await initializeConnection();

    const query = `EXEC insertDataApi @json = @json, @formId = @formId, @clientId = @clientId, @createdBy = @createdBy, @loginCompanyId = @loginCompanyId, @loginCompanyBranchId = @loginCompanyBranchId, @finYearId = @finYearId`;

    const parameters = {
      json: JSON.stringify(req.body),
      formId: req.body.menuID,
      clientId: req.clientId,
      createdBy: req.userId,
      loginCompanyId: req.body.loginCompany,
      loginCompanyBranchId: req.body.loginBranch,
      finYearId: req.body.loginfinYear,
    };

    const result = await executeQuery(query, parameters);
    res.send({
      success: true,
      message: "Data Inserted Successfully",
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error executing master API",
      error: err.message,
    });
  } finally {
    await closeConnection();
  }
};
