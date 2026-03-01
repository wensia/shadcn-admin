import { createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/clerk-react'
import { Skeleton } from '@douyinfe/semi-ui-19'

export const Route = createFileRoute('/clerk/(auth)/sign-in')({
  component: () => (
    <SignIn
      initialValues={{
        emailAddress: 'your_mail+shadcn_admin@gmail.com',
      }}
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
