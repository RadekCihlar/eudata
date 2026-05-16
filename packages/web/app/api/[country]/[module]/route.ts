import { NextRequest, NextResponse } from 'next/server'
import { dispatchModule } from '@/lib/dispatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ country: string; module: string }> }
) {
  const { country, module } = await ctx.params
  const id = req.nextUrl.searchParams.get('id') ?? ''
  if (!id) {
    return NextResponse.json({ ok: false, error: 'Missing id query param' }, { status: 400 })
  }
  const started = Date.now()
  const result = await dispatchModule(country, module, id)
  const elapsedMs = Date.now() - started
  if (!result.ok) {
    return NextResponse.json({ ...result, elapsedMs }, { status: result.status })
  }
  return NextResponse.json({ ok: true, data: result.data, elapsedMs })
}
