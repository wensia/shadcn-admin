/**
 * 云客通话记录详情路径。内容由父级 call-records 路由渲染，以保留列表状态。
 */

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/yunke/call-records/$recordId')({})
