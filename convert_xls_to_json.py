#!/usr/bin/env python3
import xlrd
import json
import sys

def convert_xls_to_json(xls_file):
    try:
        # 打开 Excel 文件
        workbook = xlrd.open_workbook(xls_file)
        print(f'工作簿包含 {workbook.nsheets} 个工作表')
        print(f'工作表名称: {workbook.sheet_names()}')

        # 转换所有工作表
        all_data = {}
        for sheet_name in workbook.sheet_names():
            sheet = workbook.sheet_by_name(sheet_name)
            print(f'\n处理工作表 "{sheet_name}": {sheet.nrows} 行, {sheet.ncols} 列')

            # 获取标题行（假设第一行是标题）
            if sheet.nrows > 0:
                headers = [sheet.cell_value(0, j) for j in range(sheet.ncols)]
                print(f'标题: {headers}')

                # 读取数据行
                data_rows = []
                for i in range(1, sheet.nrows):
                    row_data = {}
                    for j in range(sheet.ncols):
                        cell_value = sheet.cell_value(i, j)
                        # 处理不同类型的单元格值
                        if sheet.cell_type(i, j) == xlrd.XL_CELL_TEXT:
                            row_data[headers[j]] = str(cell_value)
                        elif sheet.cell_type(i, j) == xlrd.XL_CELL_NUMBER:
                            row_data[headers[j]] = float(cell_value) if cell_value != int(cell_value) else int(cell_value)
                        elif sheet.cell_type(i, j) == xlrd.XL_CELL_DATE:
                            row_data[headers[j]] = xlrd.xldate_as_datetime(cell_value, workbook.datemode).strftime('%Y-%m-%d')
                        elif sheet.cell_type(i, j) == xlrd.XL_CELL_BOOLEAN:
                            row_data[headers[j]] = bool(cell_value)
                        elif sheet.cell_type(i, j) == xlrd.XL_CELL_EMPTY:
                            row_data[headers[j]] = None
                        else:
                            row_data[headers[j]] = str(cell_value)
                    data_rows.append(row_data)

                all_data[sheet_name] = {
                    'headers': headers,
                    'rows': data_rows,
                    'total': len(data_rows)
                }

        return all_data

    except Exception as e:
        print(f'错误: {e}')
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    xls_file = '高氏家族.xls'
    data = convert_xls_to_json(xls_file)

    if data:
        # 输出 JSON
        output_file = '高氏家族.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'\n成功转换！输出文件: {output_file}')
        print(f'JSON 文件大小: {len(json.dumps(data, ensure_ascii=False))} 字符')

        # 显示预览
        print('\n数据预览:')
        print(json.dumps(data, ensure_ascii=False, indent=2)[:1000])
    else:
        print('转换失败')
        sys.exit(1)