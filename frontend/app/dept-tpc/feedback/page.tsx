'use client'

import { DepartmentTPCLayout } from '@/components/layouts/DepartmentTPCLayout'
import { FeedbackAnalytics } from '@/components/feedback/FeedbackAnalytics'

export default function DeptTPCFeedbackPage() {
  return (
    <DepartmentTPCLayout>
      <div className="p-6 lg:p-8">
        <FeedbackAnalytics
          apiBase="tpc-dept"
          title="Student Pulse — Department Feedback"
        />
      </div>
    </DepartmentTPCLayout>
  )
}
