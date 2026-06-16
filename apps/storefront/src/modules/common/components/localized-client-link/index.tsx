"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React from "react"

/**
 * Use this component to create a Next.js `<Link />` that persists the current country code in the url,
 * without having to explicitly pass it as a prop.
 */
const LocalizedClientLink = ({
  children,
  href,
  className,
  onClick,
  passHref,
  target,
  rel,
  replace,
  scroll,
  prefetch,
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: () => void
  passHref?: true
  target?: string
  rel?: string
  replace?: boolean
  scroll?: boolean
  prefetch?: boolean
}) => {
  const { countryCode } = useParams()

  return (
    <Link
      href={`/${countryCode}${href}`}
      className={className}
      onClick={onClick}
      passHref={passHref}
      target={target}
      rel={rel}
      replace={replace}
      scroll={scroll}
      prefetch={prefetch}
    >
      {children}
    </Link>
  )
}

export default LocalizedClientLink
