import { NavLink, useNavigate } from 'react-router-dom';
import { Leaf, Shield, Heart, Info, MessageSquareText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

/** 帮助页深链：跳转后自动展开对应分区并定位到具体条目 */
const helpLink = (section: string, item: string) =>
  `/help?section=${section}&item=${encodeURIComponent(item)}`;

export default function Footer() {
  const { auth } = useApp();
  const navigate = useNavigate();

  const handleFeedbackClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (auth.isLoggedIn) {
      navigate('/profile#feedback');
    } else {
      navigate('/profile');
      toast.info('请先登录后提交意见反馈');
    }
  };

  return (
    <footer className="w-full border-t border-border/60 bg-gradient-to-b from-transparent to-primary/5 mt-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-8">
          <div className="col-span-3 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center text-primary-foreground">
                <Leaf className="size-4" />
              </div>
              <span className="font-bold text-foreground">青藤集市</span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-xs md:text-sm text-foreground mb-2 md:mb-3 flex items-center gap-1.5">
              <Shield className="size-3.5 md:size-4 text-primary" />
              平台规则
            </h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <NavLink
                  to={helpLink('rules', '交易规则')}
                  className="hover:text-primary transition-colors"
                >
                  交易规则
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('rules', '商品发布规范')}
                  className="hover:text-primary transition-colors"
                >
                  禁止物品
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('safety', '线下自提安全建议')}
                  className="hover:text-primary transition-colors"
                >
                  自提须知
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('disclaimer', '信息交流平台')}
                  className="hover:text-primary transition-colors"
                >
                  免责声明
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-xs md:text-sm text-foreground mb-2 md:mb-3 flex items-center gap-1.5">
              <Info className="size-3.5 md:size-4 text-primary" />
              帮助中心
            </h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <NavLink
                  to={helpLink('guide', '如何发布商品？')}
                  className="hover:text-primary transition-colors"
                >
                  如何发布
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('guide', '如何认证登录？')}
                  className="hover:text-primary transition-colors"
                >
                  认证说明
                </NavLink>
              </li>
              <li>
                <NavLink
                  to={helpLink('safety', '防诈骗提醒')}
                  className="hover:text-primary transition-colors"
                >
                  防诈骗提示
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-xs md:text-sm text-foreground mb-2 md:mb-3 flex items-center gap-1.5">
              <Heart className="size-3.5 md:size-4 text-primary" />
              关于我们
            </h4>
            <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
              <li>
                <NavLink
                  to={helpLink('about', '关于青藤')}
                  className="hover:text-primary transition-colors"
                >
                  关于青藤
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="#"
                  onClick={handleFeedbackClick}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <MessageSquareText className="size-3.5" />
                  意见反馈
                </NavLink>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 md:mt-10 pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2026 青藤集市 Qingteng Market · 校园环保再生计划</p>
          <p className="flex items-center gap-1.5">
            <Leaf className="size-3 text-primary/60" />
            让每一件闲置，都再生长一次
          </p>
        </div>
      </div>
    </footer>
  );
}
