import { ArrowUpRightMini } from "@medusajs/icons"
import { Text, clx } from "@modules/common/components/ui"
import LocalizedClientLink from "../localized-client-link"
type InteractiveLinkProps = {
  href: string
  children?: React.ReactNode
  onClick?: () => void
  className?: string
  target?: string
  rel?: string
}

const InteractiveLink = ({
  href,
  children,
  onClick,
  className,
  target,
  rel,
}: InteractiveLinkProps) => {
  return (
    <LocalizedClientLink
      className={clx("flex gap-x-1 items-center group", className)}
      href={href}
      onClick={onClick}
      target={target}
      rel={rel}
    >
      <Text className="text-ui-fg-interactive">{children}</Text>
      <ArrowUpRightMini
        className="group-hover:rotate-45 ease-in-out duration-150"
        color="var(--fg-interactive)"
      />
    </LocalizedClientLink>
  )
}

export default InteractiveLink
