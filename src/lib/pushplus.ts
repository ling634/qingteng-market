// ---------------------------------------------------------------
// PushPlus 微信消息推送（通用封装）
// 接口文档：https://www.pushplus.plus/doc/guide/openApi.html
//
// 本模块只负责「把消息发出去」，不包含任何业务触发逻辑。
// 后续业务通知统一复用 sendPushPlusMessage，不要各自重写请求：
//   1. 私信通知：新消息入库后，取接收方 profile_private.pushplus_token 调用本函数
//      （触发器/Edge Function 侧可用 SQL 辅助函数 public.get_pushplus_token 读 token）
//   2. 求购匹配通知：新商品上架命中求购关键词时，取求购者 token 推送
// ---------------------------------------------------------------

const PUSHPLUS_API = 'https://www.pushplus.plus/send';

export interface PushPlusSendParams {
  /** 用户的 PushPlus Token（存于 profile_private.pushplus_token） */
  token: string;
  /** 消息标题 */
  title: string;
  /** 消息正文（template 为 html，可放简单标签或纯文本） */
  content: string;
  /** 点击消息后跳转的链接（可选） */
  url?: string;
}

export interface PushPlusResult {
  /** 是否发送成功（网络可达且接口返回 code=200） */
  ok: boolean;
  /** 接口返回信息或失败原因，用于 toast 提示与排查 */
  msg: string;
}

/**
 * 通用推送函数：调用 PushPlus 接口向指定 token 的微信发送消息。
 * 不抛异常——所有失败（网络异常、token 无效等）都以 { ok: false, msg } 返回。
 */
export async function sendPushPlusMessage({
  token,
  title,
  content,
  url,
}: PushPlusSendParams): Promise<PushPlusResult> {
  try {
    const res = await fetch(PUSHPLUS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        title,
        content,
        template: 'html',
        ...(url ? { url } : {}),
      }),
    });
    if (!res.ok) {
      return { ok: false, msg: `网络异常（HTTP ${res.status}）` };
    }
    const data = (await res.json()) as {
      code?: number;
      msg?: string;
      data?: unknown;
    };
    // PushPlus 约定 code=200 为成功，其余为失败（如 token 无效、内容为空等）
    if (data.code === 200) {
      return { ok: true, msg: data.msg ?? '发送成功' };
    }
    // 失败时把返回码和 data 详情一并透出（999「服务端验证错误」需看具体内容才能定位）
    console.warn('[pushplus] 发送失败，接口完整返回：', data);
    const detail =
      typeof data.data === 'string' && data.data ? `（${data.data}）` : '';
    return {
      ok: false,
      msg: `[${data.code ?? '?'}] ${data.msg ?? '未知错误'}${detail}`,
    };
  } catch (e) {
    return { ok: false, msg: e instanceof Error ? e.message : '网络请求失败' };
  }
}

/**
 * 清洗 token：去除所有空白字符及粘贴时可能带入的不可见字符。
 * 从微信里复制的 token 经常夹带零宽空格（U+200B）、零宽连接符（U+200D）、BOM（U+FEFF）
 * 或换行，肉眼看不出来，但会导致接口校验失败。
 */
export function sanitizePushPlusToken(raw: string): string {
  return raw.replace(/[\s\u200B\u200C\u200D\uFEFF]/g, '');
}

/**
 * 发送一条测试消息：验证用户绑定的 token 是否有效。
 * 绑定成功页 / 「我的」页测试按钮均可调用。
 */
export async function sendTestPushPlusMessage(token: string): Promise<PushPlusResult> {
  // PushPlus 会拦截短时间内内容完全相同的重复推送，
  // 测试消息带上当前时间，保证每次内容唯一，可反复测试
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  return sendPushPlusMessage({
    token,
    title: '青藤集市 · 推送测试',
    content: `这是一条测试消息：你的微信推送已开启，后续有新的站内通知会第一时间送到这里。<br/><small>发送时间：${now}</small>`,
    url: 'https://qingtengmarket.xyz',
  });
}
