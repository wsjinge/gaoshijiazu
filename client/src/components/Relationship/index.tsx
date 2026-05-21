import React, { useState } from 'react';
import { Card, Row, Col, Select, Button, Tag, message, Empty, Divider, Alert, Space } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import type { Member } from '../../types';

interface Props {
  members: Member[];
}

// Build relationship map
function findPath(allMembers: Member[], fromId: number, toId: number): string {
  if (fromId === toId) return '同一个人';

  const memberMap = new Map(allMembers.map(m => [m.id, m]));

  // Build ancestor chain
  function getAncestors(id: number): Member[] {
    const chain: Member[] = [];
    let current = memberMap.get(id);
    while (current) {
      chain.unshift(current);
      current = current.father_id ? memberMap.get(current.father_id) : undefined;
    }
    return chain;
  }

  const fromAncestors = getAncestors(fromId);
  const toAncestors = getAncestors(toId);
  const from = memberMap.get(fromId)!;
  const to = memberMap.get(toId)!;

  // Find common ancestor
  let commonIdx = -1;
  for (let i = 0; i < Math.min(fromAncestors.length, toAncestors.length); i++) {
    if (fromAncestors[i].id === toAncestors[i].id) {
      commonIdx = i;
    } else break;
  }

  if (commonIdx === -1) return '无血缘关系';

  const common = fromAncestors[commonIdx];
  const fromGenDiff = fromAncestors.length - 1 - commonIdx;
  const toGenDiff = toAncestors.length - 1 - commonIdx;

  // Same generation
  if (fromGenDiff === 0 && toGenDiff === 0) return common.id === from.id ? '本人' : '兄弟';

  // Direct ancestor/descendant
  if (fromGenDiff > 0 && toGenDiff === 0) {
    if (fromGenDiff === 1) return '父子关系';
    if (fromGenDiff === 2) return `祖父与孙子关系（${from.name} 是 ${to.name} 的祖父）`;
    if (fromGenDiff === 3) return `曾祖与曾孙关系`;
    return `直系祖先关系（差${fromGenDiff}代）`;
  }
  if (fromGenDiff === 0 && toGenDiff > 0) {
    if (toGenDiff === 1) return '父子关系';
    if (toGenDiff === 2) return `祖父与孙子关系（${to.name} 是 ${from.name} 的祖父）`;
    return `直系祖先关系（差${toGenDiff}代）`;
  }

  // Same level (same generation distance from common ancestor)
  if (fromGenDiff === toGenDiff) {
    if (fromGenDiff === 1) return '堂兄弟关系（同一祖父）';
    if (fromGenDiff === 2) return '再从兄弟关系（同一曾祖）';
    return `同族第${fromGenDiff}代兄弟`;
  }

  // Different levels
  const diff = Math.abs(fromGenDiff - toGenDiff);
  const minGen = Math.min(fromGenDiff, toGenDiff);
  const older = fromGenDiff < toGenDiff ? from : to;
  const younger = fromGenDiff > toGenDiff ? from : to;
  const olderGenDiff = Math.min(fromGenDiff, toGenDiff);
  const youngerGenDiff = Math.max(fromGenDiff, toGenDiff);

  if (minGen === 1 && diff === 1) {
    return `叔侄关系（${older.name} 是 ${younger.name} 的${older.gender === '男' ? '叔伯' : '姑'}`;
  }
  if (minGen === 2 && diff === 1) {
    return `堂叔侄关系`;
  }

  return `族亲关系（共同祖先：${common.name}）`;
}

const Relationship: React.FC<Props> = ({ members }) => {
  const [fromId, setFromId] = useState<number | null>(null);
  const [toId, setToId] = useState<number | null>(null);
  const [result, setResult] = useState<string>('');

  const options = members.map(m => ({
    label: `${m.name}${m.pai_name ? ` (${m.pai_name})` : ''} - 第${m.gen_number}代`,
    value: m.id,
  }));

  const handleQuery = () => {
    if (!fromId || !toId) {
      message.warning('请选择两个人');
      return;
    }
    if (fromId === toId) {
      setResult('同一个人');
      return;
    }
    const path = findPath(members, fromId, toId);
    setResult(path);
  };

  const getMemberDetail = (id: number | null) => {
    if (!id) return null;
    return members.find(m => m.id === id);
  };

  const from = getMemberDetail(fromId);
  const to = getMemberDetail(toId);

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title={<span><SwapOutlined /> 关系查询</span>}>
        <Alert
          message="点击选择两个人，查询他们的家族关系"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Row gutter={16}>
          <Col span={11}>
            <div style={{ marginBottom: 8 }}><strong>选择第一个人</strong></div>
            <Select
              style={{ width: '100%' }}
              showSearch
              placeholder="搜索并选择成员"
              options={options}
              value={fromId}
              onChange={setFromId}
              filterOption={(input, option) => (option?.label as string || '').includes(input)}
            />
            {from && (
              <Card size="small" style={{ marginTop: 8 }}>
                <Tag color={from.gender === '女' ? 'pink' : 'blue'}>{from.gender}</Tag>
                <strong>{from.name}</strong>
                <span style={{ marginLeft: 8, color: '#999' }}>第{from.gen_number}代 · {from.gen_pai_zi}字派</span>
                {from.pai_name && <div style={{ color: '#666', fontSize: 12 }}>派名：{from.pai_name}</div>}
              </Card>
            )}
          </Col>
          <Col span={2} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SwapOutlined style={{ fontSize: 24, color: '#8B4513' }} />
          </Col>
          <Col span={11}>
            <div style={{ marginBottom: 8 }}><strong>选择第二个人</strong></div>
            <Select
              style={{ width: '100%' }}
              showSearch
              placeholder="搜索并选择成员"
              options={options}
              value={toId}
              onChange={setToId}
              filterOption={(input, option) => (option?.label as string || '').includes(input)}
            />
            {to && (
              <Card size="small" style={{ marginTop: 8 }}>
                <Tag color={to.gender === '女' ? 'pink' : 'blue'}>{to.gender}</Tag>
                <strong>{to.name}</strong>
                <span style={{ marginLeft: 8, color: '#999' }}>第{to.gen_number}代 · {to.gen_pai_zi}字派</span>
                {to.pai_name && <div style={{ color: '#666', fontSize: 12 }}>派名：{to.pai_name}</div>}
              </Card>
            )}
          </Col>
        </Row>

        <Divider />

        <Button type="primary" size="large" onClick={handleQuery} block>
          查询关系
        </Button>

        {result && (
          <Card style={{ marginTop: 16, background: '#FFF8DC', border: '1px solid #DEB887' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#8B4513', marginBottom: 8 }}>查询结果</div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                <Tag color="blue" style={{ fontSize: 16, padding: '4px 12px' }}>{from?.name}</Tag>
                <span style={{ margin: '0 16px' }}>→</span>
                <Tag color="green" style={{ fontSize: 16, padding: '4px 12px' }}>{to?.name}</Tag>
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: '#8B4513', marginTop: 16 }}>
                {result}
              </div>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
};

export default Relationship;
