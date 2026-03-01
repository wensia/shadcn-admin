import { createFileRoute } from '@tanstack/react-router'
import { SignUp } from '@clerk/clerk-react'
import { Skeleton } from '@douyinfe/semi-ui-19'

export const Route = createFileRoute('/clerk/(auth)/sign-up')({
  component: () => (
    <SignUp
      fallback={
        <Skeleton
          placeholder={<Skeleton.Paragraph rows={10} />}
          loading
          style={{ height: '30rem', width: '25rem' }}
        />
      }
    />
  ),
})
