import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Tag, Button, Tooltip, Modal, message, Space, Upload, Collapse } from 'antd';
import { PlusOutlined, EditOutlined, WomanOutlined, ManOutlined, CameraOutlined, DownOutlined, RightOutlined, LoadingOutlined } from '@ant-design/icons';
import type { Member } from '../../types';
import MemberForm from '../MemberForm';
import { updateMember, uploadAvatar, getMemberChildren, getMembers } from '../../api';
import axios from 'axios';

interface Props {
  treeData: Member[];
  members: Member[];
  selectedMember: Member | null;
  onSelect: (m: Member | null) => void;
  onAdd: (parentId?: number) => void;
  onEdit: (m: Member) => void;
  onUpdate: () => void;
}

const SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
function getShengXiao(year: number) { return SHENGXIAO[(year - 4) % 12]; }

// Convert date to combined solar+lunar format
async function getLunarFull(year: number | null, month: number | null, day: number | null, hour: number | null, minute: number | null, type: 'birth' | 'death') {
  if (!year) return null;
  try {
    const res = await axios.post('/api/lunar/convert', { year, month, day, hour, minute, type });
    return res.data;
  } catch { return null; }
}

const FamilyTreePage: React.FC<Props> = ({ treeData, members, selectedMember, onSelect, onAdd, onEdit, onUpdate }) => {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [childrenMap, setChildrenMap] = useState<Record<number, Member[]>>({});
  const [loadingChildren, setLoadingChildren] = useState<Set<number>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [lunarTexts, setLunarTexts] = useState<Record<string, any>>({});
  const [treeVersion, setTreeVersion] = useState(0);

  // Clear cached tree when members change (after add/edit)
  useEffect(() => {
    setChildrenMap({});
    setExpandedIds(new Set());
    setLunarTexts({});
    setTreeVersion(v => v + 1);
  }, [members.length]);

  // Load lunar dates for selected member
  useEffect(() => {
    if (selectedMember) {
      const key = `birth-${selectedMember.id}`;
      if (!lunarTexts[key] && selectedMember.birth_year) {
        getLunarFull(selectedMember.birth_year, selectedMember.birth_month, selectedMember.birth_day, selectedMember.birth_hour, selectedMember.birth_minute, 'birth').then(d => {
          if (d) setLunarTexts(prev => ({ ...prev, [key]: d }));
        });
      }
      const key2 = `death-${selectedMember.id}`;
      if (!lunarTexts[key2] && selectedMember.is_deceased && selectedMember.death_year) {
        getLunarFull(selectedMember.death_year, selectedMember.death_month, selectedMember.death_day, selectedMember.death_hour, selectedMember.death_minute, 'death').then(d => {
          if (d) setLunarTexts(prev => ({ ...prev, [key2]: d }));
        });
      }
    }
  }, [selectedMember]);

  // Build generation map from members for quick lookup
  const genMap = new Map<number, Member[]>();
  members.forEach(m => {
    if (!genMap.has(m.gen_number)) genMap.set(m.gen_number, []);
    genMap.get(m.gen_number)!.push(m);
  });

  // Get root members (generation 17)
  const rootMembers = members.filter(m => m.gen_number === 17);

  // Toggle expand/collapse
  const toggleExpand = async (member: Member) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(member.id)) {
      newExpanded.delete(member.id);
      setExpandedIds(newExpanded);
      return;
    }

    // If not expanded, load children
    newExpanded.add(member.id);
    setExpandedIds(newExpanded);

    // Load children from API if not already loaded
    if (!childrenMap[member.id]) {
      setLoadingChildren(prev => new Set(prev).add(member.id));
      try {
        const children = await getMemberChildren(member.id);
        setChildrenMap(prev => ({ ...prev, [member.id]: children }));
      } catch (e) {
        console.error('Failed to load children', e);
      }
      setLoadingChildren(prev => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    }
  };

  // Handle add from "+" button
  const handleLocalAdd = (parentId?: number) => {
    setEditMember(null);
    setFormParentId(parentId || null);
    setShowForm(true);
  };

  // Handle edit
  const handleLocalEdit = (member: Member) => {
    setEditMember(member);
    setFormParentId(null);
    setShowForm(true);
  };

  // Handle form close
  const handleFormClose = () => {
    setShowForm(false);
    setEditMember(null);
    setFormParentId(null);
    onUpdate();
  };

  // Handle avatar upload
  const handleAvatarUpload = async (memberId: number, file: File) => {
    try {
      const result = await uploadAvatar(file);
      await updateMember(memberId, { avatar: result.url } as any);
      message.success('头像上传成功');
      onUpdate();
    } catch {
      message.error('头像上传失败');
    }
  };

  // Recursive render tree node
  const renderNode = (member: Member, depth: number = 0) => {
    const isExpanded = expandedIds.has(member.id);
    const isLoading = loadingChildren.has(member.id);
    const children = childrenMap[member.id];
    const hasChildren = member.has_posterity === 1;
    const isSelected = selectedMember?.id === member.id;
    const isDeceased = member.is_deceased === 1;

    return (
      <div key={member.id} style={{ marginLeft: depth > 0 ? 60 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
          {/* Connector line */}
          {depth > 0 && (
            <div style={{ width: 30, height: 2, background: '#DEB887', marginRight: -1, flexShrink: 0 }} />
          )}

          {/* Expand/collapse button */}
          {hasChildren ? (
            <div
              onClick={() => toggleExpand(member)}
              style={{
                width: 24, height: 24, borderRadius: '50%', background: '#FFF8DC',
                border: '1px solid #DEB887', display: 'flex', alignItems: 'center',
                justifyContent: 'center', cursor: 'pointer', marginRight: 8, flexShrink: 0,
                fontSize: 12, color: '#8B4513'
              }}
            >
              {isLoading ? <LoadingOutlined /> : isExpanded ? <DownOutlined /> : <RightOutlined />}
            </div>
          ) : (
            <div style={{ width: 24, marginRight: 8, flexShrink: 0 }} />
          )}

          {/* Member card */}
          <Tooltip
            title={
              <div>
                <div><strong>{member.name}</strong> {member.pai_name && `(${member.pai_name})`}</div>
                {member.spouse_info?.length > 0 && <div>配偶：{member.spouse_info.map(s => s.name).join('、')}</div>}
                {member.adoption_note && <Tag color="orange">{member.adoption_note}</Tag>}
                {member.is_shang === 1 && <Tag color="red">殇</Tag>}
              </div>
            }
          >
            <div
              onClick={() => onSelect(member)}
              onDoubleClick={() => handleLocalEdit(member)}
              className={`member-node ${isSelected ? 'selected' : ''} ${isDeceased ? 'deceased' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                padding: '8px 16px', background: isDeceased ? '#fafafa' : 'white',
                border: `2px solid ${isSelected ? '#1890ff' : isDeceased ? '#d9d9d9' : '#DEB887'}`,
                borderRadius: 10, minWidth: 160, transition: 'all 0.2s',
                position: 'relative'
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
                background: '#FFF8DC', border: '2px solid #DEB887', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {member.avatar ? (
                  <img src={member.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 16, color: '#8B4513' }}>
                    {member.gender === '女' ? <WomanOutlined /> : <ManOutlined />}
                  </span>
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#333' }}>
                  {member.name}
                  <span style={{
                    display: 'inline-block', width: 16, height: 16, borderRadius: '50%',
                    fontSize: 10, lineHeight: '16px', textAlign: 'center', marginLeft: 4,
                    background: member.gender === '女' ? '#fff0f6' : '#e6f7ff',
                    color: member.gender === '女' ? '#eb2f96' : '#1890ff'
                  }}>
                    {member.gender === '女' ? '女' : '男'}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  第{member.gen_number}代·{member.gen_pai_zi}字派{member.pai_name ? ` · ${member.pai_name}` : ''}
                </div>
                <div style={{ fontSize: 11, color: '#999' }}>
                  {member.birth_year || '?'}{member.is_deceased && member.death_year ? `-${member.death_year}` : ''}
                  {member.is_shang === 1 ? ' (殇)' : ''}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 4 }}>
                <Button
                  size="small" type="text"
                  icon={<EditOutlined style={{ fontSize: 12 }} />}
                  onClick={(e) => { e.stopPropagation(); handleLocalEdit(member); }}
                />
                <Button
                  size="small" type="text"
                  icon={<PlusOutlined style={{ fontSize: 12, color: '#52c41a' }} />}
                  onClick={(e) => { e.stopPropagation(); handleLocalAdd(member.id); }}
                />
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Children (when expanded) */}
        {isExpanded && children && children.length > 0 && (
          <div style={{ borderLeft: '2px solid #DEB887', marginLeft: 11, paddingLeft: 0, paddingTop: 8, paddingBottom: 8 }}>
            {children.map(child => renderNode(child, depth + 1))}
          </div>
        )}

        {/* No children message */}
        {isExpanded && (!children || children.length === 0) && !isLoading && (
          <div style={{ marginLeft: 100, color: '#ccc', fontSize: 12, fontStyle: 'italic', padding: '4px 0 8px' }}>
            ─ 暂无后代记录（可点击+号添加）
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Space>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#8B4513' }}>📋 高氏家族族谱</span>
          <Tag color="blue">共 {members.length} 人</Tag>
          <Tag color="orange" style={{ fontSize: 11 }}>点击人物展开后代 · 双击编辑 · + 新增</Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleLocalAdd()}>
          新增人口
        </Button>
      </div>

      {/* Tree view */}
      <div style={{ padding: '20px 10px', overflow: 'auto' }}>
        {rootMembers.map(root => renderNode(root, 0))}
      </div>

      {/* Detail side panel */}
      {selectedMember && (
        <div style={{
          position: 'fixed', right: 0, top: 0, width: 380,
          height: '100vh', background: 'white', boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
          padding: 24, overflow: 'auto', zIndex: 100
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, alignItems: 'center' }}>
            <h3 style={{ margin: 0, color: '#8B4513' }}>{selectedMember.name}</h3>
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => handleLocalEdit(selectedMember)} />
              <Button size="small" onClick={() => onSelect(null)}>✕</Button>
            </Space>
          </div>

          {/* Avatar with upload */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
              margin: '0 auto 8px', background: '#FFF8DC', border: '2px solid #DEB887',
              display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
            }}>
              {selectedMember.avatar ? (
                <img src={selectedMember.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 32, color: '#8B4513' }}>
                  {selectedMember.gender === '女' ? <WomanOutlined /> : <ManOutlined />}
                </span>
              )}
              <Upload
                showUploadList={false}
                customRequest={async ({ file }) => {
                  await handleAvatarUpload(selectedMember.id, file as File);
                }}
              >
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.5)', color: 'white', fontSize: 12,
                  padding: '2px 0', cursor: 'pointer'
                }}>
                  <CameraOutlined /> 上传头像
                </div>
              </Upload>
            </div>
          </div>

          <Card size="small" style={{ marginBottom: 12 }}>
            <Row gutter={[8, 8]}>
              <Col span={12}><strong>姓名：</strong>{selectedMember.name}</Col>
              <Col span={12}><strong>派名：</strong>{selectedMember.pai_name || '-'}</Col>
              <Col span={12}><strong>性别：</strong>
                <Tag color={selectedMember.gender === '女' ? 'pink' : 'blue'}>{selectedMember.gender}</Tag>
              </Col>
              <Col span={12}>
                <strong>字辈：</strong>
                <Tag color="gold" style={{ fontWeight: 600 }}>第{selectedMember.gen_number}代 · {selectedMember.gen_pai_zi}字派</Tag>
              </Col>
              <Col span={24}>
                <strong>状态：</strong>
                {selectedMember.is_deceased ? <Tag color="red">已殁</Tag> : <Tag color="green">在世</Tag>}
                {selectedMember.is_shang === 1 && <Tag color="red" style={{ marginLeft: 4 }}>殇</Tag>}
                {selectedMember.is_adopted === 1 && <Tag color="orange" style={{ marginLeft: 4 }}>{selectedMember.adoption_note || '嗣'}</Tag>}
              </Col>
              {selectedMember.birth_year && (
                <Col span={24}>
                  <div style={{ background: '#FFF8DC', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: 12, color: '#8B4513', marginBottom: 4 }}>📅 生辰</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                      <div style={{ fontWeight: 500 }}>
                        {lunarTexts[`birth-${selectedMember.id}`]?.text || `生于${selectedMember.birth_year}年`}
                      </div>
                      <div style={{ color: '#8B4513', marginTop: 2 }}>
                        <strong>属{selectedMember.birth_year ? SHENGXIAO[(selectedMember.birth_year - 4) % 12] : '?'}</strong>
                      </div>
                    </div>
                  </div>
                </Col>
              )}
              {selectedMember.is_deceased && selectedMember.death_year && (
                <Col span={24}>
                  <div style={{ background: '#f5f5f5', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: 12, color: '#999', marginBottom: 4 }}>📅 殁辰</div>
                    <div style={{ fontSize: 13, lineHeight: 1.8 }}>
                      <div style={{ fontWeight: 500 }}>
                        {lunarTexts[`death-${selectedMember.id}`]?.text || `殁于${selectedMember.death_year}年`}
                      </div>
                      {selectedMember.death_year && (
                        <div style={{ color: '#999', marginTop: 2 }}>
                          属{SHENGXIAO[(selectedMember.death_year - 4) % 12]}
                        </div>
                      )}
                    </div>
                  </div>
                </Col>
              )}
              {selectedMember.burial && (
                <Col span={24}><strong>葬地：</strong><span style={{ color: '#666' }}>{selectedMember.burial}</span></Col>
              )}
              {selectedMember.residence && (
                <Col span={24}><strong>居地：</strong><span style={{ color: '#666' }}>{selectedMember.residence}</span></Col>
              )}
              {selectedMember.spouse_info?.length > 0 && (
                <Col span={24}>
                  <strong>配偶：</strong>
                  {selectedMember.spouse_info.map((s, i) => (
                    <div key={i} style={{ marginLeft: 8, padding: '3px 0', fontSize: 13, lineHeight: 1.6 }}>
                      {s.detail ? (
                        <span>{s.detail}</span>
                      ) : (
                        <span>
                          <Tag color="pink">{s.name}</Tag>
                          {s.note && <span style={{ fontSize: 12, color: '#999' }}>({s.note})</span>}
                          {s.birth && <span style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>{s.birth}</span>}
                          {s.death && <span style={{ fontSize: 12, color: '#666' }}>-{s.death}</span>}
                        </span>
                      )}
                    </div>
                  ))}
                </Col>
              )}
              {selectedMember.notes && (
                <Col span={24}><strong>备注：</strong><span style={{ color: '#666' }}>{selectedMember.notes}</span></Col>
              )}
              {selectedMember.burial && (
                <Col span={24}><strong>葬地：</strong><span style={{ color: '#666' }}>{selectedMember.burial}</span></Col>
              )}
              {selectedMember.residence && (
                <Col span={24}><strong>居地：</strong><span style={{ color: '#666' }}>{selectedMember.residence}</span></Col>
              )}
            </Row>
          </Card>

          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => handleLocalAdd(selectedMember.id)}
            block
            style={{ marginTop: 8 }}
          >
            为 {selectedMember.name} 添加后代
          </Button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <Modal
        title={editMember ? `编辑 - ${editMember.name}` : '新增族谱成员'}
        open={showForm}
        onCancel={() => { setShowForm(false); setEditMember(null); setFormParentId(null); }}
        footer={null}
        width={620}
        destroyOnClose
      >
        <MemberForm
          members={members}
          editMember={editMember}
          parentId={formParentId}
          onClose={handleFormClose}
        />
      </Modal>
    </div>
  );
};

export default FamilyTreePage;
