import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function convertExcelToJson(excelFile) {
  try {
    // 读取 Excel 文件
    const workbook = XLSX.readFile(excelFile);
    console.log(`工作簿包含 ${workbook.SheetNames.length} 个工作表`);
    console.log(`工作表名称: ${workbook.SheetNames.join(', ')}`);

    // 转换所有工作表
    const allData = {};
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const rowCount = range.e.r - range.s.r + 1;
      const colCount = range.e.c - range.s.c + 1;

      console.log(`\n处理工作表 "${sheetName}": ${rowCount} 行, ${colCount} 列`);

      // 转换为 JSON（使用第一行作为标题）
      const jsonData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,  // 先获取所有数据（数组格式）
        defval: null,
        raw: false  // 获取格式化的字符串值
      });

      if (jsonData.length > 0) {
        // 第一行是标题
        const headers = jsonData[0];
        console.log(`标题: ${headers.join(', ')}`);

        // 转换为对象数组
        const rows = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = {};
          let hasData = false;
          headers.forEach((header, j) => {
            const value = jsonData[i][j];
            if (value !== undefined && value !== null && value !== '') {
              hasData = true;
              row[header] = value;
            } else {
              row[header] = null;
            }
          });
          if (hasData) {
            rows.push(row);
          }
        }

        allData[sheetName] = {
          headers: headers,
          rows: rows,
          total: rows.length
        };
      }
    });

    return allData;
  } catch (error) {
    console.error('错误:', error.message);
    console.error(error.stack);
    return null;
  }
}

// 主程序
const excelFile = '高氏家族.xls';
const data = convertExcelToJson(excelFile);

if (data) {
  // 输出 JSON 文件
  const outputFile = '高氏家族.json';
  fs.writeFileSync(outputFile, JSON.stringify(data, null, 2), 'utf8');
  console.log(`\n✅ 成功转换！输出文件: ${outputFile}`);

  const jsonStr = JSON.stringify(data);
  console.log(`JSON 文件大小: ${jsonStr.length} 字符`);

  // 显示预览
  console.log('\n数据预览:');
  const preview = JSON.stringify(data, null, 2).substring(0, 1000);
  console.log(preview);
  if (preview.length >= 1000) {
    console.log('\n...（预览截断，查看完整数据请打开 JSON 文件）');
  }

  // 统计信息
  console.log('\n📊 数据统计:');
  Object.keys(data).forEach(sheetName => {
    console.log(`  ${sheetName}: ${data[sheetName].total} 行数据`);
  });
} else {
  console.log('❌ 转换失败');
  process.exit(1);
}