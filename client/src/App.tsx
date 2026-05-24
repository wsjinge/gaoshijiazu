import React, { useState, useEffect } from 'react';
import { ConfigProvider, Layout, Menu, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import {
  ApartmentOutlined,
  UserAddOutlined,
  TeamOutlined,
  CalendarOutlined,
  BarChartOutlined,
  ImportOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import FamilyTreePage from './components/FamilyTree';
import MemberForm from './components/MemberForm';
import Relationship from './components/Relationship';
import Statistics from './components/Statistics';
import LunarCalendar from './components/LunarCalendar';
import ImportExport from './components/ImportExport';
import './styles/chinese-theme.css';
import type { Member } from './types';
import { getMembers } from './api';

const { Header, Content, Sider } = Layout;

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('tree');
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formParentId, setFormParentId] = useState<number | null>(null);

  const loadData = async () => {
    const m = await getMembers();
    setMembers(m);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = (parentId?: number) => {
    setEditingMember(null);
    setFormParentId(parentId || null);
    setShowForm(true);
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormParentId(null);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingMember(null);
    setFormParentId(null);
    loadData();
  };

  const menuItems = [
    { key: 'tree', icon: <ApartmentOutlined />, label: '族谱导图' },
    { key: 'add', icon: <UserAddOutlined />, label: '新增人口' },
    { key: 'relationship', icon: <LinkOutlined />, label: '关系查询' },
    { key: 'calendar', icon: <CalendarOutlined />, label: '农历生辰' },
    { key: 'stats', icon: <BarChartOutlined />, label: '数据统计' },
    { key: 'importexport', icon: <ImportOutlined />, label: '导入导出' },
  ];

  const renderPage = () => {
    switch (currentPage) {
      case 'tree':
        return (
          <FamilyTreePage
            members={members}
            selectedMember={selectedMember}
            onSelect={setSelectedMember}
            onAdd={handleAdd}
            onEdit={handleEdit}
            onUpdate={loadData}
          />
        );
      case 'add':
        return (
          <div style={{ maxWidth: 600, margin: '24px auto' }}>
            <MemberForm
              members={members}
              parentId={formParentId}
              onClose={handleFormClose}
            />
          </div>
        );
      case 'relationship':
        return <Relationship members={members} />;
      case 'calendar':
        return <LunarCalendar />;
      case 'stats':
        return <Statistics />;
      case 'importexport':
        return (
          <ImportExport
            members={members}
            generations={[]}
            onImport={loadData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#B22222',
          colorBgLayout: '#F5E6C8',
          colorBgContainer: '#FFF8DC',
          colorBorderSecondary: '#C9A96E',
          colorText: '#2C2C2C',
          colorTextHeading: '#8B4513',
          borderRadius: 8,
          fontFamily: "'Noto Serif SC','Source Han Serif SC','SimSun','STSong',serif",
          fontSize: 14,
        },
        components: {
          Menu: {
            colorItemBg: 'transparent',
            colorItemText: '#5C3D2E',
            colorItemTextSelected: '#B22222',
            colorItemBgSelected: 'rgba(178,34,34,0.08)',
          },
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <Sider width={200} theme="light" style={{ background: 'transparent' }}>
          <div className="sider-title">高氏家族</div>
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            items={menuItems}
            onClick={({ key }) => setCurrentPage(key)}
            style={{ borderRight: 0 }}
          />
        </Sider>
        <Layout>
          <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)', overflow: 'auto' }}>
            {renderPage()}
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

export default App;
