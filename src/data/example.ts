import { defaultSettings, type Resume, type Entry } from '../types/resume';

export const emptyEntry = (): Entry => ({
  id: crypto.randomUUID(),
  title: '',
  subtitle: '',
  detail: '',
  start: '',
  end: '',
  description: '',
});
export function blankResume(): Resume {
  return {
    version: 1,
    basics: {
      name: '',
      phone: '',
      email: '',
      role: '',
      location: '',
      photo: '',
    },
    sections: [],
    settings: { ...defaultSettings },
  };
}
export const example: Resume = {
  version: 1,
  basics: {
    name: '林知远',
    phone: '138 0000 0000',
    email: 'zhiyuan.lin@example.com',
    role: '前端开发工程师',
    location: '杭州',
    photo: '',
  },
  settings: { ...defaultSettings },
  sections: [
    {
      id: 'education',
      kind: 'education',
      title: '教育经历',
      visible: true,
      entries: [
        {
          id: 'edu-1',
          title: '江南理工大学（虚构）',
          subtitle: '计算机科学与技术 · 本科',
          detail: '',
          start: '2022.09',
          end: '2026.06',
          description:
            'GPA：3.8 / 4.0，专业排名前 10%。\n主修课程：数据结构、计算机网络、操作系统、数据库原理、软件工程。',
        },
      ],
    },
    {
      id: 'work',
      kind: 'work',
      title: '实习经历',
      visible: true,
      entries: [
        {
          id: 'work-1',
          title: '星屿科技（虚构）',
          subtitle: '前端开发实习生',
          detail: '产品研发部',
          start: '2025.07',
          end: '2025.12',
          description:
            '参与企业协作平台的前端开发，使用 React、TypeScript 实现任务看板与数据筛选，覆盖 8 个业务页面。\n将通用表单和权限逻辑抽离为可复用组件，减少重复代码，提升团队交付效率。\n结合性能分析优化首屏资源加载与列表渲染，在测试环境中将首屏加载时间从 2.8 秒缩短至 1.6 秒。\n使用 Vitest 与 Playwright 补充核心流程测试，参与代码评审与技术文档维护。',
        },
      ],
    },
    {
      id: 'project',
      kind: 'project',
      title: '项目经历',
      visible: true,
      entries: [
        {
          id: 'project-1',
          title: '拾光 · 个人知识管理工具',
          subtitle: '前端负责人',
          detail: 'React / TypeScript / IndexedDB',
          start: '2025.03',
          end: '2025.06',
          description:
            '设计并实现笔记编辑、标签管理与全文搜索，支持离线使用和本地数据导出。\n使用虚拟列表优化千条笔记的浏览体验，通过防抖与增量更新降低编辑延迟。\n制定组件规范并完成响应式适配，为桌面和移动端提供一致的交互体验。',
        },
        {
          id: 'project-2',
          title: '校园活动预约系统',
          subtitle: '核心开发者',
          detail: 'Vue 3 / Vite / REST API',
          start: '2024.09',
          end: '2024.12',
          description:
            '负责活动列表、预约流程与个人中心，实现表单校验、异常提示和请求状态管理。\n与后端协作设计接口约定，补充端到端测试，完成项目部署及使用文档。',
        },
      ],
    },
    {
      id: 'skill',
      kind: 'skill',
      title: '专业技能',
      visible: true,
      entries: [
        {
          id: 'skill-1',
          title: '前端开发',
          subtitle: '熟练',
          detail: '',
          start: '',
          end: '',
          description:
            '掌握 HTML、CSS、JavaScript 与 TypeScript，熟悉 React 生态、组件设计及响应式布局。',
        },
        {
          id: 'skill-2',
          title: '工程实践',
          subtitle: '熟练',
          detail: '',
          start: '',
          end: '',
          description:
            '熟悉 Git 协作、Vite 构建、单元测试与自动化测试；了解网络协议、浏览器渲染与性能优化。',
        },
      ],
    },
    {
      id: 'other',
      kind: 'other',
      title: '其他信息',
      visible: true,
      entries: [
        {
          id: 'other-1',
          title: '证书与自我评价',
          subtitle: '',
          detail: '',
          start: '',
          end: '',
          description:
            '大学英语六级（CET-6）；校级程序设计竞赛二等奖。\n关注用户体验与代码质量，乐于主动沟通，能够独立定位问题并持续学习。',
        },
      ],
    },
  ],
};
