import { notFound } from 'next/navigation'
import { findModule } from '@/lib/modules'
import { ModuleClient } from '@/components/ModuleClient'

export default async function ModulePage({
  params,
}: {
  params: Promise<{ country: string; module: string }>
}) {
  const { country, module } = await params
  const spec = findModule(country, module)
  if (!spec) notFound()
  return <ModuleClient module={spec} />
}
