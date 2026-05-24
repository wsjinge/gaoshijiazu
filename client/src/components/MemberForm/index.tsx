import React, { useState, useEffect } from 'react';
import {
  Form, Input, Select, InputNumber, Button, Card, Divider, Radio, Space, message, Switch, Upload
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, UploadOutlined } from '@ant-design/icons';
import type { Member } from '../../types';
import { createMember, updateMember, getGenerations, uploadAvatar } from '../../api';

interface Props {
  members: Member[];
  editMember?: Member | null;
  parentId?: number | null;
  onClose: () => void;
}

const MemberForm: React.FC<Props> = ({ members, editMember, parentId, onClose }) => {
  const [form] = Form.useForm();
  const [generations, setGenerations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    getGenerations().then(setGenerations);
  }, []);

  useEffect(() => {
    if (!editMember && generations.length === 0) return;
    if (editMember) {
      form.setFieldsValue({
        name: editMember.name,
        pai_name: editMember.pai_name,
        generation_id: editMember.generation_id,
        gender: editMember.gender,
        birth_year: editMember.birth_year,
        birth_month: editMember.birth_month,
        birth_day: editMember.birth_day,
        birth_hour: editMember.birth_hour,
        birth_minute: editMember.birth_minute,
        father_id: editMember.father_id,
        is_deceased: editMember.is_deceased === 1,
        death_year: editMember.death_year,
        death_month: editMember.death_month,
        death_day: editMember.death_day,
        death_hour: editMember.death_hour,
        death_minute: editMember.death_minute,
        is_adopted: editMember.is_adopted === 1,
        adoption_note: editMember.adoption_note,
        is_shang: editMember.is_shang === 1,
        has_posterity: editMember.has_posterity === 1,
        notes: editMember.notes,
        burial: editMember.burial,
        residence: editMember.residence,
        spouse_info: editMember.spouse_info?.length > 0 ? editMember.spouse_info : [],
      });
      setAvatarUrl(editMember.avatar || null);
    } else {
      const defaultGen = generations.length > 0 ? generations[generations.length - 1].id : 23;
      form.setFieldsValue({
        generation_id: defaultGen,
        gender: '男',
        is_deceased: false,
        is_adopted: false,
        is_shang: false,
        has_posterity: true,
        spouse_info: [],
      });
      if (parentId) {
        const parent = members.find(m => m.id === parentId);
        if (parent) {
          const childGenNum = (parent.gen_number || 0) + 1;
          const childGen = generations.find(g => g.number === childGenNum);
          if (childGen) {
            form.setFieldsValue({ generation_id: childGen.id });
          }
          form.setFieldsValue({ father_id: parentId });
        }
      }
    }
  }, [editMember, parentId, generations, form, members]);

  const handleAvatarUpload = async (file: File) => {
    try {
      const result = await uploadAvatar(file);
      setAvatarUrl(result.url);
      message.success('头像上传成功');
    } catch {
      message.error('头像上传失败');
    }
    return false;
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const data = {
        ...values,
        is_deceased: values.is_deceased ? 1 : 0,
        is_adopted: values.is_adopted ? 1 : 0,
        is_shang: values.is_shang ? 1 : 0,
        has_posterity: values.has_posterity ? 1 : 0,
        avatar: avatarUrl,
        spouse_info: (values.spouse_info || []).filter((s: any) => s.name),
      };

      if (editMember) {
        await updateMember(editMember.id, data);
        message.success('更新成功');
      } else {
        await createMember(data);
        message.success('新增成功');
      }
      onClose();
    } catch (e: any) {
      message.error('操作失败：' + (e?.response?.data?.error || e?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const genOptions = generations.map(g => ({
    label: `第${g.number}代 · ${g.pai_zi}字派`,
    value: g.id,
  }));

  const selectedGenId = Form.useWatch('generation_id', form);
  const selectedGen = generations.find(g => g.id === selectedGenId);
  const paiZiDisplay = selectedGen ? `第${selectedGen.number}代 · ${selectedGen.pai_zi}字派` : '';

  const fatherOptions = members.map(m => ({
    label: `${m.name}${m.pai_name ? `(${m.pai_name})` : ''} - 第${m.gen_number}代`,
    value: m.id,
  }));

  return (
    <Card bordered={false}>
      {/* Avatar upload */}
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
          margin: '0 auto 8px', background: '#FFF8DC', border: '2px solid #DEB887',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 28, color: '#bbb' }}>📷</span>
          )}
        </div>
        <Upload
          showUploadList={false}
          beforeUpload={handleAvatarUpload}
          accept="image/*"
        >
          <Button size="small" icon={<UploadOutlined />}>上传头像</Button>
        </Upload>
      </div>

      <Form form={form} layout="vertical" onFinish={handleSubmit} size="middle">
        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入姓名" />
        </Form.Item>

        <Space style={{ display: 'flex', width: '100%' }} align="start">
          <Form.Item name="pai_name" label="派名">
            <Input placeholder="派名" />
          </Form.Item>
          <Form.Item name="generation_id" label={`字辈 → ${paiZiDisplay}`} rules={[{ required: true }]}>
            <Select options={genOptions} placeholder="选择字辈" showSearch style={{ width: 200 }} />
          </Form.Item>
        </Space>

        <Space style={{ display: 'flex', width: '100%' }} align="start">
          <Form.Item name="gender" label="性别">
            <Radio.Group>
              <Radio value="男">男</Radio>
              <Radio value="女">女</Radio>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="father_id" label="父亲">
            <Select
              options={fatherOptions}
              placeholder="选择父亲"
              showSearch
              filterOption={(input, option) => (option?.label as string || '').includes(input)}
              allowClear
              style={{ width: 250 }}
            />
          </Form.Item>
        </Space>

        <Divider style={{ fontSize: 13, color: '#8B4513' }}>📅 生辰信息（阳历）</Divider>
        <Space style={{ display: 'flex', width: '100%' }} align="start" wrap>
          <Form.Item name="birth_year" label="年">
            <InputNumber placeholder="如1970" min={1800} max={2100} />
          </Form.Item>
          <Form.Item name="birth_month" label="月">
            <InputNumber placeholder="1-12" min={1} max={12} />
          </Form.Item>
          <Form.Item name="birth_day" label="日">
            <InputNumber placeholder="1-31" min={1} max={31} />
          </Form.Item>
          <Form.Item name="birth_hour" label="时(24h)">
            <InputNumber placeholder="0-23" min={0} max={23} />
          </Form.Item>
          <Form.Item name="birth_minute" label="分">
            <InputNumber placeholder="0-59" min={0} max={59} />
          </Form.Item>
        </Space>

        <Divider style={{ fontSize: 13, color: '#999' }}>⚰️ 殁信息</Divider>
        <Space style={{ display: 'flex', width: '100%' }} align="start" wrap>
          <Form.Item name="is_deceased" label="已殁" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="death_year" label="殁年">
            <InputNumber placeholder="如2026" min={1800} max={2100} />
          </Form.Item>
          <Form.Item name="death_month" label="月">
            <InputNumber placeholder="1-12" min={1} max={12} />
          </Form.Item>
          <Form.Item name="death_day" label="日">
            <InputNumber placeholder="1-31" min={1} max={31} />
          </Form.Item>
          <Form.Item name="death_hour" label="时(24h)">
            <InputNumber placeholder="0-23" min={0} max={23} />
          </Form.Item>
          <Form.Item name="death_minute" label="分">
            <InputNumber placeholder="0-59" min={0} max={59} />
          </Form.Item>
        </Space>

        <Divider style={{ fontSize: 13, color: '#eb2f96' }}>💑 配偶信息</Divider>
        <Form.List name="spouse_info">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...rest }) => (
                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                  <Form.Item {...rest} name={[name, 'name']}><Input placeholder="姓名" style={{ width: 100 }} /></Form.Item>
                  <Form.Item {...rest} name={[name, 'birth']}><Input placeholder="出生" style={{ width: 80 }} /></Form.Item>
                  <Form.Item {...rest} name={[name, 'death']}><Input placeholder="殁" style={{ width: 80 }} /></Form.Item>
                  <Form.Item {...rest} name={[name, 'note']}><Input placeholder="原配/继室" style={{ width: 100 }} /></Form.Item>
                  {fields.length > 0 && <MinusCircleOutlined onClick={() => remove(name)} />}
                </Space>
              ))}
              <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} size="small">添加配偶</Button>
            </>
          )}
        </Form.List>

        <Divider style={{ fontSize: 13 }}>📌 其他信息</Divider>
        <Space style={{ display: 'flex', width: '100%' }} wrap>
          <Form.Item name="is_adopted" label="嗣/出承" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="adoption_note" label="说明">
            <Input placeholder="如：出承XXX嗣" style={{ width: 200 }} />
          </Form.Item>
          <Form.Item name="is_shang" label="殇" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="has_posterity" label="有后代" valuePropName="checked">
            <Switch defaultChecked />
          </Form.Item>
        </Space>
        <Space style={{ display: 'flex', width: '100%' }} wrap>
          <Form.Item name="burial" label="葬地">
            <Input placeholder="如：青峦旁下杉树坤艮向" style={{ width: 300 }} />
          </Form.Item>
          <Form.Item name="residence" label="居地">
            <Input placeholder="如：青冈冲" style={{ width: 200 }} />
          </Form.Item>
        </Space>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={2} placeholder="其他备注信息" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8, background: '#8B4513', borderColor: '#8B4513' }}>
            {editMember ? '💾 保存修改' : '✅ 确认新增'}
          </Button>
          <Button onClick={onClose}>取消</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default MemberForm;
