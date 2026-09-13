import { useState } from 'react';
import {
  HelpCircle,
  Shield,
  BookOpen,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Leaf,
  Scale,
  Heart,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const helpSections = [
  {
    id: 'rules',
    title: '平台规则',
    icon: Scale,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    id: 'guide',
    title: '新手引导',
    icon: BookOpen,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'safety',
    title: '安全须知',
    icon: Shield,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  {
    id: 'faq',
    title: '常见问题',
    icon: HelpCircle,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'report',
    title: '举报指引',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-red-100',
  },
];

const rulesContent = [
  {
    q: '用户准入规则',
    a: '青藤集市仅限本校在校学生使用。所有用户必须通过学号或校园邮箱完成实名认证，方可发布商品和参与交易。我们致力于打造纯净、安全的校园二手交易环境。',
  },
  {
    q: '商品发布规范',
    a: '禁止发布以下类型商品：违禁品、假冒伪劣商品、食品饮料（自制食品）、处方药、活体宠物、虚拟账号/代刷服务、以及违反校规校纪的物品。违规商品将被直接下架，严重者封禁账号。',
  },
  {
    q: '交易规则',
    a: '本平台仅提供信息撮合服务，所有交易均为线下自提，不涉及线上支付和订单系统。买卖双方应在约定的校内自提地点当面验货、当面交易，请注意个人财物安全。',
  },
  {
    q: '向阳位置顶规则',
    a: '向阳位为付费置顶服务，首页最多同时展示 3 个置顶商品。置顶商品按权重排序，权重相同按置顶时间排序。置顶到期后自动取消，支持续期。禁止使用违规手段刷置顶。',
  },
  {
    q: '林间好店广告规则',
    a: '林间好店面向校内合规商户开放投放（打印店、水果店、考研机构等）。广告内容须真实、合法，不得含有虚假宣传、诱导消费等内容。平台保留审核和下架广告的权利。',
  },
  {
    q: '信誉评价规则',
    a: '交易完成后买卖双方可互相评价。评价分为 1-5 星，可附文字评价。恶意差评、刷好评等行为一经核实，评价将被清除并扣除信誉分。累计多次违规将封禁账号。',
  },
];

const guideContent = [
  {
    q: '如何认证登录？',
    a: '点击首页右上角「登录」按钮，输入您的学号或校园邮箱，系统将自动校验身份。认证通过后即可使用全部功能。',
  },
  {
    q: '如何发布商品？',
    a: '登录后点击顶部「发布」按钮，填写商品分类、名称、价格、成色、图片、自提地点和备注等信息，提交后商品即刻上架。您可以在「个人中心-我的在售」中管理已发布的商品。',
  },
  {
    q: '如何联系卖家？',
    a: '在商品详情页点击「私信卖家」按钮，进入站内私信窗口与卖家沟通。为保护用户隐私和防骚扰，平台不展示微信、QQ 等外部联系方式，请使用站内私信沟通。',
  },
  {
    q: '如何收藏商品？',
    a: '在商品卡片或商品详情页点击心形收藏按钮，即可将商品加入收藏夹。您可以在「个人中心-我的收藏」中查看和管理所有收藏的商品。',
  },
  {
    q: '如何发布求购信息？',
    a: '进入「求购专区」页面，点击「发布求购」按钮，填写需求描述、预算价格、分类等信息即可发布。卖家看到后可通过站内私信联系您。',
  },
];

const safetyContent = [
  {
    q: '防诈骗提醒',
    a: '⚠️ 重要提醒：任何要求添加微信/QQ 进行私下交易的都可能是诈骗！请务必使用本站站内私信沟通。警惕"先付款后发货""定金""保证金"等话术，本站所有交易均为线下自提、当面验货。',
  },
  {
    q: '线下自提安全建议',
    a: '建议选择校内人多的公共场所（如图书馆、教学楼大厅、食堂门口等）作为自提地点，避免在偏僻处或校外交易。尽量在白天交易，可结伴前往。当面仔细验货后再完成交易。',
  },
  {
    q: '个人信息保护',
    a: '不要在商品描述或私信中透露学号、身份证号、银行卡号、家庭住址等敏感信息。平台不会以任何名义向您索要密码或验证码，如有可疑请立即举报。',
  },
  {
    q: '遇到问题怎么办？',
    a: '如遇纠纷或可疑情况，可通过商品详情页的「举报」按钮提交举报，管理员会在 24 小时内处理。紧急情况可联系管理员邮箱 1924303786@qq.com。',
  },
];

const faqContent = [
  {
    q: '青藤集市收费吗？',
    a: '基础功能完全免费！发布商品、浏览商品、私信沟通、收藏功能均不收费。「向阳位」置顶和「林间好店」广告为可选付费增值服务。',
  },
  {
    q: '为什么不能直接加微信？',
    a: '为了防骚扰、防诈骗、保护同学们的隐私安全，平台统一使用站内私信沟通。这样既能留下沟通记录便于纠纷处理，也能避免个人联系方式泄露。',
  },
  {
    q: '交易后出问题谁负责？',
    a: '青藤集市仅提供信息展示和撮合服务，不介入具体交易。交易风险由买卖双方自行承担。我们建议当面验货、当面交易，同时平台提供信誉评价和举报机制来降低风险。',
  },
  {
    q: '商品可以发布多久？',
    a: '商品上架后长期有效，直到卖家手动下架或交易完成标记售出。若商品 90 天内无任何更新，系统将自动下架，您可以在个人中心重新上架。',
  },
  {
    q: '如何成为林间好店商户？',
    a: '校内合规商户可发送邮件至 1924303786@qq.com 申请入驻，提供营业执照或社团证明等材料，审核通过后即可投放广告。学生创业项目可享优惠。',
  },
];

const reportContent = [
  {
    q: '哪些情况可以举报？',
    a: '虚假商品/图片、价格欺诈、拒绝当面交易要求转账、骚扰/辱骂、违禁品售卖、盗用他人图片、恶意差评、刷单刷好评等违反平台规则的行为均可举报。',
  },
  {
    q: '如何举报？',
    a: '在商品详情页点击右上角「...」按钮，选择「举报」；或在私信窗口点击右上角菜单选择「举报用户」。请填写具体举报原因并提供相关截图证据，便于我们核实处理。',
  },
  {
    q: '举报处理时效？',
    a: '管理员通常在 24 小时内处理举报。情况复杂的可能需要 1-3 个工作日。举报处理结果会通过站内信通知您。',
  },
  {
    q: '恶意举报会怎么样？',
    a: '恶意举报、捏造事实诬告他人的行为同样违反平台规则。一经核实，举报人将受到警告、扣除信誉分甚至封禁账号的处罚。',
  },
];

const contentMap: Record<string, { q: string; a: string }[]> = {
  rules: rulesContent,
  guide: guideContent,
  safety: safetyContent,
  faq: faqContent,
  report: reportContent,
};

export default function HelpPage() {
  const [activeSection, setActiveSection] = useState('rules');

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="w-full bg-gradient-to-b from-primary/10 via-primary/5 to-background py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="size-16 md:size-20 mx-auto rounded-full bg-white shadow-md flex items-center justify-center mb-4">
              <HelpCircle className="size-8 md:size-10 text-primary" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground mb-3">
              帮助与规则
            </h1>
            <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
              了解青藤集市的使用规则和安全须知，让你的闲置交易更安心
            </p>
          </motion.div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
        {/* 分区 Tab */}
        <div className="flex gap-2 md:gap-3 mb-6 md:mb-8 overflow-x-auto pb-2 -mx-1 px-1">
          {helpSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  document
                    .getElementById('help-content')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-105'
                    : 'bg-card border border-border/60 text-foreground/70 hover:border-primary/30 hover:text-foreground'
                }`}
              >
                <Icon className="size-4" />
                {section.title}
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        <div id="help-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="bg-card border border-border/60 rounded-2xl p-4 md:p-6 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/40">
                <div
                  className={`size-10 rounded-lg ${
                    helpSections.find((s) => s.id === activeSection)?.bgColor
                  } flex items-center justify-center`}
                >
                  {(() => {
                    const S = helpSections.find((s) => s.id === activeSection)?.icon;
                    const C = helpSections.find((s) => s.id === activeSection)?.color;
                    return S ? <S className={`size-5 ${C}`} /> : null;
                  })()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {helpSections.find((s) => s.id === activeSection)?.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    共 {contentMap[activeSection].length} 条常见问题
                  </p>
                </div>
              </div>

              <Accordion
                type="single"
                collapsible
                defaultValue={contentMap[activeSection][0]?.q}
                className="space-y-2"
              >
                {contentMap[activeSection].map((item, i) => (
                  <AccordionItem
                    key={item.q}
                    value={item.q}
                    className="border border-border/60 rounded-xl px-4 data-[state=open]:bg-muted/30 data-[state=open]:border-primary/30 transition-colors"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4 text-sm md:text-base font-medium">
                      <span className="flex items-center gap-3">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Q{i + 1}
                        </Badge>
                        {item.q}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-foreground/75 leading-relaxed pb-4 pl-9">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 联系管理员 */}
        <div className="mt-8 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl border border-primary/20 p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
              <MessageSquare className="size-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-base mb-1">还有问题？联系管理员</h3>
              <p className="text-sm text-muted-foreground mb-3">
                如果以上内容没有解决您的问题，可以通过以下方式联系我们
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline" className="bg-white/60">
                  📧 1924303786@qq.com
                </Badge>
                <Badge variant="outline" className="bg-white/60">
                  ⏰ 工作日 10:00-18:00
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* 底部装饰 */}
        <div className="mt-10 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Leaf className="size-4 text-primary/60" />
            <span className="text-xs">
              青藤集市 · 校园闲置，再生长一次
            </span>
            <Leaf className="size-4 text-primary/60 -scale-x-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
