import { NavLink, useNavigate } from 'react-router-dom';
import { Leaf, Shield, Heart, Info, MessageSquareText } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { UniversalLink } from '@lark-apaas/client-toolkit-lite';

export default function Footer() {
  const { auth } = useApp();
  const navigate = useNavigate();

  const handleAdminClick = () => {
    if (auth.isAdmin) {
      navigate('/admin');
    } else {
      toast.info('该入口仅站点管理员可访问');
      navigate('/admin');
    }
  };

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
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="size-8 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center text-primary-foreground">
                <Leaf className="size-4" />
              </div>
              <span className="font-bold text-foreground">青藤集市</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              校园闲置，再生长一次
              <br />
              纯线下自提 · 安全纯净的校园二手平台
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-1.5">
              <Shield className="size-4 text-primary" />
              平台规则
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <NavLink to="/help" className="hover:text-primary transition-colors">
                  交易规则
                </NavLink>
              </li>
              <li>
                <NavLink to="/help" className="hover:text-primary transition-colors">
                  禁止物品
                </NavLink>
              </li>
              <li>
                <NavLink to="/help" className="hover:text-primary transition-colors">
                  自提须知
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-1.5">
              <Info className="size-4 text-primary" />
              帮助中心
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <NavLink to="/help" className="hover:text-primary transition-colors">
                  如何发布
                </NavLink>
              </li>
              <li>
                <NavLink to="/help" className="hover:text-primary transition-colors">
                  认证说明
                </NavLink>
              </li>
              <li>
                <NavLink to="/help" className="hover:text-primary transition-colors">
                  防诈骗提示
                </NavLink>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-1.5">
              <Heart className="size-4 text-primary" />
              关于我们
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {auth.isAdmin && (
                <li>
                  <NavLink to="/admin" className="hover:text-primary transition-colors">
                    管理后台
                  </NavLink>
                </li>
              )}
              <li>
                <UniversalLink
                  to="#"
                  onClick={handleFeedbackClick}
                  className="hover:text-primary transition-colors flex items-center gap-1"
                >
                  <MessageSquareText className="size-3.5" />
                  意见反馈
                </UniversalLink>
              </li>
              <li>
                <button
                  onClick={handleAdminClick}
                  className="text-muted-foreground hover:text-primary transition-colors text-left"
                >
                  管理员入口
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border/60 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© 2024 青藤集市 Qingteng Market · 校园环保再生计划</p>
          <p className="flex items-center gap-1.5">
            <Leaf className="size-3 text-primary/60" />
            让每一件闲置，都再生长一次
          </p>
        </div>
      </div>
    </footer>
  );
}
