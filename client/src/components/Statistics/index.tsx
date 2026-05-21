import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spin, Table } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts';
import { getStatistics } from '../../api';
import type { Statistics } from '../../types';

const COLORS = ['#52c41a', '#d9d9d9', '#faad14'];

const StatsPage: React.FC = () => {
  const [stats, setStats] = useState<Statistics | null>(null);

  useEffect(() => {
    getStatistics().then(setStats);
  }, []);

  if (!stats) return <Spin style={{ display: 'block', marginTop: 100 }} />;

  const totalStatus = stats.living + stats.deceased + stats.deceased_unknown;

  const pieData = [
    { name: '在世', value: stats.living },
    { name: '已殁（详）', value: stats.deceased },
    { name: '已殁（未详）', value: stats.deceased_unknown },
  ];

  const genderData = [
    { name: '男', value: stats.male },
    { name: '女', value: stats.female },
  ];

  const generationChartData = stats.byGenerationLiving.map((g: any) => ({
    generation: `第${g.generation}代\n${g.pai_zi}`,
    在世: g.living,
    已故: g.deceased,
    殁未详: g.deceased_unknown,
  }));

  const columns = [
    { title: '代次', dataIndex: 'generation', key: 'generation' },
    { title: '字辈', dataIndex: 'pai_zi', key: 'pai_zi' },
    { title: '在世', dataIndex: 'living', key: 'living' },
    { title: '已故（详）', dataIndex: 'deceased', key: 'deceased' },
    { title: '已故（未详）', dataIndex: 'deceased_unknown', key: 'deceased_unknown' },
    { title: '合计', key: 'total', render: (_: any, r: any) => r.living + r.deceased + r.deceased_unknown },
  ];

  const tableData = stats.byGenerationLiving.map((g: any) => ({
    key: g.generation,
    generation: g.generation,
    pai_zi: g.pai_zi,
    living: g.living,
    deceased: g.deceased,
    deceased_unknown: g.deceased_unknown,
  }));

  return (
    <div>
      <h2 style={{ color: '#8B4513', marginBottom: 16 }}>📊 数据统计</h2>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">总人口</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value" style={{ color: '#52c41a' }}>{stats.living}</div>
            <div className="stat-label">在世</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value" style={{ color: '#666' }}>{stats.deceased}</div>
            <div className="stat-label">已殁（详）</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value" style={{ color: '#faad14' }}>{stats.deceased_unknown}</div>
            <div className="stat-label">殁未详</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value">{stats.male}</div>
            <div className="stat-label">男</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value">{stats.female}</div>
            <div className="stat-label">女</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value">{stats.post80s}</div>
            <div className="stat-label">80后</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value">{stats.post90s}</div>
            <div className="stat-label">90后</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value">{stats.post00s}</div>
            <div className="stat-label">00后</div>
          </Card>
        </Col>
        <Col xs={12} sm={8} md={4}>
          <Card className="stat-card" size="small">
            <div className="stat-value">{stats.adopted}</div>
            <div className="stat-label">嗣/出承</div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} md={12}>
          <Card title="在世/已故分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="性别分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  <Cell fill="#1890ff" />
                  <Cell fill="#eb2f96" />
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card title="各代人口分布">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={generationChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="generation" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="在世" fill="#52c41a" stackId="a" />
                <Bar dataKey="已故" fill="#d9d9d9" stackId="a" />
                <Bar dataKey="殁未详" fill="#faad14" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="各代明细" style={{ marginTop: 24 }}>
        <Table columns={columns} dataSource={tableData} pagination={false} size="small" />
      </Card>
    </div>
  );
};

export default StatsPage;
