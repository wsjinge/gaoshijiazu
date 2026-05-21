import React, { useState } from 'react';
import { Card, Button, Upload, message, Tabs, Table, Alert, Space, Divider } from 'antd';
import { DownloadOutlined, UploadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import type { Member } from '../../types';
import { getMembers, getTreeData, createMember } from '../../api';
import * as XLSX from 'xlsx';

interface Props {
  members: Member[];
  generations: any[];
  onImport: () => void;
}

const ImportExport: React.FC<Props> = ({ members, generations, onImport }) => {
  const [importing, setImporting] = useState(false);

  // Export to Excel
  const handleExportExcel = async () => {
    try {
      const allMembers = await getMembers();
      const data = allMembers.map(m => ({
        '姓名': m.name,
        '派名': m.pai_name || '',
        '性别': m.gender,
        '世系': `第${m.gen_number}代`,
        '字辈': m.gen_pai_zi,
        '出生年': m.birth_year || '',
        '状态': m.is_deceased ? '已殁' : '在世',
        '殁年': m.death_year || '',
        '父亲': members.find(p => p.id === m.father_id)?.name || '',
        '配偶': m.spouse_info?.map(s => s.name).join('、') || '',
        '备注': m.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      // Set column widths
      ws['!cols'] = Object.keys(data[0]).map(() => ({ wch: 12 }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '高氏族谱');
      XLSX.writeFile(wb, '高氏族谱.xlsx');
      message.success('导出成功');
    } catch (e) {
      message.error('导出失败');
    }
  };

  // Export template
  const handleExportTemplate = () => {
    const template = [
      {
        '姓名': '示例姓名',
        '派名': '派名',
        '性别': '男/女',
        '第几代': 23,
        '出生年': 2000,
        '出生月': 1,
        '出生日': 1,
        '已故(1是/0否)': 0,
        '殁年': '',
        '殁月': '',
        '殁日': '',
        '父亲姓名': '父亲名字',
        '配偶姓名': '配偶名',
        '配偶出生': '',
        '配偶殁': '',
        '嗣/出承': '',
        '备注': '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = Object.keys(template[0]).map(() => ({ wch: 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '导入模板');
    XLSX.writeFile(wb, '族谱导入模板.xlsx');
    message.success('模板已下载');
  };

  // Import from Excel
  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws) as any[];

      let imported = 0;
      for (const row of json) {
        const name = row['姓名'];
        if (!name) continue;

        // Find father by name
        let fatherId = null;
        if (row['父亲姓名']) {
          const father = members.find(m => m.name === row['父亲姓名']);
          if (father) fatherId = father.id;
        }

        // Get generation
        const genNum = row['第几代'] || 23;
        const genMap: Record<number, number> = {
          17: 17, 18: 18, 19: 19, 20: 20, 21: 21, 22: 22, 23: 23,
        };

        await createMember({
          name,
          pai_name: row['派名'] || null,
          generation_id: genMap[genNum] || 23,
          gender: row['性别'] || '男',
          birth_year: row['出生年'] || null,
          birth_month: row['出生月'] || null,
          birth_day: row['出生日'] || null,
          father_id: fatherId,
          is_deceased: row['已故(1是/0否)'] || 0,
          death_year: row['殁年'] || null,
          notes: row['备注'] || null,
        });
        imported++;
      }

      message.success(`成功导入 ${imported} 条记录`);
      onImport();
    } catch (e: any) {
      message.error('导入失败：' + (e?.message || ''));
    } finally {
      setImporting(false);
    }
    return false;
  };

  const exportColumns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '派名', dataIndex: 'pai_name', key: 'pai_name' },
    { title: '世系', dataIndex: 'gen', key: 'gen' },
    { title: '配偶', dataIndex: 'spouse', key: 'spouse' },
    { title: '状态', dataIndex: 'status', key: 'status' },
  ];

  const exportData = members.map(m => ({
    key: m.id,
    name: m.name,
    pai_name: m.pai_name || '-',
    gen: `第${m.gen_number}代`,
    spouse: m.spouse_info?.map(s => s.name).join('、') || '-',
    status: m.is_deceased ? '已殁' : '在世',
  }));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title="📤 导入导出">
        <Tabs
          items={[
            {
              key: 'export',
              label: '导出数据',
              children: (
                <div>
                  <Alert message="导出现有族谱数据为Excel文件，方便备份和打印" type="info" showIcon style={{ marginBottom: 16 }} />
                  <Space>
                    <Button type="primary" icon={<FileExcelOutlined />} onClick={handleExportExcel} size="large">
                      导出Excel
                    </Button>
                    <Button icon={<DownloadOutlined />} onClick={handleExportTemplate} size="large">
                      下载导入模板
                    </Button>
                  </Space>
                  <Divider />
                  <Table columns={exportColumns} dataSource={exportData} pagination={false} size="small" scroll={{ y: 300 }} />
                </div>
              ),
            },
            {
              key: 'import',
              label: '导入数据',
              children: (
                <div>
                  <Alert
                    message="导入说明"
                    description="先下载导入模板，按模板格式填写数据后上传。支持批量导入。"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  <Upload.Dragger
                    accept=".xlsx,.xls"
                    beforeUpload={handleImport}
                    showUploadList={false}
                    disabled={importing}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽Excel文件到此区域上传</p>
                    <p className="ant-upload-hint">支持 .xlsx 和 .xls 格式</p>
                  </Upload.Dragger>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
};

export default ImportExport;
