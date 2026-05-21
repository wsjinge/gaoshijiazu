import { Router } from 'express';
import { Solar } from 'lunar-javascript';

const SHENGXIAO = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const DIZHI_HOURS = {
  '子': '23:00-1:00', '丑': '1:00-3:00', '寅': '3:00-5:00', '卯': '5:00-7:00',
  '辰': '7:00-9:00', '巳': '9:00-11:00', '午': '11:00-13:00', '未': '13:00-15:00',
  '申': '15:00-17:00', '酉': '17:00-19:00', '戌': '19:00-21:00', '亥': '21:00-23:00',
};

function hourToDizhi(hour) {
  if (hour === null || hour === undefined) return '';
  if (hour >= 23 || hour < 1) return '子';
  if (hour < 3) return '丑'; if (hour < 5) return '寅'; if (hour < 7) return '卯';
  if (hour < 9) return '辰'; if (hour < 11) return '巳'; if (hour < 13) return '午';
  if (hour < 15) return '未'; if (hour < 17) return '申'; if (hour < 19) return '酉';
  if (hour < 21) return '戌'; return '亥';
}

function getHourRange(dizhi) {
  return DIZHI_HOURS[dizhi] || '';
}

const router = Router();

router.post('/convert', (req, res) => {
  const { year, month, day, hour, minute, type } = req.body;
  if (!year) return res.json({ text: '信息不全' });

  const dizhi = hourToDizhi(hour);
  const hourStr = dizhi ? `${dizhi}时` : '';
  const hourRange = getHourRange(dizhi);
  const shengXiao = SHENGXIAO[(year - 4) % 12];

  // Solar date string
  let solarStr = `${year}年`;
  if (month) solarStr += `${month}月`;
  if (day) solarStr += `${day}日`;
  if (hourRange) solarStr += ` ${hourRange}`;

  // Lunar conversion
  let lunarDateStr = '';
  if (month && day) {
    try {
      const solar = Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();
      lunarDateStr = `${lunar.getYearInGanZhi()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}日`;
    } catch (e) {
      lunarDateStr = '';
    }
  }

  // Format matching the text file: 农历{lunar}{hour} → 阳历{solar} {hour range}
  const prefix = type === 'birth' ? '生于' : '殁于';
  const lunarFull = lunarDateStr ? `农历${lunarDateStr}${hourStr}` : '';
  const solarFull = `阳历${solarStr}`;
  const combined = lunarFull ? `${lunarFull} → ${solarFull}` : `${prefix}公元${solarStr}`;

  res.json({
    text: combined,
    lunar: lunarDateStr,
    solar: solarStr,
    hour: hourStr,
    hourRange,
    shengXiao,
    combined,
  });
});

export default router;
