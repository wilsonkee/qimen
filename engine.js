// 奇门遁甲排盘引擎（转盘奇门，拆补法 / 置闰法）
// 依赖 lunar-javascript（全局 Solar/Lunar 或 require）
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory(require('lunar-javascript'));
  else root.QM = factory(root);
})(this, function (L) {
  const { Solar } = L;
  const GAN = '甲乙丙丁戊己庚辛壬癸'.split('');
  const ZHI = '子丑寅卯辰巳午未申酉戌亥'.split('');
  const GZ = []; for (let i = 0; i < 60; i++) GZ.push(GAN[i % 10] + ZHI[i % 12]);
  const QIYI = '戊己庚辛壬癸丁丙乙'.split('');           // 六仪三奇排布顺序
  const XUN_YI = '戊己庚辛壬癸'.split('');                 // 甲子戊 甲戌己 甲申庚 甲午辛 甲辰壬 甲寅癸
  const XUN_NAME = ['甲子', '甲戌', '甲申', '甲午', '甲辰', '甲寅'];
  const GONG = { 1: '坎', 2: '坤', 3: '震', 4: '巽', 5: '中', 6: '乾', 7: '兑', 8: '艮', 9: '离' };
  const GONG_DIR = { 1: '北', 2: '西南', 3: '东', 4: '东南', 5: '中', 6: '西北', 7: '西', 8: '东北', 9: '南' };
  const GONG_WX = { 1: '水', 2: '土', 3: '木', 4: '木', 5: '土', 6: '金', 7: '金', 8: '土', 9: '火' };
  const STAR = { 1: '天蓬', 2: '天芮', 3: '天冲', 4: '天辅', 5: '天禽', 6: '天心', 7: '天柱', 8: '天任', 9: '天英' };
  const DOOR = { 1: '休门', 2: '死门', 3: '伤门', 4: '杜门', 6: '开门', 7: '惊门', 8: '生门', 9: '景门' };
  const DOOR_WX = { 休门: '水', 生门: '土', 伤门: '木', 杜门: '木', 景门: '火', 死门: '土', 惊门: '金', 开门: '金' };
  const RING = [1, 8, 3, 4, 9, 2, 7, 6];                  // 八宫顺时针（坎→艮→震→巽→离→坤→兑→乾）
  const GOD_YANG = ['值符', '螣蛇', '太阴', '六合', '白虎', '玄武', '九地', '九天'];
  const JQ_ORDER = ['冬至', '小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨', '立夏', '小满', '芒种',
    '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪'];
  const JU_TABLE = { // [上元, 中元, 下元]
    冬至: [1, 7, 4], 小寒: [2, 8, 5], 大寒: [3, 9, 6], 立春: [8, 5, 2], 雨水: [9, 6, 3], 惊蛰: [1, 7, 4],
    春分: [3, 9, 6], 清明: [4, 1, 7], 谷雨: [5, 2, 8], 立夏: [4, 1, 7], 小满: [5, 2, 8], 芒种: [6, 3, 9],
    夏至: [9, 3, 6], 小暑: [8, 2, 5], 大暑: [7, 1, 4], 立秋: [2, 5, 8], 处暑: [1, 4, 7], 白露: [9, 3, 6],
    秋分: [7, 1, 4], 寒露: [6, 9, 3], 霜降: [5, 8, 2], 立冬: [6, 9, 3], 小雪: [5, 8, 2], 大雪: [4, 7, 1]
  };
  const PINYIN = { DONG_ZHI: '冬至', XIAO_HAN: '小寒', DA_HAN: '大寒', LI_CHUN: '立春', YU_SHUI: '雨水', JING_ZHE: '惊蛰', DA_XUE: '大雪' };
  const YUAN = ['上元', '中元', '下元'];
  const ZHI_GONG = { 子: 1, 丑: 8, 寅: 8, 卯: 3, 辰: 4, 巳: 4, 午: 9, 未: 2, 申: 2, 酉: 7, 戌: 6, 亥: 6 };
  const mod = (a, n) => ((a % n) + n) % n;
  const isYangJQ = jq => JQ_ORDER.indexOf(jq) < 12;

  // ---------- 历法工具 ----------
  const jqCache = {};
  function jieqiOfYear(y) { // 返回该农历年表中所有节气 [{name, solar, ts}]
    if (jqCache[y]) return jqCache[y];
    const t = Solar.fromYmd(y, 6, 1).getLunar().getJieQiTable();
    const out = [];
    for (const k in t) {
      const name = PINYIN[k] || k;
      if (!JU_TABLE[name]) continue;
      const s = t[k];
      out.push({ name, solar: s, ts: s.toYmdHms() });
    }
    return (jqCache[y] = out);
  }
  function jieqiList(y1, y2) {
    const m = {};
    for (let y = y1; y <= y2; y++) for (const j of jieqiOfYear(y)) m[j.ts] = j;
    return Object.values(m).sort((a, b) => (a.ts < b.ts ? -1 : 1));
  }
  const dayNum = s => Math.floor(s.getJulianDay() + 0.5); // 以民用日为单位的整数日序
  // 奇门日：23 点后算次日
  function qmDayNum(s) { return dayNum(s) + (s.getHour() >= 23 ? 1 : 0); }
  let DAY_OFFSET = null;
  function dayGzIdx(dn) {
    if (DAY_OFFSET === null) {
      const s = Solar.fromYmd(2000, 1, 1);
      DAY_OFFSET = mod(GZ.indexOf(s.getLunar().getDayInGanZhi()) - dayNum(s), 60);
    }
    return mod(dn + DAY_OFFSET, 60);
  }
  const dnToStr = dn => { const s = Solar.fromJulianDay(dn); return s.toYmd(); };

  // ---------- 定局 ----------
  function fuTouOf(dn) { // 符头：最近的甲/己日
    const idx = dayGzIdx(dn);
    const ft = idx - (idx % 5);
    const z = ZHI[ft % 12];
    const yuan = '子午卯酉'.includes(z) ? 0 : '寅申巳亥'.includes(z) ? 1 : 2;
    return { idx: ft, gz: GZ[ft], dn: dn - (idx % 5), yuan };
  }

  // 拆补法：一进入交节的那个时辰就换用新节气的局（p64–72）
  const msOf = str => { const [a, b] = str.split(' '); const [y, m, d] = a.split('-').map(Number); const [h, mi, se] = b.split(':').map(Number); return Date.UTC(y, m - 1, d, h, mi, se); };
  function shiStartMs(ms) { const t = new Date(ms); const h = t.getUTCHours(); const back = (h % 2 === 1 ? 0 : 3600e3) + t.getUTCMinutes() * 60e3 + t.getUTCSeconds() * 1e3 + t.getUTCMilliseconds(); return ms - back; }
  const fmtMs = ms => { const t = new Date(ms), p = n => String(n).padStart(2, '0'); return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ${p(t.getUTCHours())}:${p(t.getUTCMinutes())}`; };
  function juChaiBu(solar, jqSolar) {
    const nowMs = msOf(solar.toYmdHms());
    const off = jqSolar ? nowMs - msOf(jqSolar.toYmdHms()) : 0; // 真太阳时与北京时间之差
    const list = jieqiList(solar.getYear() - 1, solar.getYear() + 1);
    let cur = null, curStart = 0;
    for (const j of list) { const st = shiStartMs(msOf(j.ts) + off); if (st <= nowMs) { cur = j; curStart = st; } }
    const dn = qmDayNum(solar);
    const ft = fuTouOf(dn);
    const yang = isYangJQ(cur.name);
    return {
      method: '拆补法', jieqi: cur.name, jieqiTime: cur.ts, yang, yuan: ft.yuan,
      ju: JU_TABLE[cur.name][ft.yuan], fuTou: ft,
      note: `当前节气「${cur.name}」（交节 ${cur.ts}${jqSolar ? ' 北京时间' : ''}，自交节时辰 ${fmtMs(curStart).slice(5)} 起换局）。日干支 ${GZ[dayGzIdx(dn)]}，符头为 ${ft.gz}（${ft.gz[1]} 属${['子午卯酉', '寅申巳亥', '辰戌丑未'][ft.yuan]}）→ ${YUAN[ft.yuan]}。`
    };
  }

  // 置闰法：以上元符头（甲子/己卯/甲午/己酉）起 15 日为一个节气，超神过九日于芒种、大雪置闰
  function juZhiRun(solar) {
    const y = solar.getYear();
    const list = jieqiList(y - 6, y + 1);
    const target = qmDayNum(solar);
    // 找起点：y-5 年前后的冬至
    let i0 = list.findIndex(j => j.name === '冬至' && j.solar.getYear() === y - 5);
    const T0 = dayNum(list[i0].solar);
    // 上元符头：干支序 %15==0
    // 选择 T0 - S 落在 [-5, 9]
    let S = T0 + 5; while (dayGzIdx(S) % 15 !== 0) S--;
    let ji = i0, runNow = false;
    while (S + 15 <= target) {
      const name = list[ji].name;
      let nextJi = ji + 1, nextRun = false;
      if ((name === '芒种' || name === '大雪') && !runNow) {
        const Tn = dayNum(list[ji + 1].solar);
        if (Tn - (S + 15) > 9) { nextJi = ji; nextRun = true; }
      }
      S += 15; ji = nextJi; runNow = nextRun;
    }
    const name = list[ji].name;
    const Tj = dayNum(list[ji].solar);
    const off = Tj - S; // >0 超神（符头在节气前），<0 接气
    const yuan = Math.floor((target - S) / 5);
    const yang = isYangJQ(name);
    const ft = fuTouOf(target);
    let rel = runNow ? `闰${name}（超神过九日，置闰重复本节气）` :
      off > 0 ? `超神 ${off} 日（符头先于节气到）` : off < 0 ? `接气 ${-off} 日（节气先于符头到）` : '正授（符头与节气同日）';
    return {
      method: '置闰法', jieqi: name, jieqiTime: list[ji].ts, yang, yuan, ju: JU_TABLE[name][yuan], fuTou: ft,
      run: runNow, blockStart: dnToStr(S),
      note: `本节气上元符头 ${GZ[dayGzIdx(S)]}（${dnToStr(S)}），对应节气「${name}」，${rel}。今日距上元符头 ${target - S} 日 → ${YUAN[yuan]}。`
    };
  }

  // ---------- 布盘 ----------
  function paiPan(solar, opts = {}) {
    const method = opts.method || 'chaibu';
    const lunar = solar.getLunar();
    const ju = method === 'zhirun' ? juZhiRun(solar) : juChaiBu(solar, opts.jqSolar);
    const yang = ju.yang, J = ju.ju;
    const gz = {
      year: (opts.jqSolar ? opts.jqSolar.getLunar() : lunar).getYearInGanZhiByLiChun(),
      month: (opts.jqSolar ? opts.jqSolar.getLunar() : lunar).getMonthInGanZhiExact(),
      day: lunar.getDayInGanZhiExact(), hour: lunar.getTimeInGanZhi()
    };
    const hIdx = GZ.indexOf(gz.hour);
    const xun = Math.floor(hIdx / 10);
    const xunYi = XUN_YI[xun];
    const steps = [];
    steps.push({ t: '1. 四柱', d: `${gz.year}年 ${gz.month}月 ${gz.day}日 ${gz.hour}时（23 点起算次日子时）。${opts.timeNote ? opts.timeNote : ''}` });
    steps.push({ t: '2. 定阴阳遁与局数', d: `${ju.note}${ju.jieqi}属${yang ? '阳遁（冬至→芒种）' : '阴遁（夏至→大雪）'}，查表「${ju.jieqi} ${JU_TABLE[ju.jieqi].join(' ')}」取${YUAN[ju.yuan]} → ${yang ? '阳' : '阴'}遁${'一二三四五六七八九'[J - 1]}局。` });

    // 地盘
    const di = {}; // palace -> stem
    for (let k = 0; k < 9; k++) di[mod(J - 1 + (yang ? k : -k), 9) + 1] = QIYI[k];
    const diPos = {}; for (const p in di) diPos[di[p]] = +p;
    steps.push({ t: '3. 布地盘', d: `戊起${J}宫（${GONG[J]}），按「戊己庚辛壬癸丁丙乙」${yang ? '顺' : '逆'}布九宫：` + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(p => `${GONG[p]}${di[p]}`).join(' ') + '。' });

    // 旬首、值符、值使
    const xunPal = diPos[xunYi];
    const fuPal = xunPal === 5 ? 2 : xunPal;
    const zhiFuStar = STAR[xunPal];             // 可能为天禽
    const zhiShiDoor = DOOR[fuPal];              // 中五寄坤 → 死门
    steps.push({ t: '4. 找旬首、值符、值使', d: `时柱 ${gz.hour} 在 ${XUN_NAME[xun]} 旬，旬首 ${XUN_NAME[xun]} 遁于「${xunYi}」。地盘${xunYi}在${xunPal}宫（${GONG[xunPal]}）${xunPal === 5 ? '，中五寄坤二' : ''} → 值符 = ${zhiFuStar}，值使 = ${zhiShiDoor}。` });

    // 天盘九星：值符随时干
    const hGan = gz.hour[0];
    const hGanUse = hGan === '甲' ? xunYi : hGan;
    let hPal = diPos[hGanUse]; const hPalRaw = hPal; if (hPal === 5) hPal = 2;
    const rot = mod(RING.indexOf(hPal) - RING.indexOf(fuPal), 8);
    const star = {}, tian = {}, tianExtra = {};
    for (let i = 0; i < 8; i++) {
      const from = RING[i], to = RING[(i + rot) % 8];
      star[to] = STAR[from]; tian[to] = di[from];
      if (from === 2) { tianExtra[to] = di[5]; }
    }
    const qinPal = RING[(RING.indexOf(2) + rot) % 8];
    steps.push({ t: '5. 转天盘（九星 + 天盘干）', d: `时干 ${hGan}${hGan === '甲' ? `（甲遁于${xunYi}）` : ''} 在地盘${hPalRaw}宫${hPalRaw === 5 ? '（寄坤二）' : ''}，值符${zhiFuStar}${zhiFuStar === '天禽' ? '（随天芮）' : ''}从${fuPal}宫转到${hPal}宫，九星各携本宫地盘干${rot === 0 ? '不动（星伏吟）' : `顺时针转 ${rot} 宫`}。天禽随天芮落${GONG[qinPal]}宫，并带中五之「${di[5]}」。` });

    // 八门：值使随时支
    const steps9 = hIdx % 10;
    let dRaw = mod(xunPal - 1 + (yang ? steps9 : -steps9), 9) + 1;
    const dPal = dRaw === 5 ? 2 : dRaw;
    const drot = mod(RING.indexOf(dPal) - RING.indexOf(fuPal), 8);
    const door = {};
    for (let i = 0; i < 8; i++) door[RING[(i + drot) % 8]] = DOOR[RING[i]];
    steps.push({ t: '6. 转人盘（八门）', d: `${gz.hour} 距旬首 ${XUN_NAME[xun]} 为第 ${steps9} 个时辰。值使${zhiShiDoor}从旬首宫 ${xunPal} 起，按九宫数${yang ? '顺' : '逆'}行 ${steps9} 步到 ${dRaw} 宫${dRaw === 5 ? '（寄坤二）' : ''}，其余七门依次顺时针排列。` });

    // 八神
    const god = {};
    const gi = RING.indexOf(hPal);
    for (let k = 0; k < 8; k++) god[RING[mod(gi + (yang ? k : -k), 8)]] = GOD_YANG[k];
    steps.push({ t: '7. 排神盘（八神）', d: `小值符随大值符落${GONG[hPal]}宫，${yang ? '阳遁顺时针' : '阴遁逆时针'}排：值符、螣蛇、太阴、六合、白虎、玄武、九地、九天。` });

    // 空亡、马星
    const startZ = mod(12 - 2 * xun, 12);
    const kong = [ZHI[(startZ + 10) % 12], ZHI[(startZ + 11) % 12]];
    const kongPal = [...new Set(kong.map(z => ZHI_GONG[z]))];
    const hz = gz.hour[1];
    const maZ = '申子辰'.includes(hz) ? '寅' : '寅午戌'.includes(hz) ? '申' : '巳酉丑'.includes(hz) ? '亥' : '巳';
    const maPal = ZHI_GONG[maZ];
    steps.push({ t: '8. 空亡与驿马', d: `${XUN_NAME[xun]}旬空 ${kong.join('')} → ${kongPal.map(p => GONG[p] + p).join('、')}宫；时支${hz}，驿马在${maZ}（${GONG[maPal]}${maPal}宫）。` });

    const palaces = {};
    for (let p = 1; p <= 9; p++) {
      palaces[p] = {
        p, gua: GONG[p], dir: GONG_DIR[p], wx: GONG_WX[p], di: di[p],
        tian: p === 5 ? null : tian[p], tianExtra: tianExtra[p] || null,
        star: p === 5 ? null : star[p], qin: p === qinPal, door: door[p] || null, god: god[p] || null,
        kong: kongPal.includes(p), ma: p === maPal
      };
    }
    const res = {
      solar: solar.toYmdHms(), gz, ju, yang, J, xun: XUN_NAME[xun], xunYi, xunPal,
      zhiFu: zhiFuStar, zhiShi: zhiShiDoor, zhiFuPal: hPal, zhiShiPal: dPal, starRot: rot, doorRot: drot,
      kong, kongPal, ma: maZ, maPal, palaces, steps
    };
    res.patterns = detectPatterns(res);
    return res;
  }

  // ---------- 格局（p110–133，写成规则表） ----------
  const GAN_PAIRS = {
    '戊丙': ['青龙返首', '吉', '天盘戊加地盘丙：为事所谋，大吉大利；逢迫墓击刑则吉事成凶。'],
    '丙戊': ['飞鸟跌穴', '吉', '天盘丙加地盘戊：百事吉，事业可为，可谋大事。'],
    '乙辛': ['青龙逃走', '凶', '天盘乙加地盘辛：人亡财破，奴仆拐带；测婚主女方先离。'],
    '辛乙': ['白虎猖狂', '凶', '天盘辛加地盘乙：家败人亡，远行多灾；测婚主男方先离。'],
    '丁癸': ['朱雀投江', '凶', '天盘丁加地盘癸：文书口舌，官司词讼不利，音信沉溺。'],
    '癸丁': ['螣蛇夭矫', '凶', '天盘癸加地盘丁：文书官司，惊恐不宁。'],
    '庚丙': ['太白入荧', '凶', '天盘庚加地盘丙：占贼必来；为客进利，为主破财。'],
    '丙庚': ['荧入太白', '凶', '天盘丙加地盘庚：贼必去，门户破败，盗贼耗失。'],
    '庚庚': ['太白同宫（战格）', '凶', '天盘庚加地盘庚：官灾横祸，同辈相冲撞。'],
    '庚己': ['刑格', '凶', '天盘庚加地盘己：主官司受刑，经商破财，出行患病。'],
    '庚壬': ['上格（小格）', '凶', '天盘庚加地盘壬：远行迷失道路，求谋破财；测工作多变动。'],
    '庚癸': ['大格', '凶', '天盘庚加地盘癸：百事凶，求人不在，出行车破马伤。'],
    '癸癸': ['天网四张', '凶', '天盘癸加地盘癸：行人失伴，病讼皆伤，不可举事。'],
    '壬壬': ['蛇入地罗', '凶', '天盘壬加地盘壬：外人缠绕，内事索索。'],
    '丙丙': ['月奇悖师', '凶', '天盘丙加地盘丙：文书逼迫，破耗遗失。'],
    '乙乙': ['日奇伏吟', '平', '天盘乙加地盘乙：不宜见贵求名，只宜安分守己。'],
    '丁丁': ['星奇入太阴', '吉', '天盘丁加地盘丁：文书证件即至，喜事从心。']
  };
  const WX_KE = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' };
  const WX_SHENG = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };
  const JI3 = ['开门', '休门', '生门'];
  const QI3 = ['乙', '丙', '丁'];
  const GOD4 = ['太阴', '六合', '九地', '九天'];
  const GAN_MU = { 乙: 6, 丙: 6, 丁: 8, 戊: 6, 己: 8, 庚: 8, 辛: 4, 壬: 4, 癸: 2 }; // 天干墓宫
  const DOOR_MU = { 开门: 8, 惊门: 8, 休门: 4, 生门: 4, 死门: 4, 伤门: 2, 杜门: 2, 景门: 6 }; // 门入墓宫
  const OPP = { 1: 9, 9: 1, 2: 8, 8: 2, 3: 7, 7: 3, 4: 6, 6: 4 };
  const DOOR_HOME = { 休门: 1, 死门: 2, 伤门: 3, 杜门: 4, 开门: 6, 惊门: 7, 生门: 8, 景门: 9 };
  // 干支 → 盘上代表它的干（甲用旬首仪）
  const ganOf = gz => gz[0] === '甲' ? XUN_YI[Math.floor(GZ.indexOf(gz) / 10)] : gz[0];
  // 门在某宫的状态
  function doorState(door, p) {
    if (!door || p === 5) return [];
    const dw = DOOR_WX[door], pw = GONG_WX[p], out = [];
    if (DOOR_HOME[door] === p) out.push('伏吟');
    if (OPP[DOOR_HOME[door]] === p) out.push('反吟');
    if (DOOR_MU[door] === p) out.push('入墓');
    if (WX_KE[dw] === pw) out.push('门迫');
    else if (WX_KE[pw] === dw) out.push('受制');
    else if (WX_SHENG[pw] === dw) out.push('宫生门（义）');
    else if (WX_SHENG[dw] === pw) out.push('门生宫（和）');
    else out.push('比和');
    return out;
  }

  // 整盘规则：返回 null 或 {name, level, desc}
  const BOARD_RULES = [
    r => GAN.indexOf(r.hg) === (GAN.indexOf(r.dg) + 6) % 10 && { name: '五不遇时', level: '凶', desc: `时干${r.hg}克日干${r.dg}（阳克阳、阴克阴），事多不顺，择时宜避开。` },
    r => { const T = { 甲: ['甲子', '甲戌'], 己: ['甲子', '甲戌'], 乙: ['甲申'], 庚: ['甲申'], 丙: ['甲午'], 辛: ['甲午'], 丁: ['甲辰'], 壬: ['甲辰'], 戊: ['甲寅'], 癸: ['甲寅'] };
      return T[r.dg].includes(r.gz.hour) && { name: '天显时格', level: '吉', desc: '值班六甲透出之时（与日干相合），虽为伏吟不作凶论。宜行兵、上官、求财、远行。' }; },
    r => r.starRot === 0 && { name: '九星伏吟', level: '凶', desc: '值符不动，九星在本宫。主迟、主慢，利主不利客，宜守不宜动，宜讨债收财。' },
    r => r.starRot === 4 && { name: '九星反吟', level: '凶', desc: '九星落对冲宫。主快、主反复，利客不利主；出行可能半途而回。' },
    r => r.doorRot === 0 && { name: '八门伏吟', level: '凶', desc: '八门在本宫不动，主迟滞。' },
    r => r.doorRot === 4 && { name: '八门反吟', level: '凶', desc: '八门落对冲宫，门反吟尤为不利，事有反复。' }
  ];
  // 单宫规则：c = {g, p, T(天盘干数组), has(x), r}
  const PALACE_RULES = [
    c => c.T.map(t => GAN_PAIRS[t + c.g.di] && { name: GAN_PAIRS[t + c.g.di][0], level: GAN_PAIRS[t + c.g.di][1], desc: GAN_PAIRS[t + c.g.di][2] }),
    c => c.T.map(t => ({ 戊: 3, 己: 2, 庚: 8, 辛: 9, 壬: 4, 癸: 4 })[t] === c.p && { name: `六仪击刑（${t}）`, level: '凶', desc: `天盘${t}落${c.g.gua}宫，所藏之甲与宫支相刑。一动必有灾伤，极凶。` }),
    c => c.T.map(t => ({ 乙: 3, 丙: 9, 丁: 7 })[t] === c.p && { name: `三奇升殿（${t}）`, level: '吉', desc: `${t}奇落${c.g.gua}宫（贵人升殿），百事可为。` }),
    c => c.T.map(t => ({ 乙: 3, 丙: 4, 丁: 9 })[t] === c.p && { name: `奇游禄位（${t}）`, level: '吉', desc: `${t}奇到禄位${c.g.gua}宫${JI3.includes(c.g.door) ? '，又合吉门' : '，合三吉门更佳'}，宜上官赴任、求财祈福。` }),
    c => c.T.map(t => (GAN_MU[t] === c.p && QI3.includes(t)) && { name: `三奇入墓（${t}）`, level: '凶', desc: `${t}奇落${c.g.gua}宫入墓，奇而无力，吉的不吉，凶的不凶。` }),
    c => c.has('乙') && c.p === 2 && { name: '三奇入墓（乙，一说）', level: '凶', desc: '乙属木，笼统按木论墓在未（坤宫）。书中两说并列。' },
    c => c.T.map(t => (((t === '丙' || t === '丁') && (c.p === 1 || c.g.di === '壬' || c.g.di === '癸')) || (t === '乙' && (c.p === 6 || c.p === 7 || c.g.di === '庚' || c.g.di === '辛'))) && { name: `三奇受刑（${t}）`, level: '凶', desc: t === '乙' ? '乙木入金乡（临乾兑或遇庚辛），受克制，不可行动。' : `${t}火入水乡（临坎宫或遇壬癸），受克制，不可行动。` }),
    c => { const hgT = ganOf(c.r.gz.hour); return c.has(hgT) && GAN_MU[hgT] === c.p && { name: '时干入墓', level: '凶', desc: `时干${hgT}在天盘落入墓宫（${c.g.gua}），事多昏昧，择方宜避开。` }; },
    c => { const st = doorState(c.g.door, c.p); return [
      st.includes('门迫') && { name: `门迫（${c.g.door}）`, level: JI3.includes(c.g.door) ? '凶' : '平', desc: `${c.g.door}克${c.g.gua}宫。${JI3.includes(c.g.door) ? '吉门被迫，吉事不就。' : '凶门被迫，事更凶。'}` },
      st.includes('入墓') && { name: `门入墓（${c.g.door}）`, level: '凶', desc: `${c.g.door}落${c.g.gua}宫入墓，门力受困。` }]; },
    c => c.g.door === c.r.zhiShi && c.g.di === '丁' && { name: '玉女守门', level: '吉', desc: '值使门落在地盘丁奇之宫。其方利宴会喜乐、婚姻之事。' },
    c => c.T.some(t => QI3.includes(t)) && JI3.includes(c.g.door) && GOD4.includes(c.g.god) && { name: '三奇之灵', level: '吉', desc: '三奇、吉门、吉神同临一宫，吉道清灵，用事俱吉。' },
    c => { const q = c.T.some(t => QI3.includes(t)) && JI3.includes(c.g.door); const m = { 太阴: '真诈', 六合: '休诈', 九地: '重诈' }[c.g.god];
      return q && m && { name: `三诈·${m}`, level: '吉', desc: `三吉门合三奇，上乘${c.g.god}。经商、远行、婚娶，百事皆吉。` }; },
    c => { const d = c.g.door, gd = c.g.god, any = xs => c.T.some(t => xs.includes(t)); const L = [];
      if (d === '景门' && any(QI3) && gd === '九天') L.push(['天假', '宜争讼、见贵求官、上书献策。']);
      if (d === '杜门' && any(['丁', '己', '癸']) && ['九地', '太阴', '六合'].includes(gd)) L.push(['地假', '宜潜藏埋伏、躲灾、谋探私事。']);
      if (d === '惊门' && c.has('壬') && gd === '九天') L.push(['人假', '宜捕捉逃亡。']);
      if (d === '伤门' && any(['丁', '己', '癸']) && gd === '九地') L.push(['神假', '宜埋藏伏藏，使人难知。']);
      if (d === '死门' && any(['丁', '己', '癸']) && gd === '九地') L.push(['鬼假', '宜超度亡灵、破土修坟、狩猎。']);
      return L.map(([n, t]) => ({ name: `五假·${n}`, level: '平', desc: `借锐气用事，事合其气则有利。${t}` })); },
    c => c.p === c.r.zhiFuPal && c.T.some(t => QI3.includes(t)) && { name: '欢怡', level: '吉', desc: '三奇临值符之宫，凡事谋为皆有利，众情悦服。' },
    c => c.T.map(t => ['乙庚', '丙辛', '丁壬', '戊癸', '戊己'].includes(t + c.g.di) && { name: `奇仪相合（${t}${c.g.di}）`, level: '平', desc: `天地盘干相合，主和解、了结、平局、平分${JI3.includes(c.g.door) ? '；得吉门更顺' : ''}。` }),
    c => c.has('庚') && (c.g.di === '乙' || c.g.di === '丁') && { name: `奇格·${{ 乙: '合格', 丁: '破格' }[c.g.di]}`, level: '凶', desc: `天盘庚加地盘${c.g.di}，出行用兵均大凶。（庚加丙即太白入荧，又叫贼格）` },
    c => c.has('庚') && c.g.di === c.r.xunYi && { name: '伏宫格', level: '凶', desc: `天盘庚加地盘值符（旬首${c.r.xunYi}），庚克甲帅。主客俱不利，求人不在，出行防盗。` },
    c => c.has(c.r.xunYi) && c.g.di === '庚' && { name: '飞宫格', level: '凶', desc: `天盘值符（${c.r.xunYi}）加地盘庚，尤不利客；作生意破财，宜换地方。` },
    c => { if (!c.has('庚')) return null; const P = { 年: c.r.gz.year, 月: c.r.gz.month, 日: c.r.gz.day, 时: c.r.gz.hour };
      return Object.entries(P).map(([k, gz]) => ganOf(gz) === c.g.di && { name: k === '日' ? '日格（伏干格）' : `${k}格`, level: '凶', desc: `天盘庚加地盘${k}干${c.g.di}。${k === '日' ? '日干为求测人，主客皆伤，尤不利主。' : '用事大凶，只宜捕盗寻人。'}` }); },
    c => { const dgT = ganOf(c.r.gz.day); return c.has(dgT) && c.g.di === '庚' && { name: '飞干格', level: '凶', desc: `天盘日干${dgT}加地盘庚，主客两伤。` }; },
    c => { const Pg = [c.r.xunYi, ...['year', 'month', 'day', 'hour'].map(k => ganOf(c.r.gz[k]))];
      return ((c.has('丙') && Pg.includes(c.g.di)) || (c.has(c.r.xunYi) && c.g.di === '丙')) && { name: '悖格', level: '凶', desc: '丙加值符或年月日时干（或值符加丙），纲纪紊乱；得三吉门可用。' }; },
    c => { const O = { 戊: '辛', 辛: '戊', 己: '壬', 壬: '己', 庚: '癸', 癸: '庚' }; return c.has(c.r.xunYi) && O[c.r.xunYi] === c.g.di && { name: '值符反吟', level: '凶', desc: `天盘值符${c.r.xunYi}加地盘${c.g.di}，所藏之甲地支相冲。主快、主反复。` }; },
    c => { const d = c.g.door, gd = c.g.god, L = [];
      if (c.has('丙') && c.g.di === '丁' && d === '生门') L.push(['天遁', '二奇并生门，宜上书求官、经商、婚姻。']);
      if (c.has('乙') && c.g.di === '己' && d === '开门') L.push(['地遁', '宜安营扎寨、埋伏、建筑修造。']);
      if (c.has('丁') && d === '休门' && gd === '太阴') L.push(['人遁', '宜探密、伏藏、和谈、求贤、结婚、交易。']);
      if (c.has('丙') && d === '生门' && gd === '九天') L.push(['神遁', '宜攻虚、开路。']);
      if (c.has('丁') && (d === '杜门' || d === '开门') && gd === '九地') L.push(['鬼遁', '宜偷营劫寨、设伪伏虚。']);
      if (c.has('乙') && JI3.includes(d) && c.p === 4) L.push(['风遁', '宜顺风行事。']);
      if (c.has('乙') && JI3.includes(d) && c.g.di === '辛') L.push(['云遁', '宜求雨、立营寨。']);
      if (c.has('乙') && JI3.includes(d) && (c.p === 1 || c.g.di === '癸')) L.push(['龙遁', '宜水战、修桥、穿井。']);
      if ((c.has('乙') && c.g.di === '辛' && (d === '休门' || d === '生门') && c.p === 8) || (c.has('庚') && d === '开门' && c.p === 7)) L.push(['虎遁', '宜安营扎寨、设伏、修筑。']);
      return L.map(([n, t]) => ({ name: n, level: '吉', desc: t })); }
  ];
  function detectPatterns(r) {
    const out = [];
    const ctxR = Object.assign({}, r, { dg: r.gz.day[0], hg: r.gz.hour[0] });
    for (const f of BOARD_RULES) { const x = f(ctxR); if (x) out.push(Object.assign({ where: x.where || '全盘' }, x)); }
    for (let p = 1; p <= 9; p++) {
      if (p === 5) continue;
      const g = r.palaces[p]; const T = [g.tian, g.tianExtra].filter(Boolean);
      const c = { g, p, T, has: x => T.includes(x), r };
      const where = `${g.gua}${p}宫`;
      for (const f of PALACE_RULES) {
        let x = f(c); if (!x) continue; if (!Array.isArray(x)) x = [x];
        for (const y of x) if (y) out.push(Object.assign({ where }, y));
      }
    }
    // 五不遇时与天显时标在“时辰”
    out.forEach(x => { if (x.name === '五不遇时' || x.name === '天显时格') x.where = '时辰'; });
    return out;
  }

  function fromDate(y, m, d, h, mi, opts) { return paiPan(Solar.fromYmdHms(y, m, d, h, mi, 0), opts); }

  // 真太阳时：钟表时间 + 经度差 + 均时差。返回 {solar(真太阳时), jqSolar(北京时间，用于比较节气), lonMin, eot}
  function trueSolar(y, m, d, h, mi, lon, tz) {
    const utc = Date.UTC(y, m - 1, d, h, mi) - tz * 3600e3;
    const u = new Date(utc);
    const start = Date.UTC(u.getUTCFullYear(), 0, 1);
    const doy = Math.floor((utc - start) / 864e5) + 1;
    const g = 2 * Math.PI / 365 * (doy - 1 + (u.getUTCHours() - 12) / 24);
    const eot = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const lonMin = (lon - tz * 15) * 4;
    const t = new Date(utc + (lon * 4 + eot) * 60e3);
    const b = new Date(utc + 8 * 3600e3);
    const mk = x => Solar.fromYmdHms(x.getUTCFullYear(), x.getUTCMonth() + 1, x.getUTCDate(), x.getUTCHours(), x.getUTCMinutes(), x.getUTCSeconds());
    return { solar: mk(t), jqSolar: mk(b), lonMin, eot };
  }

  return {
    paiPan, fromDate, trueSolar, doorState, ganOf, GAN_MU, GAN, ZHI, GZ, GONG, GONG_DIR, GONG_WX, STAR, DOOR, DOOR_WX, JU_TABLE, JQ_ORDER, QIYI, RING, GOD_YANG
  };
});
