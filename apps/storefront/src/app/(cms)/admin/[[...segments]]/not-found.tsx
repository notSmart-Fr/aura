import { NotFoundPage } from '@payloadcms/next/views'
import { importMap } from '../../../(payload)/admin/importMap'
import config from '../../../../../payload.config'

type Args = {
  params: Promise<{
    segments: string[]
  }>
  searchParams: Promise<{
    [key: string]: string | string[]
  }>
}

const NotFound = async ({ params, searchParams }: Args) => {
  return NotFoundPage({
    config,
    params,
    searchParams,
    importMap,
  })
}

export default NotFound
