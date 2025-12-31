// import fs from "fs";
// import path from "path";

// const FOLDER_PATH = "C:\\Users\\Admin\\Downloads\\sarImages\\SAR";
// const OUTPUT_FILE = "sample.json";
// const SIZE_LIMIT_KB = 5000;

// function getFolderInfo(folderPath) {
//   let totalSize = 0;
//   let files = [];

//   const items = fs.readdirSync(folderPath);

//   for (const item of items) {
//     const fullPath = path.join(folderPath, item);
//     const stat = fs.statSync(fullPath);

//     if (stat.isFile()) {
//       totalSize += stat.size; // bytes
//       files.push(item);
//     }
//   }

//   const totalSizeKB = totalSize / 1024;

//   if (totalSizeKB > SIZE_LIMIT_KB) {
//     return {
//       folderPath,
//       totalSizeKB: totalSizeKB.toFixed(2),
//       fileCount: files.length,
//       files
//     };
//   }

//   return {
//     folderPath,
//     totalSizeKB: totalSizeKB.toFixed(2),
//     message: "Folder size is below limit"
//   };
// }

// // Generate JSON
// const result = getFolderInfo(FOLDER_PATH);

// // Write to file
// fs.writeFileSync(
//   OUTPUT_FILE,
//   JSON.stringify(result, null, 2),
//   "utf-8"
// );

// console.log(`JSON written to ${OUTPUT_FILE}`);


import fs from "fs";
import path from "path";
import xlsx from "xlsx";

const FOLDER_PATH = "C:\\Users\\Admin\\Downloads\\sarImages\\SAR";
const OUTPUT_FILE = "sample.xlsx";
const SIZE_LIMIT_KB = 5000;

function getFolderInfo(folderPath) {
  let totalSize = 0;
  let rows = [];

  const items = fs.readdirSync(folderPath);

  for (const item of items) {
    const fullPath = path.join(folderPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      totalSize += stat.size;

      rows.push({
        FileName: item,
        SizeKB: (stat.size / 1024).toFixed(2)
      });
    }
  }

  return {
    totalSizeKB: totalSize / 1024,
    rows
  };
}

const { totalSizeKB, rows } = getFolderInfo(FOLDER_PATH);

if (totalSizeKB > SIZE_LIMIT_KB) {
  // Create worksheet
  const worksheet = xlsx.utils.json_to_sheet(rows);

  // Create workbook
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Files");

  // Write Excel file
  xlsx.writeFile(workbook, OUTPUT_FILE);

  console.log(`Excel file created: ${OUTPUT_FILE}`);
} else {
  console.log("Folder size is below 5000 KB. XLSX not created.");
}
