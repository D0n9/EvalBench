import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldX, Home, LogIn } from "lucide-react";

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
          <ShieldX className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">403 - 权限不足</h1>
        <p className="text-slate-600 mb-8">
          您的账号尚未分配角色，无法访问此页面。
          <br />
          请联系管理员为您分配团队和角色。
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            返回首页
          </Button>
          <Button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            className="flex items-center gap-2 bg-[#00629B] hover:bg-[#005a8e] text-white"
          >
            <LogIn className="w-4 h-4" />
            重新登录
          </Button>
        </div>
      </div>
    </div>
  );
}
