// 카테고리 & 도구 카탈로그
// 실제 표시 문구는 여기 없고, i18n 키(nameKey/descKey/...)만 참조합니다.
// 문구는 전부 src/locales/ko.json 에서 관리합니다.

export const categories = [
  { id: 'calc', nameKey: 'categories.calc.name', tagKey: 'categories.calc.tag', accent: 'blue' },
  { id: 'manage', nameKey: 'categories.manage.name', tagKey: 'categories.manage.tag', accent: 'cyan' },
  { id: 'insights', nameKey: 'categories.insights.name', tagKey: 'categories.insights.tag', accent: 'indigo' },
]

export const tools = [
  // 계산 도구
  {
    id: 'loan',
    category: 'calc',
    path: '/tools/loan',
    ready: true,
    iconKey: 'tools.loan.icon',
    nameKey: 'tools.loan.name',
    descKey: 'tools.loan.desc',
  },
  {
    id: 'fx',
    category: 'calc',
    path: '/tools/fx',
    ready: false,
    iconKey: 'tools.fx.icon',
    nameKey: 'tools.fx.name',
    descKey: 'tools.fx.desc',
  },
  {
    id: 'roi',
    category: 'calc',
    path: '/tools/roi',
    ready: false,
    iconKey: 'tools.roi.icon',
    nameKey: 'tools.roi.name',
    descKey: 'tools.roi.desc',
  },
  {
    id: 'tax',
    category: 'calc',
    path: '/tools/tax',
    ready: false,
    iconKey: 'tools.tax.icon',
    nameKey: 'tools.tax.name',
    descKey: 'tools.tax.desc',
  },
  // 자산 관리
  {
    id: 'budget',
    category: 'manage',
    path: '/tools/budget',
    ready: true,
    iconKey: 'tools.budget.icon',
    nameKey: 'tools.budget.name',
    descKey: 'tools.budget.desc',
  },
  {
    id: 'goal',
    category: 'manage',
    path: '/tools/goal',
    ready: false,
    iconKey: 'tools.goal.icon',
    nameKey: 'tools.goal.name',
    descKey: 'tools.goal.desc',
  },
  {
    id: 'subscription',
    category: 'manage',
    path: '/tools/subscription',
    ready: false,
    iconKey: 'tools.subscription.icon',
    nameKey: 'tools.subscription.name',
    descKey: 'tools.subscription.desc',
  },
  // 분석 · 리포트
  {
    id: 'report',
    category: 'insights',
    path: '/tools/report',
    ready: false,
    iconKey: 'tools.report.icon',
    nameKey: 'tools.report.name',
    descKey: 'tools.report.desc',
  },
  {
    id: 'alert',
    category: 'insights',
    path: '/tools/alert',
    ready: false,
    iconKey: 'tools.alert.icon',
    nameKey: 'tools.alert.name',
    descKey: 'tools.alert.desc',
  },
]

export function toolsByCategory(categoryId) {
  return tools.filter((t) => t.category === categoryId)
}
