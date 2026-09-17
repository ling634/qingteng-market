// ---------------------------------------------------------------
// 发布内容敏感词过滤（发布闲置 / 发布求购共用）
// 原则：只拦明确违规的词，字面匹配（不做拼音/谐音/拆字检测），
// 宁可放过灰色词，避免误伤正常商品描述。
// 命中处理：输入时即时标红提示，提交时拦截并告知具体命中词。
// ---------------------------------------------------------------

/** 违禁品类 */
const FORBIDDEN_WORDS = [
  '枪支',
  '弹药',
  '管制刀具',
  '弩',
  '毒品',
  '冰毒',
  '大麻',
  '摇头丸',
  'K粉',
  '笑气',
  '电子烟',
  '假币',
  '假证',
  '处方药',
  '烟花爆竹',
  '代考',
  '替考',
  '论文代写',
  '刷单',
  '传销',
] as const;

/** 色情类 */
const PORN_WORDS = [
  '约炮',
  '援交',
  '一夜情',
  '裸聊',
  '卖淫',
  '嫖娼',
  '特殊服务',
  '上门服务',
  '原味内衣',
  '原味丝袜',
  '色情',
  '淫秽',
] as const;

const ALL_WORDS: readonly string[] = [...FORBIDDEN_WORDS, ...PORN_WORDS];

/**
 * 检测文本中命中的第一个敏感词；未命中返回 null。
 * 匹配前会去掉空白字符，防止用空格/换行拆词绕过（如「代 考」）。
 */
export function findSensitiveWord(text: string): string | null {
  if (!text) return null;
  const compact = text.replace(/\s+/g, '');
  for (const word of ALL_WORDS) {
    if (compact.includes(word)) return word;
  }
  return null;
}

/** 检测多个字段，返回第一个命中词（用于表单整体校验） */
export function findSensitiveWordIn(...texts: (string | undefined)[]): string | null {
  for (const t of texts) {
    const hit = findSensitiveWord(t ?? '');
    if (hit) return hit;
  }
  return null;
}
