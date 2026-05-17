import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  Database,
  FlaskConical,
  GitCompareArrows,
  Globe,
  KeyRound,
  LayoutGrid,
  RefreshCw,
  Shield,
  Users,
  ChevronRight,
  Zap,
} from "lucide-react";

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.style.overflow = "auto";
    document.body.style.overflow = "auto";
    const root = document.getElementById("root");
    if (root) root.style.overflow = "auto";
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      if (root) root.style.overflow = "";
    };
  }, []);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const features = [
    { icon: Bot,              key: "multi_model" },
    { icon: Globe,            key: "custom_api" },
    { icon: FlaskConical,     key: "judge_eval" },
    { icon: Database,         key: "custom_dataset" },
    { icon: RefreshCw,        key: "sample_retry" },
    { icon: GitCompareArrows, key: "ab_compare" },
    { icon: Bell,             key: "webhook" },
    { icon: Users,            key: "team_collab" },
  ];

  const highlights = [
    { icon: GitCompareArrows, key: "ab_compare",   color: "from-violet-500 to-purple-600" },
    { icon: Zap,              key: "webhook",       color: "from-amber-500 to-orange-500" },
    { icon: KeyRound,         key: "sso",           color: "from-emerald-500 to-teal-600" },
  ];

  const steps = [
    { num: "01", key: "step_1" },
    { num: "02", key: "step_2" },
    { num: "03", key: "step_3" },
    { num: "04", key: "step_4" },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ───────── Header ───────── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2.5">
            <img src="/favicon.svg" alt="" className="h-8 w-8 shrink-0" width={32} height={32} aria-hidden />
            <span className="text-lg font-bold tracking-tight text-slate-900">{t("landing.brand")}</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#whats-new"    className="hover:text-slate-900 transition-colors">{t("landing.nav_new")}</a>
            <a href="#features"     className="hover:text-slate-900 transition-colors">{t("landing.nav_features")}</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">{t("landing.nav_how")}</a>
            <a href="#open-source"  className="hover:text-slate-900 transition-colors">{t("landing.nav_open_source")}</a>
          </nav>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
              <button
                onClick={() => changeLanguage("en")}
                className={`px-2.5 py-1 text-xs rounded transition-all ${
                  !i18n.language.startsWith("zh") ? "bg-white shadow-sm text-slate-900 font-medium" : "text-slate-500 hover:text-slate-700"
                }`}
              >EN</button>
              <button
                onClick={() => changeLanguage("zh")}
                className={`px-2.5 py-1 text-xs rounded transition-all ${
                  i18n.language.startsWith("zh") ? "bg-white shadow-sm text-slate-900 font-medium" : "text-slate-500 hover:text-slate-700"
                }`}
              >中文</button>
            </div>
            <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900" onClick={() => navigate("/login")}>
              {t("landing.login")}
            </Button>
            <Button size="sm" className="bg-[#00629B] hover:bg-[#005080] text-white" onClick={() => navigate("/login")}>
              {t("landing.get_started")}
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      {/* ───────── Hero ───────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-sky-50 via-blue-50/50 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-sky-100/40 rounded-full blur-3xl" />
          <div className="absolute top-40 left-0 w-96 h-96 bg-blue-50/60 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto text-center px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200/60 text-sky-700 text-sm font-medium mb-8">
            <FlaskConical className="w-3.5 h-3.5" />
            {t("landing.hero_badge")}
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
            {t("landing.hero_title_1")}
            <br />
            <span className="bg-gradient-to-r from-[#00629B] to-sky-500 bg-clip-text text-transparent">
              {t("landing.hero_title_2")}
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {t("landing.hero_subtitle")}
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" className="bg-[#00629B] hover:bg-[#005080] text-white h-12 px-8 text-base" onClick={() => navigate("/login")}>
              {t("landing.hero_cta_primary")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline" size="lg" className="h-12 px-8 text-base border-slate-300 text-slate-700"
              onClick={() => document.getElementById("whats-new")?.scrollIntoView({ behavior: "smooth" })}
            >
              {t("landing.hero_cta_secondary")}
            </Button>
          </div>

          {/* Stats row */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {(["stat_benchmarks", "stat_models", "stat_compare", "stat_integrations"] as const).map((key) => (
              <div key={key} className="text-center">
                <div className="text-3xl font-bold text-slate-900">{t(`landing.${key}_value`)}</div>
                <div className="mt-1 text-sm text-slate-500">{t(`landing.${key}_label`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── What's New ───────── */}
      <section id="whats-new" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200/60 text-violet-700 text-sm font-medium mb-5">
              <Zap className="w-3.5 h-3.5" />
              {t("landing.new_badge")}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              {t("landing.new_title")}
            </h2>
            <p className="mt-4 text-lg text-slate-500">{t("landing.new_subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {highlights.map(({ icon: Icon, key, color }) => (
              <div key={key} className="relative rounded-2xl border border-slate-200/80 bg-white p-7 hover:shadow-xl hover:shadow-slate-200/60 hover:border-slate-300 transition-all duration-300 overflow-hidden group">
                <div className={`absolute top-0 right-0 w-40 h-40 bg-gradient-to-br ${color} opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-5 shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-xs font-medium mb-3">
                  {t("landing.new_tag")}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{t(`landing.new_${key}_title`)}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">{t(`landing.new_${key}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Features ───────── */}
      <section id="features" className="py-24 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              {t("landing.features_title")}
            </h2>
            <p className="mt-4 text-lg text-slate-500">{t("landing.features_subtitle")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map(({ icon: Icon, key }) => (
              <div
                key={key}
                className="group relative bg-white rounded-xl border border-slate-200/80 p-6 hover:shadow-lg hover:shadow-slate-200/50 hover:border-slate-300/80 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center mb-4 group-hover:bg-[#00629B]/10 transition-colors">
                  <Icon className="w-5 h-5 text-[#00629B]" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{t(`landing.feat_${key}_title`)}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{t(`landing.feat_${key}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── How It Works ───────── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              {t("landing.how_title")}
            </h2>
            <p className="mt-4 text-lg text-slate-500">{t("landing.how_subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map(({ num, key }, idx) => (
              <div key={key} className="relative">
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] border-t-2 border-dashed border-slate-200" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#00629B] to-sky-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-sky-200/50">
                    {num}
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-slate-900">{t(`landing.${key}_title`)}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed max-w-[220px]">{t(`landing.${key}_desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── Admin & Integration ───────── */}
      <section className="py-24 bg-slate-50/80">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-sm font-medium mb-5">
                <Shield className="w-3.5 h-3.5" />
                {t("landing.admin_badge")}
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-4">
                {t("landing.admin_title")}
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed mb-8">
                {t("landing.admin_desc")}
              </p>
              <ul className="space-y-3">
                {(["admin_item_1", "admin_item_2", "admin_item_3", "admin_item_4"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-slate-600 text-sm">{t(`landing.${k}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {([
                { icon: KeyRound, k: "admin_card_sso",     bg: "bg-emerald-50",  ic: "text-emerald-600"  },
                { icon: Bell,     k: "admin_card_webhook", bg: "bg-amber-50",    ic: "text-amber-600"    },
                { icon: Users,    k: "admin_card_users",   bg: "bg-blue-50",     ic: "text-[#00629B]"    },
                { icon: BarChart3,k: "admin_card_audit",   bg: "bg-violet-50",   ic: "text-violet-600"   },
              ] as const).map(({ icon: Icon, k, bg, ic }) => (
                <div key={k} className={`rounded-xl border border-slate-200/80 ${bg} p-5`}>
                  <Icon className={`w-6 h-6 ${ic} mb-3`} />
                  <div className="text-sm font-semibold text-slate-800">{t(`landing.${k}_title`)}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{t(`landing.${k}_desc`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───────── Open Source / EvalScope ───────── */}
      <section id="open-source" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="relative rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 sm:p-16 overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#00629B]/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-sky-300 text-sm font-medium mb-6">
                  <LayoutGrid className="w-3.5 h-3.5" />
                  {t("landing.engine_badge")}
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">{t("landing.engine_title")}</h2>
                <p className="mt-4 text-slate-400 leading-relaxed text-lg">{t("landing.engine_desc")}</p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {(["engine_tag_1","engine_tag_2","engine_tag_3","engine_tag_4","engine_tag_5"] as const).map((k) => (
                    <span key={k} className="px-3 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 text-sm">
                      {t(`landing.${k}`)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4 min-w-[260px]">
                <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                  <div className="text-3xl font-bold text-white">100+</div>
                  <div className="text-sm text-slate-400 mt-1">{t("landing.engine_metric_1")}</div>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-5">
                  <div className="text-3xl font-bold text-white">{t("landing.engine_metric_2_value")}</div>
                  <div className="text-sm text-slate-400 mt-1">{t("landing.engine_metric_2")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───────── CTA ───────── */}
      <section className="py-24 bg-slate-50/80">
        <div className="max-w-3xl mx-auto text-center px-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">{t("landing.cta_title")}</h2>
          <p className="mt-4 text-lg text-slate-500">{t("landing.cta_subtitle")}</p>
          <div className="mt-10 flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" className="bg-[#00629B] hover:bg-[#005080] text-white h-12 px-8 text-base" onClick={() => navigate("/login")}>
              {t("landing.cta_button")}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* ───────── Footer ───────── */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <img src="/favicon.svg" alt="" className="h-5 w-5 shrink-0" width={20} height={20} aria-hidden />
            {t("landing.footer_brand")}
          </div>
          <div className="text-sm text-slate-400">{t("landing.footer_powered")}</div>
        </div>
      </footer>
    </div>
  );
}

