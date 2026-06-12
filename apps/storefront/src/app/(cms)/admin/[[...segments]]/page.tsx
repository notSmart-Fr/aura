import React from 'react'
import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
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

export const generateMetadata = async ({ params, searchParams }: Args) => {
  return generatePageMetadata({
    config,
    params,
    searchParams,
  })
}

const Page = async ({ params, searchParams }: Args) => {
  return RootPage({
    config,
    params,
    searchParams,
    importMap,
  })
}

export default Page
