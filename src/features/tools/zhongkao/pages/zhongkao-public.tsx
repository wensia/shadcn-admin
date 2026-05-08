import { useState } from "react";
import { useSearch } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import { Separator } from "../components/ui/separator";
import '../styles/anthropic.css';
import { useAuthStore } from '@/stores/auth-store';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { analyzeScore } from '../api';
import type { AnalysisResult, SchoolWithDistrict } from '../api';
import { RedemptionGate } from '../../redemption/components/redemption-gate';

// 区配置：考试类型、满分
const DISTRICT_CONFIG: Record<string, { examName: string; maxScore: number }> = {
  "南开区": { examName: "一模", maxScore: 800 },
  "河西区": { examName: "结课考", maxScore: 800 },
  "和平区": { examName: "一模", maxScore: 800 },
  "河东区": { examName: "一模", maxScore: 800 },
};
const SUPPORTED_DISTRICTS = Object.keys(DISTRICT_CONFIG);

export function ZhongkaoPublicPage() {
  useDocumentTitle('中考志愿填报');
  const search = useSearch({ strict: false }) as { district?: string };
  const defaultDistrict = search.district && SUPPORTED_DISTRICTS.includes(search.district)
    ? search.district
    : "南开区";

  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [accessTicket, setAccessTicket] = useState<string | null>(null);

  const [score, setScore] = useState("");
  const [district, setDistrict] = useState(defaultDistrict);
  const [chinese, setChinese] = useState("");
  const [math, setMath] = useState("");
  const [english, setEnglish] = useState("");
  const [physics, setPhysics] = useState("");
  const [chemistry, setChemistry] = useState("");
  const [politics, setPolitics] = useState("");
  const [history, setHistory] = useState("");
  const [subjectsOpen, setSubjectsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [localOnly, setLocalOnly] = useState(false);
  const [compactView, setCompactView] = useState(false);

  // 是否可以访问工具（不缓存，每次进入页面都需要验证）
  const hasAccess = isAuthenticated || !!accessTicket;

  function handleVerified(ticket: string) {
    setAccessTicket(ticket);
  }

  function clearTicketAndReset() {
    setAccessTicket(null);
    setResult(null);
  }

  async function handleAnalyze() {
    const s = parseFloat(score);
    if (isNaN(s) || s < 0 || s > 800) return;
    setLoading(true);
    try {
      const ticket = isAuthenticated ? undefined : (accessTicket ?? undefined);
      const data = await analyzeScore(s, district, false, ticket);
      setResult(data);
      setLocalOnly(false);
    } catch (err: unknown) {
      const errCode = (err as Error & { code?: string }).code;
      if (errCode === 'ACCESS_TICKET_INVALID' || errCode === 'ACCESS_TICKET_EXPIRED') {
        clearTicketAndReset();
      }
    }
    finally { setLoading(false); }
  }

  async function handleLocalOnly() {
    if (!result) return;
    setLoading(true);
    try {
      const ticket = isAuthenticated ? undefined : (accessTicket ?? undefined);
      const data = await analyzeScore(result.score, district, true, ticket);
      setResult(data);
      setLocalOnly(true);
    } catch (err: unknown) {
      const errCode = (err as Error & { code?: string }).code;
      if (errCode === 'ACCESS_TICKET_INVALID' || errCode === 'ACCESS_TICKET_EXPIRED') {
        clearTicketAndReset();
      }
    }
    finally { setLoading(false); }
  }

  function handleReset() {
    setScore(""); setChinese(""); setMath(""); setEnglish("");
    setPhysics(""); setChemistry(""); setPolitics(""); setHistory("");
    setResult(null); setLocalOnly(false);
  }

  const tierConfig = {
    sprint: {
      label: "冲刺",
      description: "录取概率较低，需要超常发挥",
      color: "#d97757",
      bg: "bg-[#d97757]/10",
    },
    stable: {
      label: "稳妥",
      description: "录取概率较高，正常发挥可达",
      color: "#788c5d",
      bg: "bg-[#788c5d]/10",
    },
    safe: {
      label: "保底",
      description: "录取几乎确定，安全兜底选项",
      color: "#6a9bcc",
      bg: "bg-[#6a9bcc]/10",
    },
  } as const;

  function renderSchoolCard(school: SchoolWithDistrict, tier: keyof typeof tierConfig) {
    const config = tierConfig[tier];

    if (compactView) {
      return (
        <div
          key={`${school.name}-${tier}`}
          className="flex flex-col rounded-xl border border-border/30 bg-card p-3 shadow-sm transition-all hover:shadow-md hover:border-[#b0aea5]"
        >
          <div className="flex items-start justify-between gap-1 mb-2">
            <span className="font-display text-[13px] font-medium text-foreground leading-tight">
              {school.name}
            </span>
            {school.is_my_district && (
              <span
                className="inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
                style={{ backgroundColor: config.color }}
              >
                本区
              </span>
            )}
          </div>
          <div className="flex items-center justify-between mt-auto">
            <span className="inline-flex items-center rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {school.district}
            </span>
            <div className="text-right">
              <span className="text-[13px] font-semibold" style={{ color: config.color }}>{school.score}</span>
              <span className="text-[10px] text-muted-foreground ml-1">分</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${school.name}-${tier}`}
        className="flex items-center justify-between rounded-xl border border-border/30 bg-card px-4 py-3.5 shadow-sm transition-all hover:shadow-md hover:border-[#b0aea5]"
      >
        <div className="flex flex-col gap-1.5">
          <span className="font-display text-[14px] font-medium text-foreground">
            {school.name}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-[11px] text-muted-foreground" style={{ fontFamily: "var(--font-serif-local)" }}>
              {school.district}
            </span>
            {school.is_my_district && (
              <span
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: config.color }}
              >
                本区
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="ant-score">{school.score} 分</div>
          <div className="ant-section-label mt-0.5">
            市排名 {school.rank.toLocaleString()}
          </div>
        </div>
      </div>
    );
  }

  function renderTierSection(tier: keyof typeof tierConfig, schools: SchoolWithDistrict[]) {
    if (schools.length === 0) return null;
    const config = tierConfig[tier];
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium ${config.bg}`}
            style={{ color: config.color, fontFamily: "var(--font-display-local)" }}
          >
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: config.color }} />
            {config.label}
            <span className="text-[11px] opacity-70">{schools.length}所</span>
          </span>
          <span className="text-[12px] text-muted-foreground">
            {config.description}
          </span>
        </div>
        <div className={compactView ? "grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5" : "space-y-2"}>
          {schools.map((school) => renderSchoolCard(school, tier))}
        </div>
      </div>
    );
  }

  // 未有访问权限 → 显示兑换码验证
  if (!hasAccess) {
    return <RedemptionGate toolId="zhongkao" onVerified={handleVerified} />;
  }

  // ═══════════════════════════════════════════════════════════════
  // 结果页
  // ═══════════════════════════════════════════════════════════════
  if (result) {
    return (
      <div className="tools-anthropic min-h-screen">
        <div className={`mx-auto px-4 py-12 ${compactView ? 'max-w-5xl' : 'max-w-2xl'}`}>
          {/* 顶部操作栏 */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <p className="ant-section-label">中考志愿填报系统</p>
              <p className="text-[13px] text-muted-foreground">
                {district} · {DISTRICT_CONFIG[district]?.examName || '考试'} {result.score} 分
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                重新评测
              </button>
              <button
                onClick={() => {
                  setLocalOnly(!localOnly);
                  if (!localOnly) {
                    handleLocalOnly();
                  } else {
                    // 切回全市
                    const s = result.score;
                    setLoading(true);
                    const ticket = isAuthenticated ? undefined : (accessTicket ?? undefined);
                    analyzeScore(s, district, false, ticket).then(data => {
                      setResult(data);
                      setLocalOnly(false);
                    }).catch(() => {}).finally(() => setLoading(false));
                  }
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                  localOnly
                    ? 'border-[#788c5d]/30 bg-[#788c5d]/10 text-[#788c5d]'
                    : 'border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                只看本区
              </button>
              <button
                onClick={() => setCompactView(!compactView)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title={compactView ? "切换为列表视图" : "切换为紧凑视图"}
              >
                {compactView ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    列表
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    紧凑
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
            {[
              { label: `${DISTRICT_CONFIG[district]?.examName || '一模'}分数`, value: result.score.toString(), unit: "分", color: "#d97757" },
              { label: "区排名", value: result.districtRank.toLocaleString(), unit: "名", color: "#6a9bcc" },
              { label: "对标中考", value: result.targetScore.toString(), unit: "分", color: "#788c5d" },
              { label: "市排名", value: result.cityRank.toLocaleString(), unit: "名", color: "#141413" },
            ].map((stat) => (
              <Card key={stat.label} className="rounded-xl border-border/30 bg-card shadow-sm text-center">
                <CardContent className="px-3 py-2.5">
                  <p className="ant-section-label mb-1 text-[11px]">{stat.label}</p>
                  <p className="text-[22px] font-bold" style={{ color: stat.color }}>{stat.value}</p>
                  <p className="ant-section-label mt-0.5 text-[11px]">{stat.unit}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 志愿推荐 */}
          <div className="mb-8">
            <div className="mb-5 flex items-baseline gap-2">
              <h2 className="font-display text-lg font-semibold text-foreground">志愿推荐</h2>
              <p className="text-[13px] text-muted-foreground">
                {localOnly ? "仅显示本区学校" : "综合市内六区学校推荐"}
              </p>
            </div>

            <div className="space-y-6">
              {renderTierSection("sprint", result.recommendations.sprint)}
              {renderTierSection("stable", result.recommendations.stable)}
              {renderTierSection("safe", result.recommendations.safe)}

              {result.recommendations.sprint.length === 0 &&
                result.recommendations.stable.length === 0 &&
                result.recommendations.safe.length === 0 && (
                  <div className="py-8 text-center text-[13px] text-muted-foreground">
                    未找到匹配的学校推荐，请检查输入分数
                  </div>
                )}
            </div>
          </div>

          {/* 免责声明 */}
          <div className="rounded-xl bg-[#d97757]/8 p-4">
            <p className="mb-2 font-display text-[13px] font-medium" style={{ color: "#d97757" }}>
              免责声明
            </p>
            <p className="text-[12px] leading-relaxed text-muted-foreground">
              本工具仅供参考，推荐结果基于历年数据和统计模型，不构成实际填报建议。
              实际录取分数线会受当年考试难度、报考人数等因素影响，请结合学校招生简章和班主任建议综合判断。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // 输入页
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="tools-anthropic min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <p className="ant-section-label mb-2">中考志愿填报系统</p>
          <h1 className="font-display text-[36px] font-semibold leading-tight tracking-tight text-foreground sm:text-[42px]">
            输入成绩获取市排名<br />及对标高中志愿
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground" style={{ fontFamily: "var(--font-serif-local)" }}>
            基于一模成绩，智能推荐适合的高中学校
          </p>
        </div>

        {/* Input Form Card */}
        <Card className="mb-8 rounded-2xl border-border/30 bg-card shadow-sm">
          <CardHeader className="pb-2 p-6">
            <CardTitle className="font-display text-lg font-semibold">成绩输入</CardTitle>
            <CardDescription>请输入您的一模考试成绩</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-6 pt-0">
            {/* District */}
            <div className="space-y-2">
              <label className="ant-label">所在区</label>
              <Select value={district} onValueChange={(value) => value && setDistrict(value)}>
                <SelectTrigger className="w-full !h-10 rounded-[10px] border-[#e8e6dc] bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  {SUPPORTED_DISTRICTS.map((d) => (
                    <SelectItem key={d} value={d} className="h-10">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Total Score */}
            <div className="space-y-2">
              <label className="ant-label">{DISTRICT_CONFIG[district]?.examName || '一模'}总分（满分 {DISTRICT_CONFIG[district]?.maxScore || 800}）</label>
              <Input
                type="number"
                placeholder="请输入总分，如 650"
                min={0}
                max={DISTRICT_CONFIG[district]?.maxScore || 800}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="ant-input h-10"
              />
            </div>

            {/* Subject Scores */}
            <Collapsible open={subjectsOpen} onOpenChange={setSubjectsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-0 py-2 font-display text-sm text-muted-foreground hover:text-foreground cursor-pointer">
                各科成绩（选填）
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${subjectsOpen ? "rotate-180" : ""}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-4 pt-4 sm:grid-cols-3">
                  {[
                    { label: "语文（120）", value: chinese, setter: setChinese, max: 120 },
                    { label: "数学（120）", value: math, setter: setMath, max: 120 },
                    { label: "英语（120）", value: english, setter: setEnglish, max: 120 },
                    { label: "物理（100）", value: physics, setter: setPhysics, max: 100 },
                    { label: "化学（100）", value: chemistry, setter: setChemistry, max: 100 },
                    { label: "道法（100）", value: politics, setter: setPolitics, max: 100 },
                    { label: "历史（100）", value: history, setter: setHistory, max: 100 },
                  ].map((subject) => (
                    <div key={subject.label} className="space-y-1.5">
                      <label className="ant-label" style={{ fontSize: "12px" }}>{subject.label}</label>
                      <Input
                        type="number"
                        placeholder={`0-${subject.max}`}
                        min={0}
                        max={subject.max}
                        value={subject.value}
                        onChange={(e) => subject.setter(e.target.value)}
                        className="ant-input h-9"
                      />
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Separator />

            {/* Button */}
            <Button onClick={handleAnalyze} disabled={loading} className="ant-btn w-full h-10 bg-primary text-primary-foreground hover:bg-[#c4654a]">
              {loading ? '分析中...' : '开始分析'}
            </Button>

            {/* Tips */}
            <div className="rounded-xl bg-[#788c5d]/8 p-4">
              <p className="mb-2 font-display text-[13px] font-medium" style={{ color: "#788c5d" }}>
                使用提示
              </p>
              <ul className="space-y-1 text-[13px] text-muted-foreground">
                {[
                  `目前支持${SUPPORTED_DISTRICTS.join('、')}数据`,
                  `输入${DISTRICT_CONFIG[district]?.examName || '考试'}总分后点击「开始分析」`,
                  "系统将自动换算区排名、对标中考分数和市排名",
                  "推荐结果分为冲刺、稳妥、保底三个梯队",
                ].map((tip) => (
                  <li key={tip} className="flex items-start gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: "#788c5d" }} />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
