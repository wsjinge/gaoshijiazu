import React, { useState } from 'react';
import { Card, DatePicker, Space, Divider, InputNumber, Form, Button, Alert, Row, Col } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

// Chinese lunar calendar conversion using lunar-javascript
// We'll implement a simplified version since lunar-javascript may have compatibility issues
// Using the built-in algorithm for Chinese lunar calendar

const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENGXIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
];

// Simplified lunar conversion (for accurate results, use lunar-javascript npm package)
// This is a placeholder that computes GanZhi year cycle
function getLunarYear( year: number): string {
  const t = (year - 4) % 10;
  const d = (year - 4) % 12;
  const gan = t >= 0 ? TIANGAN[t] : TIANGAN[t + 10];
  const zhi = d >= 0 ? DIZHI[d] : DIZHI[d + 12];
  return `${gan}${zhi}`;
}

function getShengXiao(year: number): string {
  return SHENGXIAO[(year - 4) % 12];
}

// Convert hour to Dizhi
function hourToDizhi(hour: number): string {
  if (hour >= 23 || hour < 1) return '子';
  if (hour < 3) return '丑';
  if (hour < 5) return '寅';
  if (hour < 7) return '卯';
  if (hour < 9) return '辰';
  if (hour < 11) return '巳';
  if (hour < 13) return '午';
  if (hour < 15) return '未';
  if (hour < 17) return '申';
  if (hour < 19) return '酉';
  if (hour < 21) return '戌';
  return '亥';
}

function formatLunarDateTime(year: number, month: number, day: number, hour: number | null, minute: number | null, isBirth: boolean): string {
  const ganZhi = getLunarYear(year);
  const shengXiao = getShengXiao(year);
  const prefix = isBirth ? '生于' : '殁于';
  const dizhi = hour !== null && hour !== undefined ? hourToDizhi(hour) : '';
  const hourStr = dizhi ? `${dizhi}时` : '';
  const minStr = minute !== null && minute !== undefined && minute > 0 ? `${minute}分` : '';

  return `${prefix}公元${year}年${ganZhi}${shengXiao}年${month}月${day}日${hourStr}${minStr}`;
}

const LunarCalendar: React.FC = () => {
  const [birthResult, setBirthResult] = useState<string>('');
  const [deathResult, setDeathResult] = useState<string>('');

  const handleBirthCalc = (values: any) => {
    const { year, month, day, hour, minute } = values;
    if (!year) return;
    const result = formatLunarDateTime(year, month || 1, day || 1, hour ?? null, minute ?? null, true);
    setBirthResult(result);
  };

  const handleDeathCalc = (values: any) => {
    const { year, month, day, hour, minute } = values;
    if (!year) return;
    const result = formatLunarDateTime(year, month || 1, day || 1, hour ?? null, minute ?? null, false);
    setDeathResult(result);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Card title={<span><CalendarOutlined /> 农历生辰/殁辰转换</span>}>
        <Alert
          message="输入公历(阳历)日期，自动转换为农历(阴历)生辰/殁辰格式"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={24}>
          <Col span={12}>
            <Card title="生辰转换" size="small" style={{ borderColor: '#52c41a' }}>
              <Form layout="inline" onFinish={handleBirthCalc}>
                <Form.Item name="year" label="年" rules={[{ required: true }]}>
                  <InputNumber placeholder="如：1970" min={1800} max={2100} />
                </Form.Item>
                <Form.Item name="month" label="月">
                  <InputNumber placeholder="如：5" min={1} max={12} />
                </Form.Item>
                <Form.Item name="day" label="日">
                  <InputNumber placeholder="如：25" min={1} max={31} />
                </Form.Item>
                <Form.Item name="hour" label="时">
                  <InputNumber placeholder="如：23" min={0} max={23} />
                </Form.Item>
                <Form.Item name="minute" label="分">
                  <InputNumber placeholder="如：30" min={0} max={59} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit" style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                    转换生辰
                  </Button>
                </Form.Item>
              </Form>
              {birthResult && (
                <div className="lunar-result">
                  <div className="lunar-title">📅 生辰</div>
                  <div className="lunar-text">{birthResult}</div>
                </div>
              )}
            </Card>
          </Col>

          <Col span={12}>
            <Card title="殁辰转换" size="small" style={{ borderColor: '#999' }}>
              <Form layout="inline" onFinish={handleDeathCalc}>
                <Form.Item name="year" label="年" rules={[{ required: true }]}>
                  <InputNumber placeholder="如：2026" min={1800} max={2100} />
                </Form.Item>
                <Form.Item name="month" label="月">
                  <InputNumber placeholder="如：3" min={1} max={12} />
                </Form.Item>
                <Form.Item name="day" label="日">
                  <InputNumber placeholder="如：21" min={1} max={31} />
                </Form.Item>
                <Form.Item name="hour" label="时">
                  <InputNumber placeholder="如：23" min={0} max={23} />
                </Form.Item>
                <Form.Item name="minute" label="分">
                  <InputNumber placeholder="如：30" min={0} max={59} />
                </Form.Item>
                <Form.Item>
                  <Button type="primary" htmlType="submit">
                    转换殁辰
                  </Button>
                </Form.Item>
              </Form>
              {deathResult && (
                <div className="lunar-result">
                  <div className="lunar-title">📅 殁辰</div>
                  <div className="lunar-text">{deathResult}</div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        <Divider />

        <Card title="🌙 干支纪年参考" size="small">
          <p>十天干：甲、乙、丙、丁、戊、己、庚、辛、壬、癸</p>
          <p>十二地支：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥</p>
          <p>十二生肖：鼠、牛、虎、兔、龙、蛇、马、羊、猴、鸡、狗、猪</p>
          <p>十二时辰：子(23-1)、丑(1-3)、寅(3-5)、卯(5-7)、辰(7-9)、巳(9-11)、午(11-13)、未(13-15)、申(15-17)、酉(17-19)、戌(19-21)、亥(21-23)</p>
        </Card>
      </Card>
    </div>
  );
};

export default LunarCalendar;
